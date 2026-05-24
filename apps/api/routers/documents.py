"""Document upload and SSE progress endpoints."""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID, uuid4

from atlas_core.parse import MimeTypeMismatch, _validate_magic
from atlas_core.progress import subscribe_progress
from atlas_core.storage import ObjectStore
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

from apps.api.deps import get_tenant_id

router = APIRouter(prefix="/v1/documents", tags=["documents"])

_ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html",
    "text/markdown",
    "text/plain",
}


def _get_arq_pool(request: Request) -> Any:
    pool = getattr(request.app.state, "arq_pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail="Job queue unavailable")
    return pool


def _get_redis(request: Request) -> object:
    redis = getattr(request.app.state, "redis", None)
    if redis is None:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    return redis


async def _insert_document(
    tenant_id: UUID,
    doc_id: UUID,
    title: str,
    mime_type: str,
    byte_size: int,
    object_key: str,
) -> UUID:
    from atlas_core.db.session import with_tenant_session
    from atlas_core.models.content import Document

    async with with_tenant_session(tenant_id) as session:
        session.add(
            Document(
                id=doc_id,
                tenant_id=tenant_id,
                title=title,
                mime_type=mime_type,
                byte_size=byte_size,
                source_uri=object_key,
                status="pending",
            )
        )
    return doc_id


@router.post("/upload", status_code=202)
async def upload_document(
    request: Request,
    file: UploadFile,
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict[str, str]:
    mime = file.content_type or "application/octet-stream"

    if mime not in _ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported MIME type: {mime}")

    raw = await file.read()

    try:
        _validate_magic(raw, mime)
    except MimeTypeMismatch as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    doc_id = uuid4()
    store = ObjectStore.from_env()
    await store.ensure_bucket()
    object_key = f"{tenant_id}/{doc_id}"
    await store.upload(object_key, raw)

    await _insert_document(
        tenant_id=tenant_id,
        doc_id=doc_id,
        title=file.filename or "untitled",
        mime_type=mime,
        byte_size=len(raw),
        object_key=object_key,
    )

    pool = _get_arq_pool(request)
    job = await pool.enqueue_job("ingest_document", doc_id, tenant_id)

    return {
        "document_id": str(doc_id),
        "job_id": getattr(job, "job_id", str(uuid4())),
        "status": "pending",
    }


@router.get("/{document_id}/progress")
async def document_progress(
    document_id: UUID,
    request: Request,
    tenant_id: UUID = Depends(get_tenant_id),
) -> StreamingResponse:
    redis = _get_redis(request)

    async def _stream() -> AsyncGenerator[str, None]:
        async for msg in subscribe_progress(redis, document_id):
            yield f"data: {msg}\n\n"
            try:
                if json.loads(msg).get("stage") in ("done", "error"):
                    break
            except (json.JSONDecodeError, AttributeError):
                pass

    return StreamingResponse(_stream(), media_type="text/event-stream")
