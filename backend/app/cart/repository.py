from app.auth.service import digest
from app.memberships.products import product


async def ensure_cart(connection, client_id=None, guest_hash=None):
    if client_id:
        await connection.execute(
            "INSERT INTO carts(client_id) VALUES($1) ON CONFLICT(client_id) DO NOTHING",
            client_id,
        )
        return await connection.fetchrow(
            "SELECT * FROM carts WHERE client_id=$1 FOR UPDATE", client_id
        )
    await connection.execute(
        "INSERT INTO carts(guest_hash) VALUES($1) ON CONFLICT(guest_hash) DO NOTHING",
        guest_hash,
    )
    return await connection.fetchrow(
        "SELECT * FROM carts WHERE guest_hash=$1 FOR UPDATE", guest_hash
    )


async def claim_guest_cart(connection, client_id, guest_token):
    target = await ensure_cart(connection, client_id=client_id)
    if not guest_token:
        return
    guest = await connection.fetchrow(
        "SELECT * FROM carts WHERE guest_hash=$1 FOR UPDATE",
        digest(guest_token),
    )
    if not guest:
        return
    await connection.execute(
        "UPDATE cart_items SET cart_id=$1 WHERE cart_id=$2", target["id"], guest["id"]
    )
    await connection.execute(
        """INSERT INTO cart_requests SELECT $1,idempotency_key,request_hash FROM cart_requests
           WHERE cart_id=$2 ON CONFLICT DO NOTHING""",
        target["id"],
        guest["id"],
    )
    # Revoke guest access after claiming; preserve old keys in their original scope.
    await connection.execute(
        "UPDATE carts SET guest_hash=$1,version=version+1 WHERE id=$2",
        digest(guest_token + ":claimed"),
        guest["id"],
    )
    await bump(connection, target["id"])


async def item_rows(connection, parent_id, order=False):
    table, parent, zone_table, zone_parent = (
        ("order_items", "order_id", "order_item_zones", "order_item_id")
        if order
        else ("cart_items", "cart_id", "cart_item_zones", "cart_item_id")
    )
    return await connection.fetch(
        f"""SELECT i.*,array_agg(z.code ORDER BY z.code) AS zone_codes
            FROM {table} i JOIN {zone_table} iz ON iz.{zone_parent}=i.id
            JOIN zones z ON z.id=iz.zone_id WHERE i.{parent}=$1 GROUP BY i.id ORDER BY i.id""",
        parent_id,
    )


async def cart_view(connection, cart_id):
    row = await connection.fetchrow("SELECT * FROM carts WHERE id=$1", cart_id)
    items = await item_rows(connection, cart_id)
    return {
        "id": str(row["id"]),
        "version": row["version"],
        "items": [{"id": str(item["id"]), "product": product(item)} for item in items],
    }


async def bump(connection, cart_id):
    await connection.execute("UPDATE carts SET version=version+1 WHERE id=$1", cart_id)


async def offer(connection, selection):
    from app.memberships.products import zone_codes

    if selection.format == "training":
        return await connection.fetchrow(
            "SELECT o.* FROM training_offers o JOIN zones z ON z.id=o.zone_id "
            "WHERE z.code=$1 AND z.is_active AND o.is_active FOR SHARE OF o",
            zone_codes(selection.zones)[0],
        )

    # Parent locks serialize against catalogue updates; values stay bound.
    ids = await connection.fetch(
        """SELECT id FROM access_offers WHERE access_kind=$1
           AND duration_months IS NOT DISTINCT FROM $2 ORDER BY id FOR SHARE""",
        selection.format,
        selection.months,
    )
    return await connection.fetchrow(
        """SELECT o.* FROM access_offers o JOIN access_offer_zones oz ON oz.access_offer_id=o.id
           JOIN zones z ON z.id=oz.zone_id WHERE o.id=ANY($1::bigint[]) AND o.is_active
           GROUP BY o.id HAVING array_agg(z.code ORDER BY z.code)=$2::text[] AND
               bool_and(z.is_active)
           ORDER BY o.id LIMIT 1""",
        [row["id"] for row in ids],
        zone_codes(selection.zones),
    )


async def save_item(connection, cart_id, selection, offer_row, start, end, item_id=None):
    values = (
        offer_row["id"] if selection.format != "training" else None,
        offer_row["revision"],
        selection.format,
        selection.months,
        selection.date,
        offer_row["price_byn"],
        start,
        end,
        offer_row["id"] if selection.format == "training" else None,
    )
    if item_id:
        await connection.execute(
            """UPDATE cart_items SET access_offer_id=$1,offer_revision=$2,access_kind=$3,
               duration_months=$4,selected_date=$5,price_byn=$6,starts_at=$7,ends_at=$8
               ,training_offer_id=$9 WHERE id=$10 AND cart_id=$11""",
            *values,
            item_id,
            cart_id,
        )
        await connection.execute("DELETE FROM cart_item_zones WHERE cart_item_id=$1", item_id)
    else:
        item_id = await connection.fetchval(
            """INSERT INTO cart_items(access_offer_id,offer_revision,access_kind,duration_months,
               selected_date,price_byn,starts_at,ends_at,training_offer_id,cart_id)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
               RETURNING id""",
            *values,
            cart_id,
        )
    if selection.format == "training":
        await connection.execute(
            "INSERT INTO cart_item_zones SELECT $1,zone_id FROM training_offers WHERE id=$2",
            item_id,
            offer_row["id"],
        )
        return
    await connection.execute(
        """INSERT INTO cart_item_zones SELECT $1,zone_id FROM access_offer_zones
           WHERE access_offer_id=$2""",
        item_id,
        offer_row["id"],
    )


async def previous_request(connection, cart_id, key):
    return await connection.fetchval(
        "SELECT request_hash FROM cart_requests WHERE cart_id=$1 AND idempotency_key=$2",
        cart_id,
        key,
    )


async def record_request(connection, cart_id, key, fingerprint):
    await connection.execute(
        "INSERT INTO cart_requests VALUES($1,$2,$3)", cart_id, key, fingerprint
    )


async def remove(connection, cart_id, item_id):
    return await connection.fetchval(
        "DELETE FROM cart_items WHERE cart_id=$1 AND id=$2 RETURNING id",
        cart_id,
        item_id,
    )


async def clear(connection, cart_id):
    await connection.execute("DELETE FROM cart_items WHERE cart_id=$1", cart_id)
    await bump(connection, cart_id)


async def discount(connection, code):
    return await connection.fetchrow(
        "SELECT * FROM discounts WHERE code=$1 AND is_active FOR SHARE", code
    )


async def rate(connection, currency):
    return await connection.fetchrow(
        """SELECT * FROM exchange_rates WHERE currency=$1 AND effective_at<=clock_timestamp()
           ORDER BY effective_at DESC,id DESC LIMIT 1 FOR SHARE""",
        currency,
    )


async def existing_memberships(connection, client_id):
    return await connection.fetch(
        """SELECT m.*,array_agg(z.code ORDER BY z.code) AS zone_codes FROM memberships m
           JOIN membership_issuances mi ON mi.membership_id=m.id
           JOIN order_item_zones iz ON iz.order_item_id=mi.order_item_id
           JOIN zones z ON z.id=iz.zone_id
           WHERE m.client_id=$1 AND m.cancelled_at IS NULL GROUP BY m.id""",
        client_id,
    )
