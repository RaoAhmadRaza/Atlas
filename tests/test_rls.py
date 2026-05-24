from uuid import uuid4

import pytest
from atlas_core.db.session import with_tenant_session
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from tests.conftest import TenantFixture

_TENANT_SCOPED_TABLES = [
    "users",
    "api_keys",
    "budget_policies",
    "documents",
    "chunks",
    "conversations",
    "messages",
    "usage_events",
    "eval_runs",
]


async def _insert_doc(session: AsyncSession, tenant_id: object, title: str = "doc") -> object:
    doc_id = uuid4()
    await session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, :title)"),
        {"id": doc_id, "tid": tenant_id, "title": title},
    )
    return doc_id


async def test_rls_isolation(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
        await _insert_doc(s, tenant_a.id, "alpha-doc")

    async with with_tenant_session(tenant_b.id, session_factory=app_session_factory) as s:
        rows = (await s.execute(text("SELECT id FROM documents"))).all()
    assert len(rows) == 0


async def test_rls_owner_read(
    tenant_a: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
        await _insert_doc(s, tenant_a.id, "my-doc")

    async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
        rows = (await s.execute(text("SELECT tenant_id FROM documents"))).all()
    assert len(rows) == 1
    assert rows[0][0] == tenant_a.id


async def test_rls_blocks_insert_wrong_tenant(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    from sqlalchemy.exc import DBAPIError

    with pytest.raises(DBAPIError):
        async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
            # WITH CHECK rejects: tenant_id != current_setting
            await s.execute(
                text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'hijack')"),
                {"id": uuid4(), "tid": tenant_b.id},
            )


async def test_rls_blocks_update_cross_tenant(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
    admin_session: AsyncSession,
) -> None:
    doc_id = uuid4()
    async with admin_session.begin():
        await admin_session.execute(
            text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'original')"),
            {"id": doc_id, "tid": tenant_a.id},
        )

    async with with_tenant_session(tenant_b.id, session_factory=app_session_factory) as s:
        result = await s.execute(
            text("UPDATE documents SET title='hijacked' WHERE id=:id"),
            {"id": doc_id},
        )
    assert result.rowcount == 0

    row = await admin_session.execute(
        text("SELECT title FROM documents WHERE id=:id"), {"id": doc_id}
    )
    assert row.scalar() == "original"


async def test_rls_blocks_delete_cross_tenant(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
    admin_session: AsyncSession,
) -> None:
    doc_id = uuid4()
    async with admin_session.begin():
        await admin_session.execute(
            text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'safe')"),
            {"id": doc_id, "tid": tenant_a.id},
        )

    async with with_tenant_session(tenant_b.id, session_factory=app_session_factory) as s:
        result = await s.execute(text("DELETE FROM documents WHERE id=:id"), {"id": doc_id})
    assert result.rowcount == 0


async def test_rls_superuser_bypass(
    tenant_a: TenantFixture,
    app_session_factory: async_sessionmaker[AsyncSession],
    admin_engine: AsyncEngine,
    admin_session: AsyncSession,
) -> None:
    async with with_tenant_session(tenant_a.id, session_factory=app_session_factory) as s:
        await _insert_doc(s, tenant_a.id, "visible-to-admin")

    # Admin sees row without setting GUC
    row = await admin_session.execute(
        text("SELECT COUNT(*) FROM documents WHERE tenant_id=:tid"),
        {"tid": tenant_a.id},
    )
    assert (row.scalar() or 0) >= 1


@pytest.mark.parametrize("table", _TENANT_SCOPED_TABLES)
async def test_rls_enabled_on_all_tenant_tables(
    table: str,
    admin_session: AsyncSession,
) -> None:
    row = await admin_session.execute(
        text("SELECT relrowsecurity FROM pg_class WHERE relname = :tbl AND relkind = 'r'"),
        {"tbl": table},
    )
    assert row.scalar() is True, f"RLS not enabled on {table}"
