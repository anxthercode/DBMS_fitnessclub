import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

import asyncpg
import pytest

from app.memberships.products import MINSK

pytestmark = pytest.mark.integration
PASSWORD = "Northside-test-2026!"


async def register(client, letters, email="client@example.com", verify=True):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": PASSWORD,
            "first_name": "Test",
            "last_name": "Client",
            "locale": "en",
        },
    )
    assert response.status_code == 201, response.text
    assert not letters
    return (await client.get("/api/v1/auth/session")).json()


async def add(client, zones="gym", kind="membership", months=1, day=None, key=None):
    offers = (await client.get("/api/v1/access-offers")).json()
    offer = next(
        o
        for o in offers
        if o["zones"] == zones
        and o["format"] == kind
        and o["months"] == (months if kind == "membership" else None)
    )
    payload = dict(
        selection=dict(
            zones=zones,
            format=kind,
            months=offer["months"],
            date=day or (datetime.now(MINSK) + timedelta(days=10)).date().isoformat(),
        ),
        expected_price_byn=offer["price_byn"],
        expected_revision=offer["revision"],
        idempotency_key=key or str(uuid4()),
    )
    response = await client.put("/api/v1/cart/items", json=payload)
    assert response.status_code == 200, response.text
    return response.json(), payload


async def checkout(client, currency="BYN", promo=""):
    cart = (await client.get("/api/v1/cart")).json()
    payload = dict(cart_version=cart["version"], currency=currency, promo_code=promo)
    response = await client.post("/api/v1/cart/quote", json=payload)
    assert response.status_code == 200, response.text
    quote = response.json()
    payload.update(
        expected_total_byn=quote["total_byn"],
        expected_total_currency=quote["total_currency"],
        expected_rate=quote["byn_per_unit"],
        idempotency_key=str(uuid4()),
    )
    response = await client.post("/api/v1/orders", json=payload)
    assert response.status_code == 201, response.text
    return response.json(), payload


async def pay(client, order_id, success=True, key=None):
    return await client.post(
        f"/api/v1/orders/{order_id}/payments",
        json={
            "successful": success,
            "idempotency_key": key or str(uuid4()),
        },
    )


async def test_password_hash_session_logout_and_signup_role_guard(client, connection, letters):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@example.com",
            "password": PASSWORD,
            "first_name": "A",
            "last_name": "B",
            "role": "ADMIN",
        },
    )
    assert response.status_code == 422
    await register(client, letters, "Mixed.Case@EXAMPLE.COM", verify=False)
    row = await connection.fetchrow("SELECT * FROM users")
    assert row["email"] == "mixed.case@example.com"
    assert row["password_hash"].startswith("$argon2id$") and PASSWORD not in row["password_hash"]
    assert row["role"] == "CLIENT" and row["email_verified_at"] is None
    token = client.cookies["northside_session"]
    stored = await connection.fetchval("SELECT token_hash FROM auth_sessions")
    assert len(stored) == 32 and stored != token.encode()
    await client.post("/api/v1/auth/logout")
    assert (await client.get("/api/v1/auth/session")).status_code == 401
    client.cookies.set("northside_session", token)
    assert (await client.get("/api/v1/auth/session")).status_code == 401
    client.cookies.clear()
    assert (
        await client.post("/api/v1/auth/login", json={"email": row["email"], "password": "wrong"})
    ).status_code == 401
    response = await client.post(
        "/api/v1/auth/login", json={"email": row["email"], "password": PASSWORD}
    )
    assert response.status_code == 200
    assert (
        "HttpOnly" in response.headers["set-cookie"]
        and "SameSite=lax" in response.headers["set-cookie"]
    )
    assert client.cookies["northside_session"] != token


async def test_email_endpoints_disabled(client, connection, letters):
    await register(client, letters, verify=False)
    for path in ("verify-email", "verification-email", "forgot-password", "reset-password"):
        assert (await client.post("/api/v1/auth/" + path, json={})).status_code == 404
    assert await connection.fetchval("SELECT email_verified_at FROM users") is None


async def test_csrf_unverified_checkout_and_ownership(client, letters):
    response = await client.post("/api/v1/auth/logout", headers={"Origin": "https://evil.example"})
    assert response.status_code == 403
    response = await client.post("/api/v1/auth/logout", headers={"X-Northside-Request": ""})
    assert response.status_code == 403
    await register(client, letters, verify=False)
    await add(client)
    order, _ = await checkout(client)
    await client.post("/api/v1/auth/logout")
    await register(client, letters, "second@example.com")
    assert (await client.get(f"/api/v1/orders/{order['id']}")).status_code == 404
    assert (await pay(client, order["id"])).status_code == 404


