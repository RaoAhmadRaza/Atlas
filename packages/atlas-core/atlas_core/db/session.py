from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

_default_factory: async_sessionmaker[AsyncSession] | None = None


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    return factory


def init_default_factory(engine: AsyncEngine) -> None:
    global _default_factory
    _default_factory = create_session_factory(engine)


@asynccontextmanager
async def with_tenant_session(
    tenant_id: UUID,
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> AsyncIterator[AsyncSession]:
    if not isinstance(tenant_id, UUID):
        raise TypeError(f"tenant_id must be a UUID, got {type(tenant_id).__name__}")

    factory = session_factory or _default_factory
    if factory is None:
        raise RuntimeError("No session factory configured. Call init_default_factory() first.")

    async with factory() as session:
        async with session.begin():
            # asyncpg rejects $1 params in SET statements; UUID is hex+hyphens only
            await session.execute(text(f"SET LOCAL app.current_tenant = '{tenant_id!s}'"))
            yield session
