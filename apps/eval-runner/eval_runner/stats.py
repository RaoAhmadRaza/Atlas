from __future__ import annotations

import numpy as np


def paired_bootstrap_ci(
    scores_a: list[float],
    scores_b: list[float],
    n_resamples: int = 10_000,
    seed: int = 42,
) -> dict[str, object]:
    """Paired bootstrap CI for mean delta (A - B).

    Returns delta, p_value (prob delta >= observed), and 95% CI.
    """
    a = np.array(scores_a)
    b = np.array(scores_b)
    rng = np.random.default_rng(seed)
    delta_obs = float(np.mean(a) - np.mean(b))
    idx = rng.integers(0, len(a), size=(n_resamples, len(a)))
    deltas = np.mean(a[idx], axis=1) - np.mean(b[idx], axis=1)
    p_one = float(np.mean(deltas >= abs(delta_obs)))
    p_value = min(2.0 * p_one, 1.0)
    ci_low, ci_high = np.percentile(deltas, [2.5, 97.5]).tolist()
    return {"delta": delta_obs, "p_value": p_value, "ci_95": [ci_low, ci_high]}