async def test_guest_merge_idempotent_checkout_payment_and_snapshots(client, connection, letters):
    _, added = await add(client)
    await register(client, letters)
    cart = (await client.put("/api/v1/cart/items", json=added)).json()
    assert len(cart["items"]) == 1
    order, payload = await checkout(client, "USD", "northside10")
    assert order["total_byn"] == "72.00" and order["total_currency"] == "22.15"
    repeated = await client.post("/api/v1/orders", json=payload)
    assert repeated.json()["id"] == order["id"]
    response = await pay(client, order["id"], False)
    assert response.status_code == 200, response.text
    assert response.json()["attempts"][0]["reason"] == "payment_declined"
    await connection.execute(
        "UPDATE access_offers SET price_byn=999,revision=revision+1 WHERE code='GYM_1'"
    )
    key = str(uuid4())
    responses = await asyncio.gather(*[pay(client, order["id"], key=key) for _ in range(2)])
    assert [r.status_code for r in responses] == [200, 200], [r.text for r in responses]
    assert all(r.json()["status"] == "paid" for r in responses)
    assert await connection.fetchval("SELECT count(*) FROM memberships") == 1
    assert await connection.fetchval("SELECT count(*) FROM payments") == 2
    assert len((await client.get("/api/v1/notifications")).json()) == 1
    access = (await client.get("/api/v1/access")).json()[0]
    assert access["product"]["price_byn"] == "80.00"
    assert "allows_group" not in access
    assert (await pay(client, order["id"], False, key)).status_code == 409
    with pytest.raises(asyncpg.CheckViolationError):
        await connection.execute("UPDATE order_items SET price_byn=1")


async def test_competing_payments_overlap_and_disjoint_zones(client, connection, letters):
    await register(client, letters)
    await add(client)
    first, _ = await checkout(client)
    await add(client)
    second, _ = await checkout(client)
    responses = await asyncio.gather(pay(client, first["id"]), pay(client, second["id"]))
    assert [r.status_code for r in responses] == [200, 200], [r.text for r in responses]
    assert sorted(r.json()["status"] for r in responses) == ["paid", "pending"]
    assert any(r.json()["attempts"][-1]["reason"] == "membership_overlap" for r in responses)
    assert await connection.fetchval("SELECT count(*) FROM memberships") == 1
    await add(client, "pool")
    third, _ = await checkout(client)
    assert (await pay(client, third["id"])).json()["status"] == "paid"
    await add(client, "both")
    cart = (await client.get("/api/v1/cart")).json()
    response = await client.post(
        "/api/v1/cart/quote", json={"cart_version": cart["version"], "currency": "BYN"}
    )
    assert response.json()["code"] == "membership_overlap"


async def test_pass_payment_does_not_redeem_and_stale_prices_need_review(
    client, connection, letters
):
    await register(client, letters)
    cart, _ = await add(client, kind="single_visit")
    await connection.execute(
        "UPDATE access_offers SET price_byn=17,revision=revision+1 WHERE code='GYM_VISIT'"
    )
    quote = await client.post(
        "/api/v1/cart/quote", json={"cart_version": cart["version"], "currency": "BYN"}
    )
    assert quote.json()["code"] == "price_changed"
    assert (
        await client.post("/api/v1/cart/refresh", json={"version": cart["version"]})
    ).status_code == 200
    order, _ = await checkout(client)
    assert (await pay(client, order["id"])).json()["status"] == "paid"
    passes = (await client.get("/api/v1/access")).json()
    assert passes[0]["redeemed_at"] is None and passes[0]["format"] == "single_visit"
    assert (await client.get("/api/v1/memberships")).json() == []


async def test_inactive_user_expiry_and_rate_limit(client, connection, letters):
    await register(client, letters)
    await connection.execute("UPDATE users SET is_active=false")
    assert (await client.get("/api/v1/orders")).status_code == 401
    await connection.execute("UPDATE users SET is_active=true")
    await connection.execute(
        "UPDATE auth_sessions SET expires_at=created_at+interval '1 millisecond'"
    )
    assert (await client.get("/api/v1/auth/session")).status_code == 401
    client.cookies.clear()
    for _ in range(10):
        await client.post(
            "/api/v1/auth/login", json={"email": "client@example.com", "password": "bad"}
        )
    response = await client.post(
        "/api/v1/auth/login", json={"email": "client@example.com", "password": PASSWORD}
    )
    assert response.status_code == 429
