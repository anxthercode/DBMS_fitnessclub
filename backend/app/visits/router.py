from fastapi import APIRouter, Request

from app.auth.service import throttle
from app.core.staff import require_role, staff_transaction
from app.visits import repository, schemas, service

router = APIRouter(prefix="/api/v1", tags=["Visits"])


@router.post("/first-visits", status_code=201)
async def apply(data: schemas.Application, request: Request):
    await throttle(request, "first-visit")
    async with request.app.state.pool.acquire() as conn, conn.transaction():
        return await service.apply(conn, data)


@router.get("/admin/first-visits")
async def applications(request: Request):
    await require_role(request, "ADMIN")
    return await repository.applications(request.app.state.pool)


@router.post("/admin/first-visits/{request_id}/decision", status_code=204)
async def decide(request_id: int, data: schemas.VisitDecision, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        await service.decide(conn, user["id"], request_id, data)


@router.get("/admin/first-visits/{request_id}")
async def detail(request_id: int, request: Request):
    await require_role(request, "ADMIN")
    async with request.app.state.pool.acquire() as conn:
        async with conn.transaction(isolation="repeatable_read", readonly=True):
            return await service.detail(conn, request_id)


@router.get("/admin/passes")
async def passes(request: Request):
    await require_role(request, "ADMIN")
    return await repository.passes(request.app.state.pool)


@router.post("/admin/passes/{pass_id}/redeem", status_code=204)
async def redeem(pass_id: int, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        await service.redeem(conn, user["id"], pass_id)
