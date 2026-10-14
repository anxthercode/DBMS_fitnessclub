from datetime import timedelta

from app.auth.repository import audit, lock_user
from app.bookings import repository as repo
from app.cart.repository import existing_memberships
from app.core.errors import DomainError
from app.memberships.products import zone_codes


def client_cancellation_allowed(now, starts_at):
    return now <= starts_at - timedelta(hours=12)


async def eligibility(conn, client_id, slot_id, exclude_booking=None):
    await lock_user(conn, client_id, client=True)
    slot = await conn.fetchrow(
        "SELECT s.*,u.is_active,p.zones AS trainer_zones FROM training_slots s "
        "JOIN users u ON u.id=s.trainer_id JOIN trainer_profiles p ON p.user_id=u.id "
        "WHERE s.id=$1 FOR UPDATE OF s",
        slot_id,
    )
    now = await conn.fetchval("SELECT clock_timestamp()")
    if (
        not slot
        or slot["status"] != "scheduled"
        or slot["starts_at"] <= now
        or not slot["is_active"]
        or slot["trainer_zones"] not in (slot["zone"], "both")
    ):
        raise DomainError("slot_unavailable", 409)
    code = zone_codes(slot["zone"])[0]
    memberships = await existing_memberships(conn, client_id)
    covering = [
        m
        for m in memberships
        if m["starts_at"] <= slot["starts_at"] and m["ends_at"] >= slot["ends_at"]
    ]
    if not covering:
        raise DomainError("membership_required", 409)
    membership = next((m for m in covering if code in m["zone_codes"]), None)
    if not membership:
        raise DomainError("zone_required", 409)
    if await conn.fetchval(
        "SELECT 1 FROM bookings WHERE training_slot_id=$1 "
        "AND status IN ('pending','approved','attended','no_show') "
        "AND ($2::bigint IS NULL OR id<>$2)",
        slot_id,
        exclude_booking,
    ):
        raise DomainError("slot_full", 409)
    if await conn.fetchval(
        """SELECT 1 FROM bookings b JOIN memberships m ON m.id=b.membership_id
            JOIN training_slots s ON s.id=b.training_slot_id
            WHERE m.client_id=$1 AND b.status IN ('pending','approved')
            AND s.starts_at<$3 AND s.ends_at>$2 AND ($4::bigint IS NULL OR b.id<>$4)""",
        client_id,
        slot["starts_at"],
        slot["ends_at"],
        exclude_booking,
    ):
        raise DomainError("booking_overlap", 409)
    credit = await conn.fetchval(
        """SELECT c.id FROM training_credits c
            JOIN order_item_zones iz ON iz.order_item_id=c.order_item_id
            JOIN zones z ON z.id=iz.zone_id
            WHERE c.client_id=$1 AND c.consumed_at IS NULL AND z.code=$2 AND NOT EXISTS(
                SELECT 1 FROM bookings b WHERE b.training_credit_id=c.id
                AND b.status IN ('pending','approved','attended','no_show')
                AND ($3::bigint IS NULL OR b.id<>$3)) ORDER BY c.id LIMIT 1 FOR UPDATE OF c""",
        client_id,
        code,
        exclude_booking,
    )
    if not credit:
        raise DomainError("training_credit_required", 409)
    return membership["id"], credit, slot


async def book(conn, user, slot_id):
    membership_id, credit_id, slot = await eligibility(conn, user["id"], slot_id)
    booking_id = await conn.fetchval(
        "INSERT INTO bookings(membership_id,training_credit_id,training_slot_id) "
        "VALUES($1,$2,$3) RETURNING id",
        membership_id,
        credit_id,
        slot_id,
    )
    await audit(conn, user["id"], "booking_requested", booking_id)
    await repo.notify(conn, user["id"], slot["trainer_id"], booking_id, "pending")
    return await repo.view(conn, user, booking_id)


async def change(conn, actor, booking_id, status, reason=None):
    row = await conn.fetchrow(repo.BOOKING_QUERY + " WHERE b.id=$1", booking_id)
    if (
        not row
        or (actor["role"] == "CLIENT" and row["client_id"] != actor["id"])
        or (actor["role"] == "TRAINER" and row["trainer_id"] != actor["id"])
    ):
        raise DomainError("not_found", 404)
    # Do not require an active client for club cancellation of a deactivated account.
    await conn.fetchrow("SELECT id FROM users WHERE id=$1 FOR UPDATE", row["client_id"])
    await conn.fetchrow("SELECT id FROM bookings WHERE id=$1 FOR UPDATE", booking_id)
    now = await conn.fetchval("SELECT clock_timestamp()")
    transitions = {
        "pending": {"approved", "rejected", "cancelled"},
        "approved": {"cancelled", "attended", "no_show"},
    }
    if status not in transitions.get(row["status"], set()):
        raise DomainError("booking_changed", 409)
    if actor["role"] == "CLIENT":
        if status != "cancelled":
            raise DomainError("forbidden", 403)
        if not reason or not 1 <= len(reason.strip()) <= 500:
            raise DomainError("reason_required")
        if not client_cancellation_allowed(now, row["starts_at"]):
            raise DomainError("cancellation_deadline", 409)
    if status == "approved":
        await eligibility(conn, row["client_id"], row["training_slot_id"], booking_id)
    if status in ("attended", "no_show"):
        if now < row["ends_at"]:
            raise DomainError("booking_changed", 409)
        await conn.execute(
            "UPDATE training_credits SET consumed_at=clock_timestamp() WHERE id=$1",
            row["training_credit_id"],
        )
        await conn.execute(
            "UPDATE training_slots SET status='completed' WHERE id=$1", row["training_slot_id"]
        )
    await conn.execute(
        "UPDATE bookings SET status=$2,reason=$3,decided_at=clock_timestamp(),decided_by=$4 "
        "WHERE id=$1",
        booking_id,
        status,
        reason.strip() if reason and reason.strip() else None,
        actor["id"],
    )
    await audit(conn, actor["id"], "booking_" + status, booking_id)
    await repo.notify(conn, row["client_id"], row["trainer_id"], booking_id, status)
    return await repo.view(conn, actor, booking_id)


async def release_user(conn, actor_id, user_id, role):
    rows = await conn.fetch(
        repo.BOOKING_QUERY + " WHERE b.status IN ('pending','approved') "
        "AND s.starts_at>clock_timestamp() AND "
        "(($1='CLIENT' AND m.client_id=$2) OR ($1='TRAINER' AND s.trainer_id=$2)) "
        "ORDER BY b.id",
        role,
        user_id,
    )
    for row in rows:
        await change(
            conn, {"id": actor_id, "role": "ADMIN"}, row["id"], "cancelled", "Account deactivated"
        )
    if role == "TRAINER":
        await conn.execute(
            "UPDATE training_slots SET status='cancelled' WHERE trainer_id=$1 "
            "AND starts_at>clock_timestamp() AND status='scheduled'",
            user_id,
        )
