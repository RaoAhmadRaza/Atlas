from uuid import uuid4

import pytest
from atlas_core.db.engine import get_database_url
from atlas_core.db.session import create_session_factory, with_tenant_session
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from tests.conftest import TenantFixture


async def _get_guc(session: AsyncSession, missing_ok: bool = True) -> str:
    row = await session.execute(
        text("SELECT current_setting('app.current_tenant', :ok)"),
        {"ok": missing_ok},
    )
    return str(row.scalar() or "")


# ── Engine tests ──────────────────────────────────────────────────────────────


def test_get_database_url_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL_ADMIN", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_database_url()


def test_get_database_url_present(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x:y@h/db")
    assert get_database_url() == "postgresql+asyncpg://x:y@h/db"


async def test_engine_creates_successfully(app_engine: AsyncEngine) -> None:
    async with app_engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        assert result.scalar() == 1


# ── Session tests ─────────────────────────────────────────────────────────────


async def test_tenant_session_rejects_non_uuid(
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    with pytest.raises(TypeError, match="UUID"):
        async with with_tenant_session(  # type: ignore[arg-type]
            "not-a-uuid", session_factory=app_session_factory
        ):
            pass


async def test_tenant_session_raises_without_factory() -> None:
    from atlas_core.db import session as sess_mod

    original = sess_mod._default_factory
    sess_mod._default_factory = None
    try:
        with pytest.raises(RuntimeError, match="No session factory"):
            async with with_tenant_session(uuid4()):
                pass
    finally:
        sess_mod._default_factory = original


async def test_tenant_session_sets_guc(
    tenant_a: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
        guc = await _get_guc(s)
    assert guc == str(tenant_a.id)


async def test_tenant_session_commits_on_success(
    tenant_a: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
    admin_session: AsyncSession,
) -> None:
    doc_id = uuid4()
    async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
        await s.execute(
            text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'test-doc')"),
            {"id": doc_id, "tid": tenant_a.id},
        )

    # Verify via admin (bypasses RLS)
    row = await admin_session.execute(
        text("SELECT title FROM documents WHERE id = :id"), {"id": doc_id}
    )
    assert row.scalar() == "test-doc"


async def test_tenant_session_rollback_on_exception(
    tenant_a: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
    admin_session: AsyncSession,
) -> None:
    doc_id = uuid4()
    with pytest.raises(RuntimeError, match="boom"):
        async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
            await s.execute(
                text(
                    "INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'rolled-back')"
                ),
                {"id": doc_id, "tid": tenant_a.id},
            )
            raise RuntimeError("boom")

    # Row must not exist
    row = await admin_session.execute(
        text("SELECT COUNT(*) FROM documents WHERE id = :id"), {"id": doc_id}
    )
    assert row.scalar() == 0


async def test_guc_no_leakage_between_sessions(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
    admin_engine: AsyncEngine,
) -> None:
    """GUC from session A must not leak into session B."""
    async with with_tenant_session(tenant_a.id, session_factory=app_session_factory):
        pass  # commits and returns connection to pool

    # New session should have no tenant set
    factory = create_session_factory(admin_engine)
    async with factory() as s:
        guc = await _get_guc(s)
    assert guc == ""
