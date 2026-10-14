from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.auth.router import router as auth_router
from app.bookings.router import router as bookings_router
from app.cart.router import router as cart_router
from app.core.config import Settings
from app.core.database import database_pool
from app.core.errors import DomainError
from app.memberships.access_router import router as access_router
from app.memberships.admin_router import router as admin_router
from app.memberships.router import router as memberships_router
from app.notifications.router import router as notifications_router
from app.orders.router import router as orders_router
from app.payments.router import router as payments_router
from app.reports.router import router as reports_router
from app.schedule.router import router as schedule_router
from app.trainers.router import router as trainers_router
from app.users.router import router as users_router
from app.visits.router import router as visits_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        async with database_pool(settings) as pool:
            app.state.pool = pool
            yield

    app = FastAPI(title="NORTHSIDE API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings

    @app.middleware("http")
    async def request_safety(request: Request, call_next):
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            origin = request.headers.get("origin")
            if (origin and origin not in settings.cors_origins) or request.headers.get(
                "x-northside-request"
            ) != "1":
                return JSONResponse(status_code=403, content={"code": "forbidden"})
            if not request.headers.get("content-type", "").startswith("application/json"):
                return JSONResponse(status_code=415, content={"code": "invalid_request"})
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Accept", "Content-Type", "X-Northside-Request"],
    )

    @app.exception_handler(asyncpg.PostgresError)
    @app.exception_handler(OSError)
    @app.exception_handler(TimeoutError)
    async def database_error(_request: Request, _exc: Exception):
        # Do not leak SQL, database addresses or credentials to the browser.
        return JSONResponse(status_code=503, content={"code": "database_unavailable"})

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException):
        code = "not_found" if exc.status_code == 404 else "invalid_request"
        return JSONResponse(status_code=exc.status_code, content={"code": code})

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"code": "invalid_request"})

    @app.exception_handler(DomainError)
    async def domain_error(_request: Request, exc: DomainError):
        return JSONResponse(status_code=exc.status, content={"code": exc.code})

    @app.get("/api/v1/health/live", tags=["Health"])
    async def live():
        return {"status": "ok"}

    @app.get("/api/v1/health/ready", tags=["Health"])
    async def ready(request: Request):
        # Also checks the migrated catalogue, not just whether port 5432 is open.
        await request.app.state.pool.fetchval("SELECT count(*) FROM access_offers")
        return {"status": "ok", "database": "postgresql", "stage": "coursework-complete"}

    app.include_router(memberships_router)
    for router in (
        auth_router,
        cart_router,
        orders_router,
        payments_router,
        users_router,
        access_router,
        notifications_router,
        trainers_router,
        visits_router,
        admin_router,
        schedule_router,
        bookings_router,
        reports_router,
    ):
        app.include_router(router)
    return app
