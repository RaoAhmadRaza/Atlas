from __future__ import annotations

import json
import os
from pathlib import Path

from eval_runner.runner import EvalRunResult


def to_dict(result: EvalRunResult) -> dict[str, object]:
    return {
        "config_name": result.config_name,
        "dataset": result.dataset,
        "question_count": result.question_count,
        "recall_at_5": round(result.recall_at_5, 4),
        "recall_at_10": round(result.recall_at_10, 4),
        "mrr": round(result.mrr, 4),
        "ndcg_at_10": round(result.ndcg_at_10, 4),
        "faithfulness": round(result.faithfulness, 4),
        "p95_ms": result.p95_ms,
        "total_cost_usd": result.total_cost_usd,
        "commit_sha": os.environ.get("GITHUB_SHA", "local"),
    }


def format_json(result: EvalRunResult) -> str:
    return json.dumps(to_dict(result), indent=2)


def format_markdown(result: EvalRunResult) -> str:
    d = to_dict(result)
    lines = [
        f"## Eval Report — {d['config_name']} on {d['dataset']}",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Recall@5 | {d['recall_at_5']} |",
        f"| Recall@10 | {d['recall_at_10']} |",
        f"| MRR | {d['mrr']} |",
        f"| NDCG@10 | {d['ndcg_at_10']} |",
        f"| Faithfulness | {d['faithfulness']} |",
        f"| P95 latency | {d['p95_ms']}ms |",
        f"| Questions | {d['question_count']} |",
        f"| Commit | {d['commit_sha']} |",
    ]
    return "\n".join(lines)


def write_report(result: EvalRunResult, out_dir: str | Path) -> Path:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    data = to_dict(result)
    report_path = out / f"{result.config_name}.json"
    report_path.write_text(json.dumps(data, indent=2))
    latest = out / "latest.json"
    latest.write_text(json.dumps(data, indent=2))
    return report_path
