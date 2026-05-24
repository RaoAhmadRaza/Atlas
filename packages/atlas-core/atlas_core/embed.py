"""Embedder protocol + MockEmbedder. BGEEmbedder lives in ingestion-worker."""

from __future__ import annotations

import hashlib
import struct
from typing import Protocol, runtime_checkable


@runtime_checkable
class Embedder(Protocol):
    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...


class MockEmbedder:
    """Deterministic 1024-dim embedder for tests and CI (no model download)."""

    DIM = 1024

    def __init__(self, seed: int = 0) -> None:
        self._seed = seed

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    def _embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(f"{self._seed}:{text}".encode()).digest()
        needed = self.DIM * 4
        raw = (digest * (needed // len(digest) + 1))[:needed]
        floats = list(struct.unpack(f"{self.DIM}f", raw))
        magnitude = sum(v * v for v in floats) ** 0.5 or 1.0
        return [v / magnitude for v in floats]
