from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price_history import PriceHistory
from app.models.price_update_job import PriceRequest, PriceRequestStatus
from app.models.product import Product
from app.schemas.product import ProductPriceUpdate


async def update_product_price(
    db: AsyncSession, product_id: UUID, data: ProductPriceUpdate, usuario_id: UUID
) -> Product:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    history = PriceHistory(
        product_id=product.id,
        usuario_id=usuario_id,
        precio_anterior=float(product.precio_1),
        precio_nuevo=data.precio_1 if data.precio_1 is not None else float(product.precio_1),
        costo_anterior=float(product.costo),
        costo_nuevo=data.costo if data.costo is not None else float(product.costo),
        motivo=data.motivo,
    )
    db.add(history)

    if data.costo is not None:
        product.costo = data.costo
    if data.precio_1 is not None:
        product.precio_1 = data.precio_1
    if data.precio_2 is not None:
        product.precio_2 = data.precio_2
    if data.precio_3 is not None:
        product.precio_3 = data.precio_3
    if data.precio_4 is not None:
        product.precio_4 = data.precio_4

    product.version += 1
    await db.flush()
    return product


async def approve_price_request(
    db: AsyncSession, request_id: UUID, precio_aprobado: float, notas: str | None, gerente_id: UUID
) -> PriceRequest:
    result = await db.execute(select(PriceRequest).where(PriceRequest.id == request_id))
    pr = result.scalar_one_or_none()
    if pr is None:
        raise HTTPException(status_code=404, detail="Price request not found")
    if pr.estado != PriceRequestStatus.pendiente:
        raise HTTPException(status_code=400, detail="Request already processed")

    pr.estado = PriceRequestStatus.aprobado
    pr.precio_aprobado = precio_aprobado
    pr.gerente_id = gerente_id
    if notas:
        pr.notas = notas
    await db.flush()
    return pr


async def reject_price_request(
    db: AsyncSession, request_id: UUID, notas: str | None, gerente_id: UUID
) -> PriceRequest:
    result = await db.execute(select(PriceRequest).where(PriceRequest.id == request_id))
    pr = result.scalar_one_or_none()
    if pr is None:
        raise HTTPException(status_code=404, detail="Price request not found")
    if pr.estado != PriceRequestStatus.pendiente:
        raise HTTPException(status_code=400, detail="Request already processed")

    pr.estado = PriceRequestStatus.rechazado
    pr.gerente_id = gerente_id
    if notas:
        pr.notas = notas
    await db.flush()
    return pr
