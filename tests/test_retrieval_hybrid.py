import asyncio
import time
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

from atlas_core.retrieval.hybrid import HybridRetriever, rrf_fuse
from atlas_core.retrieval.types import ScoredChunk


def _chunk(cid: UUID, score: float = 0.5) -> ScoredChunk:
    return ScoredChunk(id=cid, content="text", metadata={}, score=score)


# ---------------------------------------------------------------------------
# rrf_fuse — pure function
# ---------------------------------------------------------------------------


def test_rrf_fuse_deduplicates() -> None:
    cid = uuid4()
    dense = [_chunk(cid, 0.9), _chunk(uuid4(), 0.7)]
    bm25 = [_chunk(cid, 0.8), _chunk(uuid4(), 0.6)]
    result = rrf_fuse([dense, bm25])
    assert [c.id for c in result].count(cid) == 1


def test_rrf_rank_promotion() -> None:
    # chunk_a rank 3 in both lists → score > chunk_b rank 1 in one list
    a, b = uuid4(), uuid4()
    dense = [_chunk(uuid4()), _chunk(uuid4()), _chunk(a)]
    bm25 = [_chunk(uuid4()), _chunk(uuid4()), _chunk(a)]
    solo = [_chunk(b), _chunk(uuid4()), _chunk(uuid4())]
    pad = [_chunk(uuid4()), _chunk(uuid4()), _chunk(uuid4())]

    score_a = next(c.score for c in rrf_fuse([dense, bm25]) if c.id == a)
    score_b = next(c.score for c in rrf_fuse([solo, pad]) if c.id == b)

    # a: 1/(60+3)+1/(60+3) ≈ 0.0317  |  b: 1/(60+1) ≈ 0.0164
    assert score_a > score_b


def test_rrf_fuse_single_list_preserves_rank_order() -> None:
    cids = [uuid4() for _ in range(3)]
    result = rrf_fuse([[_chunk(c) for c in cids]])
    assert [c.id for c in result] == cids
    assert result[0].score > result[1].score > result[2].score


def test_rrf_fuse_empty_lists() -> None:
    assert rrf_fuse([[], []]) == []


def test_rrf_fuse_scores_positive() -> None:
    result = rrf_fuse([[_chunk(uuid4()) for _ in range(5)]])
    assert all(c.score > 0 for c in result)


# ---------------------------------------------------------------------------
# HybridRetriever
# ---------------------------------------------------------------------------


async def test_hybrid_parallel_calls() -> None:
    """Both retrievers called concurrently, not sequentially."""
    DELAY = 0.05

    async def slow(*_: object, **__: object) -> list[ScoredChunk]:
        await asyncio.sleep(DELAY)
        return []

    mock_dense = AsyncMock()
    mock_dense.retrieve = AsyncMock(side_effect=slow)
    mock_bm25 = AsyncMock()
    mock_bm25.retrieve = AsyncMock(side_effect=slow)

    hybrid = HybridRetriever(dense=mock_dense, bm25=mock_bm25)  # type: ignore[arg-type]
    t0 = time.monotonic()
    await hybrid.retrieve("q", uuid4(), k=5)
    elapsed = time.monotonic() - t0

    assert elapsed < DELAY * 1.8, f"Sequential execution detected: {elapsed:.3f}s"
    mock_dense.retrieve.assert_called_once()
    mock_bm25.retrieve.assert_called_once()


async def test_hybrid_returns_deduped() -> None:
    shared_id = uuid4()
    shared = _chunk(shared_id, 0.9)

    mock_dense = AsyncMock()
    mock_dense.retrieve = AsyncMock(return_value=[shared, _chunk(uuid4(), 0.5)])
    mock_bm25 = AsyncMock()
    mock_bm25.retrieve = AsyncMock(return_value=[shared, _chunk(uuid4(), 0.3)])

    result = await HybridRetriever(dense=mock_dense, bm25=mock_bm25).retrieve("q", uuid4(), k=10)  # type: ignore[arg-type]
    assert [c.id for c in result].count(shared_id) == 1


async def test_hybrid_limits_to_k() -> None:
    chunks = [_chunk(uuid4()) for _ in range(10)]
    mock_dense = AsyncMock()
    mock_dense.retrieve = AsyncMock(return_value=chunks[:5])
    mock_bm25 = AsyncMock()
    mock_bm25.retrieve = AsyncMock(return_value=chunks[5:])

    result = await HybridRetriever(dense=mock_dense, bm25=mock_bm25).retrieve("q", uuid4(), k=3)  # type: ignore[arg-type]
    assert len(result) <= 3
