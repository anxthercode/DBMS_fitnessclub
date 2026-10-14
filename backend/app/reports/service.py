import csv
import io
import json
from datetime import datetime, timedelta
from decimal import Decimal
from xml.etree import ElementTree as ET

from pydantic import ValidationError

from app.auth.repository import audit
from app.core.errors import DomainError
from app.memberships import admin_repository as offers_repo
from app.memberships.admin_schemas import OfferInput
from app.memberships.products import MINSK, amount
from app.reports import repository as repo

FIELDS = tuple(OfferInput.model_fields)


def encode_offers(rows, format):
    rows = [{k: row[k] for k in FIELDS} for row in rows]
    if format == "json":
        return json.dumps({"version": 1, "offers": rows}, ensure_ascii=False, indent=2)
    if format == "xml":
        root = ET.Element("access_offers", version="1")
        for row in rows:
            item = ET.SubElement(root, "offer")
            for key, value in row.items():
                ET.SubElement(item, key).text = (
                    ""
                    if value is None
                    else str(value).lower()
                    if isinstance(value, bool)
                    else str(value)
                )
        return ET.tostring(root, encoding="unicode", xml_declaration=True)
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=FIELDS)
    writer.writeheader()
    for row in rows:
        # CSV is interchange data, not executable spreadsheet formulas.
        writer.writerow(
            {
                k: (
                    "'" + v
                    if isinstance(v, str) and v and v[:1] in "=+-@\t\r"
                    else str(v).lower()
                    if isinstance(v, bool)
                    else v
                )
                for k, v in row.items()
            }
        )
    return output.getvalue()


def parse_offers(content, format):
    try:
        content = content.removeprefix("\ufeff")
        if format == "json":
            raw = json.loads(content)
            if set(raw) != {"version", "offers"} or raw["version"] != 1:
                raise ValueError("Invalid envelope")
            rows = raw["offers"]
        elif format == "xml":
            if "<!" in content:
                raise ValueError("DTD and entities are not accepted")
            root = ET.fromstring(content)
            if root.tag != "access_offers" or root.attrib != {"version": "1"}:
                raise ValueError("Invalid root")
            rows = []
            for item in root:
                if item.tag != "offer" or item.attrib or len(item) != len(FIELDS):
                    raise ValueError("Invalid offer")
                if any(list(child) or child.attrib for child in item):
                    raise ValueError("Nested fields are not accepted")
                rows.append({child.tag: child.text or "" for child in item})
        else:
            reader = csv.DictReader(io.StringIO(content, newline=""))
            if reader.fieldnames != list(FIELDS):
                raise ValueError("Invalid columns")
            rows = list(reader)
        if not isinstance(rows, list) or not 1 <= len(rows) <= 100:
            raise ValueError("Import between 1 and 100 offers")
        result = []
        for row in rows:
            if not isinstance(row, dict) or set(row) != set(FIELDS):
                raise ValueError("Invalid fields")
            row = dict(row)
            if format != "json":
                if row["is_active"] not in ("true", "false"):
                    raise ValueError("Invalid boolean")
                row["is_active"] = row["is_active"] == "true"
                row["months"] = int(row["months"]) if row["months"] else None
                if format == "csv":
                    row = {
                        k: v[1:]
                        if isinstance(v, str) and len(v) > 1 and v[0] == "'" and v[1] in "=+-@\t\r"
                        else v
                        for k, v in row.items()
                    }
            result.append(OfferInput.model_validate(row))
        if len({r.code for r in result}) != len(result):
            raise ValueError("Duplicate codes")
        return result
    except (ValueError, TypeError, KeyError, ET.ParseError, ValidationError, csv.Error) as exc:
        raise DomainError("invalid_import", 422) from exc


async def import_offers(conn, actor_id, data):
    incoming = parse_offers(data.content, data.format)
    existing = {r["code"]: r for r in await offers_repo.offers(conn)}
    final = {
        code: OfferInput.model_validate({k: r[k] for k in FIELDS}) for code, r in existing.items()
    }
    final.update({r.code: r for r in incoming})
    combinations = [(r.format, r.months, r.zones) for r in final.values() if r.is_active]
    if len(combinations) != len(set(combinations)):
        raise DomainError("offer_conflict", 409)
    if data.apply:
        # Lock catalogue parents in the same order as checkout to avoid inversion.
        await conn.fetch(
            "SELECT id FROM access_offers ORDER BY access_kind,"
            "duration_months NULLS FIRST,id FOR UPDATE"
        )
        for row in incoming:
            key = int(existing[row.code]["id"]) if row.code in existing else None
            key = await offers_repo.save_offer(conn, row, key)
            await audit(conn, actor_id, "offer_imported", key)
    return {
        "applied": data.apply,
        "created": sum(r.code not in existing for r in incoming),
        "updated": sum(r.code in existing for r in incoming),
        "offers": [r.model_dump(mode="json") for r in incoming],
    }


async def sales_data(conn, dates, as_of=None):
    start = datetime.combine(dates.start, datetime.min.time(), MINSK)
    end = datetime.combine(dates.end + timedelta(days=1), datetime.min.time(), MINSK)
    now = await conn.fetchval("SELECT clock_timestamp()")
    as_of = min(as_of, now) if as_of else now
    rows = await repo.sales(conn, start, end, as_of)
    totals = {
        key: amount(sum((Decimal(r[key]) for r in rows), Decimal(0)))
        for key in ("subtotal_byn", "discount_byn", "total_byn")
    }
    return {
        "start": dates.start,
        "end": dates.end,
        "as_of": as_of,
        "rows": rows,
        "totals": totals,
        "order_count": len(rows),
        "summaries": await repo.summaries(conn, start, end, as_of),
    }
