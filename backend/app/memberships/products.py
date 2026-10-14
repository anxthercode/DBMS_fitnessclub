import calendar
import hashlib
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from app.core.errors import DomainError

MINSK = ZoneInfo("Europe/Minsk")


def fingerprint(data):
    return hashlib.sha256(data.model_dump_json().encode()).digest()


def amount(value):
    return format(Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ".2f")


def validate_date(day):
    if day < datetime.now(MINSK).date() or day.year > 9998:
        raise DomainError("invalid_date")


def period(selection):
    if selection.format == "training":
        return None, None
    validate_date(selection.date)
    start = datetime.combine(selection.date, datetime.min.time(), MINSK)
    if selection.months:
        index = start.year * 12 + start.month - 1 + selection.months
        year, month = index // 12, index % 12 + 1
        end = start.replace(
            year=year, month=month, day=min(start.day, calendar.monthrange(year, month)[1])
        )
    else:
        end = start + timedelta(days=1)
    return start.astimezone(UTC), end.astimezone(UTC)


def zone_codes(zones):
    return {"gym": ["gym_cardio"], "pool": ["pool"], "both": ["gym_cardio", "pool"]}[zones]


def zones_name(codes):
    return "both" if len(codes) == 2 else "gym" if codes[0] == "gym_cardio" else "pool"


def product(row):
    return dict(
        format=row["access_kind"],
        months=row["duration_months"],
        zones=zones_name(row["zone_codes"]),
        date=row["selected_date"].isoformat() if row["selected_date"] else None,
        offer_id=str(
            row["training_offer_id"] if row["access_kind"] == "training" else row["access_offer_id"]
        ),
        offer_revision=row["offer_revision"],
        price_byn=amount(row["price_byn"]),
        starts_at=row["starts_at"].isoformat() if row["starts_at"] else None,
        ends_at=row["ends_at"].isoformat() if row["ends_at"] else None,
        amenities_included=True,
        single_entry=row["access_kind"] == "single_visit",
    )


def intersects(a, b):
    return (
        a["starts_at"] < b["ends_at"]
        and b["starts_at"] < a["ends_at"]
        and bool(set(a["zone_codes"]) & set(b["zone_codes"]))
    )


def check_overlap(items, existing):
    new = [item for item in items if item["access_kind"] == "membership"]
    for i, item in enumerate(new):
        if any(intersects(item, other) for other in [*new[:i], *existing]):
            raise DomainError("membership_overlap", 409)
