import os
import subprocess
import sys
from urllib.parse import urlsplit

import asyncpg
import pytest
from dotenv import dotenv_values
from httpx import ASGITransport, AsyncClient

from app.core.config import BACKEND_ROOT, Settings
from app.main import create_app
from app.seed import seed_catalogue, seed_commerce


@pytest.fixture(scope="session")
def database_url():
    url = os.environ.get("TEST_DATABASE_URL") or dotenv_values(BACKEND_ROOT / ".env").get(
        "TEST_DATABASE_URL",
    )
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration checks")
    parsed = urlsplit(url)
    if parsed.path != "/northside_test" or parsed.hostname not in ("127.0.0.1", "localhost"):
        pytest.fail("Tests only reset the dedicated local northside_test database")
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
        env={**os.environ, "DATABASE_URL": url},
        check=True,
        capture_output=True,
    )
    return url


@pytest.fixture
async def connection(database_url):
    connection = await asyncpg.connect(database_url)
    assert await connection.fetchval("SELECT current_database()") == "northside_test"
    await connection.execute(
        "TRUNCATE users, auth_throttles, carts, discounts, exchange_rates, "
        "access_offer_zones, access_offers, zones RESTART IDENTITY CASCADE"
    )
    await seed_catalogue(connection)
    await seed_commerce(connection)
    try:
        yield connection
    finally:
        await connection.close()


@pytest.fixture
async def client(database_url, connection):
    app = create_app(Settings(_env_file=None, database_url=database_url))
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            headers={"X-Northside-Request": "1", "Content-Type": "application/json"},
        ) as client:
            yield client
    assert app.state.pool.is_closing()


@pytest.fixture
def letters(monkeypatch):
    from app.auth import mail

    captured = []

    async def fake_send(settings, email, purpose, token, locale):
        captured.append(dict(email=email, purpose=purpose, token=token))

    monkeypatch.setattr(mail, "send", fake_send)
    return captured
