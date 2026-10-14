import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from app.core.config import Settings


@asynccontextmanager
async def database_pool(settings: Settings) -> AsyncIterator[asyncpg.Pool]:
    # One application pool; SQLAlchemy is used only by Alembic.
    pool = await asyncpg.create_pool(
        dsn=settings.database_url.get_secret_value(),
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
        timeout=settings.db_command_timeout,
        command_timeout=settings.db_command_timeout,
        server_settings={"application_name": "northside-api", "timezone": "UTC"},
    )
    try:
        yield pool
    finally:
        try:
            await asyncio.wait_for(pool.close(), timeout=10)
        except TimeoutError:
            pool.terminate()
