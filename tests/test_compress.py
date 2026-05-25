from uuid import uuid4

import pytest
from atlas_core.retrieval.compress import compress
from atlas_core.retrieval.types import ScoredChunk


def _chunk(score: float, token_count: int) -> ScoredChunk:
    return ScoredChunk(
        id=uuid4(), content="text", metadata={}, score=score, token_count=token_count
    )  # noqa: E501


def test_compress_respects_budget() -> None:
    chunks = [_chunk(0.9, 1000), _chunk(0.8, 1000), _chunk(0.7, 1000), _chunk(0.6, 1000)]
    result = compress(chunks, budget_tokens=2500)
    assert sum(c.token_count for c in result) <= 2500


def test_compress_returns_highest_scores_first() -> None:
    chunks = [_chunk(0.3, 100), _chunk(0.9, 100), _chunk(0.6, 100)]
    result = compress(chunks, budget_tokens=500)
    assert result[0].score == pytest.approx(0.9)
    assert result[1].score == pytest.approx(0.6)


def test_compress_empty_input() -> None:
    assert compress([], budget_tokens=3000) == []


def test_compress_all_fit() -> None:
    chunks = [_chunk(0.9, 100), _chunk(0.8, 200), _chunk(0.7, 300)]
    assert len(compress(chunks, budget_tokens=3000)) == 3


def test_compress_oversized_first_chunk_stops_early() -> None:
    # Greedy break: first chunk (highest score) oversized → result is empty
    result = compress([_chunk(0.9, 5000), _chunk(0.5, 100)], budget_tokens=1000)
    assert result == []


def test_compress_zero_budget() -> None:
    assert compress([_chunk(0.9, 1)], budget_tokens=0) == []
