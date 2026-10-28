from datetime import datetime, timedelta

import pytest

from app.auth.service import hasher
from app.memberships.products import MINSK
from app.prepare_local import account_templates, prepare_slots, prepare_staff

pytestmark = pytest.mark.integration


async def test_staff_login_slots_and_rerun_preserve_password_and_cancellations(connection, client):
    credentials = {a["email"]: "Local-test-2026!" for a in account_templates()}
    async with connection.transaction():
        trainers = await prepare_staff(connection, credentials)
        count = await prepare_slots(connection, trainers)
    assert count > 0
    for account in account_templates():
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": account["email"],
                "password": credentials[account["email"]],
            },
        )
        assert response.status_code == 200
        assert response.json()["role"] == account["role"]
        await client.post("/api/v1/auth/logout")
    user = trainers[0]
    digest = hasher.hash("Changed-local-password!")
    await connection.execute("UPDATE users SET password_hash=$1 WHERE id=$2", digest, user["id"])
    await connection.execute(
        "UPDATE training_slots SET status='cancelled' WHERE trainer_id=$1", user["id"]
    )
    async with connection.transaction():
        trainers = await prepare_staff(connection, credentials)
        assert await prepare_slots(connection, trainers) == 0
    assert (
        await connection.fetchval("SELECT password_hash FROM users WHERE id=$1", user["id"])
        == digest
    )
    assert await connection.fetchval("SELECT count(*) FROM training_slots") == count
    assert not await connection.fetchval(
        "SELECT 1 FROM training_slots WHERE starts_at<$1",
        datetime.now(MINSK) + timedelta(minutes=1),
    )


async def test_existing_staff_collision_is_not_adopted(connection):
    from app.prepare_local import ADMIN_EMAIL

    await connection.execute(
        "INSERT INTO users(email,password_hash,first_name,last_name,role) "
        "VALUES($1,'preserved','Existing','Admin','ADMIN')",
        ADMIN_EMAIL,
    )
    with pytest.raises(ValueError, match="Existing staff login preserved"):
        async with connection.transaction():
            await prepare_staff(
                connection, {a["email"]: "Test-password-2026!" for a in account_templates()}
            )
    assert (
        await connection.fetchval("SELECT password_hash FROM users WHERE email=$1", ADMIN_EMAIL)
        == "preserved"
    )
