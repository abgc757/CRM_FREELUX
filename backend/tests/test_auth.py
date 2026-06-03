import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db, Base
from app.core.security import hash_password
from app.models import Role, User
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        role = Role(name="admin", permissions='["all"]')
        session.add(role)
        await session.flush()
        user = User(
            nombre="Admin Test",
            email="admin@test.com",
            password_hash=hash_password("test123"),
            role_id=role.id,
        )
        session.add(user)
        await session.commit()
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def client(db_session):
    transport = ASGITransport(app=app)

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_login_success(client):
    response = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "test123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    response = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_invalid_email(client):
    response = await client.post("/api/v1/auth/login", json={"email": "nobody@test.com", "password": "test123"})
    assert response.status_code == 401
