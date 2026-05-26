from __future__ import annotations

import json
from pathlib import Path

from eval_runner.stats import paired_bootstrap_ci


def compare_reports(
    a: dict | str | Path,
    b: dict | str | Path,
) -> dict[str, object]:
    if not isinstance(a, dict):
        a = json.loads(Path(a).read_text())
    if not isinstance(b, dict):
        b = json.loads(Path(b).read_text())

    recall_a = a.get("per_question_recall_at_5", [a.get("recall_at_5", 0.0)])
    recall_b = b.get("per_question_recall_at_5", [b.get("recall_at_5", 0.0)])
    mrr_a = a.get("per_question_mrr", [a.get("mrr", 0.0)])
    mrr_b = b.get("per_question_mrr", [b.get("mrr", 0.0)])

    recall_ci = paired_bootstrap_ci(recall_a, recall_b)
    mrr_ci = paired_bootstrap_ci(mrr_a, mrr_b)

    return {
        "delta_recall5": recall_ci["delta"],
        "delta_mrr": mrr_ci["delta"],
        "recall5_ci": recall_ci,
        "mrr_ci": mrr_ci,
        "p_value": recall_ci["p_value"],
        "ci_95": recall_ci["ci_95"],
    }
