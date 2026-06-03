"""
End-to-end test for the complete price management flow:
1. Preview price changes
2. Apply (enqueue job)
3. Execute job synchronously for testing
4. Verify prices changed in DB
5. Rollback
6. Verify prices restored
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.main import app
from app.database import get_db, Base
from app.core.security import hash_password
from app.models import Role, User, Product, Department, Category, PriceUpdateJob


TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_price_e2e.db"


@pytest.fixture(autouse=True)
async def setup_db():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        role_admin = Role(name="admin", permissions='["all"]')
        role_gerencia = Role(name="gerencia", permissions='["price_management"]')
        session.add_all([role_admin, role_gerencia])
        await session.flush()

        gerente = User(
            nombre="Gerente", email="gerente@test.com",
            password_hash=hash_password("test123"), role_id=role_gerencia.id,
        )
        session.add(gerente)
        await session.flush()

        dept = Department(name="ACEROS")
        session.add(dept)
        await session.flush()
        cat = Category(name="PERFILES", department_id=dept.id)
        session.add(cat)
        await session.flush()

        products = [
            Product(sku="C050-N20", nombre="PERFIL 1/2", costo=58.55, costo_mxn=58.55,
                    precio_venta=70.25, precio_venta_mxn=70.25, peso=2.06, peso_kg=2.06,
                    margin=0.20, stock=100, department_id=dept.id, category_id=cat.id),
            Product(sku="C075-P18", nombre="PERFIL 3/4", costo=112.06, costo_mxn=112.06,
                    precio_venta=134.47, precio_venta_mxn=134.47, peso=4.20, peso_kg=4.20,
                    margin=0.20, stock=50, department_id=dept.id, category_id=cat.id),
        ]
        session.add_all(products)
        await session.commit()
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def client(setup_db):
    transport = ASGITransport(app=app)

    async def override_get_db():
        yield setup_db

    app.dependency_overrides[get_db] = override_get_db
    return AsyncClient(transport=transport, base_url="http://test")


async def get_token(client, email: str = "gerente@test.com") -> str:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": "test123"})
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_e2e_price_flow(client, setup_db):
    """Complete E2E: preview → apply (sync) → verify → rollback → verify."""

    # 1. Login as gerente
    token = await get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Preview
    preview_resp = await client.post(
        "/api/v1/price-management/preview",
        json={
            "filter_criteria": {"department_id": 1, "is_active": True},
            "params": {"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.15, "impuestos_pct": 0.16},
            "margin_override": 0.20,
        },
        headers=headers,
    )
    assert preview_resp.status_code == 200
    preview_data = preview_resp.json()
    assert preview_data["total_products"] == 2
    # Store preview prices for later verification
    preview_prices = {item["sku"]: item["precio_nuevo"] for item in preview_data["items"]}

    # 3. Apply (creates job with pending status)
    apply_resp = await client.post(
        "/api/v1/price-management/apply",
        json={
            "name": "E2E Test Price Update",
            "filter": {"department_id": 1, "is_active": True},
            "params": {"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.15, "impuestos_pct": 0.16},
            "margin_override": 0.20,
            "batch_size": 10,
        },
        headers=headers,
    )
    assert apply_resp.status_code == 202
    job_id = apply_resp.json()["job_id"]

    # 4. Execute job synchronously (bypass Celery for test)
    from app.services.price_management import apply_price_update
    job_result = await apply_price_update(setup_db, job_id, batch_size=10)
    assert job_result.status in ("completed", "completed_with_errors")
    assert job_result.processed_count == 2

    # 5. Verify prices changed in DB
    for sku, expected_new_price in preview_prices.items():
        prod_result = await setup_db.execute(select(Product).where(Product.sku == sku))
        product = prod_result.scalar_one()
        assert product.precio_venta_mxn == expected_new_price, f"{sku}: expected {expected_new_price}, got {product.precio_venta_mxn}"

    # 6. Verify price history entries were created
    history_result = await setup_db.execute(
        select(__import__("app.models.price_history", fromlist=["PriceHistory"]).PriceHistory)
        .where(__import__("app.models.price_history", fromlist=["PriceHistory"]).PriceHistory.job_id == job_id)
    )
    history_entries = history_result.scalars().all()
    assert len(history_entries) == 2

    # 7. Rollback
    from app.services.price_management import rollback_price_update
    rollback_result = await rollback_price_update(setup_db, job_id, 1, reason="E2E test rollback")
    assert rollback_result.status in ("completed", "completed_with_errors")
    assert rollback_result.processed_count == 2

    # 8. Verify prices restored
    for sku, preview_item in zip(["C050-N20", "C075-P18"], preview_prices.values()):
        prod_result = await setup_db.execute(select(Product).where(Product.sku == sku))
        product = prod_result.scalar_one()
        # Prices should be restored to original
        if sku == "C050-N20":
            assert product.precio_venta_mxn == 70.25
        elif sku == "C075-P18":
            assert product.precio_venta_mxn == 134.47

    # 9. Verify rollback job was created
    job_result2 = await setup_db.execute(
        select(PriceUpdateJob).where(PriceUpdateJob.id == job_id)
    )
    original_job = job_result2.scalar_one()
    assert original_job.rollback_job_id is not None
