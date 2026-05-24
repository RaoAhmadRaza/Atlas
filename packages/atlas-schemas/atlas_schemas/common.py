from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

PlanLiteral = Literal["free", "pro", "enterprise"]
RoleLiteral = Literal["owner", "admin", "member"]
DocStatusLiteral = Literal["pending", "processing", "ready", "failed"]
MessageRoleLiteral = Literal["user", "assistant", "system"]

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(frozen=True)
    success: bool
    data: T | None = None
    error: str | None = None
    meta: dict[str, object] | None = None


class PaginationParams(BaseModel):
    model_config = ConfigDict(frozen=True)
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class ErrorResponse(BaseModel):
    model_config = ConfigDict(frozen=True)
    code: str
    message: str
    details: dict[str, object] | None = None
