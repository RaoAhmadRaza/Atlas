"""Tests for /v1/evals/* API endpoints."""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient


def _tenant() -> UUID:
    return uuid4()


def _fake_run(tenant_id: UUID, run_id: UUID | None = None) -> MagicMock:
    run = MagicMock()
    run.id = run_id or uuid4()
    run.tenant_id = tenant_id
    run.status = "completed"
    run.config = {"name": "hybrid_bge", "dataset": "smoke_50"}
    run.metrics = {"recall_at_5": 0.92, "mrr": 0.88, "faithfulness": 1.0}
    run.created_at = datetime(2026, 5, 1, tzinfo=timezone.utc)
    run.started_at = None
    run.finished_at = None
    return run


def _session_ctx(
    session: AsyncMock,
) -> Callable[[UUID], AbstractAsyncContextManager[AsyncMock]]:
    @asynccontextmanager
    async def _ctx(tid: UUID) -> AsyncIterator[AsyncMock]:
        yield session

    return _ctx


def _make_session() -> AsyncMock:
    return AsyncMock()


def _execute_rows(rows: list[object]) -> AsyncMock:
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows
    return AsyncMock(return_value=result)


def _execute_count_then_rows(count: int, rows: list[object]) -> AsyncMock:
    count_result = MagicMock()
    count_result.scalar.return_value = count
    rows_result = MagicMock()
    rows_result.scalars.return_value.all.return_value = rows
    return AsyncMock(side_effect=[count_result, rows_result])


# ── GET /v1/evals/runs ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_runs_empty() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    session = _make_session()
    session.execute = _execute_rows([])

    with patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get("/v1/evals/runs", headers={"X-Tenant-ID": str(tenant_id)})

    assert resp.status_code == 200
    assert resp.json() == {"runs": []}


@pytest.mark.asyncio
async def test_list_runs_returns_rows() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    run = _fake_run(tenant_id)
    session = _make_session()
    session.execute = _execute_rows([run])

    with patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get("/v1/evals/runs", headers={"X-Tenant-ID": str(tenant_id)})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["runs"]) == 1
    assert body["runs"][0]["status"] == "completed"
    assert body["runs"][0]["recall_at_5"] == 0.92


# ── GET /v1/evals/runs/{run_id} ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_run_found() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    run_id = uuid4()
    run = _fake_run(tenant_id, run_id)
    session = _make_session()
    session.get.return_value = run

    with patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(f"/v1/evals/runs/{run_id}", headers={"X-Tenant-ID": str(tenant_id)})

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(run_id)
    assert body["status"] == "completed"
    assert body["metrics"]["recall_at_5"] == 0.92


@pytest.mark.asyncio
async def test_get_run_not_found() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    session = _make_session()
    session.get.return_value = None

    with patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(f"/v1/evals/runs/{uuid4()}", headers={"X-Tenant-ID": str(tenant_id)})

    assert resp.status_code == 404


# ── GET /v1/evals/runs/{run_id}/questions ────────────────────────────────────


@pytest.mark.asyncio
async def test_list_questions_empty() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    run_id = uuid4()
    session = _make_session()
    session.execute = _execute_count_then_rows(0, [])

    with patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(
                f"/v1/evals/runs/{run_id}/questions",
                headers={"X-Tenant-ID": str(tenant_id)},
            )

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["questions"] == []


# ── GET /v1/evals/runs/{run_id}/failures ─────────────────────────────────────


@pytest.mark.asyncio
async def test_list_failures_empty() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    run_id = uuid4()
    session = _make_session()
    session.execute = _execute_rows([])

    with patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(
                f"/v1/evals/runs/{run_id}/failures",
                headers={"X-Tenant-ID": str(tenant_id)},
            )

    assert resp.status_code == 200
    assert resp.json() == {"failures": []}


# ── GET /v1/evals/compare ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_compare_runs_ok() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    run_a = _fake_run(tenant_id)
    run_b = _fake_run(tenant_id)
    session = _make_session()
    session.get.side_effect = [run_a, run_b]

    fake_comparison: dict[str, object] = {
        "delta_recall5": 0.05,
        "delta_mrr": 0.03,
        "recall5_ci": {"delta": 0.05, "p_value": 0.04, "ci_95": [0.01, 0.09]},
        "mrr_ci": {"delta": 0.03, "p_value": 0.10, "ci_95": [-0.01, 0.07]},
        "p_value": 0.04,
        "ci_95": [0.01, 0.09],
    }

    with (
        patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)),
        patch("eval_runner.compare.compare_reports", return_value=fake_comparison),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(
                "/v1/evals/compare",
                params={"run_a": str(run_a.id), "run_b": str(run_b.id)},
                headers={"X-Tenant-ID": str(tenant_id)},
            )

    assert resp.status_code == 200
    body = resp.json()
    assert "run_a" in body
    assert "run_b" in body
    assert body["delta_recall5"] == 0.05


@pytest.mark.asyncio
async def test_compare_runs_not_found() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    session = _make_session()
    session.get.return_value = None

    with patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get(
                "/v1/evals/compare",
                params={"run_a": str(uuid4()), "run_b": str(uuid4())},
                headers={"X-Tenant-ID": str(tenant_id)},
            )

    assert resp.status_code == 404


# ── POST /v1/evals/runs ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_trigger_run_returns_202() -> None:
    from apps.api.main import app

    tenant_id = _tenant()
    run_id = uuid4()

    session = _make_session()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()

    def _add_side_effect(obj: object) -> None:
        obj.id = run_id  # type: ignore[union-attr]

    session.add.side_effect = _add_side_effect

    mock_redis = AsyncMock()
    mock_redis.enqueue_job = AsyncMock()
    mock_redis.aclose = AsyncMock()

    with (
        patch("apps.api.routers.evals.with_tenant_session", _session_ctx(session)),
        patch("arq.create_pool", return_value=mock_redis),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post(
                "/v1/evals/runs",
                json={"config": "hybrid_bge", "dataset": "smoke_50"},
                headers={"X-Tenant-ID": str(tenant_id)},
            )

    assert resp.status_code == 202
    body = resp.json()
    assert body["status"] == "pending"
    assert "id" in body
