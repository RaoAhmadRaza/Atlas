"""Add eval_question_results table.

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-26
"""

from __future__ import annotations

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

_TENANT_SCOPED = "eval_question_results"


def upgrade() -> None:
    op.execute("""
        CREATE TABLE eval_question_results (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            eval_run_id       UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
            question_id       TEXT NOT NULL,
            question          TEXT NOT NULL,
            expected_answer   TEXT,
            retrieved_doc_ids JSONB NOT NULL DEFAULT '[]',
            relevant_doc_ids  JSONB NOT NULL DEFAULT '[]',
            recall_at_5       NUMERIC(5,4),
            recall_at_10      NUMERIC(5,4),
            mrr_score         NUMERIC(5,4),
            ndcg_at_10        NUMERIC(5,4),
            faithfulness      NUMERIC(5,4),
            latency_ms        INTEGER,
            cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
            generated_answer  TEXT,
            error             TEXT,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX eqr_tenant_id ON eval_question_results(tenant_id)")
    op.execute("CREATE INDEX eqr_run_id ON eval_question_results(eval_run_id)")
    op.execute(
        "CREATE INDEX eqr_failures ON eval_question_results(eval_run_id, recall_at_5) "
        "WHERE recall_at_5 < 0.5"
    )
    op.execute(f"ALTER TABLE {_TENANT_SCOPED} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {_TENANT_SCOPED} FORCE ROW LEVEL SECURITY")
    op.execute(f"""
        CREATE POLICY tenant_isolation ON {_TENANT_SCOPED}
        USING (tenant_id = current_setting('app.current_tenant')::uuid)
    """)


def downgrade() -> None:
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {_TENANT_SCOPED}")
    op.execute(f"ALTER TABLE {_TENANT_SCOPED} DISABLE ROW LEVEL SECURITY")
    op.execute("DROP TABLE IF EXISTS eval_question_results")
