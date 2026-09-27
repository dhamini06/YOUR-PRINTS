import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.domain.models import OptOutTarget
from app.domain.validation import compute_target_hash
from tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_create_investigation_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/investigations",
            json={"target": "  Forensic.Analyst@EXAMPLE.com  ", "target_type": "EMAIL"},
        )

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert len(data["id"]) == 36
    assert data["target_value"] == "forensic.analyst@example.com"
    assert data["target_type"] == "EMAIL"
    assert data["status"] in ("COMPLETED", "PARTIALLY_COMPLETED", "QUEUED")
    assert data["current_stage"] == "05_BUILDING_DIGITAL_FOOTPRINT"
    assert data["summary_stats"]["total_entities"] >= 1
    assert len(data["entities"]) >= 1

    root_ent = data["entities"][0]
    assert root_ent["canonical_value"] == "forensic.analyst@example.com"
    assert root_ent["entity_type"] == "EMAIL_TARGET"
    assert root_ent["attributes"]["domain"] == "example.com"


@pytest.mark.asyncio
async def test_create_investigation_invalid_syntax():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/investigations",
            json={"target": "not-an-email-address", "target_type": "EMAIL"},
        )

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_TARGET_SYNTAX"


@pytest.mark.asyncio
async def test_create_investigation_opted_out_target():
    # Insert an opt-out record for optedout@target.com
    target_email = "optedout@target.com"
    target_h = compute_target_hash(target_email)

    async with TestSessionLocal() as session:
        opt_out = OptOutTarget(target_hash=target_h)
        session.add(opt_out)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/investigations",
            json={"target": target_email, "target_type": "EMAIL"},
        )

    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "TARGET_OPTED_OUT"


@pytest.mark.asyncio
async def test_get_investigation_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create
        create_res = await ac.post(
            "/api/v1/investigations",
            json={"target": "inspect@domain.org", "target_type": "EMAIL"},
        )
        inv_id = create_res.json()["id"]

        # 2. Retrieve
        get_res = await ac.get(f"/api/v1/investigations/{inv_id}")

    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == inv_id
    assert data["target_value"] == "inspect@domain.org"
    assert data["status"] in ("COMPLETED", "PARTIALLY_COMPLETED", "QUEUED")
    assert len(data["entities"]) >= 1


@pytest.mark.asyncio
async def test_get_investigation_not_found():
    transport = ASGITransport(app=app)
    dummy_uuid = "00000000-0000-0000-0000-000000000000"
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/investigations/{dummy_uuid}")

    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "INVESTIGATION_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_investigation_invalid_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/investigations/short-id")

    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_IDENTIFIER"


@pytest.mark.asyncio
async def test_get_evidence_and_delete_investigation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create
        create_res = await ac.post(
            "/api/v1/investigations",
            json={"target": "evidence_test@company.com", "target_type": "EMAIL"},
        )
        inv_id = create_res.json()["id"]
        relationships = create_res.json().get("relationships") or []

        if relationships and relationships[0].get("evidence_id"):
            ev_id = relationships[0]["evidence_id"]
            ev_res = await ac.get(f"/api/v1/investigations/{inv_id}/evidence/{ev_id}")
            assert ev_res.status_code == 200
            assert ev_res.json()["id"] == ev_id

        # 2. Delete Investigation
        del_res = await ac.delete(f"/api/v1/investigations/{inv_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # 3. Verify it's gone
        get_res = await ac.get(f"/api/v1/investigations/{inv_id}")
        assert get_res.status_code == 404
