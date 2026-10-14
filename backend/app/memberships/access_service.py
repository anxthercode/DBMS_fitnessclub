from app.memberships import access_repository as repo
from app.memberships.products import product


async def accesses(connection, user_id):
    items = {row["id"]: row for row in await repo.products(connection, user_id)}
    result = []
    for row in await repo.grants(connection, user_id):
        item = items[row["order_item_id"]]
        snapshot = product(item)
        result.append(
            dict(
                id=row["grant_id"],
                client_id=str(user_id),
                format=item["access_kind"],
                zones=snapshot["zones"],
                starts_at=row["starts_at"],
                ends_at=row["ends_at"],
                cancelled_at=row["cancelled_at"],
                redeemed_at=row["redeemed_at"],
                order_id=str(item["order_id"]),
                product=snapshot,
            )
        )
    return result
