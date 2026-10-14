from fastapi import APIRouter, Request

from app.auth.service import user_for
from app.bookings import repository, schemas, service
from app.core.errors import DomainError
from app.core.staff import staff_transaction

router = APIRouter(prefix="/api/v1", tags=["Bookings"])


@router.get("/bookings")
async def bookings(request: Request):
    user = await user_for(request)
    async with request.app.state.pool.acquire() as conn:
        return await repository.list_bookings(conn, user)


@router.get("/bookings/{booking_id}")
async def booking(booking_id: int, request: Request):
    user = await user_for(request)
    async with request.app.state.pool.acquire() as conn:
        return await repository.view(conn, user, booking_id)


@router.get("/training-slots/{slot_id}/eligibility")
async def eligibility(slot_id: int, request: Request):
    async with staff_transaction(request, "CLIENT") as (conn, user):
        try:
            membership_id, _, _ = await service.eligibility(conn, user["id"], slot_id)
            return {"eligible": True, "code": None, "membership_id": str(membership_id)}
        except DomainError as exc:
            if exc.status in (401, 403):
                raise
            return {"eligible": False, "code": exc.code, "membership_id": None}


@router.post("/bookings", status_code=201)
async def book(data: schemas.BookingInput, request: Request):
    async with staff_transaction(request, "CLIENT") as (conn, user):
        return await service.book(conn, user, int(data.training_slot_id))


@router.post("/bookings/{booking_id}/decision")
async def decide(booking_id: int, data: schemas.Decision, request: Request):
    async with staff_transaction(request, "CLIENT", "TRAINER", "ADMIN") as (conn, user):
        return await service.change(conn, user, booking_id, data.status, data.reason)
