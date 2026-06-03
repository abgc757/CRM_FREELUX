from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Quote, QuoteItem, Client, Product
from app.schemas.quote import (
    QuoteCreate, QuoteUpdate, QuoteOut, QuoteItemOut,
    PriceApprovalRequest, PriceApprovalResponse,
)

router = APIRouter(prefix="/quotes", tags=["quotes"])


async def generate_folio(db: AsyncSession) -> str:
    today = datetime.now(timezone.utc)
    prefix = f"COT-{today.strftime('%Y%m')}-"
    result = await db.execute(
        select(func.count(Quote.id)).where(Quote.folio.like(f"{prefix}%"))
    )
    count = result.scalar() + 1
    return f"{prefix}{count:04d}"


def calculate_totals(items: list, descuento: float = 0.0):
    subtotal = sum(i.subtotal for i in items)
    descuento_amt = subtotal * (descuento / 100) if descuento > 0 else 0
    impuesto = (subtotal - descuento_amt) * 0.16
    total = subtotal - descuento_amt + impuesto
    return round(subtotal, 2), round(descuento_amt, 2), round(impuesto, 2), round(total, 2)


@router.get("", response_model=List[QuoteOut])
async def list_quotes(
    estado: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Quote).where(Quote.is_active == True)
    if current_user.role.name == "ventas":
        query = query.where(Quote.vendedor_id == current_user.id)
    if estado:
        query = query.where(Quote.estado == estado)
    query = query.order_by(Quote.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [QuoteOut.model_validate(q) for q in result.scalars().all()]


@router.get("/{quote_id}", response_model=QuoteOut)
async def get_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    if current_user.role.name == "ventas" and quote.vendedor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your quote")
    return QuoteOut.model_validate(quote)


@router.post("", response_model=QuoteOut, status_code=status.HTTP_201_CREATED)
async def create_quote(
    body: QuoteCreate,
    current_user: User = Depends(RoleChecker(["ventas", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    client_result = await db.execute(select(Client).where(Client.id == body.cliente_id))
    if not client_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    items = []
    requires_approval = False
    for item_data in body.items:
        prod_result = await db.execute(select(Product).where(Product.id == item_data.product_id))
        product = prod_result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_data.product_id} not found")
        subtotal = round(item_data.cantidad * item_data.precio_unitario, 2)
        if item_data.precio_unitario < product.costo:
            requires_approval = True
        items.append(QuoteItem(
            product_id=item_data.product_id,
            cantidad=item_data.cantidad,
            precio_unitario=item_data.precio_unitario,
            descuento=item_data.descuento or 0,
            subtotal=subtotal,
            notas=item_data.notas,
        ))
    subtotal, descuento_amt, impuesto, total = calculate_totals(items, body.descuento)
    folio = await generate_folio(db)
    quote = Quote(
        folio=folio,
        cliente_id=body.cliente_id,
        vendedor_id=current_user.id,
        subtotal=subtotal,
        descuento=descuento_amt,
        impuesto=impuesto,
        total=total,
        validez_dias=body.validez_dias or 15,
        notas=body.notas,
        estado="pendiente_aprobacion" if requires_approval else "borrador",
        requires_price_approval=requires_approval,
        price_approval_status="pending" if requires_approval else "none",
    )
    quote.items = items
    db.add(quote)
    await db.flush()
    await db.refresh(quote)
    return QuoteOut.model_validate(quote)


@router.post("/{quote_id}/convert", response_model=dict)
async def convert_quote_to_sale(
    quote_id: int,
    current_user: User = Depends(RoleChecker(["ventas", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    from app.models import Sale, SaleItem
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    if quote.estado != "aprobada":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quote is in state '{quote.estado}', must be 'aprobada'")
    sale_folio = f"VEN-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    sale = Sale(
        folio=sale_folio,
        quote_id=quote.id,
        cliente_id=quote.cliente_id,
        vendedor_id=current_user.id,
        subtotal=quote.subtotal,
        descuento=quote.descuento,
        impuesto=quote.impuesto,
        total=quote.total,
        notas=quote.notas,
        estado="completada",
    )
    db.add(sale)
    await db.flush()
    for item in quote.items:
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=item.product_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            descuento=item.descuento,
            subtotal=item.subtotal,
        )
        db.add(sale_item)
        prod = await db.get(Product, item.product_id)
        if prod and prod.stock >= item.cantidad:
            prod.stock -= item.cantidad
            prod.version += 1
    quote.estado = "convertida"
    await db.flush()
    return {"message": "Quote converted to sale", "sale_id": sale.id, "folio": sale_folio}


@router.post("/{quote_id}/approve-price", response_model=QuoteOut)
async def approve_quote_price(
    quote_id: int,
    body: PriceApprovalResponse,
    current_user: User = Depends(RoleChecker(["gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    quote.price_approval_status = "approved" if body.approved else "rejected"
    quote.approved_by_id = current_user.id
    if body.approved:
        quote.estado = "aprobada"
    await db.flush()
    await db.refresh(quote)
    return QuoteOut.model_validate(quote)
