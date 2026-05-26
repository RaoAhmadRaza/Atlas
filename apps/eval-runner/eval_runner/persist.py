from __future__ import annotations

from uuid import UUID

from atlas_core.models.ops import EvalQuestionResult, EvalRun
from sqlalchemy.ext.asyncio import AsyncSession

from .runner import EvalRunResult


async def save_eval_run(
    result: EvalRunResult,
    tenant_id: UUID,
    eval_run_id: UUID,
    session: AsyncSession,
) -> None:
    run = await session.get(EvalRun, eval_run_id)
    if run is None:
        raise ValueError(f"EvalRun {eval_run_id} not found")

    run.metrics = {
        "recall_at_5": result.recall_at_5,
        "recall_at_10": result.recall_at_10,
        "mrr": result.mrr,
        "ndcg_at_10": result.ndcg_at_10,
        "faithfulness": result.faithfulness,
        "p95_ms": result.p95_ms,
        "total_cost_usd": result.total_cost_usd,
        "question_count": result.question_count,
    }
    run.status = "completed"

    for q in result.per_question:
        session.add(
            EvalQuestionResult(
                tenant_id=tenant_id,
                eval_run_id=eval_run_id,
                question_id=q.question_id,
                question=q.question,
                expected_answer=q.expected_answer,
                retrieved_doc_ids=q.retrieved_doc_ids,
                relevant_doc_ids=q.relevant_doc_ids,
                recall_at_5=q.recall_at_5,
                recall_at_10=q.recall_at_10,
                mrr_score=q.mrr,
                ndcg_at_10=q.ndcg_at_10,
                faithfulness=q.faithfulness,
                latency_ms=q.latency_ms,
                cost_usd=q.cost_usd,
                generated_answer=q.generated_answer,
                error=q.error,
            )
        )

    await session.flush()
