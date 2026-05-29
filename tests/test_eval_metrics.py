"""100% coverage for eval_runner.metrics and eval_runner.stats."""

from __future__ import annotations

from eval_runner.metrics import mrr, ndcg_at_k, recall_at_k
from eval_runner.stats import paired_bootstrap_ci

# ── recall_at_k ───────────────────────────────────────────────────────────────


def test_recall_at_k_perfect() -> None:
    assert recall_at_k(["a", "b", "c"], {"a", "b", "c"}, k=3) == 1.0


def test_recall_at_k_zero_relevant() -> None:
    assert recall_at_k(["a", "b"], set(), k=2) == 0.0


def test_recall_at_k_partial() -> None:
    result = recall_at_k(["a", "x", "b"], {"a", "b", "c"}, k=3)
    assert abs(result - 2 / 3) < 1e-9


def test_recall_at_k_cutoff_excludes_later() -> None:
    assert recall_at_k(["x", "a", "b"], {"a", "b"}, k=1) == 0.0


def test_recall_at_k_empty_retrieved() -> None:
    assert recall_at_k([], {"a"}, k=5) == 0.0


# ── mrr ───────────────────────────────────────────────────────────────────────


def test_mrr_first_hit() -> None:
    assert mrr(["a", "b", "c"], {"a"}) == 1.0


def test_mrr_second_hit() -> None:
    assert abs(mrr(["x", "a", "b"], {"a"}) - 0.5) < 1e-9


def test_mrr_no_hit() -> None:
    assert mrr(["x", "y"], {"a"}) == 0.0


def test_mrr_empty() -> None:
    assert mrr([], {"a"}) == 0.0


# ── ndcg_at_k ─────────────────────────────────────────────────────────────────


def test_ndcg_perfect() -> None:
    assert abs(ndcg_at_k(["a", "b"], {"a", "b"}, k=2) - 1.0) < 1e-9


def test_ndcg_zero_relevant() -> None:
    assert ndcg_at_k(["a", "b"], set(), k=2) == 0.0


def test_ndcg_monotonic() -> None:
    perfect = ndcg_at_k(["a", "b", "c"], {"a", "b", "c"}, k=3)
    worse = ndcg_at_k(["x", "a", "b"], {"a", "b", "c"}, k=3)
    assert perfect > worse


def test_ndcg_no_hits() -> None:
    assert ndcg_at_k(["x", "y"], {"a", "b"}, k=2) == 0.0


# ── paired_bootstrap_ci ───────────────────────────────────────────────────────


def test_bootstrap_reproducible() -> None:
    a = [0.5, 0.6, 0.7, 0.4, 0.8]
    b = [0.6, 0.7, 0.8, 0.5, 0.9]
    r1 = paired_bootstrap_ci(a, b, seed=42)
    r2 = paired_bootstrap_ci(a, b, seed=42)
    assert r1 == r2


def test_bootstrap_significant() -> None:
    a = [0.1] * 50
    b = [0.9] * 50
    result = paired_bootstrap_ci(a, b, n_resamples=1000, seed=42)
    assert result["p_value"] < 0.05


def test_bootstrap_ci_bounds_ordered() -> None:
    a = [0.5, 0.6, 0.7]
    b = [0.6, 0.7, 0.8]
    result = paired_bootstrap_ci(a, b, seed=42)
    low, high = result["ci_95"]
    assert low <= high


def test_bootstrap_delta_sign() -> None:
    a = [0.3, 0.4]
    b = [0.7, 0.8]
    result = paired_bootstrap_ci(a, b, seed=42)
    assert result["delta"] < 0  # a - b is negative
