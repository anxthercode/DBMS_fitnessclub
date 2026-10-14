from app.auth.repository import audit
from app.core.errors import DomainError
from app.memberships import admin_repository as repo


async def save_offer(conn, actor_id, data, offer_id=None):
    if offer_id and not await conn.fetchval(
        "SELECT id FROM access_offers WHERE id=$1 FOR UPDATE", offer_id
    ):
        raise DomainError("not_found", 404)
    for other in await repo.offers(conn):
        if str(offer_id) == other["id"]:
            continue
        if other["code"] == data.code or (
            data.is_active
            and other["is_active"]
            and (other["format"], other["months"], other["zones"])
            == (data.format, data.months, data.zones)
        ):
            raise DomainError("offer_conflict", 409)
    offer_id = await repo.save_offer(conn, data, offer_id)
    await audit(conn, actor_id, "offer_saved", offer_id)
    return {"id": str(offer_id)}
