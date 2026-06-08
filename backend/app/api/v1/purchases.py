from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.inventory import InventoryMovement, MovementType, ReferenciaType
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.user import User, UserRole
from app.schemas.purchase import PurchaseCreate, PurchaseOut, PurchaseReceive, PurchaseUpdate

router = APIRouter(prefix="/purchases", tags=["purchases"])

IVA_RATE = Decimal("0.16")


def _purchase_query():
    return select(Purchase).options(selectinload(Purchase.items))


async def _get_purchase_or_404(db: AsyncSession, purchase_id: UUID) -> Purchase:
    result = await db.execute(_purchase_query().where(Purchase.id == purchase_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return p


@router.get("", response_model=List[PurchaseOut])
async def list_purchases(
    estado: Optional[PurchaseStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = _purchase_query()
    if estado:
        q = q.where(Purchase.estado == estado)
    result = await db.execute(q.order_by(Purchase.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=PurchaseOut, status_code=201)
async def create_purchase(
    data: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.compras, UserRole.gerente)),
):
    purchase = Purchase(
        supplier_id=data.supplier_id,
        solicitante_id=current_user.id,
        fecha_esperada=data.fecha_esperada,
        notas=data.notas,
    )
    db.add(purchase)
    await db.flush()

    subtotal = Decimal("0")
    for item_data in data.items:
        item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=item_data.product_id,
            descripcion=item_data.descripcion,
            cantidad=item_data.cantidad,
            precio_unitario=item_data.precio_unitario,
        )
        db.add(item)
        subtotal += Decimal(str(item_data.cantidad)) * Decimal(str(item_data.precio_unitario))

    purchase.subtotal = float(subtotal)
    purchase.iva = float(subtotal * IVA_RATE)
    purchase.total = float(subtotal + subtotal * IVA_RATE)
    await db.flush()
    await db.refresh(purchase, ["items"])
    return purchase


@router.get("/availability-requests", response_model=List[PurchaseOut])
async def availability_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.compras, UserRole.gerente)),
):
    result = await db.execute(
        _purchase_query()
        .where(Purchase.estado == PurchaseStatus.borrador)
        .where(Purchase.notas.like("%Auto-generado%"))
        .order_by(Purchase.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{purchase_id}", response_model=PurchaseOut)
async def get_purchase(
    purchase_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_purchase_or_404(db, purchase_id)


@router.put("/{purchase_id}", response_model=PurchaseOut)
async def update_purchase(
    purchase_id: UUID,
    data: PurchaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.compras, UserRole.gerente)),
):
    purchase = await _get_purchase_or_404(db, purchase_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(purchase, field, value)
    await db.flush()
    return purchase


@router.post("/{purchase_id}/receive", response_model=PurchaseOut)
async def receive_purchase(
    purchase_id: UUID,
    data: PurchaseReceive,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.almacen, UserRole.compras, UserRole.gerente)),
):
    purchase = await _get_purchase_or_404(db, purchase_id)
    if purchase.estado == PurchaseStatus.cancelada:
        raise HTTPException(status_code=400, detail="Purchase is cancelled")

    item_map = {str(i.id): i for i in purchase.items}

    for receive_item in data.items:
        item = item_map.get(str(receive_item.item_id))
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {receive_item.item_id} not found")

        item.cantidad_recibida = float(item.cantidad_recibida) + receive_item.cantidad_recibida

        if item.product_id:
            result = await db.execute(
                select(Product).where(Product.id == item.product_id).with_for_update()
            )
            product = result.scalar_one_or_none()
            if product:
                prev = float(product.existencia)
                product.existencia = prev + receive_item.cantidad_recibida
                product.version += 1
                movement = InventoryMovement(
                    product_id=product.id,
                    tipo=MovementType.entrada,
                    cantidad=receive_item.cantidad_recibida,
                    cantidad_anterior=prev,
                    referencia_tipo=ReferenciaType.compra,
                    referencia_id=purchase.id,
                    usuario_id=current_user.id,
                    notas=f"Recepción OC {purchase.id}",
                )
                db.add(movement)

    purchase.estado = PurchaseStatus.recibida
    await db.flush()
    await db.refresh(purchase, ["items"])
    return purchase
