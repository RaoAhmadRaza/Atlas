"""Redis pub/sub helpers for SSE ingestion progress."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from uuid import UUID


def _channel(doc_id: UUID) -> str:
    return f"progress:{doc_id}"


async def publish_progress(
    redis: object,
    doc_id: UUID,
    stage: str,
    pct: int,
    **extra: object,
) -> None:
    payload = json.dumps({"stage": stage, "pct": pct, **extra})
    await redis.publish(_channel(doc_id), payload)  # type: ignore[attr-defined]


async def subscribe_progress(
    redis: object,
    doc_id: UUID,
) -> AsyncIterator[str]:
    async with redis.pubsub() as ps:  # type: ignore[attr-defined]
        await ps.subscribe(_channel(doc_id))
        async for raw in ps.listen():
            if raw["type"] != "message":
                continue
            data: str = raw["data"]
            yield data
            try:
                if json.loads(data).get("stage") in ("done", "error"):
                    break
            except (json.JSONDecodeError, AttributeError):
                pass
