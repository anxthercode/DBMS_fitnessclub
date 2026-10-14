from app.core.errors import DomainError
from app.core.staff import dto
from app.schedule.repository import slot

BOOKING_QUERY = """
    SELECT b.*,m.client_id,s.trainer_id,s.starts_at,s.ends_at,s.zone,
        u.first_name||' '||u.last_name AS client_name,
        (b.status='pending' AND s.starts_at<=clock_timestamp()) AS requires_attention
    FROM bookings b JOIN memberships m ON m.id=b.membership_id
    JOIN training_slots s ON s.id=b.training_slot_id JOIN users u ON u.id=m.client_id
"""


async def view(conn, user, booking_id):
    row = await conn.fetchrow(BOOKING_QUERY + " WHERE b.id=$1", booking_id)
    if (
        not row
        or (user["role"] == "CLIENT" and row["client_id"] != user["id"])
        or (user["role"] == "TRAINER" and row["trainer_id"] != user["id"])
    ):
        raise DomainError("not_found", 404)
    return {**dto(row), "slot": await slot(conn, row["training_slot_id"])}


async def list_bookings(conn, user):
    rows = await conn.fetch(
        BOOKING_QUERY + " WHERE $1='ADMIN' OR ($1='CLIENT' AND m.client_id=$2) "
        "OR ($1='TRAINER' AND s.trainer_id=$2) ORDER BY b.id DESC",
        user["role"],
        user["id"],
    )
    return [{**dto(row), "slot": await slot(conn, row["training_slot_id"])} for row in rows]


async def notify(conn, client_id, trainer_id, booking_id, status):
    names = {
        "pending": ("Заявка отправлена", "Booking requested"),
        "approved": ("Тренировка подтверждена", "Training approved"),
        "rejected": ("Заявка отклонена", "Booking rejected"),
        "cancelled": ("Заявка отменена", "Booking cancelled"),
        "attended": ("Посещение отмечено", "Attendance recorded"),
        "no_show": ("Неявка отмечена", "No-show recorded"),
    }
    ru, en = names[status]
    for recipient in (client_id, trainer_id):
        await conn.execute(
            "INSERT INTO notifications(recipient_user_id,booking_id,title_ru,title_en,"
            "body_ru,body_en) VALUES($1,$2,$3,$4,$3,$4)",
            recipient,
            booking_id,
            ru,
            en,
        )
