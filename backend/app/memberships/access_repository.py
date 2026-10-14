async def grants(connection, user_id):
    return await connection.fetch(
        """SELECT 'membership-'||m.id AS grant_id,m.client_id,m.starts_at,m.ends_at,
                  m.cancelled_at,NULL::timestamptz AS redeemed_at,mi.order_item_id
           FROM memberships m JOIN membership_issuances mi ON mi.membership_id=m.id
           WHERE m.client_id=$1
           UNION ALL SELECT 'visit-'||p.id,p.client_id,p.starts_at,p.ends_at,p.cancelled_at,
                  p.redeemed_at,p.order_item_id FROM single_visit_passes p WHERE p.client_id=$1""",
        user_id,
    )


async def products(connection, user_id):
    return await connection.fetch(
        """SELECT i.*,array_agg(z.code ORDER BY z.code) AS zone_codes FROM order_items i
           JOIN orders o ON o.id=i.order_id JOIN order_item_zones iz ON iz.order_item_id=i.id
           JOIN zones z ON z.id=iz.zone_id WHERE o.client_id=$1 AND o.status='paid'
           GROUP BY i.id""",
        user_id,
    )
