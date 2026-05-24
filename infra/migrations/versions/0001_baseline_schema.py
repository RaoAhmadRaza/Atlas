"""baseline schema

Revision ID: 0001
Revises:
Create Date: 2026-05-24

"""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

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


def upgrade() -> None:
    # ── Extensions ────────────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    # ── Tables ────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE tenants (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug        TEXT NOT NULL UNIQUE,
            plan        TEXT NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free','pro','enterprise')),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE users (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            email       TEXT NOT NULL,
            role        TEXT NOT NULL DEFAULT 'member'
                        CHECK (role IN ('owner','admin','member')),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(tenant_id, email)
        )
    """)

    op.execute("""
        CREATE TABLE api_keys (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            key_hash    TEXT NOT NULL UNIQUE,
            label       TEXT NOT NULL,
            last_used   TIMESTAMPTZ,
            expires_at  TIMESTAMPTZ,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE budget_policies (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            daily_usd_limit NUMERIC(10,2),
            monthly_tokens  BIGINT,
            alert_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.8,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE documents (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            title       TEXT NOT NULL,
            source_uri  TEXT,
            mime_type   TEXT NOT NULL DEFAULT 'text/plain',
            status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','ready','failed')),
            byte_size   BIGINT NOT NULL DEFAULT 0,
            created_by  UUID REFERENCES users(id),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE chunks (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            content     TEXT NOT NULL,
            content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
            embedding   VECTOR(1024),
            chunk_index INT NOT NULL,
            token_count INT NOT NULL DEFAULT 0,
            metadata    JSONB NOT NULL DEFAULT '{}',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE conversations (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id     UUID REFERENCES users(id),
            title       TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE messages (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
            content         TEXT NOT NULL,
            citations       JSONB NOT NULL DEFAULT '[]',
            token_count     INT NOT NULL DEFAULT 0,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE usage_events (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            event_type  TEXT NOT NULL,
            tokens_in   INT NOT NULL DEFAULT 0,
            tokens_out  INT NOT NULL DEFAULT 0,
            cost_usd    NUMERIC(10,6) NOT NULL DEFAULT 0,
            meta        JSONB NOT NULL DEFAULT '{}',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE eval_runs (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            config      JSONB NOT NULL,
            metrics     JSONB NOT NULL DEFAULT '{}',
            status      TEXT NOT NULL DEFAULT 'pending',
            started_at  TIMESTAMPTZ,
            finished_at TIMESTAMPTZ,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # ── Indexes ───────────────────────────────────────────────────────────────
    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw ON chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
    """)
    op.execute("CREATE INDEX ix_chunks_content_tsv ON chunks USING gin (content_tsv)")
    op.execute("CREATE INDEX ix_documents_tenant_status ON documents (tenant_id, status)")
    op.execute("CREATE INDEX ix_chunks_document_id ON chunks (document_id)")
    op.execute(
        "CREATE INDEX ix_messages_conversation_created " "ON messages (conversation_id, created_at)"
    )
    op.execute(
        "CREATE INDEX ix_usage_events_tenant_created " "ON usage_events (tenant_id, created_at)"
    )

    # Tenant FK indexes (not auto-created by Postgres for FK columns)
    for tbl in _TENANT_SCOPED_TABLES:
        op.execute(f"CREATE INDEX ix_{tbl}_tenant_id ON {tbl} (tenant_id)")

    # ── Row-Level Security ────────────────────────────────────────────────────
    for tbl in _TENANT_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {tbl}
                FOR ALL
                USING (
                    tenant_id = current_setting('app.current_tenant', true)::uuid
                )
                WITH CHECK (
                    tenant_id = current_setting('app.current_tenant', true)::uuid
                )
        """)


def downgrade() -> None:
    # Drop policies
    for tbl in reversed(_TENANT_SCOPED_TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {tbl}")
        op.execute(f"ALTER TABLE {tbl} DISABLE ROW LEVEL SECURITY")

    # Drop indexes
    op.execute("DROP INDEX IF EXISTS ix_chunks_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS ix_chunks_content_tsv")
    op.execute("DROP INDEX IF EXISTS ix_documents_tenant_status")
    op.execute("DROP INDEX IF EXISTS ix_chunks_document_id")
    op.execute("DROP INDEX IF EXISTS ix_messages_conversation_created")
    op.execute("DROP INDEX IF EXISTS ix_usage_events_tenant_created")
    for tbl in _TENANT_SCOPED_TABLES:
        op.execute(f"DROP INDEX IF EXISTS ix_{tbl}_tenant_id")

    # Drop tables (reverse FK order)
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
        "tenants",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {tbl}")
