"""
Shared pytest fixtures for the YOUR-PRINTS backend test suite.

Creates a single in-memory SQLite engine for all API integration tests,
overrides the FastAPI `get_db` dependency globally, and resets the schema
between every test to ensure full isolation.
"""
import os
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app as fastapi_app
from app.core.database import Base, get_db
import app.domain.models  # Ensure all models are registered in Base.metadata

TEST_DB_FILE = "./test_temp.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Apply override once at import time so all test modules share the same engine
fastapi_app.dependency_overrides[get_db] = override_get_db



@pytest.fixture(autouse=True)
async def reset_test_database():
    """Create all tables before each test; drop all after each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
