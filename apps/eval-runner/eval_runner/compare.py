from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from eval_runner.stats import paired_bootstrap_ci


def _load(x: dict[str, object] | str | Path) -> dict[str, object]:
    if isinstance(x, dict):
        return x
    return cast(dict[str, object], json.loads(Path(x).read_text()))


def _floats(d: dict[str, object], key: str, fallback_key: str) -> list[float]:
    return cast(list[float], d.get(key, [d.get(fallback_key, 0.0)]))


def compare_reports(
    a: dict[str, object] | str | Path,
    b: dict[str, object] | str | Path,
) -> dict[str, object]:
    da = _load(a)
    db = _load(b)

    recall_a = _floats(da, "per_question_recall_at_5", "recall_at_5")
    recall_b = _floats(db, "per_question_recall_at_5", "recall_at_5")
    mrr_a = _floats(da, "per_question_mrr", "mrr")
    mrr_b = _floats(db, "per_question_mrr", "mrr")

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
