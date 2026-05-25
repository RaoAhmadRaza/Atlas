from __future__ import annotations

from uuid import UUID

from atlas_core.models.chat import Conversation, Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.orchestrator.cost import CostSummary
from apps.api.orchestrator.state import Citation


async def fetch_history(
    conversation_id: UUID,
    tenant_id: UUID,
    session: AsyncSession,
    n: int = 3,
) -> list[Message]:
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .limit(n)
    )
    return list(reversed(result.scalars().all()))


async def ensure_conversation(
    conversation_id: UUID | None,
    tenant_id: UUID,
    session: AsyncSession,
) -> UUID:
    if conversation_id is not None:
        return conversation_id
    conv = Conversation(tenant_id=tenant_id)
    session.add(conv)
    await session.flush()
    return UUID(str(conv.id))


async def insert_messages(
    conversation_id: UUID,
    tenant_id: UUID,
    session: AsyncSession,
    user_msg: str,
    assistant_msg: str,
    citations: list[Citation],
    cost: CostSummary,
) -> None:
    session.add(
        Message(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role="user",
            content=user_msg,
            citations=[],
            token_count=cost.tokens_in,
        )
    )
    session.add(
        Message(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role="assistant",
            content=assistant_msg,
            citations=list(citations),
            token_count=cost.tokens_out,
        )
    )
    await session.flush()
