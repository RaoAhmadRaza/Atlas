"""BGEEmbedder — production embedder using FlagEmbedding (not in atlas-core: 1.3GB model)."""

from __future__ import annotations

import asyncio


class BGEEmbedder:
    MODEL = "BAAI/bge-large-en-v1.5"
    DIM = 1024

    def __init__(self) -> None:
        from FlagEmbedding import FlagModel

        self._model = FlagModel(self.MODEL, use_fp16=True)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self._model.encode(texts, batch_size=32, normalize_embeddings=True).tolist(),
        )
