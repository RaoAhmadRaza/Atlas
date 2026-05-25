from __future__ import annotations

from uuid import UUID

from sqlalchemy import text

from atlas_core.embed import Embedder
from atlas_core.retrieval.protocols import ConnFactory
from atlas_core.retrieval.types import ScoredChunk


class DenseRetriever:
    """Vector similarity search using pgvector HNSW cosine index."""

    def __init__(self, embedder: Embedder, conn_factory: ConnFactory) -> None:
        self._embedder = embedder
        self._conn_factory = conn_factory

    async def retrieve(self, query: str, tenant_id: UUID, k: int = 20) -> list[ScoredChunk]:
        qvec = (await self._embedder.embed_batch([query]))[0]
        qvec_str = "[" + ",".join(str(v) for v in qvec) + "]"
        async with self._conn_factory(tenant_id) as session:
            result = await session.execute(
                text("""
                    SELECT id, content, metadata, token_count, document_id,
                           1 - (embedding <=> :qvec::vector) AS score
                    FROM chunks
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> :qvec::vector
                    LIMIT :k
                """),
                {"qvec": qvec_str, "k": k},
            )
            rows = result.fetchall()
        return [
            ScoredChunk(
                id=row.id,
                content=row.content,
                metadata=row.metadata,
                score=float(row.score),
                token_count=int(row.token_count),
                document_id=row.document_id,
            )
            for row in rows
        ]
