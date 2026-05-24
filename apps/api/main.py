from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from atlas_core.db.engine import create_engine, get_database_url
from atlas_core.db.session import create_session_factory, init_default_factory
from fastapi import FastAPI
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    yield
    await engine.dispose()


app = FastAPI(title="Atlas API", version="0.1.0", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
async def readyz() -> dict[str, str]:
    return {"status": "ok"}
