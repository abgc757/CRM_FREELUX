"""
Integration tests for price management API endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.main import app
from app.database import get_db, Base
from app.core.security import hash_password
from app.models import Role, User, Product, Department, Category, PriceUpdateJob, PriceHistory
from app.schemas.price_management import PriceParams, FilterCriteria

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_price.db"


@pytest.fixture(autouse=True)
async def setup_db():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        role_admin = Role(name="admin", permissions='["all", "price_management"]')
        role_gerencia = Role(name="gerencia", permissions='["read","write","price_management"]')
        role_ventas = Role(name="ventas", permissions='["read","write","create_quotes","create_clients"]')
        session.add_all([role_admin, role_gerencia, role_ventas])
        await session.flush()

        admin = User(
            nombre="Admin", email="admin@test.com",
            password_hash=hash_password("test123"), role_id=role_admin.id,
        )
        gerente = User(
            nombre="Gerente", email="gerente@test.com",
            password_hash=hash_password("test123"), role_id=role_gerencia.id,
        )
        vendedor = User(
            nombre="Vendedor", email="ventas@test.com",
            password_hash=hash_password("test123"), role_id=role_ventas.id,
        )
        session.add_all([admin, gerente, vendedor])
        await session.flush()

        dept = Department(name="ACEROS")
        session.add(dept)
        await session.flush()
        cat = Category(name="TUBERIA", department_id=dept.id)
        session.add(cat)
        await session.flush()

        products = [
            Product(sku="TUB-1", nombre="TUBO 1", costo=100.0, costo_mxn=100.0,
                    precio_venta=150.0, precio_venta_mxn=150.0, peso=5.0, peso_kg=5.0,
                    margin=0.20, department_id=dept.id, category_id=cat.id, stock=50),
            Product(sku="TUB-2", nombre="TUBO 2", costo=200.0, costo_mxn=200.0,
                    precio_venta=300.0, precio_venta_mxn=300.0, peso=10.0, peso_kg=10.0,
                    margin=0.25, department_id=dept.id, category_id=cat.id, stock=30),
            Product(sku="VAR-1", nombre="VARILLA 1", costo=50.0, costo_mxn=50.0,
                    precio_venta=75.0, precio_venta_mxn=75.0, peso=2.5, peso_kg=2.5,
                    margin=0.15, department_id=dept.id, category_id=cat.id, stock=100),
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


async def get_token(client, email: str, password: str = "test123") -> str:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_preview_endpoint(client):
    token = await get_token(client, "gerente@test.com")
    response = await client.post(
        "/api/v1/price-management/preview",
        json={
            "filter_criteria": {"is_active": True},
            "params": {"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.15, "impuestos_pct": 0.16},
            "margin_override": 0.20,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_products"] == 3
    assert len(data["items"]) == 3
    for item in data["items"]:
        assert item["precio_nuevo"] > 0
        assert "error" not in item or item["error"] is None


@pytest.mark.asyncio
async def test_preview_unauthorized(client):
    token = await get_token(client, "ventas@test.com")
    response = await client.post(
        "/api/v1/price-management/preview",
        json={
            "filter_criteria": {"is_active": True},
            "params": {"precio_acero_mxn_per_kg": 25.0},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_apply_endpoint_creates_job(client):
    token = await get_token(client, "gerente@test.com")
    response = await client.post(
        "/api/v1/price-management/apply",
        json={
            "name": "Test job",
            "filter": {"is_active": True},
            "params": {"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.0, "impuestos_pct": 0.0},
            "margin_override": 0.20,
            "batch_size": 10,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 202
    data = response.json()
    assert data["job_id"] > 0
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_job_status(client, setup_db):
    # Create a job directly
    job = PriceUpdateJob(
        name="Test job",
        filter_criteria={"is_active": True},
        params={"precio_acero_mxn_per_kg": 25.0},
        margin_override=0.20,
        status="completed",
        total_products=3,
        processed_count=3,
        created_by=1,
    )
    setup_db.add(job)
    await setup_db.flush()
    await setup_db.refresh(job)

    token = await get_token(client, "gerente@test.com")
    response = await client.get(
        f"/api/v1/price-management/jobs/{job.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == job.id
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_price_history_endpoint(client, setup_db):
    # Create a product and price history
    prod_result = await setup_db.execute(select(Product).where(Product.sku == "TUB-1"))
    product = prod_result.scalar_one()
    history = PriceHistory(
        product_id=product.id,
        old_price=150.0,
        new_price=180.0,
        old_margin=0.20,
        new_margin=0.25,
        reason="Test",
        params={},
        changed_by=1,
    )
    setup_db.add(history)
    await setup_db.flush()

    token = await get_token(client, "gerente@test.com")
    response = await client.get(
        f"/api/v1/price-management/products/{product.sku}/price-history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["old_price"] == 150.0
    assert data[0]["new_price"] == 180.0


@pytest.mark.asyncio
async def test_update_margin_single_product(client, setup_db):
    prod_result = await setup_db.execute(select(Product).where(Product.sku == "TUB-1"))
    product = prod_result.scalar_one()
    old_margin = product.margin

    token = await get_token(client, "gerente@test.com")
    response = await client.patch(
        f"/api/v1/price-management/products/{product.sku}/margin",
        json={"margin": 0.35, "reason": "Testing margin update"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["old_margin"] == old_margin
    assert data["new_margin"] == 0.35


@pytest.mark.asyncio
async def test_bulk_margin_update(client, setup_db):
    token = await get_token(client, "gerente@test.com")
    response = await client.patch(
        "/api/v1/price-management/products/bulk-margin",
        json={"skus": ["TUB-1", "TUB-2"], "margin": 0.30, "reason": "Bulk test"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 2


@pytest.mark.asyncio
async def test_list_jobs(client, setup_db):
    job = PriceUpdateJob(
        name="Job list test",
        filter_criteria={},
        params={"precio_acero_mxn_per_kg": 25.0},
        status="completed",
        created_by=1,
    )
    setup_db.add(job)
    await setup_db.flush()

    token = await get_token(client, "gerente@test.com")
    response = await client.get(
        "/api/v1/price-management/jobs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_ml_price_suggestion_stub(client):
    token = await get_token(client, "gerente@test.com")
    response = await client.post(
        "/api/v1/ml/price-suggestion",
        json={
            "product_id": 1,
            "costo_mxn": 100.0,
            "peso_kg": 5.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["suggested_margin"] > 0
    assert data["suggested_price"] > 0
    assert data["model_version"] == "heuristic-v0"


@pytest.mark.asyncio
async def test_export_dataset_endpoint(client):
    token = await get_token(client, "admin@test.com")
    response = await client.get(
        "/api/v1/ml/export/dataset?model_type=price_history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["model_type"] == "price_history"
    assert "query_template" in data
