import asyncio
import os
from dataclasses import dataclass
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from atlas_core.db.engine import create_engine
from atlas_core.db.session import create_session_factory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

_DEFAULT_ADMIN_URL = (
    "postgresql+asyncpg://atlas_admin:test@localhost:5432/atlas_test"  # pragma: allowlist secret
)
_DEFAULT_APP_URL = (
    "postgresql+asyncpg://atlas:test@localhost:5432/atlas_test"  # pragma: allowlist secret
)


@dataclass(frozen=True)
class TenantFixture:
    id: UUID
    slug: str


def _get_admin_url() -> str:
    return os.environ.get("DATABASE_URL_ADMIN") or os.environ.get(
        "DATABASE_URL", _DEFAULT_ADMIN_URL
    )


def _get_app_url() -> str:
    return os.environ.get("DATABASE_URL", _DEFAULT_APP_URL)


@pytest_asyncio.fixture(scope="session")
async def admin_engine() -> AsyncEngine:  # type: ignore[misc]
    engine = create_engine(_get_admin_url())
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def app_engine() -> AsyncEngine:  # type: ignore[misc]
    engine = create_engine(_get_app_url())
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _migrated_schema(admin_engine: AsyncEngine) -> None:  # type: ignore[misc]
    # When no DB is reachable (e.g. local unit-test runs without docker compose),
    # yield without migrating. DB-dependent tests will fail with a connection error.
    try:
        async with admin_engine.connect() as conn:
            row = await conn.execute(
                text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname='atlas'")
            )
            result = row.one_or_none()
            if result is not None:
                assert result[0] is False and result[1] is False, (
                    "atlas role must be NOSUPERUSER NOBYPASSRLS — RLS tests would be meaningless"
                )
    except Exception:
        yield
        return

    cfg = Config("infra/migrations/alembic.ini")
    await asyncio.to_thread(command.upgrade, cfg, "head")
    yield
    await asyncio.to_thread(command.downgrade, cfg, "base")


@pytest_asyncio.fixture
async def admin_session(admin_engine: AsyncEngine) -> AsyncSession:  # type: ignore[misc]
    factory: async_sessionmaker[AsyncSession] = create_session_factory(admin_engine)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture
async def db_clean(admin_engine: AsyncEngine) -> None:  # type: ignore[misc]
    yield
    async with admin_engine.connect() as conn:
        await conn.execute(text("SET session_replication_role = replica"))
        for tbl in [
            "eval_runs",
            "usage_events",
            "messages",
            "conversations",
            "chunks",
            "documents",
            "budget_policies",
            "api_keys",
            "users",
        ]:
            await conn.execute(text(f"TRUNCATE TABLE {tbl} RESTART IDENTITY CASCADE"))
        await conn.execute(text("TRUNCATE TABLE tenants RESTART IDENTITY CASCADE"))
        await conn.execute(text("SET session_replication_role = DEFAULT"))
        await conn.commit()


@pytest_asyncio.fixture
async def tenant_a(admin_engine: AsyncEngine, db_clean: None) -> TenantFixture:  # type: ignore[misc]
    tid = uuid4()
    async with admin_engine.connect() as conn:
        await conn.execute(
            text("INSERT INTO tenants (id, slug, plan) VALUES (:id, :slug, 'free')"),
            {"id": tid, "slug": f"tenant-a-{tid.hex[:8]}"},
        )
        await conn.commit()
    return TenantFixture(id=tid, slug=f"tenant-a-{tid.hex[:8]}")


@pytest_asyncio.fixture
async def tenant_b(admin_engine: AsyncEngine, db_clean: None) -> TenantFixture:  # type: ignore[misc]
    tid = uuid4()
    async with admin_engine.connect() as conn:
        await conn.execute(
            text("INSERT INTO tenants (id, slug, plan) VALUES (:id, :slug, 'free')"),
            {"id": tid, "slug": f"tenant-b-{tid.hex[:8]}"},
        )
        await conn.commit()
    return TenantFixture(id=tid, slug=f"tenant-b-{tid.hex[:8]}")


@pytest.fixture
def app_session_factory(app_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return create_session_factory(app_engine)
