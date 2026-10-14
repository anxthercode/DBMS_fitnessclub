from fastapi import APIRouter, Path, Request, Response

from app.cart import repository as repo
from app.cart import schemas, service
from app.core.errors import DomainError

router = APIRouter(prefix="/api/v1/cart", tags=["Cart"])


@router.get("")
async def cart(request: Request, response: Response):
    async with service.transaction(request, response) as (connection, _, cart):
        return await repo.cart_view(connection, cart["id"])


@router.put("/items")
async def put(data: schemas.PutItem, request: Request, response: Response):
    async with service.transaction(request, response) as (connection, _, cart):
        return await service.put(connection, cart, data)


@router.delete("/items/{item_id}")
async def remove(
    data: schemas.Version,
    request: Request,
    response: Response,
    item_id: int = Path(gt=0, le=9223372036854775807),
):
    async with service.transaction(request, response) as (connection, _, cart):
        service.check_version(cart, data.version)
        if not await repo.remove(connection, cart["id"], item_id):
            raise DomainError("not_found", 404)
        await repo.bump(connection, cart["id"])
        return await repo.cart_view(connection, cart["id"])


@router.post("/refresh")
async def refresh(data: schemas.Version, request: Request, response: Response):
    async with service.transaction(request, response) as (connection, _, cart):
        return await service.refresh(connection, cart, data.version)


@router.post("/quote")
async def quote(data: schemas.Quote, request: Request, response: Response):
    async with service.transaction(request, response) as (connection, user, cart):
        return await service.quote(connection, user, cart, data)
