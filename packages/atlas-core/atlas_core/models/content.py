from datetime import datetime
from typing import Any
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, Computed, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from atlas_core.db.base import Base, TenantScopedMixin, UpdatedAtMixin


class Document(Base, TenantScopedMixin, UpdatedAtMixin):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','processing','ready','failed')", name="status_values"
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    title: Mapped[str] = mapped_column(nullable=False)
    source_uri: Mapped[str | None] = mapped_column(nullable=True)
    mime_type: Mapped[str] = mapped_column(nullable=False, server_default="text/plain")
    status: Mapped[str] = mapped_column(nullable=False, server_default="pending")
    byte_size: Mapped[int] = mapped_column(nullable=False, server_default="0")
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class Chunk(Base, TenantScopedMixin):
    __tablename__ = "chunks"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    document_id: Mapped[UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_tsv: Mapped[Any] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('english', content)", persisted=True),
        nullable=False,
    )
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024), nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    token_count: Mapped[int] = mapped_column(nullable=False, server_default="0")
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(server_default="now()", nullable=False)
