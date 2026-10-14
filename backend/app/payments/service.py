from app.auth.repository import audit, lock_user
from app.cart.repository import existing_memberships, item_rows
from app.core.errors import DomainError
from app.memberships.products import check_overlap, validate_date
from app.orders import repository as orders
from app.payments import repository as repo


async def pay(connection, user_id, order_id, data):
    await lock_user(connection, user_id, client=True)
    order = await orders.own(connection, user_id, order_id)
    previous = await repo.previous(connection, order_id, data.idempotency_key)
    if previous:
        if previous["requested_success"] != data.successful:
            raise DomainError("idempotency_conflict", 409)
        return await orders.view(connection, user_id, order_id)
    if order["status"] == "paid":
        return await orders.view(connection, user_id, order_id)
    if order["status"] != "pending":
        raise DomainError("order_changed", 409)
    items = await item_rows(connection, order_id, order=True)
    reason = None if data.successful else "payment_declined"
    if not reason:
        try:
            for item in items:
                if item["access_kind"] != "training":
                    validate_date(item["selected_date"])
            check_overlap(items, await existing_memberships(connection, user_id))
        except DomainError as exc:
            reason = exc.code
    await repo.record(connection, order_id, data, reason)
    if not reason:
        for item in items:
            await repo.issue(connection, user_id, item)
        await orders.set_status(connection, order_id, "paid")
        await repo.notify(connection, user_id, order_id)
    await audit(connection, user_id, "payment_failed" if reason else "payment_succeeded", order_id)
    return await orders.view(connection, user_id, order_id)
