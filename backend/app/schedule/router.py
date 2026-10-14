from fastapi import APIRouter, Request

from app.auth.repository import audit
from app.auth.service import user_for
from app.core.errors import DomainError
from app.core.staff import require_role, staff_transaction
from app.schedule import repository as repo
from app.schedule import schemas, service

router = APIRouter(prefix="/api/v1", tags=["Schedule and paid sessions"])


@router.get("/training-offers")
async def offers(request: Request):
    return await repo.offers(request.app.state.pool)


@router.get("/admin/training-offers")
async def admin_offers(request: Request):
    await require_role(request, "ADMIN")
    return await repo.offers(request.app.state.pool, True)


@router.put("/admin/training-offers/{offer_id}", status_code=204)
async def update_offer(offer_id: int, data: schemas.TrainingOfferInput, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        found = await conn.fetchval(
            "UPDATE training_offers SET price_byn=$2,is_active=$3,revision=revision+1 "
            "WHERE id=$1 RETURNING id",
            offer_id,
            data.price_byn,
            data.is_active,
        )
        if not found:
            raise DomainError("not_found", 404)
        await audit(conn, user["id"], "training_offer_saved", offer_id)


@router.get("/training-credits")
async def credits(request: Request):
    user = await user_for(request, client=True)
    return await repo.credits(request.app.state.pool, user["id"])


@router.get("/training-slots")
async def slots(request: Request):
    return await repo.slots(request.app.state.pool, public=True)


@router.get("/staff/training-slots")
async def staff_slots(request: Request):
    user = await require_role(request, "TRAINER", "ADMIN")
    return await repo.slots(
        request.app.state.pool, user["id"] if user["role"] == "TRAINER" else None
    )


@router.post("/training-slots", status_code=201)
async def create(data: schemas.SlotInput, request: Request):
    async with staff_transaction(request, "TRAINER") as (conn, user):
        return await service.save_slot(conn, user, data)


@router.put("/training-slots/{slot_id}")
async def update(slot_id: int, data: schemas.SlotInput, request: Request):
    async with staff_transaction(request, "TRAINER") as (conn, user):
        return await service.save_slot(conn, user, data, slot_id)


@router.post("/training-slots/{slot_id}/cancel", status_code=204)
async def cancel(slot_id: int, request: Request):
    async with staff_transaction(request, "TRAINER", "ADMIN") as (conn, user):
        await service.cancel_slot(conn, user, slot_id)
