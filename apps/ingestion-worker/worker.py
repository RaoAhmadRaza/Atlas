import os

import arq
from tasks.ingest import ingest_document

_redis_dsn = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


class WorkerSettings:
    functions = [ingest_document]
    max_tries = 3
    redis_settings = arq.connections.RedisSettings.from_dsn(_redis_dsn)
