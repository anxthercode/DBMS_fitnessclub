from contextlib import asynccontextmanager
from decimal import Decimal

from app.auth.repository import lock_user
from app.auth.service import user_for
from app.core.errors import DomainError


def dto(row):
    """Keep BIGINT identifiers and exact decimals safe across the JSON boundary."""
    return {
        k: str(v)
        if v is not None
        and (
            k == "id"
            or k.endswith("_id")
            or k in ("decided_by", "used_by")
            or isinstance(v, Decimal)
        )
        else v
        for k, v in dict(row).items()
    }


async def require_role(request, *roles):
    user = await user_for(request)
    if user["role"] not in roles:
        raise DomainError("forbidden", 403)
    return user


@asynccontextmanager
async def staff_transaction(request, *roles):
    user = await require_role(request, *roles)
    async with request.app.state.pool.acquire() as conn, conn.transaction():
        # A small coursework workload: one lock orders schedule/staff mutations,
        # including deactivation. Commerce only takes user locks and never this lock.
        await conn.execute("SELECT pg_advisory_xact_lock(73410903)")
        user = await lock_user(conn, user["id"])
        if user["role"] not in roles:
            raise DomainError("forbidden", 403)
        yield conn, user
