from datetime import datetime

from app.auth.repository import audit
from app.core.errors import DomainError
from app.core.staff import dto
from app.memberships.products import MINSK, validate_date
from app.visits import repository as repo


async def detail(conn, request_id):
    row = await repo.application(conn, request_id)
    if not row:
        raise DomainError("not_found", 404)
    return {"application": dto(row), **await repo.phone_history(conn, row)}


async def apply(conn, data):
    await repo.lock_phone(conn, data.phone)
    if await conn.fetchval(
        "SELECT 1 FROM guest_visit_requests WHERE phone=$1 "
        "AND status IN ('pending','confirmed','used')",
        data.phone,
    ):
        raise DomainError("visit_already_requested", 409)
    request_id = await conn.fetchval(
        "INSERT INTO guest_visit_requests(name,phone) VALUES($1,$2) RETURNING id",
        data.name,
        data.phone,
    )
    await audit(conn, None, "first_visit_requested", request_id)
    return {"id": str(request_id), "status": "pending"}


async def decide(conn, actor_id, request_id, data):
    row = await conn.fetchrow("SELECT * FROM guest_visit_requests WHERE id=$1", request_id)
    if not row:
        raise DomainError("not_found", 404)
    await repo.lock_phone(conn, row["phone"])
    row = await conn.fetchrow(
        "SELECT * FROM guest_visit_requests WHERE id=$1 FOR UPDATE", request_id
    )
    valid = {"pending": {"confirmed", "rejected", "cancelled"}, "confirmed": {"used", "cancelled"}}
    if data.status not in valid.get(row["status"], set()):
        raise DomainError("visit_changed", 409)
    if data.status == "confirmed":
        validate_date(data.visit_date)
        if await conn.fetchval(
            "SELECT 1 FROM guest_visit_requests WHERE phone=$1 AND status='used'", row["phone"]
        ):
            raise DomainError("visit_already_used", 409)
        await repo.set_zones(conn, request_id, data.zones)
    if data.status == "used":
        if row["visit_date"] != datetime.now(MINSK).date():
            raise DomainError("invalid_date", 409)
        await conn.execute(
            "UPDATE guest_visit_requests SET status='used',used_at=clock_timestamp(),"
            "used_by=$2 WHERE id=$1",
            request_id,
            actor_id,
        )
    else:
        await conn.execute(
            "UPDATE guest_visit_requests SET status=$2,visit_date=coalesce($3,visit_date),"
            "decided_at=clock_timestamp(),decided_by=$4 WHERE id=$1",
            request_id,
            data.status,
            data.visit_date,
            actor_id,
        )
    await audit(conn, actor_id, "first_visit_" + data.status, request_id)


async def redeem(conn, actor_id, pass_id):
    row = await conn.fetchrow("SELECT * FROM single_visit_passes WHERE id=$1 FOR UPDATE", pass_id)
    now = await conn.fetchval("SELECT clock_timestamp()")
    if not row:
        raise DomainError("not_found", 404)
    if row["redeemed_at"] or row["cancelled_at"]:
        raise DomainError("pass_used", 409)
    if not row["starts_at"] <= now < row["ends_at"]:
        raise DomainError("invalid_date", 409)
    # The club's published opening hours are 07:00–23:00 Minsk.
    if not 7 <= now.astimezone(MINSK).hour < 23:
        raise DomainError("club_closed", 409)
    await conn.execute(
        "UPDATE single_visit_passes SET redeemed_at=clock_timestamp(),redeemed_by_user_id=$2 "
        "WHERE id=$1",
        pass_id,
        actor_id,
    )
    await audit(conn, actor_id, "pass_redeemed", pass_id)
