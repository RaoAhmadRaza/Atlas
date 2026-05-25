from __future__ import annotations

from atlas_core.retrieval.types import ScoredChunk


def compress(chunks: list[ScoredChunk], budget_tokens: int = 3000) -> list[ScoredChunk]:
    """Greedily select highest-scored chunks that fit within token budget."""
    kept: list[ScoredChunk] = []
    total = 0
    for chunk in sorted(chunks, key=lambda c: c.score, reverse=True):
        if total + chunk.token_count > budget_tokens:
            break
        kept.append(chunk)
        total += chunk.token_count
    return kept
