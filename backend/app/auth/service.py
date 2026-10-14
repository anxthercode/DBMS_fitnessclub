import asyncio
import hashlib
import secrets

import asyncpg
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

from app.auth import mail
from app.auth import repository as repo
from app.core.errors import DomainError

hasher = PasswordHasher()
_dummy_hash = hasher.hash(secrets.token_urlsafe(24))
COOKIE = "northside_session"


def digest(token):
    return hashlib.sha256(token.encode()).digest()


async def throttle(request, action, email=None):
    ip = request.client.host if request.client else "unknown"
    await repo.throttle(request.app.state.pool, digest(action + ":ip:" + ip), 30)
    if email:
        await repo.throttle(request.app.state.pool, digest(action + ":email:" + email), 10)


async def user_for(request, required=True, client=False):
    token = request.cookies.get(COOKIE, "")
    user = await repo.current_user(request.app.state.pool, digest(token)) if token else None
    if user is None and (required or token):
        raise DomainError("unauthorized", 401)
    if user and client and user["role"] != "CLIENT":
        raise DomainError("forbidden", 403)
    return user


def set_cookie(response, request, token):
    settings = request.app.state.settings
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.session_hours * 3600,
        path="/",
    )


async def sign_in(request, response, data, register=False):
    await throttle(request, "register" if register else "login", str(data.email))
    pool = request.app.state.pool
    if register:
        password_hash = await asyncio.to_thread(hasher.hash, data.password)
        try:
            async with pool.acquire() as connection, connection.transaction():
                user = await repo.create_user(connection, data, password_hash)
                await repo.audit(connection, user["id"], "register")
        except asyncpg.UniqueViolationError as exc:
            raise DomainError("email_exists", 409) from exc
    else:
        user = await repo.by_email(pool, str(data.email))
        try:
            await asyncio.to_thread(
                hasher.verify, user["password_hash"] if user else _dummy_hash, data.password
            )
        except VerificationError as exc:
            raise DomainError("invalid_credentials", 401) from exc
        if not user or not user["is_active"]:
            raise DomainError("invalid_credentials", 401)
    token = secrets.token_urlsafe(32)
    async with pool.acquire() as connection, connection.transaction():
        locked = await repo.lock_user(connection, user["id"])
        # A password reset racing with login invalidates the old credential check.
        if not locked["is_active"] or locked["password_hash"] != user["password_hash"]:
            raise DomainError("invalid_credentials", 401)
        await repo.revoke_session(connection, digest(request.cookies.get(COOKIE, "")))
        await repo.new_session(
            connection, user["id"], digest(token), request.app.state.settings.session_hours
        )
        # Commerce provides this hook once the next migration is present.
        from app.cart.repository import claim_guest_cart

        await claim_guest_cart(connection, user["id"], request.cookies.get("northside_guest", ""))
        await repo.audit(connection, user["id"], "login")
    set_cookie(response, request, token)
    response.delete_cookie("northside_guest", path="/")
    return repo.public_user(locked)


async def issue_email(request, user, purpose):
    token = secrets.token_urlsafe(32)
    async with request.app.state.pool.acquire() as connection, connection.transaction():
        user = await repo.lock_user(connection, user["id"])
        await repo.issue_token(connection, user["id"], digest(token), purpose)
    await mail.send(request.app.state.settings, user["email"], purpose, token, user["locale"])


async def redeem(request, token, purpose, password=None):
    await throttle(request, "redeem")
    hashed = digest(token)
    new_hash = await asyncio.to_thread(hasher.hash, password) if password else None
    async with request.app.state.pool.acquire() as connection, connection.transaction():
        user_id = await repo.token_owner(connection, hashed, purpose)
        if user_id is None:
            raise DomainError("invalid_token")
        await repo.lock_user(connection, user_id)
        if not await repo.consume_token(connection, hashed, purpose):
            raise DomainError("invalid_token")
        if purpose == "verify":
            await repo.verify_user(connection, user_id)
        else:
            await repo.reset_password(connection, user_id, new_hash)
        await repo.audit(
            connection, user_id, "email_verified" if purpose == "verify" else "password_reset"
        )
