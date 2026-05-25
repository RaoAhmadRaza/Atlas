from __future__ import annotations

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END

from apps.api.orchestrator.state import VERIFY_MAX_ATTEMPTS, QueryState


async def verify_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:  # noqa: ARG001
    return {"verify_attempts": state.get("verify_attempts", 0) + 1}


def verify_route(state: QueryState) -> str:
    valid_ids = {str(c.id) for c in state.get("compressed_hits", [])}
    bad = [c for c in state.get("citations", []) if c["chunk_id"] not in valid_ids]
    if bad and state.get("verify_attempts", 0) < VERIFY_MAX_ATTEMPTS:
        return "generate"
    return str(END)
