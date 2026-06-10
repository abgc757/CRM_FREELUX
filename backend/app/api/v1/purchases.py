from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from decimal import Decimal
from app.database import get_db
from app.models.user import User, UserRole
from app.models.purchase import PurchaseOrder, PurchaseOrderItem, PurchaseStatus
from app.models.product import Product
from app.models.inventory import InventoryMovement, MovementType
from app.core.dependencies import get_current_user, require_roles
from app.schemas.purchase import (
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderOut,
    PurchaseOrderListOut, PaginatedPurchases, ReceiveItemIn,
)

router = APIRouter(prefix="/purchases", tags=["purchases"])
WRITE_ROLES = (UserRole.gerencia, UserRole.administracion, UserRole.compras)

IVA = Decimal("0.16")


async def _next_folio(db: AsyncSession) -> str:
    count = (await db.execute(select(func.count()).select_from(PurchaseOrder))).scalar() + 1
    return f"OC-{count:06d}"


def _calc_totals(items: list[PurchaseOrderItem]) -> tuple[Decimal, Decimal, Decimal]:
    subtotal = sum(i.subtotal for i in items)
    iva_total = (subtotal * IVA).quantize(Decimal("0.01"))
    return subtotal, iva_total, subtotal + iva_total


@router.get("/", response_model=PaginatedPurchases)
async def list_purchases(
    status: Optional[PurchaseStatus] = None,
    supplier_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    conditions = []
    if status:
        conditions.append(PurchaseOrder.status == status)
    if supplier_id:
        conditions.append(PurchaseOrder.supplier_id == supplier_id)

    total = (await db.execute(select(func.count()).select_from(PurchaseOrder).where(and_(*conditions)))).scalar()
    result = await db.execute(
        select(PurchaseOrder).where(and_(*conditions))
        .order_by(PurchaseOrder.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    return PaginatedPurchases(total=total, page=page, page_size=page_size, items=result.scalars().all())


@router.get("/{order_id}", response_model=PurchaseOrderOut)
async def get_purchase(order_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    return order


@router.post("/", response_model=PurchaseOrderOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_purchase(
    body: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.items:
        raise HTTPException(status_code=400, detail="La orden debe tener al menos un producto")

    folio = await _next_folio(db)
    order = PurchaseOrder(
        folio=folio,
        supplier_id=body.supplier_id,
        created_by_id=current_user.id,
        fecha_requerida=body.fecha_requerida,
        notas=body.notas,
    )
    db.add(order)
    await db.flush()

    items = []
    for item_in in body.items:
        subtotal = (item_in.cantidad_solicitada * item_in.precio_unitario).quantize(Decimal("0.01"))
        item = PurchaseOrderItem(
            order_id=order.id,
            product_id=item_in.product_id,
            descripcion=item_in.descripcion,
            cantidad_solicitada=item_in.cantidad_solicitada,
            unidad=item_in.unidad,
            precio_unitario=item_in.precio_unitario,
            subtotal=subtotal,
        )
        items.append(item)
        db.add(item)

    await db.flush()
    subtotal, iva, total = _calc_totals(items)
    order.subtotal = subtotal
    order.iva = iva
    order.total = total

    await db.commit()
    result = await db.execute(select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == order.id))
    return result.scalar_one()


@router.patch("/{order_id}", response_model=PurchaseOrderOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_purchase(order_id: int, body: PurchaseOrderUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="No encontrada")
    if order.status in (PurchaseStatus.recibida, PurchaseStatus.cancelada):
        raise HTTPException(status_code=400, detail="No se puede modificar una OC recibida o cancelada")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(order, field, value)
    await db.commit()
    await db.refresh(order)
    return order


@router.post("/{order_id}/receive", response_model=PurchaseOrderOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def receive_items(
    order_id: int,
    items_received: List[ReceiveItemIn],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Receive (full or partial) items from a purchase order. Updates product stock."""
    result = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if order.status == PurchaseStatus.recibida:
        raise HTTPException(status_code=400, detail="Esta orden ya fue completamente recibida")
    if order.status == PurchaseStatus.cancelada:
        raise HTTPException(status_code=400, detail="No se puede recibir una orden cancelada")

    item_map = {i.id: i for i in order.items}

    for recv in items_received:
        oc_item = item_map.get(recv.item_id)
        if not oc_item:
            raise HTTPException(status_code=400, detail=f"Partida {recv.item_id} no pertenece a esta OC")

        pendiente = oc_item.cantidad_solicitada - oc_item.cantidad_recibida
        if recv.cantidad_recibida > pendiente:
            raise HTTPException(status_code=400, detail=f"Cantidad recibida ({recv.cantidad_recibida}) supera pendiente ({pendiente})")

        oc_item.cantidad_recibida += recv.cantidad_recibida

        # Update product stock
        prod_result = await db.execute(select(Product).where(Product.id == oc_item.product_id))
        product = prod_result.scalar_one_or_none()
        if product:
            stock_antes = product.stock_actual
            product.stock_actual += recv.cantidad_recibida
            movement = InventoryMovement(
                product_id=product.id,
                tipo=MovementType.entrada,
                cantidad=recv.cantidad_recibida,
                stock_antes=stock_antes,
                stock_despues=product.stock_actual,
                referencia=order.folio,
                notas=f"Recepción OC {order.folio}",
                created_by_id=current_user.id,
            )
            db.add(movement)

    # Determine new order status
    all_received = all(i.cantidad_recibida >= i.cantidad_solicitada for i in order.items)
    any_received = any(i.cantidad_recibida > 0 for i in order.items)
    if all_received:
        order.status = PurchaseStatus.recibida
    elif any_received:
        order.status = PurchaseStatus.recibida_parcial
    else:
        order.status = PurchaseStatus.confirmada

    await db.commit()
    result = await db.execute(select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == order_id))
    return result.scalar_one()
