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
        import numpy as np

        loop = asyncio.get_event_loop()

        def _encode() -> list[list[float]]:
            vecs = self._model.encode(texts, batch_size=32)
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1.0, norms)
            return (vecs / norms).tolist()

        return await loop.run_in_executor(None, _encode)
