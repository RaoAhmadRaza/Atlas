from __future__ import annotations

from collections.abc import Callable
from contextlib import AbstractAsyncContextManager
from typing import Protocol, TypeAlias, runtime_checkable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from atlas_core.retrieval.types import ScoredChunk

ConnFactory: TypeAlias = Callable[[UUID], AbstractAsyncContextManager[AsyncSession]]


@runtime_checkable
class RetrieverProtocol(Protocol):
    async def retrieve(self, query: str, tenant_id: UUID, k: int = 20) -> list[ScoredChunk]: ...


@runtime_checkable
class RerankerProtocol(Protocol):
    async def rerank(
        self, query: str, chunks: list[ScoredChunk], top_n: int = 5
    ) -> list[ScoredChunk]: ...
