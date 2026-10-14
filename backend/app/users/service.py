from app.auth.repository import audit, lock_user, public_user
from app.users.repository import update_profile


async def update(pool, user_id, data):
    async with pool.acquire() as connection, connection.transaction():
        await lock_user(connection, user_id)
        result = await update_profile(connection, user_id, data)
        await audit(connection, user_id, "profile_updated")
        return public_user(result)
