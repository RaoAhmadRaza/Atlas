import os

import arq
from dotenv import load_dotenv
from tasks.ingest import ingest_document
from tasks.run_eval import run_eval_job

load_dotenv(override=True)

_redis_dsn = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


async def on_startup(ctx: dict) -> None:
    from atlas_core.db.engine import create_engine, get_database_url
    from atlas_core.db.session import create_session_factory, init_default_factory

    engine = create_engine(get_database_url())
    create_session_factory(engine)
    init_default_factory(engine)
    ctx["db_engine"] = engine


async def on_shutdown(ctx: dict) -> None:
    engine = ctx.get("db_engine")
    if engine:
        await engine.dispose()


class WorkerSettings:
    functions = [ingest_document, run_eval_job]
    on_startup = on_startup
    on_shutdown = on_shutdown
    max_tries = 3
    redis_settings = arq.connections.RedisSettings.from_dsn(_redis_dsn)
