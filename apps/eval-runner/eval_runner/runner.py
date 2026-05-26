from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from eval_runner.config import EvalConfig
from eval_runner.dataset import DatasetQuestion
from eval_runner.faithfulness import FaithfulnessJudge, NoopFaithfulnessJudge, get_judge
from eval_runner.metrics import mrr, ndcg_at_k, recall_at_k


@dataclass
class QuestionResult:
    question_id: str
    question: str
    expected_answer: str
    retrieved_doc_ids: list[str]
    relevant_doc_ids: list[str]
    recall_at_5: float
    recall_at_10: float
    mrr: float
    ndcg_at_10: float
    faithfulness: float
    latency_ms: int
    generated_answer: str = ""
    error: str | None = None


@dataclass
class EvalRunResult:
    config_name: str
    dataset: str
    question_count: int
    recall_at_5: float
    recall_at_10: float
    mrr: float
    ndcg_at_10: float
    faithfulness: float
    p95_ms: int
    total_cost_usd: float = 0.0
    per_question: list[QuestionResult] = field(default_factory=list)


class FakeSeededRetriever:
    """Deterministic in-memory retriever for CI smoke — no DB needed."""

    def __init__(self, questions: list[DatasetQuestion], seed: int = 42) -> None:
        self._index: dict[str, list[str]] = {}
        rng_state = int(hashlib.sha256(str(seed).encode()).hexdigest(), 16)
        for q in questions:
            docs = list(q.supporting_docs)
            # add seeded decoys so retrieval isn't trivially perfect
            n_decoys = max(2, len(docs))
            for i in range(n_decoys):
                decoy_id = f"decoy_{q.question_id}_{(rng_state + i) % 9999}"
                docs.append(decoy_id)
            self._index[q.question_id] = docs
        self._questions = {q.question_id: q for q in questions}

    async def retrieve(self, query: str, tenant_id: UUID, k: int = 20) -> list[Any]:
        # Find closest question by simple string match
        best_qid = min(
            self._questions,
            key=lambda qid: (
                -sum(w in query.lower() for w in self._questions[qid].question.lower().split())
            ),
        )
        from atlas_core.retrieval.types import ScoredChunk

        docs = self._index.get(best_qid, [])[:k]
        return [
            ScoredChunk(
                id=UUID(int=abs(hash(d)) % (2**128)),
                content=f"content for {d}",
                metadata={"source_doc_id": d},
                score=1.0 / (i + 1),
                token_count=20,
                document_id=None,
            )
            for i, d in enumerate(docs)
        ]


class EvalRunner:
    def __init__(
        self,
        config: EvalConfig,
        retriever: Any,
        reranker: Any | None = None,
        judge: FaithfulnessJudge | None = None,
        tenant_id: UUID | None = None,
    ) -> None:
        self._config = config
        self._retriever = retriever
        self._reranker = reranker
        self._judge = judge or NoopFaithfulnessJudge()
        self._tenant_id = tenant_id or UUID(int=0)

    async def run(
        self, questions: list[DatasetQuestion], dataset_name: str = "unknown"
    ) -> EvalRunResult:
        per_question: list[QuestionResult] = []
        latencies: list[int] = []

        for q in questions:
            result = await self._eval_one(q)
            per_question.append(result)
            latencies.append(result.latency_ms)

        def avg(vals: list[float]) -> float:
            return sum(vals) / len(vals) if vals else 0.0

        latencies_sorted = sorted(latencies)
        p95_idx = max(0, int(0.95 * len(latencies_sorted)) - 1)

        return EvalRunResult(
            config_name=self._config.name,
            dataset=dataset_name,
            question_count=len(questions),
            recall_at_5=avg([r.recall_at_5 for r in per_question]),
            recall_at_10=avg([r.recall_at_10 for r in per_question]),
            mrr=avg([r.mrr for r in per_question]),
            ndcg_at_10=avg([r.ndcg_at_10 for r in per_question]),
            faithfulness=avg([r.faithfulness for r in per_question]),
            p95_ms=latencies_sorted[p95_idx] if latencies_sorted else 0,
            per_question=per_question,
        )

    async def _eval_one(self, q: DatasetQuestion) -> QuestionResult:
        t0 = time.monotonic()
        try:
            chunks = await self._retriever.retrieve(q.question, self._tenant_id, k=self._config.k)
            if self._reranker is not None:
                chunks = await self._reranker.rerank(q.question, chunks, top_n=self._config.top_n)

            retrieved_ids = [str(c.metadata.get("source_doc_id", str(c.id))) for c in chunks]
            relevant = set(q.supporting_docs)
            generated = " ".join(c.content for c in chunks[: self._config.top_n])
            context = "\n".join(c.content for c in chunks)
            faith = await self._judge.score(q.question, generated, context)
            latency_ms = int((time.monotonic() - t0) * 1000)

            return QuestionResult(
                question_id=q.question_id,
                question=q.question,
                expected_answer=q.answer,
                retrieved_doc_ids=retrieved_ids,
                relevant_doc_ids=list(relevant),
                recall_at_5=recall_at_k(retrieved_ids, relevant, 5),
                recall_at_10=recall_at_k(retrieved_ids, relevant, 10),
                mrr=mrr(retrieved_ids, relevant),
                ndcg_at_10=ndcg_at_k(retrieved_ids, relevant, 10),
                faithfulness=faith,
                latency_ms=latency_ms,
                generated_answer=generated,
            )
        except Exception as exc:
            latency_ms = int((time.monotonic() - t0) * 1000)
            return QuestionResult(
                question_id=q.question_id,
                question=q.question,
                expected_answer=q.answer,
                retrieved_doc_ids=[],
                relevant_doc_ids=list(q.supporting_docs),
                recall_at_5=0.0,
                recall_at_10=0.0,
                mrr=0.0,
                ndcg_at_10=0.0,
                faithfulness=0.0,
                latency_ms=latency_ms,
                error=str(exc),
            )


def build_runner(config: EvalConfig, questions: list[DatasetQuestion]) -> EvalRunner:
    """Factory: instantiates retriever/reranker from config strings."""
    judge = get_judge(config.faithfulness_judge)
    if config.retriever_source == "fake_seeded":
        retriever = FakeSeededRetriever(questions)
        return EvalRunner(config, retriever=retriever, judge=judge)

    # live path — requires conn_factory from caller
    raise RuntimeError(
        "live retriever_source requires explicit conn_factory; "
        "use EvalRunner(config, retriever, ...) directly"
    )
