from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from atlas_core.models.ops import BudgetPolicy, UsageEvent
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class BudgetExceeded(Exception):
    """Raised when tenant daily spend exceeds their budget policy."""


@dataclass(frozen=True)
class CostSummary:
    tokens_in: int
    tokens_out: int
    usd: float
    meta: dict[str, object]


def _today_key(tenant_id: UUID) -> str:
    return f"budget:{tenant_id}:{date.today().isoformat()}"


async def track_cost(
    tenant_id: UUID,
    cost: CostSummary,
    redis: Any,
    session: AsyncSession,
) -> None:
    session.add(
        UsageEvent(
            tenant_id=tenant_id,
            event_type="query",
            tokens_in=cost.tokens_in,
            tokens_out=cost.tokens_out,
            cost_usd=Decimal(str(cost.usd)),
            meta=cost.meta,
        )
    )
    await session.flush()

    key = _today_key(tenant_id)
    daily_spend: float = await redis.incrbyfloat(key, cost.usd)
    await redis.expire(key, 86_400)
    policy = (
        await session.execute(select(BudgetPolicy).where(BudgetPolicy.tenant_id == tenant_id))
    ).scalar_one_or_none()

    if policy and policy.daily_usd_limit is not None:
        if Decimal(str(daily_spend)) > policy.daily_usd_limit:
            raise BudgetExceeded(
                f"Daily limit ${policy.daily_usd_limit} exceeded (spent ${daily_spend:.4f})"
            )
