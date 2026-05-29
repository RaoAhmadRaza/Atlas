from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from atlas_core.db.base import Base, TenantScopedMixin


class UsageEvent(Base, TenantScopedMixin):
    __tablename__ = "usage_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_in: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    tokens_out: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False, server_default="0")
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")


class EvalRun(Base, TenantScopedMixin):
    __tablename__ = "eval_runs"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    status: Mapped[str] = mapped_column(nullable=False, server_default="pending")
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)


class BudgetPolicy(Base, TenantScopedMixin):
    __tablename__ = "budget_policies"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    daily_usd_limit: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    monthly_tokens: Mapped[int | None] = mapped_column(nullable=True)
    alert_threshold: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), nullable=False, server_default="0.8"
    )


class EvalQuestionResult(Base, TenantScopedMixin):
    __tablename__ = "eval_question_results"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    eval_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("eval_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(Text, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    retrieved_doc_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default="[]")
    relevant_doc_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default="[]")
    recall_at_5: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    recall_at_10: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    mrr_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    ndcg_at_10: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    faithfulness: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False, server_default="0")
    generated_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
