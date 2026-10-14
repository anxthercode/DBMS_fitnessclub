import asyncpg


async def list_access_offers(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    return await pool.fetch(
        """
        SELECT o.id, o.access_kind, o.duration_months, o.price_byn, o.revision,
               array_agg(z.code ORDER BY z.code) AS zone_codes
        FROM access_offers AS o
        JOIN access_offer_zones AS oz ON oz.access_offer_id = o.id
        JOIN zones AS z ON z.id = oz.zone_id
        WHERE o.is_active = $1
        GROUP BY o.id
        HAVING bool_and(z.is_active)
        ORDER BY o.access_kind, o.duration_months NULLS LAST, o.id
        """,
        True,
    )
