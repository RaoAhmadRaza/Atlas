from __future__ import annotations

import asyncio
from dataclasses import replace
from uuid import UUID

from atlas_core.retrieval.bm25 import BM25Retriever
from atlas_core.retrieval.dense import DenseRetriever
from atlas_core.retrieval.types import ScoredChunk


def rrf_fuse(rankings: list[list[ScoredChunk]], k: int = 60) -> list[ScoredChunk]:
    """Reciprocal Rank Fusion — score = sum(1 / (k + rank)) across all lists."""
    scores: dict[UUID, float] = {}
    for ranking in rankings:
        for rank, chunk in enumerate(ranking, start=1):
            scores[chunk.id] = scores.get(chunk.id, 0.0) + 1.0 / (k + rank)
    all_chunks: dict[UUID, ScoredChunk] = {c.id: c for ranking in rankings for c in ranking}
    return sorted(
        [replace(all_chunks[cid], score=score) for cid, score in scores.items()],
        key=lambda c: c.score,
        reverse=True,
    )


class HybridRetriever:
    """Parallel dense + BM25 retrieval fused with RRF (ADR-0004)."""

    def __init__(
        self,
        dense: DenseRetriever,
        bm25: BM25Retriever,
        rrf_k: int = 60,
    ) -> None:
        self._dense = dense
        self._bm25 = bm25
        self._rrf_k = rrf_k

    async def retrieve(self, query: str, tenant_id: UUID, k: int = 20) -> list[ScoredChunk]:
        dense_hits, bm25_hits = await asyncio.gather(
            self._dense.retrieve(query, tenant_id, k=k * 2),
            self._bm25.retrieve(query, tenant_id, k=k * 2),
        )
        return rrf_fuse([dense_hits, bm25_hits], k=self._rrf_k)[:k]
