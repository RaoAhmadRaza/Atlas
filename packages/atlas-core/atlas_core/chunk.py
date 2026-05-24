"""Text chunking strategies: text → list[ChunkResult]."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ChunkResult:
    text: str
    token_count: int
    metadata: dict[str, object] = field(default_factory=dict)


def chunk(
    text: str,
    strategy: str = "recursive_token",
    size: int = 512,
    overlap: int = 64,
) -> list[ChunkResult]:
    if not text.strip():
        return []
    match strategy:
        case "recursive_token":
            return _recursive_token(text, size, overlap)
        case "markdown_header":
            return _markdown_header(text)
        case _:
            raise ValueError(f"Unknown strategy: {strategy!r}")


def _recursive_token(text: str, size: int, overlap: int) -> list[ChunkResult]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=size,
        chunk_overlap=overlap,
    )
    docs = splitter.create_documents([text])
    return [
        ChunkResult(
            text=d.page_content,
            token_count=_count_tokens(d.page_content),
            metadata=d.metadata,
        )
        for d in docs
        if d.page_content.strip()
    ]


def _markdown_header(text: str) -> list[ChunkResult]:
    from langchain_text_splitters import MarkdownHeaderTextSplitter

    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[("#", "h1"), ("##", "h2"), ("###", "h3")]
    )
    docs = splitter.split_text(text)
    return [
        ChunkResult(
            text=d.page_content,
            token_count=_count_tokens(d.page_content),
            metadata=d.metadata,
        )
        for d in docs
        if d.page_content.strip()
    ]


def _count_tokens(text: str) -> int:
    try:
        import tiktoken

        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return len(text.split())
