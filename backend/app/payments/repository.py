async def previous(connection, order_id, key):
    return await connection.fetchrow(
        "SELECT * FROM payments WHERE order_id=$1 AND idempotency_key=$2",
        order_id,
        key,
    )


async def record(connection, order_id, data, reason):
    await connection.execute(
        """INSERT INTO payments(order_id,idempotency_key,requested_success,status,reason)
           VALUES($1,$2,$3,$4,$5)""",
        order_id,
        data.idempotency_key,
        data.successful,
        "failed" if reason else "succeeded",
        reason,
    )


async def issue(connection, user_id, item):
    if item["access_kind"] == "training":
        await connection.execute(
            "INSERT INTO training_credits(client_id,order_item_id) VALUES($1,$2)",
            user_id,
            item["id"],
        )
        return
    if item["access_kind"] == "membership":
        membership_id = await connection.fetchval(
            "INSERT INTO memberships(client_id,starts_at,ends_at) VALUES($1,$2,$3) RETURNING id",
            user_id,
            item["starts_at"],
            item["ends_at"],
        )
        await connection.execute(
            "INSERT INTO membership_issuances VALUES($1,$2)", membership_id, item["id"]
        )
    else:
        await connection.execute(
            """INSERT INTO single_visit_passes(client_id,order_item_id,starts_at,ends_at)
               VALUES($1,$2,$3,$4)""",
            user_id,
            item["id"],
            item["starts_at"],
            item["ends_at"],
        )


async def notify(connection, user_id, order_id):
    await connection.execute(
        """INSERT INTO notifications(recipient_user_id,order_id,title_ru,title_en,body_ru,body_en)
           VALUES($1,$2,$3,$4,$5,$6)""",
        user_id,
        order_id,
        "Заказ оплачен",
        "Order paid",
        "Имитация оплаты завершена. Покупки появились в кабинете.",
        "Simulated payment completed. Purchases are in your account.",
    )
