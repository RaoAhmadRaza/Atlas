"""Document parsing: bytes → plain text, with magic-byte validation."""

from __future__ import annotations

MAGIC_BYTES: dict[str, bytes] = {
    "application/pdf": b"%PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK\x03\x04",
}


class UnsupportedMimeType(ValueError):
    pass


class MimeTypeMismatch(ValueError):
    pass


def parse(raw: bytes, mime_type: str) -> str:
    _validate_magic(raw, mime_type)
    match mime_type:
        case "application/pdf":
            return _parse_pdf(raw)
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return _parse_docx(raw)
        case "text/html":
            return _parse_html(raw)
        case "text/markdown" | "text/plain":
            return raw.decode("utf-8", errors="replace")
        case _:
            raise UnsupportedMimeType(mime_type)


def _validate_magic(raw: bytes, mime_type: str) -> None:
    magic = MAGIC_BYTES.get(mime_type)
    if magic and not raw.startswith(magic):
        raise MimeTypeMismatch(f"Magic bytes do not match claimed {mime_type}")


def _parse_pdf(raw: bytes) -> str:
    import io

    import pymupdf

    doc: object = pymupdf.open(stream=io.BytesIO(raw), filetype="pdf")  # type: ignore[no-untyped-call]
    return "\n".join(page.get_text() for page in doc)  # type: ignore[attr-defined]


def _parse_docx(raw: bytes) -> str:
    import io

    from docx import Document

    doc = Document(io.BytesIO(raw))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _parse_html(raw: bytes) -> str:
    import trafilatura

    result = trafilatura.extract(raw.decode("utf-8", errors="replace"))
    return result or ""
