import asyncio

import asyncpg

from app.auth.repository import audit, create_user, public_user
from app.auth.service import hasher
from app.core.errors import DomainError
from app.trainers import repository


async def create(conn, actor_id, data):
    hashed = await asyncio.to_thread(hasher.hash, data.password)
    try:
        user = await create_user(conn, data, hashed)
    except asyncpg.UniqueViolationError as exc:
        raise DomainError("email_exists", 409) from exc
    await conn.execute("UPDATE users SET role='TRAINER' WHERE id=$1", user["id"])
    await repository.save(conn, user["id"], data.profile)
    await audit(conn, actor_id, "trainer_created", user["id"])
    return {**public_user(user), "role": "TRAINER"}


async def update(conn, actor_id, trainer_id, data):
    if not await conn.fetchval("SELECT 1 FROM trainer_profiles WHERE user_id=$1", trainer_id):
        raise DomainError("not_found", 404)
    # Existing future slots must still fit the trainer's specialization.
    if await conn.fetchval("SELECT to_regclass('training_slots')"):
        if await conn.fetchval(
            "SELECT 1 FROM training_slots WHERE trainer_id=$1 AND status='scheduled' "
            "AND starts_at>clock_timestamp() AND zone<>$2 AND $2<>'both'",
            trainer_id,
            data.zones,
        ):
            raise DomainError("trainer_zone_conflict", 409)
    await repository.save(conn, trainer_id, data)
    await audit(conn, actor_id, "trainer_updated", trainer_id)
