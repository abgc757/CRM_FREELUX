from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from decimal import Decimal
from app.database import get_db
from app.models.user import User, UserRole
from app.models.quote import Quote, QuoteItem, QuoteStatus
from app.models.client import Client
from app.models.product import Product, UnitType
from app.core.dependencies import get_current_user, require_roles
from app.schemas.quote import QuoteCreate, QuoteUpdate, QuoteOut, QuoteListOut, PaginatedQuotes

router = APIRouter(prefix="/quotes", tags=["quotes"])

IVA = Decimal("0.16")


async def _next_folio(db: AsyncSession) -> str:
    result = await db.execute(select(func.count()).select_from(Quote))
    count = result.scalar() + 1
    return f"COT-{count:06d}"


def _calc_totals(items: list[QuoteItem]) -> tuple[Decimal, Decimal, Decimal]:
    subtotal = Decimal("0")
    iva_total = Decimal("0")
    for item in items:
        sub = (item.cantidad * item.precio_unitario * (1 - item.descuento_pct / 100)).quantize(Decimal("0.01"))
        item.subtotal = sub
        subtotal += sub
        if item.tiene_iva:
            iva_total += (sub * IVA).quantize(Decimal("0.01"))
    return subtotal, iva_total, subtotal + iva_total


@router.get("/", response_model=PaginatedQuotes)
async def list_quotes(
    status: Optional[QuoteStatus] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = []
    if current_user.role == UserRole.ventas:
        conditions.append(Quote.seller_id == current_user.id)
    if status:
        conditions.append(Quote.status == status)
    if client_id:
        conditions.append(Quote.client_id == client_id)
    if search:
        term = f"%{search}%"
        conditions.append(
            or_(
                Quote.folio.ilike(term),
                Quote.client_id.in_(
                    select(Client.id).where(Client.nombre.ilike(term))
                ),
            )
        )

    base_q = select(Quote).join(Client, Quote.client_id == Client.id).where(and_(*conditions))
    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar()
    rows = (await db.execute(
        base_q.add_columns(Client.nombre.label("client_nombre"))
        .order_by(Quote.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )).all()

    items = [
        QuoteListOut(
            id=q.id, folio=q.folio, client_id=q.client_id,
            client_nombre=nombre, seller_id=q.seller_id,
            status=q.status, total=q.total, created_at=q.created_at,
        )
        for q, nombre in rows
    ]
    return PaginatedQuotes(total=total, page=page, page_size=page_size, items=items)


@router.get("/{quote_id}", response_model=QuoteOut)
async def get_quote(quote_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(
        select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return quote


@router.post("/", response_model=QuoteOut)
async def create_quote(
    body: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.items:
        raise HTTPException(status_code=400, detail="La cotización debe tener al menos un producto")

    folio = await _next_folio(db)
    quote = Quote(
        folio=folio,
        client_id=body.client_id,
        seller_id=current_user.id,
        notas=body.notas,
        condiciones_pago=body.condiciones_pago,
        vigencia_dias=body.vigencia_dias,
    )
    db.add(quote)
    await db.flush()

    items = []
    for item_in in body.items:
        item = QuoteItem(
            quote_id=quote.id,
            product_id=item_in.product_id,
            descripcion=item_in.descripcion,
            cantidad=item_in.cantidad,
            unidad=item_in.unidad,
            precio_unitario=item_in.precio_unitario,
            descuento_pct=item_in.descuento_pct,
            tiene_iva=item_in.tiene_iva,
            subtotal=Decimal("0"),
        )
        items.append(item)
        db.add(item)

    await db.flush()
    subtotal, iva, total = _calc_totals(items)
    quote.subtotal = subtotal
    quote.iva = iva
    quote.total = total

    await db.commit()
    result = await db.execute(select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote.id))
    return result.scalar_one()


@router.patch("/{quote_id}", response_model=QuoteOut)
async def update_quote(
    quote_id: int,
    body: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if current_user.role == UserRole.ventas and quote.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    if quote.status in (QuoteStatus.convertida, QuoteStatus.cancelada):
        raise HTTPException(status_code=400, detail="No se puede editar una cotización convertida o cancelada")

    for field, value in body.model_dump(exclude_none=True, exclude={"items"}).items():
        setattr(quote, field, value)

    if body.items is not None:
        for old_item in quote.items:
            await db.delete(old_item)
        await db.flush()
        items = []
        for item_in in body.items:
            item = QuoteItem(
                quote_id=quote.id,
                product_id=item_in.product_id,
                descripcion=item_in.descripcion,
                cantidad=item_in.cantidad,
                unidad=item_in.unidad,
                precio_unitario=item_in.precio_unitario,
                descuento_pct=item_in.descuento_pct,
                tiene_iva=item_in.tiene_iva,
                subtotal=Decimal("0"),
            )
            items.append(item)
            db.add(item)
        await db.flush()
        subtotal, iva, total = _calc_totals(items)
        quote.subtotal = subtotal
        quote.iva = iva
        quote.total = total

    await db.commit()
    result = await db.execute(select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote.id))
    return result.scalar_one()
