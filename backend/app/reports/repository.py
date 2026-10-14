from app.core.staff import dto


async def sales(conn, start, end, as_of):
    return [
        dto(r)
        for r in await conn.fetch(
            """
        SELECT o.id,p.created_at AS paid_at,
            (SELECT count(*) FROM order_items i WHERE i.order_id=o.id) AS item_count,
            o.subtotal_byn,o.discount_byn,o.total_byn
        FROM orders o JOIN payments p ON p.order_id=o.id AND p.status='succeeded'
        WHERE p.created_at >= $1 AND p.created_at < $2 AND p.created_at <= $3
        ORDER BY p.created_at,o.id
    """,
            start,
            end,
            as_of,
        )
    ]


async def summaries(conn, start, end, as_of):
    sales_rows = await conn.fetch(
        """
        SELECT (p.created_at AT TIME ZONE 'Europe/Minsk')::date AS day,
            count(*) AS orders, sum(o.total_byn) AS revenue_byn
        FROM orders o JOIN payments p ON p.order_id=o.id AND p.status='succeeded'
        WHERE p.created_at >= $1 AND p.created_at < $2 AND p.created_at <= $3
        GROUP BY 1 ORDER BY 1
    """,
        start,
        end,
        as_of,
    )
    attendance = await conn.fetch(
        """
        SELECT s.trainer_id,u.first_name||' '||u.last_name AS trainer_name,
            count(*) FILTER(WHERE b.status='attended') AS attended,
            count(*) FILTER(WHERE b.status='no_show') AS no_show
        FROM bookings b JOIN training_slots s ON s.id=b.training_slot_id
        JOIN users u ON u.id=s.trainer_id WHERE s.starts_at >= $1 AND s.starts_at < $2
        AND s.starts_at <= $3 AND b.status IN ('attended','no_show')
        GROUP BY s.trainer_id,u.first_name,u.last_name ORDER BY s.trainer_id
    """,
        start,
        end,
        as_of,
    )
    popularity = await conn.fetch(
        """
        SELECT i.access_offer_id,o.code,i.access_kind,i.duration_months,
            count(*) AS purchased_count
        FROM order_items i JOIN access_offers o ON o.id=i.access_offer_id
        JOIN payments p ON p.order_id=i.order_id AND p.status='succeeded'
        WHERE p.created_at >= $1 AND p.created_at < $2 AND p.created_at <= $3
        GROUP BY i.access_offer_id,o.code,i.access_kind,i.duration_months
        ORDER BY purchased_count DESC,i.access_offer_id
    """,
        start,
        end,
        as_of,
    )
    occupancy = await conn.fetch(
        """
        SELECT s.trainer_id,u.first_name||' '||u.last_name AS trainer_name,
            sum(extract(epoch FROM least(s.ends_at,$2)-greatest(s.starts_at,$1))/60)
                AS scheduled_minutes,
            coalesce(sum(extract(epoch FROM least(s.ends_at,$2)-greatest(s.starts_at,$1))/60)
                FILTER(WHERE EXISTS(SELECT 1 FROM bookings b WHERE b.training_slot_id=s.id
                AND b.status IN ('pending','approved','attended','no_show'))),0) AS booked_minutes
        FROM training_slots s JOIN users u ON u.id=s.trainer_id
        WHERE s.starts_at < $2 AND s.ends_at > $1 AND s.status<>'cancelled'
        GROUP BY s.trainer_id,u.first_name,u.last_name ORDER BY s.trainer_id
    """,
        start,
        end,
    )
    return {
        "sales": [dto(r) for r in sales_rows],
        "attendance": [dto(r) for r in attendance],
        "popularity": [dto(r) for r in popularity],
        "occupancy": [dto(r) for r in occupancy],
    }
