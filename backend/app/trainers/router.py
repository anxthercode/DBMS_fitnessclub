from fastapi import APIRouter, Request

from app.core.staff import require_role, staff_transaction
from app.trainers import repository, schemas, service

router = APIRouter(prefix="/api/v1", tags=["Trainers"])


@router.get("/trainers")
async def trainers(request: Request):
    return await repository.profiles(request.app.state.pool)


@router.get("/admin/trainers")
async def staff_trainers(request: Request):
    await require_role(request, "ADMIN")
    return await repository.profiles(request.app.state.pool, True)


@router.post("/admin/trainers", status_code=201)
async def create(data: schemas.CreateTrainer, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        return await service.create(conn, user["id"], data)


@router.put("/admin/trainers/{trainer_id}", status_code=204)
async def update(trainer_id: int, data: schemas.TrainerProfile, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        await service.update(conn, user["id"], trainer_id, data)
