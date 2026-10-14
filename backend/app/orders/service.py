from decimal import Decimal

from app.auth.repository import audit
from app.cart import repository as cart_repo
from app.cart import service as cart_service
from app.core.errors import DomainError
from app.memberships.products import fingerprint
from app.orders import repository as repo


async def checkout(connection, user, cart, data):
    hashed = fingerprint(data)
    prior = await repo.previous(connection, user["id"], data.idempotency_key)
    if prior:
        if prior["request_hash"] != hashed:
            raise DomainError("idempotency_conflict", 409)
        return await repo.view(connection, user["id"], prior["id"])
    quote = await cart_service.quote(connection, user, cart, data)
    if (
        Decimal(quote["total_byn"]),
        Decimal(quote["total_currency"]),
        Decimal(quote["byn_per_unit"]),
    ) != (
        data.expected_total_byn,
        data.expected_total_currency,
        data.expected_rate,
    ):
        raise DomainError("price_changed", 409)
    order_id = await repo.create(
        connection, user["id"], cart["id"], quote, data.idempotency_key, hashed
    )
    await cart_repo.clear(connection, cart["id"])
    await audit(connection, user["id"], "order_created", order_id)
    return await repo.view(connection, user["id"], order_id)
