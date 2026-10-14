from fastapi import APIRouter, Path, Request, Response

from app.auth.repository import audit, lock_user
from app.auth.service import user_for
from app.cart.schemas import Checkout
from app.cart.service import transaction
from app.core.errors import DomainError
from app.orders import repository as repo
from app.orders import service

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


@router.post("", status_code=201)
async def checkout(data: Checkout, request: Request, response: Response):
    async with transaction(request, response, required=True) as (connection, user, cart):
        return await service.checkout(connection, user, cart, data)


@router.get("")
async def orders(request: Request):
    user = await user_for(request, client=True)
    async with request.app.state.pool.acquire() as connection:
        return [
            await repo.view(connection, user["id"], row["id"])
            for row in await repo.list_ids(connection, user["id"])
        ]


@router.get("/{order_id}")
async def order(request: Request, order_id: int = Path(gt=0, le=9223372036854775807)):
    user = await user_for(request, client=True)
    async with request.app.state.pool.acquire() as connection:
        return await repo.view(connection, user["id"], order_id)


@router.post("/{order_id}/cancel")
async def cancel(request: Request, order_id: int = Path(gt=0, le=9223372036854775807)):
    user = await user_for(request, client=True)
    async with request.app.state.pool.acquire() as connection, connection.transaction():
        await lock_user(connection, user["id"], client=True)
        row = await repo.own(connection, user["id"], order_id)
        if row["status"] != "pending":
            raise DomainError("order_changed", 409)
        await repo.set_status(connection, order_id, "cancelled")
        await audit(connection, user["id"], "order_cancelled", order_id)
        return await repo.view(connection, user["id"], order_id)
