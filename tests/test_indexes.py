import json
import random
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from tests.conftest import TenantFixture


async def _random_vec(dim: int = 1024) -> list[float]:
    return [random.gauss(0, 1) for _ in range(dim)]


async def test_hnsw_index_exists(admin_session: AsyncSession) -> None:
    row = await admin_session.execute(
        text(
            "SELECT indexname FROM pg_indexes "
            "WHERE tablename='chunks' AND indexname='ix_chunks_embedding_hnsw'"
        )
    )
    assert row.scalar() == "ix_chunks_embedding_hnsw"


async def test_bm25_index_exists(admin_session: AsyncSession) -> None:
    row = await admin_session.execute(
        text(
            "SELECT indexname FROM pg_indexes "
            "WHERE tablename='chunks' AND indexname='ix_chunks_content_tsv'"
        )
    )
    assert row.scalar() == "ix_chunks_content_tsv"


async def test_hnsw_index_used_in_query_plan(
    tenant_a: TenantFixture,
    admin_engine: AsyncEngine,
    admin_session: AsyncSession,
) -> None:
    # Insert a document first
    doc_id = uuid4()
    await admin_session.execute(
        text("INSERT INTO documents (id, tenant_id, title) VALUES (:id, :tid, 'idx-test')"),
        {"id": doc_id, "tid": tenant_a.id},
    )
    await admin_session.commit()

    # Insert 200 chunks with random embeddings
    rows = [
        {
            "id": str(uuid4()),
            "tid": str(tenant_a.id),
            "did": str(doc_id),
            "content": f"chunk content number {i}",
            "emb": "[" + ",".join(str(x) for x in await _random_vec()) + "]",
            "idx": i,
        }
        for i in range(200)
    ]
    for r in rows:
        await admin_session.execute(
            text(
                "INSERT INTO chunks (id, tenant_id, document_id, content, embedding, chunk_index) "
                "VALUES (:id, :tid, :did, :content, :emb::vector, :idx)"
            ),
            r,
        )
    await admin_session.commit()

    # Update planner stats
    async with admin_engine.connect() as conn:
        await conn.execute(text("ANALYZE chunks"))
        await conn.commit()

    query_vec = "[" + ",".join(str(x) for x in await _random_vec()) + "]"
    row = await admin_session.execute(
        text(
            "EXPLAIN (ANALYZE, FORMAT JSON) "
            "SELECT id FROM chunks ORDER BY embedding <=> :qvec::vector LIMIT 10"
        ),
        {"qvec": query_vec},
    )
    plan_json = row.scalar()
    plan_str = json.dumps(plan_json)
    assert "ix_chunks_embedding_hnsw" in plan_str, f"HNSW index not used in plan: {plan_str[:500]}"
