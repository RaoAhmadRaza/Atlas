from __future__ import annotations

import json

import openai
from atlas_core.retrieval.types import ScoredChunk
from langchain_core.runnables import RunnableConfig

from apps.api.orchestrator.state import Citation, CostData, QueryState, _sse_queue_var

_TOKENS_IN_RATE = 0.15e-6  # gpt-4o-mini input $/token
_TOKENS_OUT_RATE = 0.60e-6  # gpt-4o-mini output $/token
_GENERATE_MODEL = "gpt-4o-mini"
_MAX_TOKENS = 1024


def _build_citations(compressed_hits: list[ScoredChunk]) -> list[Citation]:
    return [Citation(chunk_id=str(c.id), text=c.content[:120]) for c in compressed_hits]


async def generate_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:
    queue = _sse_queue_var.get(None)
    if queue is not None:
        await queue.put(json.dumps({"type": "stage", "stage": "generate"}))

    llm_client: openai.AsyncOpenAI = config["configurable"]["llm_client"]
    context = "\n\n".join(c.content for c in state["compressed_hits"])
    answer_parts: list[str] = []
    tokens_in = tokens_out = 0

    stream = await llm_client.chat.completions.create(
        model=_GENERATE_MODEL,
        max_tokens=_MAX_TOKENS,
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer using only the provided context. Reference chunk IDs where applicable."
                ),
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {state['rewritten_query']}",
            },
        ],
        stream=True,
        stream_options={"include_usage": True},
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            answer_parts.append(delta)
            if queue is not None:
                await queue.put(json.dumps({"type": "token", "delta": delta}))
        if chunk.usage:
            tokens_in = chunk.usage.prompt_tokens
            tokens_out = chunk.usage.completion_tokens

    usd = tokens_in * _TOKENS_IN_RATE + tokens_out * _TOKENS_OUT_RATE
    cost: CostData = {"tokens_in": tokens_in, "tokens_out": tokens_out, "usd": usd, "meta": {}}
    return {
        "answer": "".join(answer_parts),
        "citations": _build_citations(state["compressed_hits"]),
        "cost": cost,
    }
