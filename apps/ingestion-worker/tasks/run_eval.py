from __future__ import annotations

import logging
from uuid import UUID

from atlas_core.db.session import with_tenant_session

log = logging.getLogger(__name__)


async def run_eval_job(ctx: dict, eval_run_id: str, tenant_id: str, config_name: str) -> None:
    from eval_runner.config import load_config
    from eval_runner.dataset import load_jsonl
    from eval_runner.persist import save_eval_run
    from eval_runner.runner import build_runner

    tid = UUID(tenant_id)
    eid = UUID(eval_run_id)

    config = load_config(f"evals/configs/{config_name}.yaml")
    questions = load_jsonl("evals/datasets/smoke_50.jsonl")

    runner = build_runner(config, questions)
    result = await runner.run(questions, dataset_name=config_name)

    async with with_tenant_session(tid) as session:
        await save_eval_run(result, tid, eid, session)
        await session.commit()

    log.info("eval_run_id=%s completed recall@5=%.3f", eval_run_id, result.recall_at_5)
