from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    model_config = ConfigDict(frozen=True)
    label: str = Field(max_length=128)
    expires_at: datetime | None = None


class ApiKeyRead(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)
    id: UUID
    label: str
    last_used: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime


class ApiKeyCreateResponse(ApiKeyRead):
    """Returned once on creation. plaintext_key never stored after this response."""

    plaintext_key: str
