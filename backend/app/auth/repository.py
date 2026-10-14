from app.core.errors import DomainError

PUBLIC_FIELDS = (
    "id",
    "email",
    "role",
    "first_name",
    "last_name",
    "phone",
    "locale",
    "is_active",
    "email_verified_at",
)


def public_user(row):
    result = {field: row[field] for field in PUBLIC_FIELDS}
    result["id"] = str(result["id"])
    return result


async def current_user(connection, digest):
    return await connection.fetchrow(
        """SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id
           WHERE s.token_hash=$1 AND s.revoked_at IS NULL
             AND s.expires_at>clock_timestamp() AND u.is_active""",
        digest,
    )


async def lock_user(connection, user_id, client=False):
    row = await connection.fetchrow("SELECT * FROM users WHERE id=$1 FOR UPDATE", user_id)
    if not row or not row["is_active"]:
        raise DomainError("unauthorized", 401)
    if client and row["role"] != "CLIENT":
        raise DomainError("forbidden", 403)
    return row


async def audit(connection, user_id, action, record_id=None):
    await connection.execute(
        "INSERT INTO audit_logs(actor_id,action,record_id) VALUES($1,$2,$3)",
        user_id,
        action,
        record_id,
    )


async def by_email(connection, email):
    return await connection.fetchrow("SELECT * FROM users WHERE email=$1", email)


async def create_user(connection, data, password_hash):
    return await connection.fetchrow(
        """INSERT INTO users(email,password_hash,first_name,last_name,locale)
           VALUES($1,$2,$3,$4,$5) RETURNING *""",
        str(data.email),
        password_hash,
        data.first_name,
        data.last_name,
        data.locale,
    )


async def new_session(connection, user_id, digest, hours):
    await connection.execute(
        """INSERT INTO auth_sessions(token_hash,user_id,expires_at)
           VALUES($1,$2,clock_timestamp()+make_interval(hours=>$3))""",
        digest,
        user_id,
        hours,
    )


async def revoke_session(connection, digest):
    await connection.execute(
        "UPDATE auth_sessions SET revoked_at=clock_timestamp() WHERE token_hash=$1",
        digest,
    )


def token_table(purpose):
    return {"verify": "email_verification_tokens", "reset": "password_reset_tokens"}[purpose]


async def issue_token(connection, user_id, digest, purpose):
    table = token_table(purpose)
    await connection.execute(
        f"UPDATE {table} SET revoked_at=clock_timestamp() "
        "WHERE user_id=$1 AND used_at IS NULL AND revoked_at IS NULL",
        user_id,
    )
    await connection.execute(
        f"INSERT INTO {table}(token_hash,user_id,expires_at) "
        "VALUES($1,$2,clock_timestamp()+make_interval(hours=>$3))",
        digest,
        user_id,
        24 if purpose == "verify" else 1,
    )


async def token_owner(connection, digest, purpose):
    return await connection.fetchval(
        f"SELECT user_id FROM {token_table(purpose)} WHERE token_hash=$1",
        digest,
    )


async def consume_token(connection, digest, purpose):
    return await connection.fetchval(
        f"UPDATE {token_table(purpose)} SET used_at=clock_timestamp() WHERE token_hash=$1 "
        "AND used_at IS NULL AND revoked_at IS NULL AND expires_at>clock_timestamp() "
        "RETURNING user_id",
        digest,
    )


async def verify_user(connection, user_id):
    return await connection.fetchrow(
        "UPDATE users SET email_verified_at=clock_timestamp() WHERE id=$1 RETURNING *",
        user_id,
    )


async def reset_password(connection, user_id, password_hash):
    await connection.execute(
        "UPDATE users SET password_hash=$1 WHERE id=$2", password_hash, user_id
    )
    await connection.execute(
        "UPDATE auth_sessions SET revoked_at=clock_timestamp() WHERE user_id=$1",
        user_id,
    )


async def throttle(connection, key, limit):
    count = await connection.fetchval(
        """INSERT INTO auth_throttles(key,window_started,attempts)
           VALUES($1,clock_timestamp(),1) ON CONFLICT(key) DO UPDATE SET
           attempts=CASE WHEN auth_throttles.window_started < clock_timestamp()-interval '15
               minutes'
                         THEN 1 ELSE auth_throttles.attempts+1 END,
           window_started=CASE WHEN auth_throttles.window_started < clock_timestamp()-interval
               '15 minutes'
                         THEN clock_timestamp() ELSE auth_throttles.window_started END
           RETURNING attempts""",
        key,
    )
    if count > limit:
        raise DomainError("too_many_requests", 429)
