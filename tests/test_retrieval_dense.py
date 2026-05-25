from __future__ import annotations

from functools import partial
from uuid import uuid4

from atlas_core.db.session import with_tenant_session
from atlas_core.embed import MockEmbedder
from atlas_core.retrieval.dense import DenseRetriever
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from tests.conftest import TenantFixture


async def _insert_chunks(
    session: AsyncSession,
    tenant_id: object,
    doc_id: object,
    n: int,
    embedder: MockEmbedder,
) -> None:
    for i in range(n):
        vec = (await embedder.embed_batch([f"chunk content {i}"]))[0]
        vec_str = "[" + ",".join(str(v) for v in vec) + "]"
        await session.execute(
            text(
                "INSERT INTO chunks"
                " (id, tenant_id, document_id, content, embedding, chunk_index, token_count)"
                " VALUES (:id, :tid, :did, :content, CAST(:emb AS vector), :idx, :tc)"
            ),
            {
                "id": str(uuid4()),
                "tid": str(tenant_id),
                "did": str(doc_id),
                "content": f"chunk content {i}",
                "emb": vec_str,
                "idx": i,
                "tc": 50,
            },
        )
    await session.commit()


async def test_dense_returns_k_results(
    tenant_a: TenantFixture,
    admin_session: AsyncSession,
    admin_engine: AsyncEngine,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    doc_id = uuid4()
    await admin_session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'dense-test')"),
        {"id": doc_id, "tid": tenant_a.id},
    )
    await admin_session.commit()

    embedder = MockEmbedder()
    await _insert_chunks(admin_session, tenant_a.id, doc_id, 25, embedder)
    async with admin_engine.connect() as conn:
        await conn.execute(text("ANALYZE chunks"))
        await conn.commit()

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    results = await DenseRetriever(embedder=embedder, conn_factory=conn_factory).retrieve(
        "chunk content 0", tenant_a.id, k=10
    )

    assert len(results) == 10
    assert all(c.score >= 0 for c in results)
    assert all(c.token_count == 50 for c in results)


async def test_dense_rls_isolation(
    tenant_a: TenantFixture,
    tenant_b: TenantFixture,
    admin_session: AsyncSession,
    admin_engine: AsyncEngine,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    doc_id = uuid4()
    await admin_session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'rls-dense')"),
        {"id": doc_id, "tid": tenant_a.id},
    )
    await admin_session.commit()

    embedder = MockEmbedder()
    await _insert_chunks(admin_session, tenant_a.id, doc_id, 10, embedder)
    async with admin_engine.connect() as conn:
        await conn.execute(text("ANALYZE chunks"))
        await conn.commit()

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    retriever = DenseRetriever(embedder=embedder, conn_factory=conn_factory)

    assert len(await retriever.retrieve("chunk content 0", tenant_a.id, k=10)) > 0
    assert await retriever.retrieve("chunk content 0", tenant_b.id, k=10) == []


async def test_dense_fewer_than_k_available(
    tenant_a: TenantFixture,
    admin_session: AsyncSession,
    admin_engine: AsyncEngine,
    app_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    doc_id = uuid4()
    await admin_session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'few-dense')"),
        {"id": doc_id, "tid": tenant_a.id},
    )
    await admin_session.commit()

    embedder = MockEmbedder(seed=99)
    await _insert_chunks(admin_session, tenant_a.id, doc_id, 3, embedder)
    async with admin_engine.connect() as conn:
        await conn.execute(text("ANALYZE chunks"))
        await conn.commit()

    conn_factory = partial(with_tenant_session, session_factory=app_session_factory)
    results = await DenseRetriever(embedder=embedder, conn_factory=conn_factory).retrieve(
        "query", tenant_a.id, k=10
    )
    assert len(results) == 3
