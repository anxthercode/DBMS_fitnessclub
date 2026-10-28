from datetime import datetime
from io import BytesIO
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import pytest
from docx import Document

from app.memberships.products import MINSK
from tests.test_auth_commerce import add, checkout, pay, register
from tests.test_staff_training import login, staff, training_item

pytestmark = pytest.mark.integration


async def test_exchange_roundtrip_validation_and_atomicity(client, connection):
    assert (await client.get("/api/v1/admin/exchange/offers")).status_code == 401
    await staff(connection)
    await login(client, "admin@example.com")
    for format in ("json", "xml", "csv"):
        exported = await client.get("/api/v1/admin/exchange/offers", params={"format": format})
        assert exported.status_code == 200, exported.text
        data = {"format": format, "content": exported.text, "apply": False}
        response = await client.post("/api/v1/admin/exchange/offers", json=data)
        assert response.status_code == 200, response.text
        assert response.json()["updated"] == 12 and response.json()["created"] == 0
        before = await connection.fetchval("SELECT sum(revision) FROM access_offers")
        data["apply"] = True
        assert (await client.post("/api/v1/admin/exchange/offers", json=data)).status_code == 200
        assert await connection.fetchval("SELECT sum(revision) FROM access_offers") == before + 12
    exported = (await client.get("/api/v1/admin/exchange/offers")).json()
    exported["offers"][0]["price_byn"] = "999.00"
    exported["offers"][-1]["price_byn"] = "-1"
    import json

    before = await connection.fetchval("SELECT sum(price_byn) FROM access_offers")
    response = await client.post("/api/v1/admin/exchange/offers", json={
        "format": "json", "content": json.dumps(exported), "apply": True,
    })
    assert response.status_code == 422
    assert await connection.fetchval("SELECT sum(price_byn) FROM access_offers") == before
    response = await client.post("/api/v1/admin/exchange/offers", json={
        "format": "xml", "content": '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]>'
        '<access_offers version="1">&x;</access_offers>', "apply": True,
    })
    assert response.status_code == 422


async def test_reports_same_sales_dataset_and_private_exports(
    client, connection, letters, tmp_path,
):
    await register(client, letters)
    await add(client, day=datetime.now(MINSK).date().isoformat())
    await training_item(client)
    order, _ = await checkout(client, "EUR", "NORTHSIDE10")
    await pay(client, order["id"], False)
    await pay(client, order["id"])
    today = datetime.now(MINSK).date().isoformat()
    params = {"start": today, "end": today}
    assert (await client.get("/api/v1/admin/reports", params=params)).status_code == 403
    await staff(connection)
    await login(client, "admin@example.com")
    response = await client.get("/api/v1/admin/reports", params=params)
    assert response.status_code == 200, response.text
    report = response.json()
    assert report["order_count"] == 1
    assert report["totals"]["total_byn"] == "99.00"
    assert report["summaries"]["popularity"][0]["purchased_count"] == 1
    assert report["summaries"]["sales"][0]["revenue_byn"] == "99.00"
    params["as_of"] = report["as_of"]
    for locale in ("ru", "en"):
        for format in ("docx", "xlsx", "pdf"):
            response = await client.get(f"/api/v1/admin/reports/sales.{format}",
                                        params={**params, "locale": locale})
            assert response.status_code == 200, (
                response.text[:300] if response.status_code != 200 else ""
            )
            (tmp_path / f"sales-{locale}.{format}").write_bytes(response.content)
            if format == "docx":
                doc = Document(BytesIO(response.content))
                assert doc.tables[0].rows[-1].cells[-1].text == "99.00"
            elif format == "xlsx":
                with ZipFile(BytesIO(response.content)) as archive:
                    root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
                    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
                    assert root.find(".//s:c[@r='F8']/s:v", ns).text == "99.00"
                    assert root.find(".//s:c[@r='F8']/s:f", ns).text == "SUM(F7:F7)"
            else:
                assert response.content.startswith(b"%PDF-")
    assert (await client.get("/api/v1/admin/reports",
                            params={"start": "2026-12-01", "end": "2026-01-01"})).status_code == 422
