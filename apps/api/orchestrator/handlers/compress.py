from __future__ import annotations

from atlas_core.retrieval.compress import compress
from langchain_core.runnables import RunnableConfig

from apps.api.orchestrator.state import CONTEXT_BUDGET_TOKENS, QueryState


async def compress_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:  # noqa: ARG001
    compressed = compress(state["reranked_hits"], budget_tokens=CONTEXT_BUDGET_TOKENS)
    return {"compressed_hits": compressed}
