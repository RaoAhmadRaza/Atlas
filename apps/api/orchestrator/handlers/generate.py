from __future__ import annotations

import json

import anthropic
from atlas_core.retrieval.types import ScoredChunk
from langchain_core.runnables import RunnableConfig

from apps.api.orchestrator.state import Citation, CostData, QueryState, _sse_queue_var

_TOKENS_IN_RATE = 3e-6
_TOKENS_OUT_RATE = 15e-6
_GENERATE_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 1024


def _build_citations(compressed_hits: list[ScoredChunk]) -> list[Citation]:
    return [Citation(chunk_id=str(c.id), text=c.content[:120]) for c in compressed_hits]


async def generate_node(state: QueryState, config: RunnableConfig) -> dict[str, object]:
    queue = _sse_queue_var.get(None)
    if queue is not None:
        await queue.put(json.dumps({"type": "stage", "stage": "generate"}))

    llm_client: anthropic.AsyncAnthropic = config["configurable"]["llm_client"]
    context = "\n\n".join(c.content for c in state["compressed_hits"])
    answer_parts: list[str] = []
    tokens_in = tokens_out = 0

    async with llm_client.messages.stream(
        model=_GENERATE_MODEL,
        max_tokens=_MAX_TOKENS,
        system="Answer using only the provided context. Reference chunk IDs where applicable.",
        messages=[
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {state['rewritten_query']}",
            }
        ],
    ) as stream:
        async for text in stream.text_stream:
            answer_parts.append(text)
            if queue is not None:
                await queue.put(json.dumps({"type": "token", "delta": text}))
        final = await stream.get_final_message()
        tokens_in = final.usage.input_tokens
        tokens_out = final.usage.output_tokens

    usd = tokens_in * _TOKENS_IN_RATE + tokens_out * _TOKENS_OUT_RATE
    cost: CostData = {"tokens_in": tokens_in, "tokens_out": tokens_out, "usd": usd, "meta": {}}
    return {
        "answer": "".join(answer_parts),
        "citations": _build_citations(state["compressed_hits"]),
        "cost": cost,
    }
