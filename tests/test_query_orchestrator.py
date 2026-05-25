"""Tests for Module 4 — Query Orchestrator."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from decimal import Decimal
from functools import partial
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from atlas_core.retrieval.types import ScoredChunk
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from apps.api.orchestrator.cost import BudgetExceeded, CostSummary, track_cost
from apps.api.orchestrator.handlers.verify import verify_route
from apps.api.orchestrator.state import (
    VERIFY_MAX_ATTEMPTS,
    Citation,
    QueryState,
    _sse_queue_var,
)
from tests.conftest import TenantFixture

# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_chunk(content: str = "chunk text", token_count: int = 10) -> ScoredChunk:
    return ScoredChunk(id=uuid4(), content=content, metadata={}, score=0.9, token_count=token_count)


def _make_state(**overrides: object) -> QueryState:
    base: QueryState = {
        "query": "what is atlas?",
        "rewritten_query": "what is atlas?",
        "tenant_id": uuid4(),
        "conversation_id": None,
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
    return {**base, **overrides}  # type: ignore[return-value]


def _mock_llm(answer: str = "test answer") -> MagicMock:
    mock = MagicMock()

    rewrite_resp = MagicMock()
    rewrite_resp.content = [MagicMock(text="rewritten query")]
    mock.messages.create = AsyncMock(return_value=rewrite_resp)

    final_msg = MagicMock()
    final_msg.usage.input_tokens = 100
    final_msg.usage.output_tokens = 50

    async def _text_gen() -> AsyncGenerator[str, None]:
        for word in answer.split():
            yield word + " "

    stream_obj = MagicMock()
    stream_obj.text_stream = _text_gen()
    stream_obj.get_final_message = AsyncMock(return_value=final_msg)

    @asynccontextmanager
    async def _stream_ctx(*_a: object, **_k: object) -> AsyncGenerator[MagicMock, None]:
        yield stream_obj

    mock.messages.stream = _stream_ctx
    return mock


def _make_config(llm: object = None, **extra: object) -> dict:
    mock_dense = AsyncMock()
    mock_dense.retrieve = AsyncMock(return_value=[])
    mock_bm25 = AsyncMock()
    mock_bm25.retrieve = AsyncMock(return_value=[])
    mock_reranker = AsyncMock()
    mock_reranker.rerank = AsyncMock(return_value=[])
    return {
        "configurable": {
            "conn_factory": MagicMock(),
            "dense_retriever": mock_dense,
            "bm25_retriever": mock_bm25,
            "reranker": mock_reranker,
            "llm_client": llm or _mock_llm(),
            "redis": AsyncMock(),
            **extra,
        }
    }


# ── Tests ─────────────────────────────────────────────────────────────────────


async def test_pipeline_runs_e2e() -> None:
    from apps.api.orchestrator.pipeline import build_pipeline

    queue: asyncio.Queue[str | None] = asyncio.Queue()
    token = _sse_queue_var.set(queue)
    try:
        result = await build_pipeline().ainvoke(_make_state(), config=_make_config())
    finally:
        _sse_queue_var.reset(token)

    assert result["cost"] is not None
    assert result["cost"]["tokens_in"] == 100
    assert result["cost"]["tokens_out"] == 50


async def test_sse_event_order() -> None:
    from apps.api.orchestrator.pipeline import build_pipeline

    queue: asyncio.Queue[str | None] = asyncio.Queue()
    token = _sse_queue_var.set(queue)
    try:
        await build_pipeline().ainvoke(_make_state(), config=_make_config())
    finally:
        _sse_queue_var.reset(token)

    events = [json.loads(raw) for raw in list(queue._queue) if raw is not None]  # type: ignore[attr-defined]
    stages = [e["stage"] for e in events if e["type"] == "stage"]
    token_events = [e for e in events if e["type"] == "token"]

    assert stages.index("rewrite") < stages.index("retrieve")
    assert stages.index("retrieve") < stages.index("rerank")
    assert stages.index("rerank") < stages.index("generate")
    assert len(token_events) > 0


async def test_citation_verify_retries() -> None:
    chunk = _make_chunk()
    bad: Citation = {"chunk_id": str(uuid4()), "text": "hallucinated"}

    assert (
        verify_route(_make_state(compressed_hits=[chunk], citations=[bad], verify_attempts=0))
        == "generate"
    )
    assert (
        verify_route(_make_state(compressed_hits=[chunk], citations=[bad], verify_attempts=1))
        == "generate"
    )

    route_at_max = verify_route(
        _make_state(compressed_hits=[chunk], citations=[bad], verify_attempts=VERIFY_MAX_ATTEMPTS)
    )
    assert route_at_max != "generate"


async def test_budget_exceeded_raises(
    tenant_a: TenantFixture,
    admin_session: AsyncSession,
) -> None:
    from atlas_core.models.ops import BudgetPolicy

    admin_session.add(
        BudgetPolicy(
            tenant_id=tenant_a.id,
            daily_usd_limit=Decimal("0.001"),
            alert_threshold=Decimal("0.8"),
        )
    )
    await admin_session.commit()

    mock_redis = AsyncMock()
    mock_redis.incrbyfloat = AsyncMock(return_value=999.0)
    mock_redis.expire = AsyncMock()

    with pytest.raises(BudgetExceeded):
        await track_cost(
            tenant_a.id,
            CostSummary(tokens_in=100, tokens_out=50, usd=0.01, meta={}),
            mock_redis,
            admin_session,
        )
    await admin_session.rollback()


async def test_cost_written_to_db(
    tenant_a: TenantFixture,
    admin_session: AsyncSession,
) -> None:
    from atlas_core.models.ops import UsageEvent

    mock_redis = AsyncMock()
    mock_redis.incrbyfloat = AsyncMock(return_value=0.001)
    mock_redis.expire = AsyncMock()

    await track_cost(
        tenant_a.id,
        CostSummary(tokens_in=100, tokens_out=50, usd=0.002, meta={"model": "test"}),
        mock_redis,
        admin_session,
    )
    await admin_session.commit()

    count = (
        await admin_session.execute(
            select(func.count()).select_from(UsageEvent).where(UsageEvent.tenant_id == tenant_a.id)
        )
    ).scalar()
    assert count == 1


async def test_conversation_history(
    tenant_a: TenantFixture,
    admin_session: AsyncSession,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    from atlas_core.db.session import with_tenant_session
    from atlas_core.models.chat import Conversation, Message

    from apps.api.orchestrator.conversation import fetch_history

    conv = Conversation(tenant_id=tenant_a.id)
    admin_session.add(conv)
    await admin_session.flush()
    admin_session.add(
        Message(
            tenant_id=tenant_a.id,
            conversation_id=conv.id,
            role="user",
            content="previous question",
            citations=[],
            token_count=10,
        )
    )
    await admin_session.commit()

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    async with conn_factory(tenant_a.id) as session:
        history = await fetch_history(conv.id, tenant_a.id, session, n=3)

    assert len(history) == 1
    assert history[0].content == "previous question"
    assert history[0].role == "user"
