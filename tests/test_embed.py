"""Tests for atlas_core.embed — TDD."""

import pytest


def test_mock_embedder_dim() -> None:
    import asyncio

    from atlas_core.embed import MockEmbedder

    embedder = MockEmbedder()
    result = asyncio.get_event_loop().run_until_complete(embedder.embed_batch(["hello world"]))
    assert len(result) == 1
    assert len(result[0]) == 1024


def test_mock_embedder_batch_count() -> None:
    import asyncio

    from atlas_core.embed import MockEmbedder

    texts = ["text one", "text two", "text three"]
    embedder = MockEmbedder()
    result = asyncio.get_event_loop().run_until_complete(embedder.embed_batch(texts))
    assert len(result) == 3


def test_mock_embedder_deterministic() -> None:
    import asyncio

    from atlas_core.embed import MockEmbedder

    embedder = MockEmbedder(seed=42)
    r1 = asyncio.get_event_loop().run_until_complete(embedder.embed_batch(["hello"]))
    r2 = asyncio.get_event_loop().run_until_complete(embedder.embed_batch(["hello"]))
    assert r1 == r2


def test_mock_embedder_returns_floats() -> None:
    import asyncio

    from atlas_core.embed import MockEmbedder

    embedder = MockEmbedder()
    result = asyncio.get_event_loop().run_until_complete(embedder.embed_batch(["x"]))
    assert all(isinstance(v, float) for v in result[0])


def test_embedder_protocol_satisfied() -> None:
    from atlas_core.embed import Embedder, MockEmbedder

    assert isinstance(MockEmbedder(), Embedder)


@pytest.mark.asyncio
async def test_mock_embedder_empty_batch() -> None:
    from atlas_core.embed import MockEmbedder

    embedder = MockEmbedder()
    result = await embedder.embed_batch([])
    assert result == []
