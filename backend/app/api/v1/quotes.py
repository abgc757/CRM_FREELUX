import io
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.price_update_job import PriceRequest
from app.models.quote import Quote, QuoteStatus
from app.models.user import User, UserRole
from app.schemas.quote import PriceRequestCreate, QuoteCreate, QuoteOut, QuoteUpdate
from app.schemas.price_management import PriceRequestOut
from app.services.quotes import convert_quote_to_sale, create_quote, update_quote

router = APIRouter(prefix="/quotes", tags=["quotes"])


def _quote_query():
    return select(Quote).options(selectinload(Quote.items))


async def _get_quote_or_404(db: AsyncSession, quote_id: UUID, user: User) -> Quote:
    result = await db.execute(
        _quote_query().where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if user.role == UserRole.ventas and quote.vendedor_id != user.id:
        raise HTTPException(status_code=403, detail="Not your quote")
    return quote


@router.get("", response_model=List[QuoteOut])
async def list_quotes(
    vendedor_id: Optional[UUID] = Query(None),
    estado: Optional[QuoteStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = _quote_query()
    if current_user.role == UserRole.ventas:
        q = q.where(Quote.vendedor_id == current_user.id)
    elif vendedor_id:
        q = q.where(Quote.vendedor_id == vendedor_id)
    if estado:
        q = q.where(Quote.estado == estado)
    result = await db.execute(q.order_by(Quote.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=QuoteOut, status_code=201)
async def create(
    data: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = await create_quote(db, data, current_user.id)
    return quote


@router.get("/{quote_id}", response_model=QuoteOut)
async def get_quote(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_quote_or_404(db, quote_id, current_user)


@router.put("/{quote_id}", response_model=QuoteOut)
async def update(
    quote_id: UUID,
    data: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = await _get_quote_or_404(db, quote_id, current_user)
    return await update_quote(db, quote, data)


@router.post("/{quote_id}/convert")
async def convert(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = await _get_quote_or_404(db, quote_id, current_user)
    sale = await convert_quote_to_sale(db, quote, current_user.id)
    return {"sale_id": str(sale.id), "quote_id": str(quote_id)}


@router.post("/{quote_id}/request-price", response_model=PriceRequestOut, status_code=201)
async def request_price(
    quote_id: UUID,
    data: PriceRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = await _get_quote_or_404(db, quote_id, current_user)
    pr = PriceRequest(
        quote_id=quote.id,
        vendedor_id=current_user.id,
        producto_id=data.producto_id,
        precio_solicitado=data.precio_solicitado,
        notas=data.notas,
    )
    db.add(pr)
    await db.flush()
    await db.refresh(pr)
    return pr


@router.get("/{quote_id}/pdf")
async def get_pdf(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = await _get_quote_or_404(db, quote_id, current_user)
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"FREE LUX - Cotización #{quote.folio}", styles["Title"]))
    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph(f"Estado: {quote.estado}", styles["Normal"]))
    elements.append(Paragraph(f"Moneda: {quote.moneda}", styles["Normal"]))
    if quote.fecha_validez:
        elements.append(Paragraph(f"Válida hasta: {quote.fecha_validez.strftime('%Y-%m-%d')}", styles["Normal"]))
    elements.append(Spacer(1, 4 * mm))

    table_data = [["Descripción", "Cantidad", "Precio Unit.", "Importe"]]
    for item in quote.items:
        table_data.append([
            item.descripcion,
            str(item.cantidad),
            f"${float(item.precio_unitario):,.2f}",
            f"${float(item.importe):,.2f}",
        ])
    table_data.append(["", "", "Subtotal", f"${float(quote.subtotal):,.2f}"])
    table_data.append(["", "", "IVA 16%", f"${float(quote.iva):,.2f}"])
    table_data.append(["", "", "Total", f"${float(quote.total):,.2f}"])

    t = Table(table_data, colWidths=[200, 70, 90, 90])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, -3), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(t)

    if quote.notas:
        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph(f"Notas: {quote.notas}", styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=cotizacion_{quote.folio}.pdf"},
    )


@router.post("/{quote_id}/send-whatsapp")
async def send_whatsapp(
    quote_id: UUID,
    phone: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = await _get_quote_or_404(db, quote_id, current_user)
    from app.core.config import settings
    from app.tasks.notification_tasks import send_whatsapp_quote

    if settings.TWILIO_ACCOUNT_SID:
        send_whatsapp_quote.delay(str(quote.id), phone)
        return {"status": "queued", "phone": phone}
    return {"status": "skipped", "reason": "Twilio not configured", "quote_folio": quote.folio}
