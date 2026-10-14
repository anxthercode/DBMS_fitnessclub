from fastapi import APIRouter, Request

from app.auth.repository import audit, public_user
from app.auth.schemas import Profile
from app.auth.service import user_for
from app.core.errors import DomainError
from app.core.staff import require_role, staff_transaction
from app.users.schemas import Active
from app.users.service import update

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.patch("/me")
async def profile(data: Profile, request: Request):
    user = await user_for(request)
    return await update(request.app.state.pool, user["id"], data)


@router.get("")
async def users(request: Request):
    await require_role(request, "ADMIN")
    return [
        public_user(row)
        for row in await request.app.state.pool.fetch("SELECT * FROM users ORDER BY id DESC")
    ]


@router.patch("/{user_id}")
async def active(user_id: int, data: Active, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, actor):
        user = await conn.fetchrow("SELECT * FROM users WHERE id=$1 FOR UPDATE", user_id)
        if not user:
            raise DomainError("not_found", 404)
        if user["role"] == "ADMIN":
            raise DomainError("forbidden", 403)
        if not data.is_active:
            if await conn.fetchval("SELECT to_regclass('bookings')"):
                from app.bookings.service import release_user

                await release_user(conn, actor["id"], user_id, user["role"])
            await conn.execute(
                "UPDATE auth_sessions SET revoked_at=clock_timestamp() WHERE user_id=$1", user_id
            )
        user = await conn.fetchrow(
            "UPDATE users SET is_active=$2 WHERE id=$1 RETURNING *", user_id, data.is_active
        )
        await audit(
            conn, actor["id"], "user_activated" if data.is_active else "user_deactivated", user_id
        )
        return public_user(user)
