from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class ScoredChunk:
    """Immutable retrieval result carrying a chunk with its relevance score."""

    id: UUID
    content: str
    metadata: dict[str, object]
    score: float
    token_count: int = 0
    document_id: UUID | None = None
