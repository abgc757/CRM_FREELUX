from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryMovement, MovementType
from app.models.product import Product
from app.schemas.inventory import MovementCreate


async def register_movement(
    db: AsyncSession, data: MovementCreate, usuario_id: UUID
) -> InventoryMovement:
    result = await db.execute(
        select(Product).where(Product.id == data.product_id).with_for_update()
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    prev = float(product.existencia)

    if data.tipo == MovementType.entrada or data.tipo == MovementType.devolucion:
        product.existencia = prev + data.cantidad
    elif data.tipo == MovementType.salida:
        if prev < data.cantidad:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        product.existencia = prev - data.cantidad
    elif data.tipo == MovementType.ajuste:
        product.existencia = data.cantidad

    product.version += 1

    movement = InventoryMovement(
        product_id=data.product_id,
        almacen_id=data.almacen_id,
        tipo=data.tipo,
        cantidad=data.cantidad,
        cantidad_anterior=prev,
        referencia_tipo=data.referencia_tipo,
        referencia_id=data.referencia_id,
        usuario_id=usuario_id,
        notas=data.notas,
    )
    db.add(movement)
    await db.flush()
    return movement
