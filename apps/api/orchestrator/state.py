from __future__ import annotations

import asyncio
from contextvars import ContextVar
from typing import Any, TypedDict
from uuid import UUID

from atlas_core.retrieval.types import ScoredChunk

VERIFY_MAX_ATTEMPTS = 2
CONTEXT_BUDGET_TOKENS = 3000
RERANK_TOP_N = 5
RETRIEVAL_K = 20

_sse_queue_var: ContextVar[asyncio.Queue[str | None]] = ContextVar("sse_queue")


class Citation(TypedDict):
    chunk_id: str
    text: str


class CostData(TypedDict):
    tokens_in: int
    tokens_out: int
    usd: float
    meta: dict[str, Any]


class QueryState(TypedDict):
    query: str
    rewritten_query: str
    tenant_id: UUID
    conversation_id: UUID | None
    dense_hits: list[ScoredChunk]
    bm25_hits: list[ScoredChunk]
    fused_hits: list[ScoredChunk]
    reranked_hits: list[ScoredChunk]
    compressed_hits: list[ScoredChunk]
    answer: str
    citations: list[Citation]
    verify_attempts: int
    cost: CostData | None
