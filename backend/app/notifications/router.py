from fastapi import APIRouter, Path, Request

from app.auth.service import user_for
from app.core.errors import DomainError
from app.notifications import repository as repo

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("")
async def notifications(request: Request):
    user = await user_for(request)
    return await repo.list_notifications(request.app.state.pool, user["id"])


@router.post("/{notification_id}/read", status_code=204)
async def read(request: Request, notification_id: int = Path(gt=0, le=9223372036854775807)):
    user = await user_for(request)
    if not await repo.mark_read(request.app.state.pool, user["id"], notification_id):
        raise DomainError("not_found", 404)
