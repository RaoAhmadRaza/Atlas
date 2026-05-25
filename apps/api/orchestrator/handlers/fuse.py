from __future__ import annotations

from atlas_core.retrieval.hybrid import rrf_fuse
from langchain_core.runnables import RunnableConfig

from apps.api.orchestrator.state import QueryState


async def fuse_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:  # noqa: ARG001
    fused = rrf_fuse([state["dense_hits"], state["bm25_hits"]])
    return {"fused_hits": fused}
