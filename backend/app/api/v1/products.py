from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Product, Department, Category, Warehouse
from app.schemas.product import ProductCreate, ProductOut, StockOut, DepartmentOut, CategoryOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductOut])
async def list_products(
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.is_active == True)
    if search:
        search_filter = or_(
            Product.sku.ilike(f"%{search}%"),
            Product.nombre.ilike(f"%{search}%"),
            Product.caracteristicas.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
    if department_id:
        query = query.where(Product.department_id == department_id)
    if category_id:
        query = query.where(Product.category_id == category_id)
    query = query.order_by(Product.nombre).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [ProductOut.model_validate(p) for p in result.scalars().all()]


@router.get("/{sku}/stock", response_model=StockOut)
async def get_product_stock(
    sku: str,
    warehouse_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.sku == sku))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    warehouse_name = "Principal"
    if warehouse_id:
        w_result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
        wh = w_result.scalar_one_or_none()
        warehouse_name = wh.name if wh else "Principal"
    return StockOut(
        product_id=product.id,
        sku=product.sku,
        nombre=product.nombre,
        stock=product.stock,
        warehouse_id=warehouse_id or 1,
        warehouse_name=warehouse_name,
    )


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    current_user: User = Depends(RoleChecker(["admin", "almacen"])),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Product).where(Product.sku == body.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    product = Product(**body.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return ProductOut.model_validate(product)


@router.get("/departments", response_model=List[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.is_active == True))
    return [DepartmentOut.model_validate(d) for d in result.scalars().all()]


@router.get("/categories", response_model=List[CategoryOut])
async def list_categories(
    department_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Category).where(Category.is_active == True)
    if department_id:
        query = query.where(Category.department_id == department_id)
    result = await db.execute(query)
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]
