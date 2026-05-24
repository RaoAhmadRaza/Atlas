from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from atlas_core.db.base import Base, TenantScopedMixin, TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"
    __table_args__ = (CheckConstraint("plan IN ('free','pro','enterprise')", name="plan_values"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    slug: Mapped[str] = mapped_column(nullable=False, unique=True)
    plan: Mapped[str] = mapped_column(nullable=False, server_default="free")


class User(Base, TenantScopedMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email"),
        CheckConstraint("role IN ('owner','admin','member')", name="role_values"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    email: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(nullable=False, server_default="member")


class ApiKey(Base, TenantScopedMixin):
    __tablename__ = "api_keys"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default="gen_random_uuid()")
    key_hash: Mapped[str] = mapped_column(nullable=False, unique=True)
    label: Mapped[str] = mapped_column(nullable=False)
    last_used: Mapped[datetime | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
