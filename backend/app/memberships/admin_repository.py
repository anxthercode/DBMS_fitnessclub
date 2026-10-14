from app.core.staff import dto
from app.memberships.products import zone_codes, zones_name


async def offers(conn):
    rows = await conn.fetch("""
        SELECT o.*,array_agg(z.code ORDER BY z.code) AS zone_codes FROM access_offers o
        JOIN access_offer_zones oz ON oz.access_offer_id=o.id JOIN zones z ON z.id=oz.zone_id
        GROUP BY o.id ORDER BY o.id
    """)
    return [
        dict(
            id=str(r["id"]),
            code=r["code"],
            format=r["access_kind"],
            months=r["duration_months"],
            zones=zones_name(r["zone_codes"]),
            name_ru=r["name_ru"],
            name_en=r["name_en"],
            description_ru=r["description_ru"],
            description_en=r["description_en"],
            price_byn=str(r["price_byn"]),
            is_active=r["is_active"],
            revision=r["revision"],
        )
        for r in rows
    ]


async def save_offer(conn, data, offer_id=None):
    values = (
        data.code,
        data.format,
        data.months,
        data.name_ru,
        data.name_en,
        data.description_ru,
        data.description_en,
        data.price_byn,
        data.is_active,
    )
    if offer_id:
        await conn.execute(
            """UPDATE access_offers SET code=$1,access_kind=$2,duration_months=$3,name_ru=$4,
               name_en=$5,description_ru=$6,description_en=$7,price_byn=$8,is_active=$9,
               revision=revision+1,updated_at=clock_timestamp() WHERE id=$10""",
            *values,
            offer_id,
        )
        await conn.execute("DELETE FROM access_offer_zones WHERE access_offer_id=$1", offer_id)
    else:
        offer_id = await conn.fetchval(
            """INSERT INTO access_offers(code,access_kind,duration_months,name_ru,name_en,
               description_ru,description_en,price_byn,is_active)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id""",
            *values,
        )
    await conn.execute(
        "INSERT INTO access_offer_zones SELECT $1,id FROM zones WHERE code=ANY($2::text[])",
        offer_id,
        zone_codes(data.zones),
    )
    return offer_id


async def discounts(conn):
    return [dto(r) for r in await conn.fetch("SELECT * FROM discounts ORDER BY id")]


async def rates(conn):
    return [
        dto(r)
        for r in await conn.fetch("SELECT * FROM exchange_rates ORDER BY effective_at DESC,id DESC")
    ]
