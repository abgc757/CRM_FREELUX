import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserRole
from tests.conftest import _create_user, _login


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "auth_test@example.com", UserRole.ventas)
    token = await _login(client, "auth_test@example.com")
    assert isinstance(token, str)
    assert len(token) > 10


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "wrong_pass@example.com", UserRole.ventas)
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "wrong_pass@example.com", "password": "WRONG"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient, db: AsyncSession):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "nobody@example.com", "password": "secret123"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_with_valid_token(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "me_test@example.com", UserRole.gerente)
    token = await _login(client, "me_test@example.com")
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "me_test@example.com"
    assert data["role"] == "gerente"


@pytest.mark.asyncio
async def test_me_with_invalid_token(client: AsyncClient, db: AsyncSession):
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "refresh_test@example.com", UserRole.ventas)
    token = await _login(client, "refresh_test@example.com")
    resp = await client.post("/api/v1/auth/refresh", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    new_token = resp.json()["access_token"]
    assert isinstance(new_token, str)
