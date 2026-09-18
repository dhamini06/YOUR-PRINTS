import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.core.database import Base, get_db
from app.domain.models import OptOutTarget
from app.domain.validation import compute_target_hash


# Setup an isolated in-memory test database for API integration tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_test_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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
    assert data["status"] == "QUEUED"
    assert data["current_stage"] == "01_VALIDATING_TARGET"
    assert data["summary_stats"]["total_entities"] == 1
    assert len(data["entities"]) == 1

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
    assert data["status"] == "QUEUED"
    assert len(data["entities"]) == 1


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
