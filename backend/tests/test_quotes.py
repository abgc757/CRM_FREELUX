import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.user import UserRole
from tests.conftest import _create_user, _login


async def _create_product(db: AsyncSession, sku: str, existencia: float = 100.0) -> str:
    product = Product(
        sku=sku,
        nombre=f"Producto {sku}",
        costo=50.0,
        precio_1=100.0,
        existencia=existencia,
        tiene_impuesto=True,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return str(product.id)


async def _create_client_for_user(client: AsyncClient, token: str) -> str:
    resp = await client.post(
        "/api/v1/clients",
        json={"nombre": f"Cliente {uuid.uuid4().hex[:6]}"},
        headers={"Authorization": f"Bearer {token}"},
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_quote_with_items(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "q_create@example.com", UserRole.ventas)
    token = await _login(client, "q_create@example.com")
    product_id = await _create_product(db, "SKU-Q001")
    client_id = await _create_client_for_user(client, token)

    resp = await client.post(
        "/api/v1/quotes",
        json={
            "cliente_id": client_id,
            "items": [
                {
                    "product_id": product_id,
                    "descripcion": "Producto de prueba",
                    "cantidad": 5,
                    "precio_unitario": 100.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["subtotal"] == 500.0
    assert data["iva"] == 80.0
    assert data["total"] == 580.0
    assert len(data["items"]) == 1
    assert data["estado"] == "borrador"


@pytest.mark.asyncio
async def test_convert_quote_to_sale_decrements_stock(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "q_convert@example.com", UserRole.ventas)
    token = await _login(client, "q_convert@example.com")
    product_id = await _create_product(db, "SKU-Q002", existencia=20.0)
    client_id = await _create_client_for_user(client, token)

    create_resp = await client.post(
        "/api/v1/quotes",
        json={
            "cliente_id": client_id,
            "items": [
                {
                    "product_id": product_id,
                    "descripcion": "Producto conversión",
                    "cantidad": 5,
                    "precio_unitario": 100.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    quote_id = create_resp.json()["id"]

    conv_resp = await client.post(
        f"/api/v1/quotes/{quote_id}/convert",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert conv_resp.status_code == 200
    assert "sale_id" in conv_resp.json()

    from sqlalchemy import select
    from app.models.product import Product as ProductModel
    result = await db.execute(select(ProductModel).where(ProductModel.id == uuid.UUID(product_id)))
    product = result.scalar_one()
    assert float(product.existencia) == 15.0


@pytest.mark.asyncio
async def test_convert_quote_creates_purchase_when_no_stock(client: AsyncClient, db: AsyncSession):
    from app.models.supplier import Supplier
    supplier = Supplier(nombre="Proveedor Test", activo=True, fiabilidad_score=80)
    db.add(supplier)
    await db.commit()

    await _create_user(db, "q_nostock@example.com", UserRole.ventas)
    token = await _login(client, "q_nostock@example.com")
    product_id = await _create_product(db, "SKU-Q003", existencia=2.0)
    client_id = await _create_client_for_user(client, token)

    create_resp = await client.post(
        "/api/v1/quotes",
        json={
            "cliente_id": client_id,
            "items": [
                {
                    "product_id": product_id,
                    "descripcion": "Sin stock suficiente",
                    "cantidad": 10,
                    "precio_unitario": 100.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    quote_id = create_resp.json()["id"]

    conv_resp = await client.post(
        f"/api/v1/quotes/{quote_id}/convert",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert conv_resp.status_code == 200

    from sqlalchemy import select
    from app.models.purchase import Purchase, PurchaseStatus
    result = await db.execute(
        select(Purchase).where(Purchase.estado == PurchaseStatus.borrador)
    )
    purchases = result.scalars().all()
    assert len(purchases) >= 1


@pytest.mark.asyncio
async def test_cannot_convert_same_quote_twice(client: AsyncClient, db: AsyncSession):
    await _create_user(db, "q_twice@example.com", UserRole.ventas)
    token = await _login(client, "q_twice@example.com")
    product_id = await _create_product(db, "SKU-Q004", existencia=50.0)
    client_id = await _create_client_for_user(client, token)

    create_resp = await client.post(
        "/api/v1/quotes",
        json={
            "cliente_id": client_id,
            "items": [{"product_id": product_id, "descripcion": "Item", "cantidad": 1, "precio_unitario": 10.0}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    quote_id = create_resp.json()["id"]
    await client.post(f"/api/v1/quotes/{quote_id}/convert", headers={"Authorization": f"Bearer {token}"})
    resp2 = await client.post(f"/api/v1/quotes/{quote_id}/convert", headers={"Authorization": f"Bearer {token}"})
    assert resp2.status_code == 400
