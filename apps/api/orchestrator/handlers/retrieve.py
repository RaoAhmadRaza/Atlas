from __future__ import annotations

import asyncio
import json

from langchain_core.runnables import RunnableConfig

from apps.api.orchestrator.state import RETRIEVAL_K, QueryState, _sse_queue_var


async def retrieve_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:
    queue = _sse_queue_var.get(None)
    if queue is not None:
        await queue.put(json.dumps({"type": "stage", "stage": "retrieve"}))

    dense = config["configurable"]["dense_retriever"]
    bm25 = config["configurable"]["bm25_retriever"]
    tenant_id = state["tenant_id"]
    query = state["rewritten_query"]

    dense_hits, bm25_hits = await asyncio.gather(
        dense.retrieve(query, tenant_id, k=RETRIEVAL_K),
        bm25.retrieve(query, tenant_id, k=RETRIEVAL_K),
    )
    return {"dense_hits": dense_hits, "bm25_hits": bm25_hits}
