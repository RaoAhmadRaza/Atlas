from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, model_validator

_BASE_DEFAULTS: dict[str, object] = {
    "k": 20,
    "top_n": 5,
    "budget_tokens": 3000,
    "retriever_source": "live",
    "faithfulness_judge": "noop",
}


class EvalConfig(BaseModel):
    name: str
    retriever: Literal["dense", "bm25", "hybrid"]
    reranker: Literal["noop", "bge", "cohere"]
    k: int = 20
    top_n: int = 5
    budget_tokens: int = 3000
    retriever_source: Literal["live", "fake_seeded"] = "live"
    faithfulness_judge: Literal["noop", "openai"] = "noop"
    dataset_path: str | None = None

    @model_validator(mode="before")
    @classmethod
    def apply_env_overrides(cls, data: dict[str, object]) -> dict[str, object]:
        import os

        src = os.environ.get("EVAL_RETRIEVER_SOURCE")
        if src:
            data["retriever_source"] = src
        judge = os.environ.get("EVAL_FAITHFULNESS_JUDGE")
        if judge:
            data["faithfulness_judge"] = judge
        return data


def load_config(path: str | Path) -> EvalConfig:
    p = Path(path)
    base_path = p.parent / "_base.yaml"
    data: dict[str, object] = dict(_BASE_DEFAULTS)
    if base_path.exists():
        data.update(yaml.safe_load(base_path.read_text()) or {})
    data.update(yaml.safe_load(p.read_text()) or {})
    if "name" not in data:
        data["name"] = p.stem
    return EvalConfig.model_validate(data)
