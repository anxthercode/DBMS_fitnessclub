from fastapi import APIRouter, Request

from app.auth.service import user_for
from app.memberships.access_service import accesses

router = APIRouter(prefix="/api/v1", tags=["Purchased access"])


@router.get("/access")
async def access(request: Request):
    user = await user_for(request, client=True)
    async with request.app.state.pool.acquire() as connection:
        return await accesses(connection, user["id"])


@router.get("/memberships")
async def memberships(request: Request):
    rows = await access(request)
    return [
        {
            **row,
            "id": row["id"].removeprefix("membership-"),
            "plan_name_ru": "Абонемент",
            "plan_name_en": "Membership",
        }
        for row in rows
        if row["format"] == "membership"
    ]
