from app.core.staff import dto

SLOT_QUERY = """
    SELECT s.*,u.first_name||' '||u.last_name AS trainer_name,
        (SELECT count(*) FROM bookings b WHERE b.training_slot_id=s.id
         AND b.status IN ('pending','approved','attended','no_show'))::int AS reserved_count
    FROM training_slots s JOIN users u ON u.id=s.trainer_id
"""


def slot_dto(row):
    return {**dto(row), "training_type": "individual", "capacity": 1}


async def slots(conn, trainer_id=None, public=False):
    rows = await conn.fetch(
        SLOT_QUERY + " WHERE ($1::bigint IS NULL OR s.trainer_id=$1) "
        "AND (NOT $2 OR (u.is_active AND s.starts_at>=clock_timestamp()-interval '1 day')) "
        "ORDER BY s.starts_at,s.id",
        trainer_id,
        public,
    )
    return [slot_dto(row) for row in rows]


async def slot(conn, slot_id):
    row = await conn.fetchrow(SLOT_QUERY + " WHERE s.id=$1", slot_id)
    return slot_dto(row) if row else None


async def offers(conn, admin=False):
    return [
        dto(r)
        for r in await conn.fetch(
            "SELECT o.*,CASE z.code WHEN 'gym_cardio' THEN 'gym' ELSE 'pool' END AS zones "
            "FROM training_offers o JOIN zones z ON z.id=o.zone_id "
            "WHERE $1 OR (o.is_active AND z.is_active) ORDER BY o.id",
            admin,
        )
    ]


async def credits(conn, client_id):
    return [
        dto(r)
        for r in await conn.fetch(
            """
        SELECT c.id,c.consumed_at,i.order_id,
            CASE z.code WHEN 'gym_cardio' THEN 'gym' ELSE 'pool' END AS zone,
            CASE WHEN c.consumed_at IS NOT NULL THEN 'used'
                 WHEN b.id IS NOT NULL THEN 'reserved' ELSE 'available' END AS status,
            b.id AS booking_id
        FROM training_credits c JOIN order_items i ON i.id=c.order_item_id
        JOIN order_item_zones iz ON iz.order_item_id=i.id JOIN zones z ON z.id=iz.zone_id
        LEFT JOIN bookings b ON b.training_credit_id=c.id AND b.status IN ('pending','approved')
        WHERE c.client_id=$1 ORDER BY c.id
    """,
            client_id,
        )
    ]
