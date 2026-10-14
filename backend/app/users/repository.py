async def update_profile(connection, user_id, data):
    return await connection.fetchrow(
        """UPDATE users SET first_name=$1,last_name=$2,phone=$3,locale=$4
           WHERE id=$5 RETURNING *""",
        data.first_name,
        data.last_name,
        data.phone or None,
        data.locale,
        user_id,
    )
