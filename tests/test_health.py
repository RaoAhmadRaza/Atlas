import sys
from pathlib import Path

import pytest

# Add apps/api to path so `main` is importable in the workspace test runner
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api"))

from httpx import ASGITransport, AsyncClient  # noqa: E402


@pytest.mark.asyncio
async def test_healthz_returns_ok() -> None:
    from main import app  # noqa: PLC0415

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_readyz_returns_ok() -> None:
    from main import app  # noqa: PLC0415

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/readyz")
    assert response.status_code == 200
