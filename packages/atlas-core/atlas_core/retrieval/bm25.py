from __future__ import annotations

from uuid import UUID

from sqlalchemy import text

from atlas_core.retrieval.protocols import ConnFactory
from atlas_core.retrieval.types import ScoredChunk


class BM25Retriever:
    """Full-text search using PostgreSQL ts_rank_cd with GIN-indexed tsvector."""

    def __init__(self, conn_factory: ConnFactory) -> None:
        self._conn_factory = conn_factory

    async def retrieve(self, query: str, tenant_id: UUID, k: int = 20) -> list[ScoredChunk]:
        async with self._conn_factory(tenant_id) as session:
            result = await session.execute(
                text("""
                    SELECT id, content, metadata, token_count, document_id,
                           ts_rank_cd(content_tsv, plainto_tsquery('english', :q)) AS score
                    FROM chunks
                    WHERE content_tsv @@ plainto_tsquery('english', :q)
                    ORDER BY score DESC
                    LIMIT :k
                """),
                {"q": query, "k": k},
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
