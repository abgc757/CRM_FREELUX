from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime, timezone
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Product, Warehouse, InventoryMovement
from app.schemas.inventory import (
    InventoryMovementCreate, InventoryMovementOut, WarehouseOut,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/warehouses", response_model=List[WarehouseOut])
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Warehouse).where(Warehouse.is_active == True))
    return [WarehouseOut.model_validate(w) for w in result.scalars().all()]


@router.post("/movement", response_model=InventoryMovementOut, status_code=status.HTTP_201_CREATED)
async def create_movement(
    body: InventoryMovementCreate,
    current_user: User = Depends(RoleChecker(["almacen", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    prod = await db.get(Product, body.product_id)
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    wh = await db.get(Warehouse, body.warehouse_id)
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    if body.tipo not in ("entrada", "salida", "ajuste"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid movement type")
    if body.tipo == "salida" and prod.stock < body.cantidad:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
    movement = InventoryMovement(
        product_id=body.product_id,
        warehouse_id=body.warehouse_id,
        cantidad=body.cantidad,
        tipo=body.tipo,
        referencia=body.referencia,
        referencia_tipo=body.referencia_tipo,
        notes=body.notes,
        user_id=current_user.id,
    )
    db.add(movement)
    if body.tipo == "entrada":
        prod.stock += body.cantidad
    elif body.tipo == "salida":
        prod.stock -= body.cantidad
    else:
        prod.stock = body.cantidad
    prod.version += 1
    await db.flush()
    await db.refresh(movement)
    return InventoryMovementOut.model_validate(movement)


@router.get("/movements", response_model=List[InventoryMovementOut])
async def list_movements(
    product_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(InventoryMovement)
    if product_id:
        query = query.where(InventoryMovement.product_id == product_id)
    if tipo:
        query = query.where(InventoryMovement.tipo == tipo)
    if warehouse_id:
        query = query.where(InventoryMovement.warehouse_id == warehouse_id)
    query = query.order_by(InventoryMovement.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [InventoryMovementOut.model_validate(m) for m in result.scalars().all()]


@router.get("/stats/weights", response_model=List[dict])
async def get_weight_stats(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Product.department_id,
            func.avg(Product.peso).label("avg_weight"),
            func.min(Product.peso).label("min_weight"),
            func.max(Product.peso).label("max_weight"),
            func.stddev(Product.peso).label("std_weight"),
            func.count(Product.id).label("product_count"),
        ).where(Product.is_active == True).group_by(Product.department_id)
    )
    stats = result.all()
    return [
        {
            "department_id": row[0],
            "avg_weight": round(float(row[1]), 2) if row[1] else 0,
            "min_weight": float(row[2]) if row[2] else 0,
            "max_weight": float(row[3]) if row[3] else 0,
            "std_weight": round(float(row[4]), 2) if row[4] else 0,
            "product_count": row[5],
        }
        for row in stats
    ]
