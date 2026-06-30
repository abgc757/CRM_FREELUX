from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from decimal import Decimal
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User, UserRole
from app.models.pos import CashSession, POSSale, POSSaleItem, SessionStatus, POSPaymentMethod
from app.models.product import Product
from app.models.inventory import InventoryMovement, MovementType
from app.core.dependencies import get_current_user, require_roles
from app.schemas.pos import (
    OpenSessionIn, CloseSessionIn, SessionOut,
    POSSaleIn, POSSaleOut, PaginatedPOSSales,
)

router = APIRouter(prefix="/pos", tags=["pos"])
POS_ROLES = (UserRole.gerencia, UserRole.administracion, UserRole.ventas)


async def _get_active_session(db: AsyncSession, user_id: int) -> CashSession | None:
    result = await db.execute(
        select(CashSession)
        .where(CashSession.cajero_id == user_id, CashSession.status == SessionStatus.abierta)
    )
    return result.scalar_one_or_none()


async def _next_session_folio(db: AsyncSession) -> str:
    total = (await db.execute(select(func.count()).select_from(CashSession))).scalar() or 0
    return f"CAJA-{total + 1:05d}"


async def _next_pos_folio(db: AsyncSession) -> str:
    total = (await db.execute(select(func.count()).select_from(POSSale))).scalar() or 0
    return f"POS-{total + 1:07d}"


def _session_out(s: CashSession) -> SessionOut:
    return SessionOut.model_validate({
        **{c.name: getattr(s, c.name) for c in s.__table__.columns},
        "cajero_nombre": s.cajero.full_name if s.cajero else None,
    })


# ── Sesiones de caja ──────────────────────────────────────────────────────────

@router.get("/sessions/current", response_model=SessionOut | None)
async def get_current_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = await _get_active_session(db, current_user.id)
    if not s:
        return None
    return _session_out(s)


@router.post("/sessions/open", response_model=SessionOut,
             dependencies=[Depends(require_roles(*POS_ROLES))])
