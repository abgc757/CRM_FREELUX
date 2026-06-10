from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from decimal import Decimal
from datetime import date, timedelta
from app.database import get_db
from app.models.user import User, UserRole
from app.models.quote import Quote, QuoteItem, QuoteStatus
from app.models.sale import Sale, Payment, SaleStatus, PaymentMethod
from app.models.client import Client
from app.core.dependencies import get_current_user, require_roles
from app.schemas.sale import SaleCreate, SaleOut, SaleListOut, PaginatedSales, PaymentIn, PaymentOut

router = APIRouter(prefix="/sales", tags=["sales"])


async def _next_folio(db: AsyncSession) -> str:
    result = await db.execute(select(func.count()).select_from(Sale))
    count = result.scalar() + 1
    return f"VTA-{count:06d}"


@router.get("/", response_model=PaginatedSales)
async def list_sales(
    status: Optional[SaleStatus] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = []
    if current_user.role == UserRole.ventas:
        conditions.append(Sale.seller_id == current_user.id)
    if status:
        conditions.append(Sale.status == status)
    if client_id:
        conditions.append(Sale.client_id == client_id)
    if search:
        term = f"%{search}%"
        conditions.append(
            or_(
                Sale.folio.ilike(term),
                Sale.client_id.in_(
                    select(Client.id).where(Client.nombre.ilike(term))
                ),
            )
        )

    base_q = select(Sale).join(Client, Sale.client_id == Client.id).where(and_(*conditions))
    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar()
    rows = (await db.execute(
        base_q.add_columns(Client.nombre.label("client_nombre"))
        .order_by(Sale.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )).all()

    items = [
        SaleListOut(
            id=s.id, folio=s.folio, client_id=s.client_id,
            client_nombre=nombre, status=s.status,
            metodo_pago=s.metodo_pago, total=s.total,
            saldo_pendiente=s.saldo_pendiente, created_at=s.created_at,
        )
        for s, nombre in rows
    ]
    return PaginatedSales(total=total, page=page, page_size=page_size, items=items)


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(sale_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(
        select(Sale).options(selectinload(Sale.payments)).where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return sale


@router.post("/", response_model=SaleOut)
async def create_sale(
    body: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert an approved quote into a sale."""
    result = await db.execute(
        select(Quote)
        .options(selectinload(Quote.items), selectinload(Quote.sale))
        .where(Quote.id == body.quote_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if quote.status not in (QuoteStatus.aprobada, QuoteStatus.enviada):
        raise HTTPException(status_code=400, detail=f"La cotización debe estar aprobada (estado actual: {quote.status.value})")
    if quote.sale:
        raise HTTPException(status_code=400, detail="Esta cotización ya fue convertida a venta")

    folio = await _next_folio(db)
    sale = Sale(
        folio=folio,
        quote_id=quote.id,
        client_id=quote.client_id,
        seller_id=quote.seller_id,
        metodo_pago=body.metodo_pago,
        subtotal=quote.subtotal,
        iva=quote.iva,
        total=quote.total,
        notas=body.notas,
    )

    # If credit, balance = total; if cash, balance = 0
    client_result = await db.execute(select(Client).where(Client.id == quote.client_id))
    client = client_result.scalar_one_or_none()

    if body.metodo_pago == PaymentMethod.credito:
        sale.saldo_pendiente = quote.total
        if client and client.credito_activo:
            new_balance = client.saldo_pendiente + quote.total
            if new_balance > client.limite_credito:
                raise HTTPException(
                    status_code=400,
                    detail=f"Excede límite de crédito. Disponible: ${client.limite_credito - client.saldo_pendiente:,.2f}"
                )
            client.saldo_pendiente = new_balance
        dias = client.dias_credito if client else 30
        sale.fecha_vencimiento = date.today() + timedelta(days=dias)
    else:
        sale.saldo_pendiente = Decimal("0")

    quote.status = QuoteStatus.convertida
    db.add(sale)
    await db.commit()
    result = await db.execute(select(Sale).options(selectinload(Sale.payments)).where(Sale.id == sale.id))
    return result.scalar_one()


@router.post("/{sale_id}/payments", response_model=PaymentOut)
async def register_payment(
    sale_id: int,
    body: PaymentIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if sale.saldo_pendiente <= 0:
        raise HTTPException(status_code=400, detail="Esta venta ya está saldada")
    if body.monto > sale.saldo_pendiente:
        raise HTTPException(status_code=400, detail=f"El monto excede el saldo pendiente (${sale.saldo_pendiente:,.2f})")

    payment = Payment(
        sale_id=sale.id,
        client_id=sale.client_id,
        monto=body.monto,
        metodo=body.metodo,
        referencia=body.referencia,
        fecha_pago=body.fecha_pago or date.today(),
        notas=body.notas,
        registered_by_id=current_user.id,
    )
    db.add(payment)

    sale.saldo_pendiente -= body.monto

    # Update client credit balance
    client_result = await db.execute(select(Client).where(Client.id == sale.client_id))
    client = client_result.scalar_one_or_none()
    if client and client.credito_activo and sale.metodo_pago == PaymentMethod.credito:
        client.saldo_pendiente = max(Decimal("0"), client.saldo_pendiente - body.monto)

    if sale.saldo_pendiente <= 0:
        sale.status = SaleStatus.entregada

    await db.commit()
    await db.refresh(payment)
    return payment


@router.patch("/{sale_id}/status")
async def update_sale_status(
    sale_id: int,
    status: SaleStatus,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.gerencia, UserRole.administracion, UserRole.ventas)),
):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    sale.status = status
    await db.commit()
    return {"id": sale_id, "status": status}
