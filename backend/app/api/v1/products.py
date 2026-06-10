from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.database import get_db
from app.models.user import UserRole
from app.models.product import Product, ProductPrice, ClientType
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductOut, ProductListOut,
    PriceUpdateBulk, PaginatedProducts,
)
from app.services.price_engine import bulk_update_prices
from app.services.csv_importer import import_products

router = APIRouter(prefix="/products", tags=["products"])

WRITE_ROLES = (UserRole.gerencia, UserRole.administracion, UserRole.compras)


@router.get("/", response_model=PaginatedProducts)
async def list_products(
    q: Optional[str] = Query(None, description="Buscar por clave, descripción o tags"),
    departamento: Optional[str] = None,
    categoria: Optional[str] = None,
    activos: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    conditions = [Product.is_active == activos]
    if q:
        term = f"%{q}%"
        conditions.append(or_(
            Product.clave.ilike(term),
            Product.clave_alterna.ilike(term),
            Product.descripcion.ilike(term),
            Product.tags.ilike(term),
        ))
    if departamento:
        conditions.append(Product.departamento == departamento)
    if categoria:
        conditions.append(Product.categoria == categoria)

    total_q = await db.execute(select(func.count()).select_from(Product).where(and_(*conditions)))
    total = total_q.scalar()

    result = await db.execute(
        select(Product)
        .where(and_(*conditions))
        .options(selectinload(Product.prices))
        .order_by(Product.descripcion)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()
    return PaginatedProducts(total=total, page=page, page_size=page_size, items=items)


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    deps = await db.execute(select(Product.departamento).distinct().where(Product.departamento != None))
    cats = await db.execute(select(Product.categoria).distinct().where(Product.categoria != None))
    return {
        "departamentos": sorted([r[0] for r in deps.fetchall()]),
        "categorias": sorted([r[0] for r in cats.fetchall()]),
    }


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(
        select(Product).options(selectinload(Product.prices)).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.post("/", response_model=ProductOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.clave == body.clave))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="CLAVE ya existe")
    data = body.model_dump(exclude={"prices"})
    product = Product(**data)
    db.add(product)
    await db.flush()
    for price_in in body.prices:
        db.add(ProductPrice(product_id=product.id, **price_in.model_dump()))
    await db.commit()
    await db.refresh(product)
    result = await db.execute(select(Product).options(selectinload(Product.prices)).where(Product.id == product.id))
    return result.scalar_one()


@router.patch("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_product(product_id: int, body: ProductUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).options(selectinload(Product.prices)).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


@router.post("/import/csv", dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos CSV o Excel")
    content = await file.read()
    result = await import_products(db, content, file.filename, current_user.id)
    return result


@router.post("/prices/bulk-update", dependencies=[Depends(require_roles(UserRole.gerencia, UserRole.administracion, UserRole.compras))])
async def bulk_price_update(
    body: PriceUpdateBulk,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await bulk_update_prices(db, body, current_user.id)
    return result
