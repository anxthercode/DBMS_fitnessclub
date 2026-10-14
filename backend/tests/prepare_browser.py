"""Seed browser-only credentials exclusively in local northside_test."""

import asyncio
import os
import subprocess
import sys
from urllib.parse import urlsplit

import asyncpg

from app.auth.service import hasher
from app.core.config import BACKEND_ROOT, Settings
from app.seed import seed_catalogue, seed_commerce


async def prepare():
    url = Settings().database_url.get_secret_value()
    parsed = urlsplit(url)
    if parsed.path != "/northside_test" or parsed.hostname not in ("127.0.0.1", "localhost"):
        raise RuntimeError("Only local northside_test may hold browser fixtures")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND_ROOT,
                   env={**os.environ, "DATABASE_URL": url}, check=True, capture_output=True)
    conn = await asyncpg.connect(url)
    try:
        await seed_catalogue(conn)
        await seed_commerce(conn)
        await conn.execute(
            """INSERT INTO users(email,password_hash,first_name,last_name,role)
               VALUES('browser-admin@example.com',$1,'Browser','Admin','ADMIN')
               ON CONFLICT(email) DO UPDATE SET password_hash=$1,is_active=true""",
            hasher.hash("Browser-test-2026!"),
        )
        await conn.execute("DELETE FROM auth_throttles")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(prepare())
