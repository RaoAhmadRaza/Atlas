"""Eval harness endpoints — /v1/evals/..."""

from __future__ import annotations

from uuid import UUID

from atlas_core.db.session import with_tenant_session
from atlas_core.models.ops import EvalQuestionResult, EvalRun
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from apps.api.deps import get_tenant_id

router = APIRouter(prefix="/v1/evals", tags=["evals"])


class RunSummary(BaseModel):
    id: UUID
    dataset: str
    config_name: str
    status: str
    recall_at_5: float | None
    mrr: float | None
    faithfulness: float | None
    created_at: str


class TriggerRequest(BaseModel):
    config: str
    dataset: str


@router.get("/runs")
async def list_runs(
    limit: int = Query(20, ge=1, le=100),
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict[str, object]:
    async with with_tenant_session(tenant_id) as session:
        rows = (
            (
                await session.execute(
                    select(EvalRun)
                    .where(EvalRun.tenant_id == tenant_id)
                    .order_by(EvalRun.created_at.desc())
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )

    runs = [
        {
            "id": str(r.id),
            "dataset": r.config.get("dataset", ""),
            "config_name": r.config.get("name", ""),
            "status": r.status,
            "recall_at_5": r.metrics.get("recall_at_5"),
            "mrr": r.metrics.get("mrr"),
            "faithfulness": r.metrics.get("faithfulness"),
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
    return {"runs": runs}


@router.post("/runs", status_code=202)
async def trigger_run(
    body: TriggerRequest,
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict[str, object]:
    import arq

    async with with_tenant_session(tenant_id) as session:
        run = EvalRun(
            tenant_id=tenant_id,
            config={"name": body.config, "dataset": body.dataset},
            status="pending",
        )
        session.add(run)
        await session.flush()
        run_id = run.id
        await session.commit()

    redis = await arq.create_pool(arq.connections.RedisSettings())
    await redis.enqueue_job("run_eval_job", str(run_id), str(tenant_id), body.config)
    await redis.aclose()

    return {"id": str(run_id), "status": "pending"}


@router.get("/runs/{run_id}")
async def get_run(
    run_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict[str, object]:
    async with with_tenant_session(tenant_id) as session:
        run = await session.get(EvalRun, run_id)

    if run is None or run.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="run not found")

    return {
        "id": str(run.id),
        "status": run.status,
        "dataset": run.config.get("dataset", ""),
        "config_name": run.config.get("name", ""),
        "metrics": run.metrics,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "created_at": run.created_at.isoformat(),
    }


@router.get("/runs/{run_id}/questions")
async def list_questions(
    run_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict[str, object]:
    offset = (page - 1) * limit
    async with with_tenant_session(tenant_id) as session:
        total = (
            await session.execute(
                select(func.count())
                .select_from(EvalQuestionResult)
                .where(EvalQuestionResult.eval_run_id == run_id)
            )
        ).scalar()
        rows = (
            (
                await session.execute(
                    select(EvalQuestionResult)
                    .where(EvalQuestionResult.eval_run_id == run_id)
                    .order_by(EvalQuestionResult.created_at)
                    .offset(offset)
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "questions": [
            {
                "question_id": r.question_id,
                "question": r.question,
                "recall_at_5": float(r.recall_at_5) if r.recall_at_5 is not None else None,
                "mrr": float(r.mrr_score) if r.mrr_score is not None else None,
                "ndcg_at_10": float(r.ndcg_at_10) if r.ndcg_at_10 is not None else None,
                "latency_ms": r.latency_ms,
                "error": r.error,
            }
            for r in rows
        ],
    }


@router.get("/runs/{run_id}/failures")
async def list_failures(
    run_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict[str, object]:
    async with with_tenant_session(tenant_id) as session:
        rows = (
            (
                await session.execute(
                    select(EvalQuestionResult)
                    .where(
                        EvalQuestionResult.eval_run_id == run_id,
                        EvalQuestionResult.recall_at_5 < 0.5,
                    )
                    .order_by(EvalQuestionResult.recall_at_5)
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )

    return {
        "failures": [
            {
                "question_id": r.question_id,
                "question": r.question,
                "recall_at_5": float(r.recall_at_5) if r.recall_at_5 is not None else None,
                "retrieved_doc_ids": r.retrieved_doc_ids,
                "relevant_doc_ids": r.relevant_doc_ids,
                "error": r.error,
            }
            for r in rows
        ]
    }


@router.get("/compare")
async def compare_runs(
    run_a: UUID = Query(...),
    run_b: UUID = Query(...),
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict[str, object]:
    from eval_runner.compare import compare_reports

    async with with_tenant_session(tenant_id) as session:
        ra = await session.get(EvalRun, run_a)
        rb = await session.get(EvalRun, run_b)

    if ra is None or ra.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="run_a not found")
    if rb is None or rb.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="run_b not found")

    comparison = compare_reports(ra.metrics, rb.metrics)
    return {
        "run_a": {"id": str(ra.id), "metrics": ra.metrics},
        "run_b": {"id": str(rb.id), "metrics": rb.metrics},
        **comparison,
    }