async def open_session(
    body: OpenSessionIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await _get_active_session(db, current_user.id)
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes una sesión de caja abierta")

    folio = await _next_session_folio(db)
    s = CashSession(
        folio=folio,
        cajero_id=current_user.id,
        fondo_inicial=body.fondo_inicial,
        notas=body.notas,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _session_out(s)


@router.post("/sessions/close", response_model=SessionOut,
             dependencies=[Depends(require_roles(*POS_ROLES))])
async def close_session(
    body: CloseSessionIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = await _get_active_session(db, current_user.id)
    if not s:
        raise HTTPException(status_code=400, detail="No tienes sesión de caja abierta")

    # Calcular totales desde las ventas de la sesión
    result = await db.execute(
        select(POSSale).where(POSSale.session_id == s.id, POSSale.is_cancelled == False)
    )
    ventas = result.scalars().all()

    s.total_efectivo      = sum(v.monto_efectivo for v in ventas)
    s.total_tarjeta       = sum(v.monto_tarjeta for v in ventas)
    s.total_transferencia = sum(v.monto_transferencia for v in ventas)
    s.total_ventas        = sum(v.total for v in ventas)
    s.num_transacciones   = len(ventas)
    s.efectivo_contado    = body.efectivo_contado
    s.diferencia          = body.efectivo_contado - s.total_efectivo
    s.status              = SessionStatus.cerrada
    s.closed_at           = datetime.now(timezone.utc)
    if body.notas:
        s.notas = body.notas

    await db.commit()
    await db.refresh(s)
    return _session_out(s)


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CashSession)
        .order_by(CashSession.opened_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    sessions = result.scalars().all()
    return [_session_out(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(CashSession).where(CashSession.id == session_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return _session_out(s)


# ── Ventas POS ────────────────────────────────────────────────────────────────

@router.get("/sales", response_model=PaginatedPOSSales)
async def list_pos_sales(
    session_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = []
    if session_id:
        conditions.append(POSSale.session_id == session_id)
    else:
        # Default: ventas de sesión activa del usuario
        s = await _get_active_session(db, current_user.id)
        if s:
            conditions.append(POSSale.session_id == s.id)

    total = (
        await db.execute(
            select(func.count()).select_from(POSSale).where(and_(*conditions))
        )
    ).scalar()

    result = await db.execute(
        select(POSSale)
        .where(and_(*conditions))
        .order_by(POSSale.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    ventas = result.scalars().unique().all()
    return PaginatedPOSSales(
        total=total, page=page, page_size=page_size,
        items=[POSSaleOut.model_validate(v, from_attributes=True) for v in ventas],
    )


@router.post("/sales", response_model=POSSaleOut,
             dependencies=[Depends(require_roles(*POS_ROLES))])
async def create_pos_sale(
    body: POSSaleIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = await _get_active_session(db, current_user.id)
    if not s:
        raise HTTPException(status_code=400, detail="Debes abrir una sesión de caja antes de vender")

    if not body.items:
        raise HTTPException(status_code=400, detail="La venta requiere al menos un artículo")

    folio = await _next_pos_folio(db)

    # Calcular totales
    subtotal = Decimal("0")
    iva_total = Decimal("0")
    built_items = []
    for item_data in body.items:
        base = item_data.cantidad * item_data.precio_unitario
        descuento = base * (item_data.descuento_pct / 100)
        item_sub = (base - descuento).quantize(Decimal("0.01"))
        item_iva = (item_sub * Decimal("0.16")).quantize(Decimal("0.01")) if item_data.tiene_iva else Decimal("0")
        subtotal += item_sub
        iva_total += item_iva
        built_items.append({**item_data.model_dump(), "subtotal": item_sub})

    total = subtotal + iva_total

    # Cambio
    pagado = body.monto_efectivo + body.monto_tarjeta + body.monto_transferencia
    cambio = max(Decimal("0"), pagado - total)

    venta = POSSale(
        folio=folio,
        session_id=s.id,
        cajero_id=current_user.id,
        client_id=body.client_id,
        subtotal=subtotal,
        iva=iva_total,
        total=total,
        metodo_pago=body.metodo_pago,
        monto_efectivo=body.monto_efectivo,
        monto_tarjeta=body.monto_tarjeta,
        monto_transferencia=body.monto_transferencia,
        cambio=cambio,
        notas=body.notas,
    )
    db.add(venta)
    await db.flush()

    # Items + descuento de inventario
    for item_data in built_items:
        item = POSSaleItem(
            venta_id=venta.id,
            product_id=item_data.get("product_id"),
            descripcion=item_data["descripcion"],
            cantidad=item_data["cantidad"],
            precio_unitario=item_data["precio_unitario"],
            descuento_pct=item_data["descuento_pct"],
            subtotal=item_data["subtotal"],
            tiene_iva=item_data["tiene_iva"],
        )
        db.add(item)

        # Descontar inventario si tiene product_id
        if item_data.get("product_id"):
            prod_result = await db.execute(select(Product).where(Product.id == item_data["product_id"]))
            product = prod_result.scalar_one_or_none()
            if product and not product.is_service:
                stock_antes = product.stock_actual
                product.stock_actual -= item_data["cantidad"]
                movement = InventoryMovement(
                    product_id=product.id,
                    tipo=MovementType.salida,
                    cantidad=item_data["cantidad"],
                    stock_antes=stock_antes,
                    stock_despues=product.stock_actual,
                    referencia=folio,
                    notas="Venta POS",
                    created_by_id=current_user.id,
                )
                db.add(movement)

    await db.commit()
    await db.refresh(venta)
    return POSSaleOut.model_validate(venta, from_attributes=True)


@router.delete("/sales/{sale_id}", dependencies=[Depends(require_roles(UserRole.gerencia, UserRole.administracion))])
async def cancel_pos_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(POSSale).where(POSSale.id == sale_id))
    venta = result.scalar_one_or_none()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta POS no encontrada")
    if venta.is_cancelled:
        raise HTTPException(status_code=400, detail="La venta ya está cancelada")

    venta.is_cancelled = True

    # Revertir inventario
    for item in venta.items:
        if item.product_id:
            prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
            product = prod_result.scalar_one_or_none()
            if product and not product.is_service:
                stock_antes = product.stock_actual
                product.stock_actual += item.cantidad
                movement = InventoryMovement(
                    product_id=product.id,
                    tipo=MovementType.devolucion,
                    cantidad=item.cantidad,
                    stock_antes=stock_antes,
                    stock_despues=product.stock_actual,
                    referencia=venta.folio,
                    notas="Cancelación POS",
                    created_by_id=current_user.id,
                )
                db.add(movement)

    await db.commit()
    return {"ok": True}
