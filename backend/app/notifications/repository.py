async def list_notifications(connection, user_id):
    rows = await connection.fetch(
        "SELECT * FROM notifications WHERE recipient_user_id=$1 ORDER BY id DESC",
        user_id,
    )
    return [
        {
            **dict(row),
            "id": str(row["id"]),
            "recipient_user_id": str(user_id),
            "target": {"kind": "order", "id": str(row["order_id"])}
            if row["order_id"]
            else {"kind": "booking", "id": str(row["booking_id"])}
            if row["booking_id"]
            else None,
        }
        for row in rows
    ]


async def mark_read(connection, user_id, notification_id):
    return await connection.fetchval(
        """UPDATE notifications SET read_at=coalesce(read_at,clock_timestamp())
           WHERE id=$1 AND recipient_user_id=$2 RETURNING id""",
        notification_id,
        user_id,
    )
