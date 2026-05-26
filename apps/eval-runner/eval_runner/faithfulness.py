from __future__ import annotations

import os
from typing import Protocol, runtime_checkable


@runtime_checkable
class FaithfulnessJudge(Protocol):
    async def score(self, question: str, answer: str, context: str) -> float: ...


class NoopFaithfulnessJudge:
    """Returns 1.0 always — used in CI when no LLM key available."""

    async def score(self, question: str, answer: str, context: str) -> float:
        return 1.0


class OpenAIFaithfulnessJudge:
    """GPT-4o-mini judge: scores answer faithfulness to context (0–1)."""

    _PROMPT = (
        "You are a factual consistency judge.\n"
        "Context: {context}\n\n"
        "Question: {question}\n"
        "Answer: {answer}\n\n"
        "Rate how faithfully the answer is supported by the context alone. "
        "Reply with a single float between 0.0 (hallucinated) and 1.0 (fully grounded)."
    )

    def __init__(self, api_key: str | None = None) -> None:
        import openai

        self._client = openai.AsyncOpenAI(api_key=api_key or os.environ["OPENAI_API_KEY"])

    async def score(self, question: str, answer: str, context: str) -> float:
        prompt = self._PROMPT.format(context=context[:3000], question=question, answer=answer)
        resp = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=8,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        raw = (resp.choices[0].message.content or "0").strip()
        try:
            return max(0.0, min(1.0, float(raw)))
        except ValueError:
            return 0.0


def get_judge(name: str | None = None) -> FaithfulnessJudge:
    judge_name = name or os.environ.get("EVAL_FAITHFULNESS_JUDGE", "noop")
    if judge_name == "openai":
        return OpenAIFaithfulnessJudge()
    return NoopFaithfulnessJudge()
