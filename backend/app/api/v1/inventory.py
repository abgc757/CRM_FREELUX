from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.inventory import InventoryMovement, MovementType
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.inventory import LowStockItem, MovementCreate, MovementOut
from app.services.inventory import register_movement

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=List[LowStockItem])
async def list_inventory(
    almacen_id: Optional[UUID] = Query(None),
    product_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Product).where(Product.activo == True)
    if product_id:
        q = q.where(Product.id == product_id)
    result = await db.execute(q.order_by(Product.nombre))
    products = result.scalars().all()
    return [
        LowStockItem(
            product_id=p.id,
            sku=p.sku,
            nombre=p.nombre,
            existencia=float(p.existencia),
            inv_min=float(p.inv_min) if p.inv_min is not None else None,
        )
        for p in products
    ]


@router.post("/movement", response_model=MovementOut, status_code=201)
async def create_movement(
    data: MovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.almacen, UserRole.gerente)),
):
    return await register_movement(db, data, current_user.id)


@router.get("/movements", response_model=List[MovementOut])
async def list_movements(
    product_id: Optional[UUID] = Query(None),
    tipo: Optional[MovementType] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(InventoryMovement)
    if product_id:
        q = q.where(InventoryMovement.product_id == product_id)
    if tipo:
        q = q.where(InventoryMovement.tipo == tipo)
    result = await db.execute(q.order_by(InventoryMovement.created_at.desc()).limit(500))
    return result.scalars().all()


@router.get("/low-stock", response_model=List[LowStockItem])
async def low_stock(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Product).where(
            Product.activo == True,
            Product.inv_min.isnot(None),
            Product.existencia <= Product.inv_min,
        ).order_by(Product.nombre)
    )
    products = result.scalars().all()
    return [
        LowStockItem(
            product_id=p.id,
            sku=p.sku,
            nombre=p.nombre,
            existencia=float(p.existencia),
            inv_min=float(p.inv_min) if p.inv_min is not None else None,
        )
        for p in products
    ]
