"""Insert fictional catalogue entries without overwriting existing prices or conditions."""

import asyncio

import asyncpg

from app.core.config import Settings

PRICES = {
    "GYM": ("gym_cardio", ("Зал и кардио", "Gym and cardio"), ["80", "210", "720", "15"]),
    "POOL": ("pool", ("Бассейн", "Pool"), ["90", "240", "840", "20"]),
    "BOTH": (None, ("Зал и бассейн", "Gym and pool"), ["120", "320", "1080", "28"]),
}


async def seed_catalogue(connection: asyncpg.Connection):
    from decimal import Decimal

    async with connection.transaction():
        # Serializes repeated seed processes without introducing an external service.
        await connection.execute("SELECT pg_advisory_xact_lock($1)", 73410901)
        await connection.executemany(
            """INSERT INTO zones (code, name_ru, name_en) VALUES ($1, $2, $3)
               ON CONFLICT (code) DO NOTHING""",
            [("gym_cardio", "Зал и кардио", "Gym and cardio"), ("pool", "Бассейн", "Pool")],
        )
        zones = {r["code"]: r["id"] for r in await connection.fetch("SELECT id, code FROM zones")}
        for code, (zone, names, prices) in PRICES.items():
            for months, price in zip([1, 3, 12, None], prices, strict=True):
                kind = "membership" if months else "single_visit"
                offer_id = await connection.fetchval(
                    """INSERT INTO access_offers
                       (code, access_kind, name_ru, name_en, duration_months, price_byn)
                       VALUES ($1, $2, $3, $4, $5, $6)
                       ON CONFLICT (code) DO NOTHING RETURNING id""",
                    f"{code}_{months or 'VISIT'}",
                    kind,
                    names[0],
                    names[1],
                    months,
                    Decimal(price),
                )
                if offer_id is not None:
                    selected_zones = [zone] if zone else ["gym_cardio", "pool"]
                    await connection.executemany(
                        "INSERT INTO access_offer_zones VALUES ($1, $2)",
                        [(offer_id, zones[z]) for z in selected_zones],
                    )


async def seed_commerce(connection):
    await connection.execute(
        "INSERT INTO training_offers(zone_id,price_byn) SELECT id,30 FROM zones "
        "ON CONFLICT(zone_id) DO NOTHING"
    )
    await connection.execute(
        """INSERT INTO discounts(code,kind,value) VALUES('NORTHSIDE10','percent',10)
           ON CONFLICT(code) DO NOTHING"""
    )
    async with connection.transaction():
        await connection.execute("SELECT pg_advisory_xact_lock($1)", 73410902)
        for currency, value in (("USD", "3.25"), ("EUR", "3.60")):
            from decimal import Decimal

            await connection.execute(
                """INSERT INTO exchange_rates(currency,byn_per_unit)
                   SELECT $1,$2 WHERE NOT EXISTS(SELECT 1 FROM exchange_rates WHERE currency=$1)""",
                currency,
                Decimal(value),
            )


async def main():
    connection = await asyncpg.connect(Settings().database_url.get_secret_value(), timeout=10)
    try:
        await seed_catalogue(connection)
        await seed_commerce(connection)
    finally:
        await connection.close()
    print("Demo access catalogue is ready; existing entries were preserved.")


if __name__ == "__main__":
    asyncio.run(main())
