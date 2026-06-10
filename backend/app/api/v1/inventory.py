from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.inventory import InventoryMovement, MovementType
from app.core.dependencies import get_current_user, require_roles
from app.schemas.inventory import MovementIn, MovementOut, StockAlertOut, PaginatedMovements

router = APIRouter(prefix="/inventory", tags=["inventory"])
WRITE_ROLES = (UserRole.gerencia, UserRole.administracion, UserRole.almacen, UserRole.compras)


@router.get("/movements", response_model=PaginatedMovements)
async def list_movements(
    product_id: Optional[int] = None,
    tipo: Optional[MovementType] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    conditions = []
    if product_id:
        conditions.append(InventoryMovement.product_id == product_id)
    if tipo:
        conditions.append(InventoryMovement.tipo == tipo)

    total = (await db.execute(select(func.count()).select_from(InventoryMovement).where(and_(*conditions)))).scalar()
    result = await db.execute(
        select(InventoryMovement).where(and_(*conditions))
        .order_by(InventoryMovement.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    return PaginatedMovements(total=total, page=page, page_size=page_size, items=result.scalars().all())


@router.post("/movements", response_model=MovementOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def register_movement(
    body: MovementIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prod_result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    stock_antes = product.stock_actual

    if body.tipo in (MovementType.entrada, MovementType.ajuste_positivo, MovementType.devolucion):
        product.stock_actual += body.cantidad
    elif body.tipo in (MovementType.salida, MovementType.ajuste_negativo):
        if product.stock_actual < body.cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente. Disponible: {product.stock_actual}")
        product.stock_actual -= body.cantidad

    movement = InventoryMovement(
        product_id=body.product_id,
        tipo=body.tipo,
        cantidad=body.cantidad,
        stock_antes=stock_antes,
        stock_despues=product.stock_actual,
        referencia=body.referencia,
        notas=body.notas,
        created_by_id=current_user.id,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return movement


@router.get("/alerts", response_model=list[StockAlertOut])
async def stock_alerts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Products where stock_actual <= stock_min (and stock_min > 0)."""
    result = await db.execute(
        select(Product).where(
            Product.is_active == True,
            Product.stock_min > 0,
            Product.stock_actual <= Product.stock_min,
        ).order_by(Product.stock_actual)
    )
    return result.scalars().all()


@router.get("/stock", response_model=dict)
async def stock_summary(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total_products = (await db.execute(select(func.count()).select_from(Product).where(Product.is_active == True))).scalar()
    below_min = (await db.execute(
        select(func.count()).select_from(Product).where(
            Product.is_active == True, Product.stock_min > 0, Product.stock_actual <= Product.stock_min
        )
    )).scalar()
    zero_stock = (await db.execute(
        select(func.count()).select_from(Product).where(Product.is_active == True, Product.stock_actual <= 0)
    )).scalar()
    return {"total_products": total_products, "below_min": below_min, "zero_stock": zero_stock}
