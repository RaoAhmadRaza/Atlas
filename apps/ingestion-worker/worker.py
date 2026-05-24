import arq


class WorkerSettings:
    functions: list = []
    redis_settings = arq.connections.RedisSettings.from_dsn("redis://localhost:6379/0")
