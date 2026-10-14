import asyncpg

from app.memberships import repository
from app.memberships.schemas import AccessOffer


async def list_access_offers(pool: asyncpg.Pool) -> list[AccessOffer]:
    zone_names = {
        ("gym_cardio",): "gym",
        ("pool",): "pool",
        ("gym_cardio", "pool"): "both",
    }
    return [
        AccessOffer(
            id=str(row["id"]),
            format=row["access_kind"],
            zones=zone_names[tuple(row["zone_codes"])],
            months=row["duration_months"],
            price_byn=format(row["price_byn"], ".2f"),
            revision=row["revision"],
        )
        for row in await repository.list_access_offers(pool)
    ]
