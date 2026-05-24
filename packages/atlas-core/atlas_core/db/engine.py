import os
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.ext.asyncio import create_async_engine as _create_async_engine


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is required but not set")
    return url


def create_engine(database_url: str, **overrides: object) -> AsyncEngine:  # noqa: ANN401
    params: dict[str, Any] = {
        "pool_size": 20,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_reset_on_return": "rollback",
    }
    params.update(overrides)
    return _create_async_engine(database_url, **params)
