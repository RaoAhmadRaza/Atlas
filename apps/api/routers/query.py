"""POST /v1/query — SSE streaming query orchestrator endpoint."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from functools import partial
from typing import Any, cast
from uuid import UUID, uuid4

import openai
from atlas_core.db.session import with_tenant_session
from atlas_core.embed import MockEmbedder
from atlas_core.retrieval import BM25Retriever, DenseRetriever, NoopReranker
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.api.deps import get_tenant_id
from apps.api.orchestrator.conversation import ensure_conversation, insert_messages
from apps.api.orchestrator.cost import BudgetExceeded, CostSummary, track_cost
from apps.api.orchestrator.pipeline import get_pipeline
from apps.api.orchestrator.state import QueryState, _sse_queue_var

router = APIRouter(prefix="/v1", tags=["query"])


class QueryRequest(BaseModel):
    query: str
    conversation_id: UUID | None = None


async def _sse_stream(queue: asyncio.Queue[str | None]) -> AsyncGenerator[str, None]:
    while True:
        event = await queue.get()
        if event is None:
            break
        yield f"data: {event}\n\n"


async def _run_pipeline(
    body: QueryRequest,
    tenant_id: UUID,
    queue: asyncio.Queue[str | None],
    request: Request,
) -> None:
    db_factory = request.app.state.db_factory
    redis = request.app.state.redis
    conn_factory = partial(with_tenant_session, session_factory=db_factory)

    embedder = MockEmbedder()
    dense_retriever = DenseRetriever(embedder=embedder, conn_factory=conn_factory)
    bm25_retriever = BM25Retriever(conn_factory=conn_factory)
    reranker = NoopReranker()
    llm_client = openai.AsyncOpenAI()

    token = _sse_queue_var.set(queue)
    try:
        async with conn_factory(tenant_id) as session:
            conv_id = await ensure_conversation(body.conversation_id, tenant_id, session)

        query_id = str(uuid4())
        await queue.put(
            json.dumps({"type": "meta", "conversation_id": str(conv_id), "query_id": query_id})
        )

        initial: QueryState = {
            "query": body.query,
            "rewritten_query": body.query,
            "tenant_id": tenant_id,
            "conversation_id": conv_id,
            "dense_hits": [],
            "bm25_hits": [],
            "fused_hits": [],
            "reranked_hits": [],
            "compressed_hits": [],
            "answer": "",
            "citations": [],
            "verify_attempts": 0,
            "cost": None,
        }

        config = {
            "configurable": {
                "conn_factory": conn_factory,
                "dense_retriever": dense_retriever,
                "bm25_retriever": bm25_retriever,
                "reranker": reranker,
                "llm_client": llm_client,
                "redis": redis,
            }
        }

        final_state: QueryState = await get_pipeline().ainvoke(cast(Any, initial), config=config)  # type: ignore[call-overload]

        cost_data = final_state.get("cost")
        if cost_data:
            summary = CostSummary(
                tokens_in=cost_data["tokens_in"],
                tokens_out=cost_data["tokens_out"],
                usd=cost_data["usd"],
                meta=cost_data.get("meta", {}),
            )
            async with conn_factory(tenant_id) as session:
                await track_cost(tenant_id, summary, redis, session)
                await insert_messages(
                    conv_id,
                    tenant_id,
                    session,
                    body.query,
                    final_state["answer"],
                    final_state.get("citations", []),
                    summary,
                )

        await queue.put(
            json.dumps(
                {
                    "type": "done",
                    "citations": final_state.get("citations", []),
                    "cost": cost_data or {},
                }
            )
        )
    except BudgetExceeded as exc:
        await queue.put(json.dumps({"type": "error", "message": str(exc), "code": 402}))
    except Exception:
        await queue.put(json.dumps({"type": "error", "message": "Internal server error"}))
        raise
    finally:
        _sse_queue_var.reset(token)
        await queue.put(None)


@router.post("/query")
async def query_endpoint(
    body: QueryRequest,
    request: Request,
    tenant_id: UUID = Depends(get_tenant_id),
) -> StreamingResponse:
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    asyncio.create_task(_run_pipeline(body, tenant_id, queue, request))
    return StreamingResponse(_sse_stream(queue), media_type="text/event-stream")
