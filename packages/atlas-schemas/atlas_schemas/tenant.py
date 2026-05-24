from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from atlas_schemas.common import PlanLiteral


class TenantBase(BaseModel):
    model_config = ConfigDict(frozen=True)
    slug: str = Field(min_length=3, max_length=64, pattern=r"^[a-z0-9-]+$")
    plan: PlanLiteral = "free"


class TenantCreate(TenantBase):
    pass


class TenantRead(TenantBase):
    model_config = ConfigDict(frozen=True, from_attributes=True)
    id: UUID
    created_at: datetime


class TenantUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)
    plan: PlanLiteral | None = None
