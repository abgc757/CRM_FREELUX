from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Quote, QuoteItem, Product
from app.schemas.quote import QuoteItemCreate


async def generate_pdf(quote: Quote) -> str:
    # Placeholder: would integrate with ReportLab / WeasyPrint
    pdf_url = f"/media/quotes/{quote.folio}.pdf"
    quote.pdf_url = pdf_url
    quote.pdf_generated = True
    return pdf_url


async def check_price_approval_needed(items: List[QuoteItemCreate], db: AsyncSession) -> bool:
    for item in items:
        result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = result.scalar_one_or_none()
        if product and item.precio_unitario < product.costo:
            return True
    return False
