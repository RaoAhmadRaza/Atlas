import sys
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from atlas_core.retrieval.rerankers import CohereReranker, NoopReranker
from atlas_core.retrieval.types import ScoredChunk


def _chunks(scores: list[float]) -> list[ScoredChunk]:
    return [
        ScoredChunk(id=uuid4(), content=f"chunk {i}", metadata={}, score=s)
        for i, s in enumerate(scores)
    ]


# ---------------------------------------------------------------------------
# NoopReranker
# ---------------------------------------------------------------------------


async def test_noop_reranker_returns_top_n() -> None:
    chunks = _chunks([0.9, 0.7, 0.5, 0.3, 0.1])
    result = await NoopReranker().rerank("q", chunks, top_n=3)
    assert len(result) == 3
    assert result == chunks[:3]


async def test_noop_reranker_empty_input() -> None:
    assert await NoopReranker().rerank("q", [], top_n=5) == []


async def test_noop_reranker_top_n_larger_than_list() -> None:
    chunks = _chunks([0.5, 0.3])
    result = await NoopReranker().rerank("q", chunks, top_n=10)
    assert result == chunks


# ---------------------------------------------------------------------------
# BGEReranker (FlagEmbedding mocked — no model download in CI)
# ---------------------------------------------------------------------------


async def test_bge_reranker_scores_change() -> None:
    mock_flag = MagicMock()
    mock_model = MagicMock()
    mock_flag.FlagReranker.return_value = mock_model

    with patch.dict(sys.modules, {"FlagEmbedding": mock_flag}):
        from atlas_core.retrieval.rerankers import BGEReranker

        reranker = BGEReranker()

    # asyncio.to_thread returns scores that differ from and reorder the input
    chunks = _chunks([0.5, 0.3, 0.7])
    with patch("asyncio.to_thread", new_callable=AsyncMock, return_value=[0.9, 0.1, 0.5]):
        result = await reranker.rerank("query", chunks, top_n=2)

    assert len(result) == 2
    assert result[0].score == pytest.approx(0.9)
    assert result[1].score == pytest.approx(0.5)
    # Verify reranker changed scores from originals (0.5, 0.3, 0.7)
    assert result[0].score != pytest.approx(0.7)  # original top was 0.7, now 0.9


async def test_bge_reranker_empty_input() -> None:
    mock_flag = MagicMock()
    with patch.dict(sys.modules, {"FlagEmbedding": mock_flag}):
        from atlas_core.retrieval.rerankers import BGEReranker

        reranker = BGEReranker()

    assert await reranker.rerank("query", [], top_n=5) == []


# ---------------------------------------------------------------------------
# CohereReranker (cohere client mocked)
# ---------------------------------------------------------------------------


async def test_cohere_reranker_reorders_chunks() -> None:
    mock_cohere = MagicMock()
    mock_client = MagicMock()
    mock_cohere.AsyncClientV2.return_value = mock_client

    r0 = MagicMock()
    r0.index = 2
    r0.relevance_score = 0.95
    r1 = MagicMock()
    r1.index = 0
    r1.relevance_score = 0.60

    mock_resp = MagicMock()
    mock_resp.results = [r0, r1]
    mock_client.rerank = AsyncMock(return_value=mock_resp)

    with patch.dict(sys.modules, {"cohere": mock_cohere}):
        reranker = CohereReranker(api_key="test-key")

    chunks = _chunks([0.5, 0.4, 0.3])
    reranked = await reranker.rerank("query", chunks, top_n=2)

    assert len(reranked) == 2
    assert reranked[0].score == pytest.approx(0.95)
    assert reranked[1].score == pytest.approx(0.60)
    # Chunk at original index 2 (score 0.3) is now ranked first
    assert reranked[0].content == "chunk 2"
