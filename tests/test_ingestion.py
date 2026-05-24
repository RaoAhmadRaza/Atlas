"""Integration tests for the ingestion pipeline — TDD."""

from __future__ import annotations

import io
import os
from uuid import uuid4

import pytest
from atlas_core.storage import ObjectStore

from tests.conftest import TenantFixture


@pytest.fixture
def object_store() -> ObjectStore:
    from atlas_core.storage import ObjectStore

    return ObjectStore(
        endpoint_url=os.environ.get("OBJECT_STORE_ENDPOINT", "http://localhost:9000"),
        bucket=os.environ.get("OBJECT_STORE_BUCKET", "atlas-test"),
        access_key=os.environ.get("OBJECT_STORE_ACCESS_KEY", "atlas"),
        secret_key=os.environ.get("OBJECT_STORE_SECRET_KEY", "atlas-minio-pw"),
    )


@pytest.fixture
def minimal_pdf_bytes() -> bytes:
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Atlas ingestion test document content here.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_ingest_e2e(
    tenant_a: TenantFixture,
    object_store: ObjectStore,
    minimal_pdf_bytes: bytes,
) -> None:
    from atlas_core.db.session import with_tenant_session
    from atlas_core.models.content import Chunk, Document
    from sqlalchemy import select
    from tasks.ingest import ingest_document

    await object_store.ensure_bucket()
    doc_id = uuid4()
    await object_store.upload(f"{tenant_a.id}/{doc_id}", minimal_pdf_bytes)

    async with with_tenant_session(tenant_a.id) as session:
        session.add(
            Document(
                id=doc_id,
                tenant_id=tenant_a.id,
                title="Test PDF",
                mime_type="application/pdf",
                byte_size=len(minimal_pdf_bytes),
                status="pending",
            )
        )

    ctx: dict = {}
    await ingest_document(ctx, doc_id, tenant_a.id)

    async with with_tenant_session(tenant_a.id) as session:
        chunks = (
            (await session.execute(select(Chunk).where(Chunk.document_id == doc_id)))
            .scalars()
            .all()
        )
    assert len(chunks) >= 1
    assert all(c.tenant_id == tenant_a.id for c in chunks)

    async with with_tenant_session(tenant_a.id) as session:
        doc = (await session.execute(select(Document).where(Document.id == doc_id))).scalar_one()
    assert doc.status == "ready"


@pytest.mark.asyncio
async def test_rls_on_chunks(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    object_store: ObjectStore,
    minimal_pdf_bytes: bytes,
) -> None:
    from atlas_core.db.session import with_tenant_session
    from atlas_core.models.content import Chunk, Document
    from sqlalchemy import select
    from tasks.ingest import ingest_document

    await object_store.ensure_bucket()
    doc_id = uuid4()
    await object_store.upload(f"{tenant_a.id}/{doc_id}", minimal_pdf_bytes)

    async with with_tenant_session(tenant_a.id) as session:
        session.add(
            Document(
                id=doc_id,
                tenant_id=tenant_a.id,
                title="RLS Test",
                mime_type="application/pdf",
                byte_size=len(minimal_pdf_bytes),
                status="pending",
            )
        )

    ctx: dict = {}
    await ingest_document(ctx, doc_id, tenant_a.id)

    async with with_tenant_session(tenant_b.id) as session:
        chunks = (
            (await session.execute(select(Chunk).where(Chunk.document_id == doc_id)))
            .scalars()
            .all()
        )
    assert chunks == []


@pytest.mark.asyncio
async def test_status_transitions(
    tenant_a: TenantFixture,
    object_store: ObjectStore,
    minimal_pdf_bytes: bytes,
) -> None:
    from atlas_core.db.session import with_tenant_session
    from atlas_core.models.content import Document
    from sqlalchemy import select
    from tasks.ingest import ingest_document

    await object_store.ensure_bucket()
    doc_id = uuid4()
    await object_store.upload(f"{tenant_a.id}/{doc_id}", minimal_pdf_bytes)

    async with with_tenant_session(tenant_a.id) as session:
        session.add(
            Document(
                id=doc_id,
                tenant_id=tenant_a.id,
                title="Status Test",
                mime_type="application/pdf",
                byte_size=len(minimal_pdf_bytes),
                status="pending",
            )
        )

    ctx: dict = {}
    await ingest_document(ctx, doc_id, tenant_a.id)

    async with with_tenant_session(tenant_a.id) as session:
        doc = (await session.execute(select(Document).where(Document.id == doc_id))).scalar_one()
    assert doc.status == "ready"
