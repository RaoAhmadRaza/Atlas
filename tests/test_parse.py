"""Tests for atlas_core.parse — TDD RED phase."""

import io

import pytest


@pytest.fixture
def minimal_pdf_bytes() -> bytes:
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Hello Atlas PDF")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@pytest.fixture
def minimal_docx_bytes() -> bytes:
    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_paragraph("Hello Atlas DOCX")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@pytest.fixture
def html_bytes() -> bytes:
    return b"<html><body><h1>Hello</h1><p>Atlas HTML content here.</p></body></html>"


@pytest.fixture
def markdown_bytes() -> bytes:
    return b"# Hello\n\nAtlas markdown content."


@pytest.fixture
def text_bytes() -> bytes:
    return b"Hello Atlas plain text."


def test_parse_pdf(minimal_pdf_bytes: bytes) -> None:
    from atlas_core.parse import parse

    result = parse(minimal_pdf_bytes, "application/pdf")
    assert "Hello Atlas PDF" in result


def test_parse_docx(minimal_docx_bytes: bytes) -> None:
    from atlas_core.parse import parse

    result = parse(
        minimal_docx_bytes,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert "Hello Atlas DOCX" in result


def test_parse_html(html_bytes: bytes) -> None:
    from atlas_core.parse import parse

    result = parse(html_bytes, "text/html")
    assert len(result) > 0


def test_parse_markdown(markdown_bytes: bytes) -> None:
    from atlas_core.parse import parse

    result = parse(markdown_bytes, "text/markdown")
    assert "Hello" in result
    assert "Atlas markdown" in result


def test_parse_plain_text(text_bytes: bytes) -> None:
    from atlas_core.parse import parse

    result = parse(text_bytes, "text/plain")
    assert result == "Hello Atlas plain text."


def test_magic_bytes_mismatch_pdf() -> None:
    from atlas_core.parse import MimeTypeMismatch, parse

    with pytest.raises(MimeTypeMismatch, match="application/pdf"):
        parse(b"not a pdf content here", "application/pdf")


def test_magic_bytes_mismatch_docx() -> None:
    from atlas_core.parse import MimeTypeMismatch, parse

    with pytest.raises(MimeTypeMismatch):
        parse(
            b"not a zip content",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )


def test_unsupported_mime() -> None:
    from atlas_core.parse import UnsupportedMimeType, parse

    with pytest.raises(UnsupportedMimeType):
        parse(b"some bytes", "application/x-executable")


def test_parse_returns_str(text_bytes: bytes) -> None:
    from atlas_core.parse import parse

    result = parse(text_bytes, "text/plain")
    assert isinstance(result, str)
