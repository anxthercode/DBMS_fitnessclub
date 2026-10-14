from fastapi import APIRouter, Request

from app.auth.repository import audit
from app.core.staff import require_role, staff_transaction
from app.memberships import admin_repository as repo
from app.memberships import admin_schemas as schemas
from app.memberships.admin_service import save_offer
from app.orders.repository import view

router = APIRouter(prefix="/api/v1/admin", tags=["Administration"])


@router.get("/offers")
async def offers(request: Request):
    await require_role(request, "ADMIN")
    return await repo.offers(request.app.state.pool)


@router.post("/offers", status_code=201)
async def create(data: schemas.OfferInput, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        return await save_offer(conn, user["id"], data)


@router.put("/offers/{offer_id}")
async def update(offer_id: int, data: schemas.OfferInput, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        return await save_offer(conn, user["id"], data, offer_id)


@router.get("/orders")
async def orders(request: Request):
    await require_role(request, "ADMIN")
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch("SELECT id,client_id FROM orders ORDER BY id DESC")
        return [await view(conn, r["client_id"], r["id"]) for r in rows]


@router.get("/access")
async def access(request: Request):
    await require_role(request, "ADMIN")
    from app.memberships.access_service import accesses

    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch("SELECT id FROM users WHERE role='CLIENT' ORDER BY id")
        return [item for row in rows for item in await accesses(conn, row["id"])]


@router.get("/discounts")
async def discounts(request: Request):
    await require_role(request, "ADMIN")
    return await repo.discounts(request.app.state.pool)


@router.post("/discounts", status_code=204)
async def discount(data: schemas.DiscountInput, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        key = await conn.fetchval(
            """INSERT INTO discounts(code,kind,value,is_active) VALUES($1,$2,$3,$4)
               ON CONFLICT(code) DO UPDATE SET kind=$2,value=$3,is_active=$4 RETURNING id""",
            data.code,
            data.kind,
            data.value,
            data.is_active,
        )
        await audit(conn, user["id"], "discount_saved", key)


@router.get("/rates")
async def rates(request: Request):
    await require_role(request, "ADMIN")
    return await repo.rates(request.app.state.pool)


@router.post("/rates", status_code=204)
async def rate(data: schemas.RateInput, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        key = await conn.fetchval(
            "INSERT INTO exchange_rates(currency,byn_per_unit) VALUES($1,$2) RETURNING id",
            data.currency,
            data.byn_per_unit,
        )
        await audit(conn, user["id"], "exchange_rate_added", key)
