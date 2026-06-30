from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User, UserRole
from app.models.logistics import Vehicle, Operator, DeliveryOrder, DeliveryOrderItem, DeliveryStatus
from app.models.client import Client
from app.core.dependencies import get_current_user, require_roles
from app.schemas.logistics import (
    VehicleIn, VehicleOut, OperatorIn, OperatorOut,
    DeliveryOrderIn, DeliveryOrderOut, DeliveryStatusUpdate, PaginatedDeliveries,
)

router = APIRouter(prefix="/logistics", tags=["logistics"])
WRITE_ROLES = (UserRole.gerencia, UserRole.administracion, UserRole.almacen)


# ── Vehículos ─────────────────────────────────────────────────────────────────

@router.get("/vehicles", response_model=list[VehicleOut])
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.is_active == True).order_by(Vehicle.placa)
    )
    return result.scalars().all()


@router.post("/vehicles", response_model=VehicleOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_vehicle(body: VehicleIn, db: AsyncSession = Depends(get_db)):
    v = Vehicle(**body.model_dump())
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return v


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_vehicle(vehicle_id: int, body: VehicleIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    for k, val in body.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    await db.commit()
    await db.refresh(v)
    return v


@router.delete("/vehicles/{vehicle_id}", dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def deactivate_vehicle(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    v.is_active = False
    await db.commit()
    return {"ok": True}


# ── Operadores ────────────────────────────────────────────────────────────────

@router.get("/operators", response_model=list[OperatorOut])
async def list_operators(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Operator).where(Operator.is_active == True).order_by(Operator.nombre)
    )
    return result.scalars().all()


@router.post("/operators", response_model=OperatorOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_operator(body: OperatorIn, db: AsyncSession = Depends(get_db)):
    op = Operator(**body.model_dump())
    db.add(op)
    await db.commit()
    await db.refresh(op)
    return op


@router.patch("/operators/{op_id}", response_model=OperatorOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_operator(op_id: int, body: OperatorIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Operator).where(Operator.id == op_id))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    for k, val in body.model_dump(exclude_unset=True).items():
        setattr(op, k, val)
    await db.commit()
    await db.refresh(op)
    return op


# ── Pedidos de entrega ────────────────────────────────────────────────────────

async def _next_folio(db: AsyncSession) -> str:
    total = (await db.execute(select(func.count()).select_from(DeliveryOrder))).scalar() or 0
    return f"ENT-{total + 1:06d}"


def _delivery_out(d: DeliveryOrder) -> dict:
    """Build DeliveryOrderOut-compatible dict with joined data."""
    return {
        **{c.name: getattr(d, c.name) for c in d.__table__.columns},
        "client_nombre": d.client.nombre if d.client else None,
        "vehiculo_placa": d.vehiculo.placa if d.vehiculo else None,
        "operador_nombre": d.operador.nombre if d.operador else None,
        "items": d.items,
    }


@router.get("/deliveries", response_model=PaginatedDeliveries)
async def list_deliveries(
    status: Optional[DeliveryStatus] = None,
    client_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    conditions = []
    if status:
        conditions.append(DeliveryOrder.status == status)
    if client_id:
        conditions.append(DeliveryOrder.client_id == client_id)

    total = (
        await db.execute(
            select(func.count()).select_from(DeliveryOrder).where(and_(*conditions))
        )
    ).scalar()

    result = await db.execute(
        select(DeliveryOrder)
        .where(and_(*conditions))
        .order_by(DeliveryOrder.fecha_programada.asc().nullsfirst(), DeliveryOrder.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    orders = result.scalars().unique().all()

    items_out = []
    for d in orders:
        out = DeliveryOrderOut.model_validate({
            **{c.name: getattr(d, c.name) for c in d.__table__.columns},
            "client_nombre": d.client.nombre if d.client else None,
            "vehiculo_placa": d.vehiculo.placa if d.vehiculo else None,
            "operador_nombre": d.operador.nombre if d.operador else None,
            "items": d.items,
        })
        items_out.append(out)

    return PaginatedDeliveries(total=total, page=page, page_size=page_size, items=items_out)


@router.get("/deliveries/{delivery_id}", response_model=DeliveryOrderOut)
async def get_delivery(
    delivery_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(DeliveryOrder).where(DeliveryOrder.id == delivery_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Pedido de entrega no encontrado")
    return DeliveryOrderOut.model_validate({
        **{c.name: getattr(d, c.name) for c in d.__table__.columns},
        "client_nombre": d.client.nombre if d.client else None,
        "vehiculo_placa": d.vehiculo.placa if d.vehiculo else None,
        "operador_nombre": d.operador.nombre if d.operador else None,
        "items": d.items,
    })


@router.post("/deliveries", response_model=DeliveryOrderOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_delivery(
    body: DeliveryOrderIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folio = await _next_folio(db)
    data = body.model_dump(exclude={"items"})
    order = DeliveryOrder(**data, folio=folio, created_by_id=current_user.id)
    db.add(order)
    await db.flush()

    for item_data in body.items:
        item = DeliveryOrderItem(**item_data.model_dump(), pedido_id=order.id)
        db.add(item)

    await db.commit()
    await db.refresh(order)

    # Re-query with relationships
    result = await db.execute(select(DeliveryOrder).where(DeliveryOrder.id == order.id))
    d = result.scalar_one()
    return DeliveryOrderOut.model_validate({
        **{c.name: getattr(d, c.name) for c in d.__table__.columns},
        "client_nombre": d.client.nombre if d.client else None,
        "vehiculo_placa": d.vehiculo.placa if d.vehiculo else None,
        "operador_nombre": d.operador.nombre if d.operador else None,
        "items": d.items,
    })


@router.patch("/deliveries/{delivery_id}/status", response_model=DeliveryOrderOut,
              dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_delivery_status(
    delivery_id: int,
    body: DeliveryStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DeliveryOrder).where(DeliveryOrder.id == delivery_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Pedido de entrega no encontrado")

    d.status = body.status
    if body.fecha_entrega_real:
        d.fecha_entrega_real = body.fecha_entrega_real
    if body.notas:
        d.notas = body.notas

    await db.commit()
    await db.refresh(d)
    return DeliveryOrderOut.model_validate({
        **{c.name: getattr(d, c.name) for c in d.__table__.columns},
        "client_nombre": d.client.nombre if d.client else None,
        "vehiculo_placa": d.vehiculo.placa if d.vehiculo else None,
        "operador_nombre": d.operador.nombre if d.operador else None,
        "items": d.items,
    })


@router.patch("/deliveries/{delivery_id}", response_model=DeliveryOrderOut,
              dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_delivery(
    delivery_id: int,
    body: DeliveryOrderIn,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DeliveryOrder).where(DeliveryOrder.id == delivery_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Pedido de entrega no encontrado")
    if d.status in (DeliveryStatus.entregado, DeliveryStatus.cancelado):
        raise HTTPException(status_code=400, detail="No se puede editar un pedido ya entregado o cancelado")

    for k, val in body.model_dump(exclude={"items"}, exclude_unset=True).items():
        setattr(d, k, val)

    # Reemplazar items
    for old_item in d.items:
        await db.delete(old_item)
    await db.flush()
    for item_data in body.items:
        item = DeliveryOrderItem(**item_data.model_dump(), pedido_id=d.id)
        db.add(item)

    await db.commit()
    await db.refresh(d)
    return DeliveryOrderOut.model_validate({
        **{c.name: getattr(d, c.name) for c in d.__table__.columns},
        "client_nombre": d.client.nombre if d.client else None,
        "vehiculo_placa": d.vehiculo.placa if d.vehiculo else None,
        "operador_nombre": d.operador.nombre if d.operador else None,
        "items": d.items,
    })
