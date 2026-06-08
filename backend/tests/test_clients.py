import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserRole
from tests.conftest import _create_user, _login


@pytest.mark.asyncio
async def test_create_client(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "vendedor1@example.com", UserRole.ventas)
    token = await _login(client, "vendedor1@example.com")
    resp = await client.post(
        "/api/v1/clients",
        json={"nombre": "Cliente ABC", "telefono": "555-1234"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["nombre"] == "Cliente ABC"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_client(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "vendedor_get@example.com", UserRole.ventas)
    token = await _login(client, "vendedor_get@example.com")
    create_resp = await client.post(
        "/api/v1/clients",
        json={"nombre": "Cliente GET"},
        headers={"Authorization": f"Bearer {token}"},
    )
    client_id = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/clients/{client_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["id"] == client_id


@pytest.mark.asyncio
async def test_vendedor_cannot_see_other_vendedor_clients(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "v_owner@example.com", UserRole.ventas)
    await _create_user(db, "v_other@example.com", UserRole.ventas)

    token_owner = await _login(client, "v_owner@example.com")
    token_other = await _login(client, "v_other@example.com")

    create_resp = await client.post(
        "/api/v1/clients",
        json={"nombre": "Cliente Privado"},
        headers={"Authorization": f"Bearer {token_owner}"},
    )
    client_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/clients/{client_id}", headers={"Authorization": f"Bearer {token_other}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_vendedor_list_only_own_clients(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "v_list1@example.com", UserRole.ventas)
    await _create_user(db, "v_list2@example.com", UserRole.ventas)

    token1 = await _login(client, "v_list1@example.com")
    token2 = await _login(client, "v_list2@example.com")

    await client.post("/api/v1/clients", json={"nombre": "C1 owner1"}, headers={"Authorization": f"Bearer {token1}"})
    await client.post("/api/v1/clients", json={"nombre": "C2 owner1"}, headers={"Authorization": f"Bearer {token1}"})
    await client.post("/api/v1/clients", json={"nombre": "C3 owner2"}, headers={"Authorization": f"Bearer {token2}"})

    resp1 = await client.get("/api/v1/clients", headers={"Authorization": f"Bearer {token1}"})
    assert resp1.status_code == 200
    names = [c["nombre"] for c in resp1.json()]
    assert "C1 owner1" in names
    assert "C2 owner1" in names
    assert "C3 owner2" not in names


@pytest.mark.asyncio
async def test_update_client(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "v_update@example.com", UserRole.ventas)
    token = await _login(client, "v_update@example.com")
    create_resp = await client.post(
        "/api/v1/clients",
        json={"nombre": "Original Name"},
        headers={"Authorization": f"Bearer {token}"},
    )
    client_id = create_resp.json()["id"]
    resp = await client.put(
        f"/api/v1/clients/{client_id}",
        json={"nombre": "Updated Name"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_client(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "v_delete@example.com", UserRole.ventas)
    token = await _login(client, "v_delete@example.com")
    create_resp = await client.post(
        "/api/v1/clients",
        json={"nombre": "To Delete"},
        headers={"Authorization": f"Bearer {token}"},
    )
    client_id = create_resp.json()["id"]
    del_resp = await client.delete(f"/api/v1/clients/{client_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_resp.status_code == 204
    get_resp = await client.get(f"/api/v1/clients/{client_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 404
