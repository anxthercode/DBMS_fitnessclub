from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Request, Response
from pydantic import AwareDatetime, ValidationError
from starlette.concurrency import run_in_threadpool

from app.auth.repository import audit
from app.core.errors import DomainError
from app.core.staff import require_role, staff_transaction
from app.memberships.admin_repository import offers
from app.reports import schemas, service
from app.reports.exports import EXPORTERS

router = APIRouter(prefix="/api/v1/admin", tags=["Reports and exchange"])
Format = Literal["json", "xml", "csv"]
ReportFormat = Literal["docx", "xlsx", "pdf"]


def date_range(start, end):
    try:
        return schemas.DateRange(start=start, end=end)
    except ValidationError as exc:
        raise DomainError("invalid_date", 422) from exc


@router.get("/exchange/offers")
async def export_offers(request: Request, format: Format = "json"):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        output = service.encode_offers(await offers(conn), format)
        await audit(conn, user["id"], "offers_exported")
    media = {"json": "application/json", "xml": "application/xml", "csv": "text/csv"}[format]
    return Response(
        output,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="northside-offers.{format}"'},
    )


@router.post("/exchange/offers")
async def import_offers(data: schemas.ImportInput, request: Request):
    async with staff_transaction(request, "ADMIN") as (conn, user):
        return await service.import_offers(conn, user["id"], data)


@router.get("/reports")
async def report(request: Request, start: date, end: date):
    await require_role(request, "ADMIN")
    dates = date_range(start, end)
    async with (
        request.app.state.pool.acquire() as conn,
        conn.transaction(isolation="repeatable_read", readonly=True),
    ):
        return await service.sales_data(conn, dates)


@router.get("/reports/sales.{format}")
async def export_report(
    request: Request,
    format: ReportFormat,
    start: date,
    end: date,
    locale: Literal["ru", "en"] = "ru",
    as_of: Annotated[AwareDatetime | None, Query()] = None,
):
    user = await require_role(request, "ADMIN")
    dates = date_range(start, end)
    async with (
        request.app.state.pool.acquire() as conn,
        conn.transaction(isolation="repeatable_read", readonly=True),
    ):
        data = await service.sales_data(conn, dates, as_of)
    output = await run_in_threadpool(EXPORTERS[format], data, locale)
    await audit(request.app.state.pool, user["id"], "sales_report_exported")
    media = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }[format]
    return Response(
        output,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="northside-sales-{start}-{end}.{format}"'
        },
    )
