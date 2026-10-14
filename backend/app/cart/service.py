import secrets
from contextlib import asynccontextmanager
from decimal import Decimal

from app.auth.repository import lock_user
from app.auth.service import digest, user_for
from app.cart import repository as repo
from app.cart.schemas import Selection
from app.core.errors import DomainError
from app.memberships.products import amount, check_overlap, fingerprint, period, zones_name


@asynccontextmanager
async def transaction(request, response, required=False):
    user = await user_for(request, required=required, client=True)
    guest = request.cookies.get("northside_guest", "")
    if not user and not guest:
        guest = secrets.token_urlsafe(32)
        response.set_cookie(
            "northside_guest",
            guest,
            httponly=True,
            secure=request.app.state.settings.cookie_secure,
            samesite="lax",
            max_age=30 * 86400,
            path="/",
        )
    async with request.app.state.pool.acquire() as connection, connection.transaction():
        if user:
            user = await lock_user(connection, user["id"], client=True)
        cart = await repo.ensure_cart(
            connection, user["id"] if user else None, digest(guest) if not user else None
        )
        yield connection, user, cart


def check_version(cart, version):
    if version != cart["version"]:
        raise DomainError("cart_changed", 409)


def selection_for(row):
    return Selection(
        format=row["access_kind"],
        months=row["duration_months"],
        date=row["selected_date"],
        zones=zones_name(row["zone_codes"]),
    )


async def put(connection, cart, data):
    previous = await repo.previous_request(connection, cart["id"], data.idempotency_key)
    hashed = fingerprint(data)
    if previous:
        if previous != hashed:
            raise DomainError("idempotency_conflict", 409)
        return await repo.cart_view(connection, cart["id"])
    if data.item_id and data.cart_version is None:
        raise DomainError("invalid_request")
    if data.cart_version is not None:
        check_version(cart, data.cart_version)
    items = await repo.item_rows(connection, cart["id"])
    if data.item_id and not any(str(row["id"]) == data.item_id for row in items):
        raise DomainError("not_found", 404)
    if not data.item_id and len(items) >= 12:
        raise DomainError("cart_limit")
    start, end = period(data.selection)
    offer = await repo.offer(connection, data.selection)
    if not offer:
        raise DomainError("offer_unavailable")
    if offer["price_byn"] != data.expected_price_byn or offer["revision"] != data.expected_revision:
        raise DomainError("price_changed", 409)
    await repo.save_item(
        connection,
        cart["id"],
        data.selection,
        offer,
        start,
        end,
        int(data.item_id) if data.item_id else None,
    )
    await repo.record_request(connection, cart["id"], data.idempotency_key, hashed)
    await repo.bump(connection, cart["id"])
    return await repo.cart_view(connection, cart["id"])


async def refresh(connection, cart, version):
    check_version(cart, version)
    for row in await repo.item_rows(connection, cart["id"]):
        selection = selection_for(row)
        start, end = period(selection)
        offer = await repo.offer(connection, selection)
        if not offer:
            raise DomainError("offer_unavailable")
        await repo.save_item(connection, cart["id"], selection, offer, start, end, row["id"])
    await repo.bump(connection, cart["id"])
    return await repo.cart_view(connection, cart["id"])


async def quote(connection, user, cart, data):
    check_version(cart, data.cart_version)
    items = await repo.item_rows(connection, cart["id"])
    if not items:
        raise DomainError("cart_empty")
    if len(items) > 12:
        raise DomainError("cart_limit")
    # Deterministic catalogue lock order across clients and mixed selections.
    for row in sorted(items, key=lambda item: (item["access_kind"], item["duration_months"] or 0)):
        selection = selection_for(row)
        period(selection)
        offer = await repo.offer(connection, selection)
        if not offer:
            raise DomainError("offer_unavailable")
        if (offer["id"], offer["revision"], offer["price_byn"]) != (
            row["training_offer_id"]
            if row["access_kind"] == "training"
            else row["access_offer_id"],
            row["offer_revision"],
            row["price_byn"],
        ):
            raise DomainError("price_changed", 409)
    check_overlap(items, await repo.existing_memberships(connection, user["id"]) if user else [])
    subtotal = sum(row["price_byn"] for row in items)
    code = (data.promo_code or "").strip().upper() or None
    discount = await repo.discount(connection, code) if code else None
    if code and not discount:
        raise DomainError("invalid_promo")
    reduction = Decimal(0)
    if discount:
        reduction = discount["value"]
        if discount["kind"] == "percent":
            reduction = Decimal(amount(subtotal * reduction / 100))
        reduction = min(reduction, subtotal)
    rate = await repo.rate(connection, data.currency) if data.currency != "BYN" else None
    if data.currency != "BYN" and not rate:
        raise DomainError("rate_unavailable")
    byn_rate = rate["byn_per_unit"] if rate else Decimal("1.00000000")
    total = subtotal - reduction
    return dict(
        cart_version=cart["version"],
        subtotal_byn=amount(subtotal),
        discount_byn=amount(reduction),
        total_byn=amount(total),
        promo_code=code,
        currency=data.currency,
        total_currency=amount(total / byn_rate),
        byn_per_unit=format(byn_rate, ".8f"),
        rate_date=rate["effective_at"] if rate else None,
    )
