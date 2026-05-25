from __future__ import annotations

from functools import partial
from uuid import uuid4

from atlas_core.db.session import with_tenant_session
from atlas_core.retrieval.bm25 import BM25Retriever
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from tests.conftest import TenantFixture


async def _insert_text_chunks(
    session: AsyncSession,
    tenant_id: object,
    doc_id: object,
    contents: list[str],
) -> None:
    for i, content in enumerate(contents):
        await session.execute(
            text(
                "INSERT INTO chunks"
                " (id, tenant_id, document_id, content, chunk_index, token_count)"
                " VALUES (:id, :tid, :did, :content, :idx, :tc)"
            ),
            {
                "id": str(uuid4()),
                "tid": str(tenant_id),
                "did": str(doc_id),
                "content": content,
                "idx": i,
                "tc": 40,
            },
        )
    await session.commit()


async def test_bm25_returns_k_results(
    tenant_a: TenantFixture,
    admin_session: AsyncSession,
    admin_engine: AsyncEngine,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    doc_id = uuid4()
    await admin_session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'bm25-test')"),
        {"id": doc_id, "tid": tenant_a.id},
    )
    await admin_session.commit()
    await _insert_text_chunks(
        admin_session,
        tenant_a.id,
        doc_id,
        [f"python programming language tutorial {i}" for i in range(20)],
    )
    async with admin_engine.connect() as conn:
        await conn.execute(text("ANALYZE chunks"))
        await conn.commit()

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    results = await BM25Retriever(conn_factory=conn_factory).retrieve(
        "python programming", tenant_a.id, k=5
    )
    assert len(results) == 5
    assert all(c.score > 0 for c in results)
    assert all(c.token_count == 40 for c in results)


async def test_bm25_rls_isolation(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    admin_session: AsyncSession,
    admin_engine: AsyncEngine,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    doc_id = uuid4()
    await admin_session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'rls-bm25')"),
        {"id": doc_id, "tid": tenant_a.id},
    )
    await admin_session.commit()
    await _insert_text_chunks(
        admin_session,
        tenant_a.id,
        doc_id,
        ["machine learning neural network"] * 5,
    )
    async with admin_engine.connect() as conn:
        await conn.execute(text("ANALYZE chunks"))
        await conn.commit()

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    retriever = BM25Retriever(conn_factory=conn_factory)
    assert len(await retriever.retrieve("machine learning", tenant_a.id, k=5)) > 0
    assert await retriever.retrieve("machine learning", tenant_b.id, k=5) == []


async def test_bm25_no_match_returns_empty(
    tenant_a: TenantFixture,
    admin_session: AsyncSession,
    admin_engine: AsyncEngine,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    doc_id = uuid4()
    await admin_session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'nomatch-bm25')"),
        {"id": doc_id, "tid": tenant_a.id},
    )
    await admin_session.commit()
    await _insert_text_chunks(admin_session, tenant_a.id, doc_id, ["cats dogs pets"] * 3)

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    results = await BM25Retriever(conn_factory=conn_factory).retrieve(
        "zyxwvutsrqponmlkjihgfedcba",  # pragma: allowlist secret
        tenant_a.id,
        k=5,
    )
    assert results == []


async def test_bm25_protocol_structural_typing(
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    from atlas_core.retrieval.protocols import RetrieverProtocol

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    assert isinstance(BM25Retriever(conn_factory=conn_factory), RetrieverProtocol)
