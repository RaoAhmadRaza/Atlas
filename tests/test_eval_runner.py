"""Tests for eval_runner.runner, dataset, config, faithfulness, persist, report."""

from __future__ import annotations

import json
from pathlib import Path

from eval_runner.config import EvalConfig, load_config
from eval_runner.dataset import DatasetQuestion, load_jsonl
from eval_runner.faithfulness import NoopFaithfulnessJudge, get_judge
from eval_runner.report import format_json, format_markdown
from eval_runner.runner import EvalRunResult, FakeSeededRetriever

# ── dataset ───────────────────────────────────────────────────────────────────


def test_load_jsonl_valid(tmp_path: Path) -> None:
    f = tmp_path / "q.jsonl"
    q = {
        "question_id": "q1",
        "question": "What is X?",
        "answer": "X is Y",
        "supporting_docs": ["doc1"],
        "dataset": "test",
    }
    f.write_text(json.dumps(q) + "\n")
    result = load_jsonl(f)
    assert len(result) == 1
    assert result[0].question_id == "q1"


def test_load_jsonl_skips_malformed(tmp_path: Path) -> None:
    f = tmp_path / "q.jsonl"
    f.write_text('{"bad": true}\nnot json at all\n')
    result = load_jsonl(f)
    assert len(result) == 0


# ── config ────────────────────────────────────────────────────────────────────


def test_load_config_merges_base(tmp_path: Path) -> None:
    base = tmp_path / "_base.yaml"
    base.write_text(
        "k: 10\ntop_n: 3\nbudget_tokens: 1000\nretriever_source: live\nfaithfulness_judge: noop\n"
    )
    cfg_file = tmp_path / "test.yaml"
    cfg_file.write_text("name: test\nretriever: dense\nreranker: noop\n")
    config = load_config(cfg_file)
    assert config.name == "test"
    assert config.k == 10
    assert config.retriever == "dense"


def test_eval_config_defaults() -> None:
    c = EvalConfig(name="x", retriever="dense", reranker="noop")
    assert c.k == 20
    assert c.faithfulness_judge == "noop"


# ── faithfulness ──────────────────────────────────────────────────────────────


async def test_noop_judge_returns_one() -> None:
    judge = NoopFaithfulnessJudge()
    score = await judge.score("q", "a", "ctx")
    assert score == 1.0


def test_get_judge_noop() -> None:
    judge = get_judge("noop")
    assert isinstance(judge, NoopFaithfulnessJudge)


# ── FakeSeededRetriever ───────────────────────────────────────────────────────


def test_fake_seeded_retriever_returns_docs() -> None:
    q = DatasetQuestion(
        question_id="q1",
        question="test?",
        answer="ans",
        supporting_docs=["doc1", "doc2"],
        dataset="test",
    )
    retriever = FakeSeededRetriever(questions=[q], seed=42)
    assert "doc1" in retriever._index["q1"]
    assert "doc2" in retriever._index["q1"]


def test_fake_seeded_retriever_empty() -> None:
    retriever = FakeSeededRetriever(questions=[], seed=42)
    assert retriever._index == {}


# ── report ────────────────────────────────────────────────────────────────────


def _make_result() -> EvalRunResult:
    return EvalRunResult(
        config_name="test",
        dataset="smoke",
        recall_at_5=0.8,
        recall_at_10=0.9,
        mrr=0.75,
        ndcg_at_10=0.85,
        faithfulness=1.0,
        p95_ms=120,
        total_cost_usd=0.001,
        question_count=10,
        per_question=[],
    )


def test_format_json() -> None:
    result = _make_result()
    out = format_json(result)
    data = json.loads(out)
    assert data["recall_at_5"] == 0.8
    assert data["config_name"] == "test"


def test_format_markdown() -> None:
    result = _make_result()
    md = format_markdown(result)
    assert "Recall@5" in md
    assert "0.8" in md


def test_write_report(tmp_path: Path) -> None:
    from eval_runner.report import write_report

    result = _make_result()
    write_report(result, tmp_path)
    assert (tmp_path / "test.json").exists()
    assert (tmp_path / "latest.json").exists()
