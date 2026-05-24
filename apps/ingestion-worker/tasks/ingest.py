"""arq task: full document ingestion pipeline."""

from __future__ import annotations

import os
from uuid import UUID

from atlas_core.chunk import ChunkResult, chunk
from atlas_core.db.session import with_tenant_session
from atlas_core.embed import Embedder, MockEmbedder
from atlas_core.parse import parse
from atlas_core.progress import publish_progress
from atlas_core.storage import ObjectStore
from sqlalchemy.ext.asyncio import AsyncSession


def _get_embedder() -> Embedder:
    if os.environ.get("ENVIRONMENT") == "test":
        return MockEmbedder()
    from embedders import BGEEmbedder

    return BGEEmbedder()


async def ingest_document(ctx: dict[str, object], document_id: UUID, tenant_id: UUID) -> None:
    redis = ctx.get("redis")
    store = ObjectStore.from_env()
    embedder = _get_embedder()

    async with with_tenant_session(tenant_id) as session:
        await _set_status(session, document_id, "processing")

    raw = await store.download(f"{tenant_id}/{document_id}")
    mime = await _get_mime(tenant_id, document_id)

    text = parse(raw, mime)
    if redis:
        await publish_progress(redis, document_id, "parse", 10)

    chunks = chunk(text, strategy="recursive_token", size=512, overlap=64)
    if redis:
        await publish_progress(redis, document_id, "chunk", 30)

    embeddings = await embedder.embed_batch([c.text for c in chunks])
    if redis:
        await publish_progress(redis, document_id, "embed", 60)

    async with with_tenant_session(tenant_id) as session:
        await _bulk_insert_chunks(session, tenant_id, document_id, chunks, embeddings)
    if redis:
        await publish_progress(redis, document_id, "insert", 90)

    async with with_tenant_session(tenant_id) as session:
        await _set_status(session, document_id, "ready")
    if redis:
        await publish_progress(redis, document_id, "done", 100, chunk_count=len(chunks))


async def _set_status(session: AsyncSession, document_id: UUID, status: str) -> None:
    from atlas_core.models.content import Document
    from sqlalchemy import update

    await session.execute(update(Document).where(Document.id == document_id).values(status=status))


async def _get_mime(tenant_id: UUID, document_id: UUID) -> str:
    from atlas_core.models.content import Document
    from sqlalchemy import select

    async with with_tenant_session(tenant_id) as session:
        return (
            await session.execute(select(Document.mime_type).where(Document.id == document_id))
        ).scalar_one()


async def _bulk_insert_chunks(
    session: AsyncSession,
    tenant_id: UUID,
    document_id: UUID,
    chunks: list[ChunkResult],
    embeddings: list[list[float]],
) -> None:
    from uuid import uuid4

    from atlas_core.models.content import Chunk

    session.add_all(
        [
            Chunk(
                id=uuid4(),
                tenant_id=tenant_id,
                document_id=document_id,
                content=c.text,
                embedding=emb,
                chunk_index=i,
                token_count=c.token_count,
                metadata_=c.metadata,
            )
            for i, (c, emb) in enumerate(zip(chunks, embeddings))
        ]
    )
