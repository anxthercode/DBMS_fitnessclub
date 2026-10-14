from datetime import datetime
from uuid import uuid4

import pytest

from app.memberships.products import MINSK
from tests.test_auth_commerce import add, checkout, pay, register
from tests.test_staff_training import book, decision, login, slot, staff, training_item

pytestmark = pytest.mark.integration


@pytest.mark.parametrize("outcome", ["attended", "no_show"])
async def test_visit_history_evidence_normalization_and_access(
    client, connection, letters, outcome
):
    admin = await staff(connection)
    await staff(connection, "trainer@example.com", "TRAINER")
    await login(client, "trainer@example.com")
    training, _ = await slot(client)
    await client.post("/api/v1/auth/logout")
    user = await register(client, letters)
    await connection.execute(
        "UPDATE users SET phone='8 (029) 123-45-67' WHERE id=$1", int(user["id"])
    )
    today = datetime.now(MINSK).date().isoformat()
    await add(client, day=today)
    await add(client, kind="single_visit", day=today)
    await add(client, kind="single_visit", day=today)
    await training_item(client)
    order, _ = await checkout(client)
    await pay(client, order["id"])
    booking = (await book(client, training["id"])).json()
    await login(client, "trainer@example.com")
    await decision(client, booking["id"], "approved")
    await connection.execute(
        "UPDATE training_slots SET starts_at=starts_at-interval '4 days',"
        "ends_at=ends_at-interval '4 days'"
    )
    assert (await decision(client, booking["id"], outcome)).status_code == 200
    # An already-recorded pass entry fixture, independent of current opening hours.
    await connection.execute(
        "UPDATE single_visit_passes SET redeemed_at=now(),redeemed_by_user_id=$1 "
        "WHERE id=(SELECT min(id) FROM single_visit_passes)",
        admin,
    )
    phone = "+375291234567"
    await connection.execute(
        "INSERT INTO guest_visit_requests(name,phone,status) VALUES('Earlier',$1,'rejected')",
        phone,
    )
    await connection.execute(
        "INSERT INTO guest_visit_requests(name,phone,status) "
        "VALUES('Unrelated','+375291234568','rejected')"
    )
    application = (
        await client.post(
            "/api/v1/first-visits",
            json={
                "name": "Review",
                "phone": phone,
            },
        )
    ).json()
    endpoint = "/api/v1/admin/first-visits/" + application["id"]
    assert (await client.get(endpoint)).status_code == 403
    await login(client, "client@example.com")
    assert (await client.get(endpoint)).status_code == 403
    await client.post("/api/v1/auth/logout")
    assert (await client.get(endpoint)).status_code == 401
    await login(client, "admin@example.com")
    response = await client.get(endpoint)
    assert response.status_code == 200, response.text
    data = response.json()
    assert [a["id"] for a in data["accounts"]] == [user["id"]]
    assert "password_hash" not in data["accounts"][0]
    history = data["history"]
    assert len(history) == 5
    assert not any(row["person_name"] == "Unrelated" for row in history)
    assert sum(r["attendance_evidence"] for r in history) == (2 if outcome == "attended" else 1)
    assert not next(r for r in history if r["kind"] == "membership")["attendance_evidence"]
    assert next(r for r in history if r["kind"] == "training")["status"] == outcome
    assert (await client.get("/api/v1/admin/first-visits/999999")).status_code == 404


async def test_empty_visit_history_is_not_automatic_eligibility(client, connection):
    application = (
        await client.post(
            "/api/v1/first-visits",
            json={
                "name": "New visitor",
                "phone": "+441234567890",
            },
        )
    ).json()
    await staff(connection)
    await login(client, "admin@example.com")
    endpoint = "/api/v1/admin/first-visits/" + application["id"]
    result = (await client.get(endpoint)).json()
    assert result["accounts"] == result["history"] == []
    assert (
        await client.post(
            endpoint + "/decision",
            json={
                "status": "confirmed",
                "visit_date": datetime.now(MINSK).date().isoformat(),
                "zones": "gym",
                "eligibility_checked": False,
            },
        )
    ).status_code == 422


async def test_training_cart_edit_preserves_item_and_checks_price_and_version(client, connection):
    cart = await training_item(client)
    item_id = cart["items"][0]["id"]
    offers = (await client.get("/api/v1/training-offers")).json()
    pool = next(o for o in offers if o["zones"] == "pool")
    payload = {
        "selection": {"format": "training", "zones": "pool", "date": None, "months": None},
        "item_id": item_id,
        "cart_version": cart["version"],
        "expected_price_byn": "0.01",
        "expected_revision": pool["revision"],
        "idempotency_key": str(uuid4()),
    }
    response = await client.put("/api/v1/cart/items", json=payload)
    assert response.json()["code"] == "price_changed"
    payload["expected_price_byn"] = pool["price_byn"]
    edited = await client.put("/api/v1/cart/items", json=payload)
    assert edited.status_code == 200, edited.text
    assert len(edited.json()["items"]) == 1
    assert edited.json()["items"][0]["id"] == item_id
    assert edited.json()["items"][0]["product"]["zones"] == "pool"
    assert (await client.put("/api/v1/cart/items", json=payload)).json() == edited.json()
    payload["idempotency_key"] = str(uuid4())
    assert (await client.put("/api/v1/cart/items", json=payload)).json()["code"] == "cart_changed"
