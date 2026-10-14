from app.core.staff import dto
from app.memberships.products import zone_codes

# Normalize the same Belarusian national notation accepted by application input.
PHONE_DIGITS = "regexp_replace(coalesce(u.phone,''),'[^0-9]','','g')"
PHONE_MATCH = (
    f"CASE WHEN length({PHONE_DIGITS})=11 AND left({PHONE_DIGITS},2)='80' "
    f"THEN '375'||substring({PHONE_DIGITS} FROM 3) ELSE {PHONE_DIGITS} END"
)


async def lock_phone(conn, phone):
    await conn.execute("SELECT pg_advisory_xact_lock(hashtextextended($1, 73410904))", phone)


async def applications(conn):
    rows = await conn.fetch(f"""
        SELECT r.*,coalesce((SELECT string_agg(z.code,',' ORDER BY z.code)
            FROM guest_visit_zones vz JOIN zones z ON z.id=vz.zone_id
            WHERE vz.request_id=r.id),'') AS zones,
            (SELECT count(*) FROM users u WHERE
                {PHONE_MATCH}=substring(r.phone FROM 2))
                AS matching_accounts,
            (SELECT count(*) FROM guest_visit_requests previous
             WHERE previous.phone=r.phone AND previous.id<>r.id) AS previous_applications
        FROM guest_visit_requests r ORDER BY r.id DESC
    """)
    return [dto(row) for row in rows]


async def application(conn, request_id):
    return await conn.fetchrow(
        """
        SELECT r.*,coalesce((SELECT string_agg(z.code,',' ORDER BY z.code)
            FROM guest_visit_zones vz JOIN zones z ON z.id=vz.zone_id
            WHERE vz.request_id=r.id),'') AS zones
        FROM guest_visit_requests r WHERE r.id=$1
    """,
        request_id,
    )


async def phone_history(conn, application_row):
    phone = application_row["phone"]
    accounts = await conn.fetch(
        "SELECT u.id,u.first_name,u.last_name,u.email,u.phone,u.role,u.is_active "
        f"FROM users u WHERE {PHONE_MATCH}=$1 ORDER BY u.id",
        phone[1:],
    )
    ids = [row["id"] for row in accounts]
    visits = await conn.fetch(
        """
        SELECT r.id,r.name AS person_name,r.status,r.created_at AS recorded_at,
            r.visit_date,r.used_at AS occurred_at,r.decided_at,
            a.first_name||' '||a.last_name AS actor_name,
            coalesce((SELECT string_agg(z.code,',' ORDER BY z.code)
                FROM guest_visit_zones vz JOIN zones z ON z.id=vz.zone_id
                WHERE vz.request_id=r.id),'') AS zones
        FROM guest_visit_requests r LEFT JOIN users a ON a.id=coalesce(r.used_by,r.decided_by)
        WHERE r.phone=$1 AND r.id<>$2 ORDER BY r.created_at DESC,r.id DESC
    """,
        phone,
        application_row["id"],
    )
    passes = await conn.fetch(
        """
        SELECT p.id,p.client_id,u.first_name||' '||u.last_name AS person_name,
            p.starts_at,p.ends_at,p.redeemed_at AS occurred_at,o.created_at AS recorded_at,
            i.order_id,a.first_name||' '||a.last_name AS actor_name,
            CASE WHEN p.redeemed_at IS NOT NULL THEN 'used'
                 WHEN p.cancelled_at IS NOT NULL THEN 'cancelled'
                 WHEN p.ends_at<=now() THEN 'expired' ELSE 'unused' END AS status,
            (SELECT string_agg(z.code,',' ORDER BY z.code) FROM order_item_zones iz
             JOIN zones z ON z.id=iz.zone_id WHERE iz.order_item_id=i.id) AS zones
        FROM single_visit_passes p JOIN users u ON u.id=p.client_id
        JOIN order_items i ON i.id=p.order_item_id JOIN orders o ON o.id=i.order_id
        LEFT JOIN users a ON a.id=p.redeemed_by_user_id WHERE p.client_id=ANY($1::bigint[])
    """,
        ids,
    )
    memberships = await conn.fetch(
        """
        SELECT m.id,m.client_id,u.first_name||' '||u.last_name AS person_name,
            m.starts_at,m.ends_at,o.created_at AS recorded_at,i.order_id,
            CASE WHEN m.cancelled_at IS NOT NULL THEN 'cancelled'
                 WHEN m.ends_at<=now() THEN 'expired'
                 WHEN m.starts_at>now() THEN 'upcoming' ELSE 'active' END AS status,
            (SELECT string_agg(z.code,',' ORDER BY z.code) FROM order_item_zones iz
             JOIN zones z ON z.id=iz.zone_id WHERE iz.order_item_id=i.id) AS zones
        FROM memberships m JOIN users u ON u.id=m.client_id
        JOIN membership_issuances mi ON mi.membership_id=m.id
        JOIN order_items i ON i.id=mi.order_item_id JOIN orders o ON o.id=i.order_id
        WHERE m.client_id=ANY($1::bigint[])
    """,
        ids,
    )
    bookings = await conn.fetch(
        """
        SELECT b.id,m.client_id,u.first_name||' '||u.last_name AS person_name,
            b.status,b.created_at AS recorded_at,b.decided_at,b.reason,
            s.starts_at,s.ends_at,s.zone AS zones,
            CASE WHEN b.status='attended' THEN s.starts_at END AS occurred_at,
            t.first_name||' '||t.last_name AS trainer_name,
            a.first_name||' '||a.last_name AS actor_name
        FROM bookings b JOIN memberships m ON m.id=b.membership_id
        JOIN users u ON u.id=m.client_id JOIN training_slots s ON s.id=b.training_slot_id
        JOIN users t ON t.id=s.trainer_id LEFT JOIN users a ON a.id=b.decided_by
        WHERE m.client_id=ANY($1::bigint[])
    """,
        ids,
    )
    history = []
    for kind, rows in (
        ("first_visit", visits),
        ("pass", passes),
        ("membership", memberships),
        ("training", bookings),
    ):
        for row in rows:
            entry = dto(row)
            entry["kind"] = kind
            entry["attendance_evidence"] = (
                kind in ("first_visit", "pass") and row["status"] == "used"
            ) or (kind == "training" and row["status"] == "attended")
            history.append(entry)
    history.sort(key=lambda r: r.get("occurred_at") or r["recorded_at"], reverse=True)
    return {"accounts": [dto(row) for row in accounts], "history": history}


async def set_zones(conn, request_id, zones):
    await conn.execute("DELETE FROM guest_visit_zones WHERE request_id=$1", request_id)
    await conn.execute(
        "INSERT INTO guest_visit_zones SELECT $1,id FROM zones WHERE code=ANY($2::text[])",
        request_id,
        zone_codes(zones),
    )


async def passes(conn):
    return [
        dto(r)
        for r in await conn.fetch("""
        SELECT p.*,u.first_name,u.last_name,u.email,u.phone,i.order_id,
            (SELECT string_agg(z.code,',' ORDER BY z.code) FROM order_item_zones iz
             JOIN zones z ON z.id=iz.zone_id WHERE iz.order_item_id=p.order_item_id) AS zones
        FROM single_visit_passes p JOIN users u ON u.id=p.client_id
        JOIN order_items i ON i.id=p.order_item_id ORDER BY p.id DESC
    """)
    ]
