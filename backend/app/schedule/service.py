import asyncpg

from app.auth.repository import audit
from app.core.errors import DomainError
from app.memberships.products import MINSK
from app.schedule import repository as repo


async def save_slot(conn, user, data, slot_id=None):
    now = await conn.fetchval("SELECT clock_timestamp()")
    if data.starts_at <= now:
        raise DomainError("slot_unavailable", 409)
    start, end = data.starts_at.astimezone(MINSK), data.ends_at.astimezone(MINSK)
    if (
        start.date() != end.date()
        or start.hour < 7
        or end.hour > 23
        or (end.hour == 23 and (end.minute or end.second or end.microsecond))
    ):
        raise DomainError("club_closed")
    profile = await conn.fetchrow("SELECT * FROM trainer_profiles WHERE user_id=$1", user["id"])
    if not profile or profile["zones"] not in (data.zone, "both"):
        raise DomainError("trainer_zone_conflict", 409)
    if slot_id:
        slot = await conn.fetchrow("SELECT * FROM training_slots WHERE id=$1 FOR UPDATE", slot_id)
        if not slot or slot["trainer_id"] != user["id"]:
            raise DomainError("not_found", 404)
        if slot["starts_at"] <= now or slot["status"] != "scheduled":
            raise DomainError("slot_unavailable", 409)
        if await conn.fetchval("SELECT 1 FROM bookings WHERE training_slot_id=$1", slot_id):
            raise DomainError("slot_has_bookings", 409)
    try:
        values = (user["id"], data.zone, data.title_ru, data.title_en, data.starts_at, data.ends_at)
        if slot_id:
            await conn.execute(
                "UPDATE training_slots SET trainer_id=$1,zone=$2,title_ru=$3,title_en=$4,"
                "starts_at=$5,ends_at=$6 WHERE id=$7",
                *values,
                slot_id,
            )
        else:
            slot_id = await conn.fetchval(
                "INSERT INTO training_slots(trainer_id,zone,title_ru,title_en,starts_at,ends_at) "
                "VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
                *values,
            )
    except asyncpg.ExclusionViolationError as exc:
        raise DomainError("slot_overlap", 409) from exc
    await audit(conn, user["id"], "slot_saved", slot_id)
    return await repo.slot(conn, slot_id)


async def cancel_slot(conn, actor, slot_id):
    from app.bookings.service import change

    row = await conn.fetchrow("SELECT * FROM training_slots WHERE id=$1 FOR UPDATE", slot_id)
    if not row or (actor["role"] != "ADMIN" and row["trainer_id"] != actor["id"]):
        raise DomainError("not_found", 404)
    if row["status"] != "scheduled":
        raise DomainError("slot_unavailable", 409)
    if await conn.fetchval(
        "SELECT 1 FROM bookings WHERE training_slot_id=$1 AND status IN ('attended','no_show')",
        slot_id,
    ):
        raise DomainError("booking_changed", 409)
    for booking in await conn.fetch(
        "SELECT id FROM bookings WHERE training_slot_id=$1 AND status IN ('pending','approved')",
        slot_id,
    ):
        await change(conn, actor, booking["id"], "cancelled", "Club cancellation")
    await conn.execute("UPDATE training_slots SET status='cancelled' WHERE id=$1", slot_id)
    await audit(conn, actor["id"], "slot_cancelled", slot_id)
