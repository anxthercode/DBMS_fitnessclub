import asyncio

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings

target_metadata = None  # Manual SQL migrations only; no ORM metadata/autogeneration.


def run_migrations(connection):
    context.configure(connection=connection, target_metadata=None)
    with context.begin_transaction():
        context.run_migrations()


async def run_online():
    url = make_url(Settings().database_url.get_secret_value()).set(drivername="postgresql+asyncpg")
    engine = create_async_engine(url, poolclass=pool.NullPool, connect_args={"timeout": 10})
    try:
        async with engine.connect() as connection:
            await connection.run_sync(run_migrations)
    finally:
        await engine.dispose()


if context.is_offline_mode():
    context.configure(dialect_name="postgresql", literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(run_online())
