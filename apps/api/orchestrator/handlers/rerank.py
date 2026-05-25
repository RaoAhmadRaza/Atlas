from __future__ import annotations

import json

from langchain_core.runnables import RunnableConfig

from apps.api.orchestrator.state import RERANK_TOP_N, QueryState, _sse_queue_var


async def rerank_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:
    queue = _sse_queue_var.get(None)
    if queue is not None:
        await queue.put(json.dumps({"type": "stage", "stage": "rerank"}))

    reranker = config["configurable"]["reranker"]
    reranked = await reranker.rerank(
        state["rewritten_query"], state["fused_hits"], top_n=RERANK_TOP_N
    )
    return {"reranked_hits": reranked}
