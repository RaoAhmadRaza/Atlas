"""Tests for POST /v1/documents/upload and GET /v1/documents/{id}/progress — TDD."""

from __future__ import annotations

import io
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def tenant_id() -> UUID:
    return uuid4()


@pytest.fixture
def pdf_bytes() -> bytes:
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Upload API test content.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_upload_returns_202(tenant_id: UUID, pdf_bytes: bytes) -> None:
    from apps.api.main import app

    mock_pool = AsyncMock()
    mock_pool.enqueue_job = AsyncMock(return_value=MagicMock(job_id="fake-job-id"))
    mock_store = AsyncMock()
    mock_store.upload = AsyncMock(return_value="key")
    mock_store.ensure_bucket = AsyncMock()

    with (
        patch(
            "apps.api.routers.documents.ObjectStore.from_env",
            return_value=mock_store,
        ),
        patch(
            "apps.api.routers.documents._get_arq_pool",
            return_value=mock_pool,
        ),
        patch(
            "apps.api.routers.documents._insert_document",
            new_callable=AsyncMock,
            return_value=uuid4(),
        ),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/v1/documents/upload",
                files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
                headers={"X-Tenant-ID": str(tenant_id)},
            )

    assert resp.status_code == 202
    body = resp.json()
    assert "document_id" in body
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_upload_missing_tenant_header(pdf_bytes: bytes) -> None:
    from apps.api.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/v1/documents/upload",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_magic_byte_rejection(tenant_id: UUID) -> None:
    from apps.api.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/v1/documents/upload",
            files={"file": ("fake.pdf", b"not a pdf", "application/pdf")},
            headers={"X-Tenant-ID": str(tenant_id)},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_unsupported_mime(tenant_id: UUID) -> None:
    from apps.api.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/v1/documents/upload",
            files={
                "file": (
                    "bad.exe",
                    b"\x4d\x5a\x90\x00",
                    "application/x-executable",
                )
            },
            headers={"X-Tenant-ID": str(tenant_id)},
        )
    assert resp.status_code == 422
