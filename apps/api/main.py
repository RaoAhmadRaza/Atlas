from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import arq
import redis.asyncio as aioredis
from atlas_core.db.engine import create_engine, get_database_url
from atlas_core.db.session import create_session_factory, init_default_factory
from fastapi import FastAPI
from pydantic_settings import BaseSettings, SettingsConfigDict

from apps.api.routers.documents import router as documents_router
from apps.api.routers.query import router as query_router


class Settings(BaseSettings):
    model_config = SettingsConfigDict(frozen=True, env_file=".env", extra="ignore")
    database_url: str = "postgresql+asyncpg://atlas:atlas@localhost:5432/atlas"
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"
    log_level: str = "INFO"


settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    engine = create_engine(get_database_url())
    factory = create_session_factory(engine)
    init_default_factory(engine)
    app.state.db_engine = engine
    app.state.db_factory = factory

    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)  # type: ignore[no-untyped-call]
    app.state.redis = redis_client

    arq_pool = await arq.create_pool(arq.connections.RedisSettings.from_dsn(settings.redis_url))
    app.state.arq_pool = arq_pool

    yield

    await arq_pool.close()
    await redis_client.aclose()
    await engine.dispose()


app = FastAPI(title="Atlas API", version="0.1.0", lifespan=lifespan)
app.include_router(documents_router)
app.include_router(query_router)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
async def readyz() -> dict[str, str]:
    return {"status": "ok"}
