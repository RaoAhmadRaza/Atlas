from __future__ import annotations

import asyncio
from dataclasses import replace
from typing import Any

from atlas_core.retrieval.types import ScoredChunk


class NoopReranker:
    """Pass-through reranker — returns top_n by existing score. Use for A/B eval baseline."""

    async def rerank(
        self, query: str, chunks: list[ScoredChunk], top_n: int = 5
    ) -> list[ScoredChunk]:
        return chunks[:top_n]


class BGEReranker:
    """Cross-encoder reranker using BAAI/bge-reranker-v2-m3 (FlagEmbedding)."""

    MODEL = "BAAI/bge-reranker-v2-m3"

    def __init__(self) -> None:
        from FlagEmbedding import FlagReranker  # lazy: 1GB+ model, not in atlas-core deps

        self._model: Any = FlagReranker(self.MODEL, use_fp16=True)

    async def rerank(
        self, query: str, chunks: list[ScoredChunk], top_n: int = 5
    ) -> list[ScoredChunk]:
        if not chunks:
            return []
        pairs = [[query, c.content] for c in chunks]
        scores: list[float] = await asyncio.to_thread(
            self._model.compute_score, pairs, normalize=True
        )
        reranked = sorted(
            [replace(c, score=float(s)) for c, s in zip(chunks, scores)],
            key=lambda c: c.score,
            reverse=True,
        )
        return reranked[:top_n]


class CohereReranker:
    """Reranker backed by Cohere rerank API."""

    MODEL = "rerank-english-v3.0"

    def __init__(self, api_key: str) -> None:
        import cohere  # lazy: optional dep

        self._client: Any = cohere.AsyncClientV2(api_key)

    async def rerank(
        self, query: str, chunks: list[ScoredChunk], top_n: int = 5
    ) -> list[ScoredChunk]:
        if not chunks:
            return []
        resp = await self._client.rerank(
            model=self.MODEL,
            query=query,
            documents=[c.content for c in chunks],
            top_n=top_n,
        )
        return [replace(chunks[r.index], score=float(r.relevance_score)) for r in resp.results]
