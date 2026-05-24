"""Tests for atlas_core.chunk — TDD."""

import pytest

LONG_TEXT = " ".join(["word"] * 2000)
MARKDOWN_TEXT = "# Title\n\nParagraph one.\n\n## Section\n\nParagraph two content here."


def test_chunk_returns_list() -> None:
    from atlas_core.chunk import chunk

    result = chunk(LONG_TEXT)
    assert isinstance(result, list)
    assert len(result) > 0


def test_chunk_sizes() -> None:
    from atlas_core.chunk import chunk

    result = chunk(LONG_TEXT, size=512, overlap=64)
    for c in result:
        assert c.token_count <= 512


def test_chunk_has_fields() -> None:
    from atlas_core.chunk import chunk

    result = chunk("hello world " * 10)
    c = result[0]
    assert hasattr(c, "text")
    assert hasattr(c, "token_count")
    assert hasattr(c, "metadata")
    assert isinstance(c.token_count, int)
    assert c.token_count >= 0


def test_chunk_markdown_strategy() -> None:
    from atlas_core.chunk import chunk

    result = chunk(MARKDOWN_TEXT, strategy="markdown_header")
    assert len(result) >= 1
    assert all(isinstance(c.text, str) for c in result)


def test_chunk_empty_text() -> None:
    from atlas_core.chunk import chunk

    result = chunk("")
    assert result == []


def test_chunk_default_strategy() -> None:
    from atlas_core.chunk import chunk

    result = chunk("short text")
    assert len(result) == 1
    assert result[0].text == "short text"


def test_chunk_unknown_strategy() -> None:
    from atlas_core.chunk import chunk

    with pytest.raises(ValueError, match="Unknown strategy"):
        chunk("some text", strategy="unknown_strategy")
