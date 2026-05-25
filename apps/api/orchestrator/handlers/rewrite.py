from __future__ import annotations

import json

import anthropic
from langchain_core.runnables import RunnableConfig

from apps.api.orchestrator.conversation import fetch_history
from apps.api.orchestrator.state import QueryState, _sse_queue_var


async def rewrite_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:
    queue = _sse_queue_var.get(None)
    if queue is not None:
        await queue.put(json.dumps({"type": "stage", "stage": "rewrite"}))

    conn_factory = config["configurable"]["conn_factory"]
    llm_client: anthropic.AsyncAnthropic = config["configurable"]["llm_client"]

    history_text = ""
    conv_id = state.get("conversation_id")
    if conv_id is not None:
        async with conn_factory(state["tenant_id"]) as session:
            msgs = await fetch_history(conv_id, state["tenant_id"], session)
        if msgs:
            history_text = "\n".join(f"{m.role}: {m.content}" for m in msgs)

    content = state["query"]
    if history_text:
        content = (
            f"Conversation so far:\n{history_text}\n\n"
            f"Rewrite this query to be self-contained: {state['query']}"
        )

    msg = await llm_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": content}],
    )
    first = msg.content[0] if msg.content else None
    rewritten = (
        first.text.strip() if isinstance(first, anthropic.types.TextBlock) else state["query"]
    )
    return {"rewritten_query": rewritten}
