from decimal import Decimal

from app.cart.repository import item_rows
from app.core.errors import DomainError
from app.memberships.products import amount, product


async def previous(connection, user_id, key):
    return await connection.fetchrow(
        "SELECT * FROM orders WHERE client_id=$1 AND idempotency_key=$2",
        user_id,
        key,
    )


async def own(connection, user_id, order_id):
    row = await connection.fetchrow(
        "SELECT * FROM orders WHERE id=$1 AND client_id=$2 FOR UPDATE",
        order_id,
        user_id,
    )
    if not row:
        raise DomainError("not_found", 404)
    return row


async def create(connection, user_id, cart_id, quote, key, hashed):
    fields = (
        "cart_version",
        "subtotal_byn",
        "discount_byn",
        "total_byn",
        "promo_code",
        "currency",
        "total_currency",
        "byn_per_unit",
        "rate_date",
    )
    values = [
        Decimal(quote[k])
        if k in ("subtotal_byn", "discount_byn", "total_byn", "total_currency", "byn_per_unit")
        else quote[k]
        for k in fields
    ]
    order_id = await connection.fetchval(
        """INSERT INTO orders(client_id,cart_version,subtotal_byn,discount_byn,total_byn,promo_code,
           currency,total_currency,byn_per_unit,rate_date,idempotency_key,request_hash)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id""",
        user_id,
        *values,
        key,
        hashed,
    )
    for row in await item_rows(connection, cart_id):
        item_id = await connection.fetchval(
            """INSERT INTO order_items(order_id,access_offer_id,offer_revision,access_kind,
               duration_months,selected_date,price_byn,starts_at,ends_at,training_offer_id)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id""",
            order_id,
            row["access_offer_id"],
            row["offer_revision"],
            row["access_kind"],
            row["duration_months"],
            row["selected_date"],
            row["price_byn"],
            row["starts_at"],
            row["ends_at"],
            row["training_offer_id"],
        )
        await connection.execute(
            "INSERT INTO order_item_zones SELECT $1,zone_id FROM cart_item_zones "
            "WHERE cart_item_id=$2",
            item_id,
            row["id"],
        )
    return order_id


async def view(connection, user_id, order_id):
    row = await connection.fetchrow(
        "SELECT * FROM orders WHERE id=$1 AND client_id=$2", order_id, user_id
    )
    if not row:
        raise DomainError("not_found", 404)
    output = dict(row)
    for field in ("request_hash", "idempotency_key"):
        output.pop(field)
    for field in ("id", "client_id"):
        output[field] = str(output[field])
    for field in ("subtotal_byn", "discount_byn", "total_byn", "total_currency"):
        output[field] = amount(output[field])
    output["byn_per_unit"] = format(row["byn_per_unit"], ".8f")
    output["items"] = [
        {"id": str(i["id"]), "product": product(i)}
        for i in await item_rows(connection, order_id, order=True)
    ]
    attempts = await connection.fetch(
        "SELECT id,created_at,status,reason FROM payments WHERE order_id=$1 ORDER BY id",
        order_id,
    )
    output["attempts"] = [{**dict(p), "id": str(p["id"])} for p in attempts]
    grants = await connection.fetch(
        """SELECT 'membership-'||mi.membership_id AS id FROM membership_issuances mi
           JOIN order_items i ON i.id=mi.order_item_id WHERE i.order_id=$1
           UNION ALL SELECT 'visit-'||p.id FROM single_visit_passes p
           JOIN order_items i ON i.id=p.order_item_id WHERE i.order_id=$1""",
        order_id,
    )
    output["access_ids"] = [r["id"] for r in grants]
    return output


async def list_ids(connection, user_id):
    return await connection.fetch(
        "SELECT id FROM orders WHERE client_id=$1 ORDER BY id DESC", user_id
    )


async def set_status(connection, order_id, status):
    await connection.execute("UPDATE orders SET status=$1 WHERE id=$2", status, order_id)
