import asyncio
from decimal import Decimal

import asyncpg
import pytest

from app.seed import seed_catalogue

pytestmark = pytest.mark.integration


async def test_catalogue_reads_persisted_price_and_serializes_money(client, connection):
    await connection.execute(
        "UPDATE access_offers SET price_byn = $1, revision = revision + 1 WHERE code = $2",
        Decimal("123.45"),
        "BOTH_3",
    )
    response = await client.get("/api/v1/access-offers")
    assert response.status_code == 200
    offers = response.json()
    assert len(offers) == 12
    offer = next(o for o in offers if o["zones"] == "both" and o["months"] == 3)
    assert offer["price_byn"] == "123.45"
    assert offer["revision"] == 2
    assert isinstance(offer["id"], str)
    assert "allows_group" not in offer
    assert "allows_individual" not in offer
    preview = (await client.get("/api/v1/access-offers/previews")).json()
    assert len(preview) == 12
    assert "id" not in preview[0]


async def test_inactive_offers_and_zones_are_not_public(client, connection):
    await connection.execute("UPDATE access_offers SET is_active = false WHERE code = $1", "GYM_1")
    assert len((await client.get("/api/v1/access-offers")).json()) == 11
    await connection.execute("UPDATE zones SET is_active = false WHERE code = $1", "pool")
    remaining = (await client.get("/api/v1/access-offers")).json()
    assert len(remaining) == 3
    assert all(offer["zones"] == "gym" for offer in remaining)


async def test_constraints_prevent_invalid_offer_and_orphaned_zones(connection):
    for price in (Decimal("-1"), Decimal("0"), Decimal("NaN")):
        with pytest.raises(asyncpg.CheckViolationError):
            await connection.execute("UPDATE access_offers SET price_byn = $1", price)
    with pytest.raises(asyncpg.CheckViolationError):
        await connection.execute(
            "UPDATE access_offers SET duration_months = NULL WHERE code = $1", "GYM_1"
        )
    with pytest.raises(asyncpg.CheckViolationError):
        async with connection.transaction():
            await connection.execute("DELETE FROM access_offer_zones")
    assert await connection.fetchval("SELECT count(*) FROM access_offer_zones") == 16
    with pytest.raises(asyncpg.ForeignKeyViolationError):
        await connection.execute("INSERT INTO access_offer_zones VALUES ($1, $2)", 999999, 1)


async def test_seed_is_idempotent_and_preserves_edited_prices(connection, database_url):
    await connection.execute(
        "UPDATE access_offers SET price_byn = $1 WHERE code = $2", Decimal("101"), "GYM_1"
    )
    second = await asyncpg.connect(database_url)
    try:
        await asyncio.gather(seed_catalogue(connection), seed_catalogue(second))
    finally:
        await second.close()
    assert await connection.fetchval("SELECT count(*) FROM access_offers") == 12
    assert await connection.fetchval(
        "SELECT price_byn FROM access_offers WHERE code = $1", "GYM_1"
    ) == Decimal("101")


async def test_health_no_demo_login_and_no_public_writes(client):
    assert (await client.get("/api/v1/health/ready")).json()["database"] == "postgresql"
    assert (await client.get("/api/v1/auth/session")).status_code == 401
    assert (await client.post("/api/v1/access-offers", json={"price_byn": "1"})).status_code == 405
    assert (await client.get("/api/v1/missing")).json() == {"code": "not_found"}
    response = await client.get(
        "/api/v1/access-offers", headers={"Origin": "https://untrusted.test"}
    )
    assert "access-control-allow-origin" not in response.headers
    response = await client.get(
        "/api/v1/access-offers", headers={"Origin": "http://127.0.0.1:5173"}
    )
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
