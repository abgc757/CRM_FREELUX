import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.user import UserRole
from tests.conftest import _create_user, _login


async def _create_product(db: AsyncSession, sku: str, existencia: float = 0.0) -> str:
    product = Product(
        sku=sku,
        nombre=f"Prod {sku}",
        costo=10.0,
        precio_1=20.0,
        existencia=existencia,
        tiene_impuesto=True,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return str(product.id)


@pytest.mark.asyncio
async def test_register_entrada_updates_stock(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "almacen1@example.com", UserRole.almacen)
    token = await _login(client, "almacen1@example.com")
    product_id = await _create_product(db, "INV-001", existencia=10.0)

    resp = await client.post(
        "/api/v1/inventory/movement",
        json={
            "product_id": product_id,
            "tipo": "entrada",
            "cantidad": 50.0,
            "notas": "Recepción inicial",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["tipo"] == "entrada"
    assert data["cantidad"] == 50.0
    assert data["cantidad_anterior"] == 10.0

    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one()
    assert float(product.existencia) == 60.0


@pytest.mark.asyncio
async def test_register_salida_updates_stock(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "almacen2@example.com", UserRole.almacen)
    token = await _login(client, "almacen2@example.com")
    product_id = await _create_product(db, "INV-002", existencia=30.0)

    resp = await client.post(
        "/api/v1/inventory/movement",
        json={"product_id": product_id, "tipo": "salida", "cantidad": 10.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201

    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one()
    assert float(product.existencia) == 20.0


@pytest.mark.asyncio
async def test_salida_insufficient_stock_returns_400(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "almacen3@example.com", UserRole.almacen)
    token = await _login(client, "almacen3@example.com")
    product_id = await _create_product(db, "INV-003", existencia=5.0)

    resp = await client.post(
        "/api/v1/inventory/movement",
        json={"product_id": product_id, "tipo": "salida", "cantidad": 100.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_ajuste_sets_exact_stock(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "almacen4@example.com", UserRole.almacen)
    token = await _login(client, "almacen4@example.com")
    product_id = await _create_product(db, "INV-004", existencia=100.0)

    resp = await client.post(
        "/api/v1/inventory/movement",
        json={"product_id": product_id, "tipo": "ajuste", "cantidad": 42.0, "notas": "Conteo físico"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201

    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one()
    assert float(product.existencia) == 42.0


@pytest.mark.asyncio
async def test_low_stock_endpoint(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "almacen5@example.com", UserRole.almacen)
    token = await _login(client, "almacen5@example.com")

    product = Product(
        sku="INV-LOW-001",
        nombre="Producto bajo stock",
        costo=5.0,
        precio_1=10.0,
        existencia=2.0,
        inv_min=10.0,
        tiene_impuesto=True,
    )
    db.add(product)
    await db.commit()

    resp = await client.get("/api/v1/inventory/low-stock", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    skus = [p["sku"] for p in resp.json()]
    assert "INV-LOW-001" in skus


@pytest.mark.asyncio
async def test_ventas_cannot_register_movement(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "ventas_inv@example.com", UserRole.ventas)
    token = await _login(client, "ventas_inv@example.com")
    product_id = await _create_product(db, "INV-005", existencia=10.0)

    resp = await client.post(
        "/api/v1/inventory/movement",
        json={"product_id": product_id, "tipo": "entrada", "cantidad": 5.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
