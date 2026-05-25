import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

_repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_repo_root / "packages" / "atlas-core"))
sys.path.insert(0, str(_repo_root / "packages" / "atlas-schemas"))

import atlas_core.models  # noqa: E402, F401
from atlas_core.db.base import Base  # noqa: E402

config = context.config

_raw_url = os.environ.get("DATABASE_URL_ADMIN") or os.environ.get("DATABASE_URL", "")
if _raw_url.startswith("postgresql://"):
    _raw_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
config.set_main_option("sqlalchemy.url", _raw_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: object) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    url = config.get_main_option("sqlalchemy.url")
    engine = create_async_engine(url, poolclass=pool.NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
