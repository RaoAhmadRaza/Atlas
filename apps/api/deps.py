"""FastAPI dependency providers."""

from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException, Request


async def get_tenant_id(x_tenant_id: UUID = Header(...)) -> UUID:
    return x_tenant_id


def get_redis(request: Request) -> object:
    redis = getattr(request.app.state, "redis", None)
    if redis is None:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    return redis


def get_arq_pool(request: Request) -> object:
    pool = getattr(request.app.state, "arq_pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail="Job queue unavailable")
    return pool
