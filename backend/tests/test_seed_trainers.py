import asyncio

import asyncpg
import pytest

from app.seed_trainers import seed_trainers

pytestmark = pytest.mark.integration


async def test_concurrent_seed_is_idempotent_and_public_profiles_are_safe(
    connection, database_url, client,
):
    other = await asyncpg.connect(database_url)
    try:
        counts = await asyncio.gather(seed_trainers(connection), seed_trainers(other))
    finally:
        await other.close()
    assert sum(counts) == 3
    response = await client.get("/api/v1/trainers")
    profiles = response.json()
    assert response.status_code == 200
    assert len(profiles) == 3
    assert {p["portrait_key"] for p in profiles} == {
        "trainer-01", "trainer-02", "trainer-03",
    }
    assert all("email" not in p and "password_hash" not in p for p in profiles)
    assert not await connection.fetchval(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email_verified_at IS NOT NULL)"
    )


async def test_seed_preserves_existing_accounts_and_profile_edits(connection):
    collision_id = await connection.fetchval(
        """INSERT INTO users(email,password_hash,first_name,last_name)
           VALUES('daniel.coursework@northside.example','existing','Existing','Client')
           RETURNING id"""
    )
    assert await seed_trainers(connection) == 2
    assert await connection.fetchval("SELECT role FROM users WHERE id=$1", collision_id) == "CLIENT"
    assert not await connection.fetchval(
        "SELECT 1 FROM trainer_profiles WHERE user_id=$1", collision_id,
    )
    await connection.execute(
        "UPDATE trainer_profiles SET bio_ru='Edited by administrator' "
        "WHERE portrait_key='trainer-02'"
    )
    await connection.execute(
        "UPDATE users SET is_active=false WHERE id IN "
        "(SELECT user_id FROM trainer_profiles WHERE portrait_key='trainer-02')"
    )
    assert await seed_trainers(connection) == 0
    assert await connection.fetchval(
        "SELECT bio_ru FROM trainer_profiles WHERE portrait_key='trainer-02'"
    ) == "Edited by administrator"
    assert not await connection.fetchval(
        "SELECT is_active FROM users WHERE id IN "
        "(SELECT user_id FROM trainer_profiles WHERE portrait_key='trainer-02')"
    )


async def test_portrait_constraints_and_public_assignment_rejection(connection, client):
    await seed_trainers(connection)
    with pytest.raises(asyncpg.CheckViolationError):
        await connection.execute("UPDATE trainer_profiles SET portrait_key='../unknown'")
    with pytest.raises(asyncpg.UniqueViolationError):
        await connection.execute("UPDATE trainer_profiles SET portrait_key='trainer-01'")
    response = await client.put("/api/v1/admin/trainers/1", json={"portrait_key": "trainer-01"})
    assert response.status_code in (401, 422)
