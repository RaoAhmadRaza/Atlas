from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from atlas_schemas.common import RoleLiteral


class UserBase(BaseModel):
    model_config = ConfigDict(frozen=True)
    email: EmailStr
    role: RoleLiteral = "member"


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    model_config = ConfigDict(frozen=True, from_attributes=True)
    id: UUID
    tenant_id: UUID
    created_at: datetime
