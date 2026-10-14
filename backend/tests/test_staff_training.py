import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

import pytest

from app.auth.service import hasher
from app.memberships.products import MINSK
from tests.test_auth_commerce import PASSWORD, add, checkout, pay, register

pytestmark = pytest.mark.integration


async def staff(connection, email="admin@example.com", role="ADMIN", zones="both"):
    user_id = await connection.fetchval(
        "INSERT INTO users(email,password_hash,first_name,last_name,role) "
        "VALUES($1,$2,'Staff','Test',$3) RETURNING id",
        email,
        hasher.hash(PASSWORD),
        role,
    )
    if role == "TRAINER":
        await connection.execute(
            "INSERT INTO trainer_profiles VALUES($1,$2,5,'Coach','Coach','Bio','Bio','','')",
            user_id,
            zones,
        )
    return user_id


async def login(client, email):
    client.cookies.clear()
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text


async def training_item(client, zone="gym"):
    offers = (await client.get("/api/v1/training-offers")).json()
    offer = next(o for o in offers if o["zones"] == zone)
    response = await client.put(
        "/api/v1/cart/items",
        json={
            "selection": {"format": "training", "zones": zone, "months": None, "date": None},
            "expected_price_byn": offer["price_byn"],
            "expected_revision": offer["revision"],
            "idempotency_key": str(uuid4()),
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


async def slot(client, day=2, hour=12, zone="gym"):
    start = (datetime.now(MINSK) + timedelta(days=day)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    data = dict(
        zone=zone,
        title_ru="Тренировка",
        title_en="Training",
        starts_at=start.isoformat(),
        ends_at=(start + timedelta(hours=1)).isoformat(),
    )
    response = await client.post("/api/v1/training-slots", json=data)
    assert response.status_code == 201, response.text
    return response.json(), data


async def book(client, slot_id):
    return await client.post("/api/v1/bookings", json={"training_slot_id": str(slot_id)})


async def decision(client, booking_id, status, **fields):
    return await client.post(
        f"/api/v1/bookings/{booking_id}/decision", json={"status": status, **fields}
    )


async def test_first_visit_roles_phone_and_concurrent_redemption(client, connection):
    data = {"name": "Guest", "phone": "+375 (29) 123-45-67"}
    results = await asyncio.gather(
        *[client.post("/api/v1/first-visits", json=data) for _ in range(2)]
    )
    assert sorted(r.status_code for r in results) == [201, 409]
    key = next(r.json()["id"] for r in results if r.status_code == 201)
    assert (await client.get("/api/v1/admin/first-visits")).status_code == 401
    admin = await staff(connection)
    await login(client, "admin@example.com")
    endpoint = f"/api/v1/admin/first-visits/{key}/decision"
    assert (await client.post(endpoint, json={"status": "confirmed"})).status_code == 422
    response = await client.post(
        endpoint,
        json={
            "status": "confirmed",
            "zones": "both",
            "visit_date": datetime.now(MINSK).date().isoformat(),
            "eligibility_checked": True,
        },
    )
    assert response.status_code == 204, response.text
    responses = await asyncio.gather(
        *[client.post(endpoint, json={"status": "used"}) for _ in range(2)]
    )
    assert sorted(r.status_code for r in responses) == [204, 409]
    assert await connection.fetchval("SELECT used_by FROM guest_visit_requests") == admin
    assert (await client.post("/api/v1/first-visits", json=data)).status_code == 409
    assert (
        await connection.fetchval("SELECT count(*) FROM audit_logs WHERE action='first_visit_used'")
        == 1
    )


async def test_pass_redemption_is_admin_only_and_atomic(client, connection, letters):
    await register(client, letters)
    await add(client, kind="single_visit", day=datetime.now(MINSK).date().isoformat())
    order, _ = await checkout(client)
    assert (await pay(client, order["id"])).json()["status"] == "paid"
    key = await connection.fetchval("SELECT id FROM single_visit_passes")
    endpoint = f"/api/v1/admin/passes/{key}/redeem"
    assert (await client.post(endpoint)).status_code == 403
    await staff(connection)
    await login(client, "admin@example.com")
    results = await asyncio.gather(*[client.post(endpoint) for _ in range(2)])
    if 7 <= datetime.now(MINSK).hour < 23:
        assert sorted(r.status_code for r in results) == [204, 409]
        assert await connection.fetchval("SELECT redeemed_at FROM single_visit_passes")
    else:
        assert all(r.json()["code"] == "club_closed" for r in results)


async def test_training_mixed_purchase_booking_and_return(client, connection, letters):
    await staff(connection, "trainer@example.com", "TRAINER")
    await login(client, "trainer@example.com")
    training, payload = await slot(client)
    assert (await client.post("/api/v1/training-slots", json=payload)).json()[
        "code"
    ] == "slot_overlap"
    await client.post("/api/v1/auth/logout")
    user = await register(client, letters)
    # A paid session can be bought without a membership, but cannot be booked.
    await training_item(client)
    order, _ = await checkout(client)
    assert (await pay(client, order["id"])).json()["status"] == "paid"
    assert (await book(client, training["id"])).json()["code"] == "membership_required"
    await add(client, day=datetime.now(MINSK).date().isoformat())
    await training_item(client)
    mixed, _ = await checkout(client, "USD", "NORTHSIDE10")
    results = await asyncio.gather(*[pay(client, mixed["id"]) for _ in range(2)])
    assert all(r.json()["status"] == "paid" for r in results)
    assert await connection.fetchval("SELECT count(*) FROM training_credits") == 2
    assert (
        await connection.fetchval(
            "SELECT email_verified_at FROM users WHERE id=$1", int(user["id"])
        )
        is None
    )
    results = await asyncio.gather(*[book(client, training["id"]) for _ in range(2)])
    assert sorted(r.status_code for r in results) == [201, 409], [r.text for r in results]
    booking_id = next(r.json()["id"] for r in results if r.status_code == 201)
    assert (await decision(client, booking_id, "approved")).status_code == 403
    assert (await decision(client, booking_id, "cancelled")).json()["code"] == "reason_required"
    assert (
        await decision(client, booking_id, "cancelled", reason="Changed plans")
    ).status_code == 200
    assert all(
        c["status"] == "available" for c in (await client.get("/api/v1/training-credits")).json()
    )
    again = await book(client, training["id"])
    assert again.status_code == 201
    await login(client, "trainer@example.com")
    assert (await decision(client, again.json()["id"], "approved")).status_code == 200
    assert (await decision(client, again.json()["id"], "attended")).status_code == 409
    assert (await client.post(f"/api/v1/training-slots/{training['id']}/cancel")).status_code == 204
    assert await connection.fetchval("SELECT count(*) FROM bookings WHERE status='cancelled'") == 2


async def test_client_overlap_across_memberships_and_deactivation(client, connection, letters):
    await staff(connection, "trainer@example.com", "TRAINER")
    trainer2 = await staff(connection, "other@example.com", "TRAINER")
    await staff(connection)
    await login(client, "trainer@example.com")
    first, _ = await slot(client)
    await login(client, "other@example.com")
    second, _ = await slot(client, zone="pool")
    await client.post("/api/v1/auth/logout")
    user = await register(client, letters)
    for zone in ("gym", "pool"):
        await add(client, zones=zone, day=datetime.now(MINSK).date().isoformat())
        await training_item(client, zone)
    order, _ = await checkout(client)
    assert (await pay(client, order["id"])).json()["status"] == "paid"
    results = await asyncio.gather(book(client, first["id"]), book(client, second["id"]))
    assert sorted(r.status_code for r in results) == [201, 409]
    assert next(r.json()["code"] for r in results if r.status_code == 409) == "booking_overlap"
    booking_id = next(r.json()["id"] for r in results if r.status_code == 201)
    await login(client, "admin@example.com")
    assert (
        await client.patch(f"/api/v1/users/{user['id']}", json={"is_active": False})
    ).status_code == 200
    assert (
        await connection.fetchval("SELECT status FROM bookings WHERE id=$1", int(booking_id))
        == "cancelled"
    )
    assert (
        await connection.fetchval("SELECT count(*) FROM training_credits WHERE consumed_at IS NULL")
        == 2
    )
    assert (
        await client.patch(f"/api/v1/users/{trainer2}", json={"is_active": False})
    ).status_code == 200
    assert (
        await connection.fetchval(
            "SELECT status FROM training_slots WHERE id=$1", int(second["id"])
        )
        == "cancelled"
    )


async def test_staff_crud_archival_and_role_guards(client, connection, letters):
    await register(client, letters)
    assert (await client.get("/api/v1/users")).status_code == 403
    assert (await client.get("/api/v1/admin/orders")).status_code == 403
    await staff(connection)
    await login(client, "admin@example.com")
    trainer = await client.post(
        "/api/v1/admin/trainers",
        json={
            "email": "coach@example.com",
            "password": PASSWORD,
            "first_name": "Coach",
            "last_name": "Test",
            "profile": {
                "zones": "gym",
                "experience_years": 2,
                "specialization_ru": "Зал",
                "specialization_en": "Gym",
                "bio_ru": "Опыт",
                "bio_en": "Experience",
            },
        },
    )
    assert trainer.status_code == 201, trainer.text
    offer = (await client.get("/api/v1/admin/offers")).json()[0]
    offer_id = offer.pop("id")
    offer.pop("revision")
    offer["is_active"] = False
    assert (await client.put(f"/api/v1/admin/offers/{offer_id}", json=offer)).status_code == 200
    assert all(o["id"] != offer_id for o in (await client.get("/api/v1/access-offers")).json())
    assert (await client.get("/api/v1/admin/access")).status_code == 200
    await login(client, "coach@example.com")
    assert (await client.get("/api/v1/admin/first-visits")).status_code == 403
    assert (await client.get("/api/v1/orders")).status_code == 403


def test_cancellation_exact_twelve_hour_boundary():
    from app.bookings.service import client_cancellation_allowed

    start = datetime(2026, 10, 20, 12, tzinfo=MINSK)
    boundary = start - timedelta(hours=12)
    assert client_cancellation_allowed(boundary, start)
    assert not client_cancellation_allowed(boundary + timedelta(microseconds=1), start)


@pytest.mark.parametrize("outcome", ["attended", "no_show"])
async def test_attendance_consumes_once_and_overdue_pending_releases(
    client, connection, letters, outcome
):
    await staff(connection, "trainer@example.com", "TRAINER")
    await staff(connection, "other@example.com", "TRAINER")
    await login(client, "trainer@example.com")
    first, _ = await slot(client)
    second, _ = await slot(client, hour=14)
    await client.post("/api/v1/auth/logout")
    user = await register(client, letters)
    await add(client, day=datetime.now(MINSK).date().isoformat())
    for _ in range(2):
        await training_item(client)
    order, _ = await checkout(client)
    await pay(client, order["id"])
    a = (await book(client, first["id"])).json()
    b = (await book(client, second["id"])).json()
    await login(client, "other@example.com")
    assert (await client.get(f"/api/v1/bookings/{a['id']}")).status_code == 404
    assert (await decision(client, a["id"], "approved")).status_code == 404
    await login(client, "trainer@example.com")
    assert (await decision(client, a["id"], "approved")).status_code == 200
    # Backdate test slots only, simulating time passing without a production clock override.
    await connection.execute(
        "UPDATE training_slots SET starts_at=starts_at-interval '4 days',"
        "ends_at=ends_at-interval '4 days'"
    )
    results = await asyncio.gather(*[decision(client, a["id"], outcome) for _ in range(2)])
    assert sorted(r.status_code for r in results) == [200, 409]
    assert await connection.fetchval(
        "SELECT count(*) FROM training_credits WHERE consumed_at IS NOT NULL"
    ) == 1
    assert (await decision(client, a["id"], "cancelled")).status_code == 409
    assert (await decision(client, b["id"], "approved")).json()["code"] == "slot_unavailable"
    assert (await decision(client, b["id"], "no_show")).status_code == 409
    assert (await decision(client, b["id"], "rejected")).status_code == 200
    await login(client, "client@example.com")
    units = (await client.get("/api/v1/training-credits")).json()
    assert sorted(u["status"] for u in units) == ["available", "used"]
    assert len((await client.get("/api/v1/notifications")).json()) >= 5
    assert all(n["recipient_user_id"] == user["id"] for n in
               (await client.get("/api/v1/notifications")).json())


async def test_full_membership_zone_and_late_cancellation(client, connection, letters):
    await staff(connection, "trainer@example.com", "TRAINER")
    await login(client, "trainer@example.com")
    gym, _ = await slot(client)
    pool, _ = await slot(client, hour=14, zone="pool")
    await client.post("/api/v1/auth/logout")
    await register(client, letters)
    await add(client, zones="pool", kind="single_visit")
    await training_item(client)
    order, _ = await checkout(client)
    await pay(client, order["id"])
    assert (await book(client, gym["id"])).json()["code"] == "membership_required"
    await add(client, zones="gym", day=datetime.now(MINSK).date().isoformat())
    order, _ = await checkout(client)
    await pay(client, order["id"])
    assert (await book(client, pool["id"])).json()["code"] == "zone_required"
    original_end = await connection.fetchval("SELECT ends_at FROM memberships")
    await connection.execute(
        "UPDATE memberships SET ends_at=$1", datetime.fromisoformat(gym["starts_at"])
        + timedelta(minutes=59),
    )
    assert (await book(client, gym["id"])).json()["code"] == "membership_required"
    await connection.execute("UPDATE memberships SET ends_at=$1", original_end)
    booking = (await book(client, gym["id"])).json()
    await connection.execute(
        "UPDATE training_slots SET starts_at=now()+interval '11 hours',"
        "ends_at=now()+interval '12 hours' WHERE id=$1", int(gym["id"]),
    )
    assert (await decision(client, booking["id"], "cancelled", reason="Late change")).json()[
        "code"
    ] == "cancellation_deadline"
