from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from atlas_core.db.base import Base, TenantScopedMixin, UpdatedAtMixin


class Conversation(Base, TenantScopedMixin, UpdatedAtMixin):
    __tablename__ = "conversations"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str | None] = mapped_column(nullable=True)


class Message(Base, TenantScopedMixin):
    __tablename__ = "messages"
    __table_args__ = (CheckConstraint("role IN ('user','assistant','system')", name="role_values"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default="[]")
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
