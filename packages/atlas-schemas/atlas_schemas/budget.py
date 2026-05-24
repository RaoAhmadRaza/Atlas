from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BudgetPolicyCreate(BaseModel):
    model_config = ConfigDict(frozen=True)
    daily_usd_limit: Decimal = Field(max_digits=10, decimal_places=2, ge=0)
    monthly_tokens: int = Field(ge=0)
    alert_threshold: Decimal = Field(
        default=Decimal("0.8"), max_digits=3, decimal_places=2, ge=0, le=1
    )


class BudgetPolicyRead(BudgetPolicyCreate):
    model_config = ConfigDict(frozen=True, from_attributes=True)
    id: UUID
    tenant_id: UUID
    created_at: datetime
