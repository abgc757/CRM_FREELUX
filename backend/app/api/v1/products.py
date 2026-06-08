from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductOut, ProductPriceUpdate, ProductStock, ProductUpdate
from app.services.price_management import update_product_price

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductOut])
async def list_products(
    search: Optional[str] = Query(None),
    familia: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Product).where(Product.activo == True)
    if search:
        q = q.where(
            or_(
                Product.sku.ilike(f"%{search}%"),
                Product.nombre.ilike(f"%{search}%"),
            )
        )
    if familia:
        q = q.where(Product.familia.ilike(f"%{familia}%"))
    if categoria:
        q = q.where(Product.categoria.ilike(f"%{categoria}%"))
    result = await db.execute(q.order_by(Product.nombre))
    return result.scalars().all()


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/{sku}/stock", response_model=ProductStock)
async def get_product_stock(
    sku: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).where(Product.sku == sku))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductStock(
        product_id=product.id,
        sku=product.sku,
        nombre=product.nombre,
        existencia=float(product.existencia),
        inv_min=float(product.inv_min) if product.inv_min is not None else None,
        inv_max=float(product.inv_max) if product.inv_max is not None else None,
    )


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente, UserRole.admin)),
):
    existing = await db.execute(select(Product).where(Product.sku == data.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SKU already exists")
    product = Product(**data.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente, UserRole.admin)),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    return product


@router.put("/{product_id}/price", response_model=ProductOut)
async def update_price(
    product_id: UUID,
    data: ProductPriceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente)),
):
    return await update_product_price(db, product_id, data, current_user.id)
