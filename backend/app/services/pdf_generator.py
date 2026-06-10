"""
PDF generation service using Jinja2 + WeasyPrint.
Generates: quotation, nota de venta, remisión.
"""
import os
from datetime import datetime, timezone
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.quote import Quote
from app.models.sale import Sale
from app.models.client import Client
from app.models.user import User
from app.models.product import Product

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

EMPRESA = {
    "nombre": "Aceros y Perfiles FreeLux S.A. de C.V.",
    "rfc": "FME121108UI1",
    "direccion": "Av. Industrial 123, Col. Centro, C.P. 64000, Monterrey, N.L.",
    "telefono": "81 1234 5678",
    "email": "ventas@freelux.mx",
}


def _pdf_path(subfolder: str, filename: str) -> str:
    out_dir = Path(settings.MEDIA_DIR) / "pdfs" / subfolder
    out_dir.mkdir(parents=True, exist_ok=True)
    return str(out_dir / filename)


def _render_pdf(template_name: str, context: dict, out_path: str) -> str:
    template = jinja_env.get_template(template_name)
    html_content = template.render(**context)
    HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf(out_path)
    return out_path


async def generate_quote_pdf(db: AsyncSession, quote_id: int) -> str:
    result = await db.execute(
        select(Quote)
        .options(selectinload(Quote.items), selectinload(Quote.client), selectinload(Quote.seller))
        .where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise ValueError(f"Quote {quote_id} not found")

    # Enrich items with product clave
    items_data = []
    for item in quote.items:
        prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
        prod = prod_result.scalar_one_or_none()
        items_data.append({
            "clave": prod.clave if prod else "—",
            "descripcion": item.descripcion,
            "cantidad": float(item.cantidad),
            "unidad": item.unidad.value,
            "precio_unitario": float(item.precio_unitario),
            "descuento_pct": float(item.descuento_pct),
            "subtotal": float(item.subtotal),
        })

    ctx = {
        "empresa": EMPRESA,
        "folio": quote.folio,
        "fecha": quote.created_at.strftime("%d/%m/%Y"),
        "vigencia_dias": quote.vigencia_dias,
        "status": quote.status.value,
        "condiciones_pago": quote.condiciones_pago or "Contado",
        "notas": quote.notas,
        "cliente": {
            "nombre": quote.client.nombre,
            "razon_social": quote.client.razon_social,
            "rfc": quote.client.rfc,
            "direccion": quote.client.direccion,
            "telefono": quote.client.telefono,
            "email": quote.client.email,
        },
        "vendedor": {"nombre": quote.seller.full_name},
        "items": items_data,
        "subtotal": float(quote.subtotal),
        "iva": float(quote.iva),
        "total": float(quote.total),
        "fecha_generacion": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
    }

    out_path = _pdf_path("quotes", f"{quote.folio}.pdf")
    _render_pdf("quote_pdf.html", ctx, out_path)

    # Save URL back to quote
    relative = f"/media/pdfs/quotes/{quote.folio}.pdf"
    quote.pdf_url = relative
    await db.commit()
    return relative


async def generate_nota_venta_pdf(db: AsyncSession, sale_id: int) -> str:
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.client), selectinload(Sale.quote).selectinload(Quote.items))
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise ValueError(f"Sale {sale_id} not found")

    seller_result = await db.execute(select(User).where(User.id == sale.seller_id))
    seller = seller_result.scalar_one_or_none()

    items_data = []
    if sale.quote:
        for item in sale.quote.items:
            prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
            prod = prod_result.scalar_one_or_none()
            items_data.append({
                "clave": prod.clave if prod else "—",
                "descripcion": item.descripcion,
                "cantidad": float(item.cantidad),
                "unidad": item.unidad.value,
                "precio_unitario": float(item.precio_unitario),
                "descuento_pct": float(item.descuento_pct),
                "subtotal": float(item.subtotal),
            })

    ctx = {
        "empresa": EMPRESA,
        "folio": sale.folio,
        "fecha": sale.created_at.strftime("%d/%m/%Y"),
        "metodo_pago": sale.metodo_pago.value.replace("_", " ").title(),
        "cotizacion_folio": sale.quote.folio if sale.quote else None,
        "notas": sale.notas,
        "cliente": {
            "nombre": sale.client.nombre,
            "razon_social": sale.client.razon_social,
            "rfc": sale.client.rfc,
            "direccion": sale.client.direccion,
            "telefono": sale.client.telefono,
            "dias_credito": sale.client.dias_credito,
        },
        "vendedor": {"nombre": seller.full_name if seller else "—"},
        "items": items_data,
        "subtotal": float(sale.subtotal),
        "iva": float(sale.iva),
        "total": float(sale.total),
        "saldo_pendiente": float(sale.saldo_pendiente),
        "fecha_generacion": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
    }

    out_path = _pdf_path("sales", f"{sale.folio}-nota.pdf")
    _render_pdf("nota_venta_pdf.html", ctx, out_path)
    return f"/media/pdfs/sales/{sale.folio}-nota.pdf"


async def generate_remision_pdf(db: AsyncSession, sale_id: int) -> str:
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.client), selectinload(Sale.quote).selectinload(Quote.items))
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise ValueError(f"Sale {sale_id} not found")

    seller_result = await db.execute(select(User).where(User.id == sale.seller_id))
    seller = seller_result.scalar_one_or_none()

    items_data = []
    if sale.quote:
        for item in sale.quote.items:
            prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
            prod = prod_result.scalar_one_or_none()
            items_data.append({
                "clave": prod.clave if prod else "—",
                "descripcion": item.descripcion,
                "cantidad": float(item.cantidad),
                "unidad": item.unidad.value,
            })

    folio_remision = sale.folio.replace("VTA", "REM")
    ctx = {
        "empresa": EMPRESA,
        "folio": folio_remision,
        "venta_folio": sale.folio,
        "cfdi_uuid": sale.cfdi_uuid,
        "fecha": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "notas": sale.notas,
        "cliente": {
            "nombre": sale.client.nombre,
            "rfc": sale.client.rfc,
            "direccion": sale.client.direccion,
            "telefono": sale.client.telefono,
        },
        "vendedor": {"nombre": seller.full_name if seller else "—"},
        "items": items_data,
        "fecha_generacion": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
    }

    out_path = _pdf_path("sales", f"{folio_remision}.pdf")
    _render_pdf("remision_pdf.html", ctx, out_path)

    relative = f"/media/pdfs/sales/{folio_remision}.pdf"
    sale.remision_url = relative
    await db.commit()
    return relative
