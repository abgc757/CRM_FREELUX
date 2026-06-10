"""
Facturama API integration for CFDI 4.0.
Docs: https://apisandbox.facturama.mx/docs
"""
import uuid as _uuid
import httpx
from typing import Optional
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.sale import Sale
from app.models.quote import Quote
from app.models.client import Client
from app.models.user import User
from app.models.product import Product


def _base_url() -> str:
    if settings.FACTURAMA_SANDBOX:
        return "https://apisandbox.facturama.mx"
    return "https://api.facturama.mx"


def _auth() -> tuple[str, str]:
    return (settings.FACTURAMA_USER or "", settings.FACTURAMA_PASSWORD or "")


def _build_cfdi_payload(
    sale: Sale,
    quote: Quote,
    client: Client,
    seller: User,
    items_data: list[dict],
) -> dict:
    """Build Facturama CFDI 4.0 payload."""
    line_items = []
    for item in items_data:
        subtotal_sin_desc = float(item["precio_unitario"]) * float(item["cantidad"])
        descuento = subtotal_sin_desc * float(item["descuento_pct"]) / 100
        line_items.append({
            "Quantity": str(item["cantidad"]),
            "Unit": item["unidad_sat"],
            "UnitCode": item["clave_sat"],
            "IdentificationNumber": item["clave"],
            "Name": item["descripcion"][:100],
            "UnitPrice": f"{item['precio_unitario']:.4f}",
            "Subtotal": f"{subtotal_sin_desc:.2f}",
            "Discount": f"{descuento:.2f}" if descuento > 0 else None,
            "Total": f"{item['subtotal']:.2f}",
            "TaxObject": "02" if item["tiene_iva"] else "01",
            "Taxes": [
                {
                    "Total": f"{item['subtotal'] * 0.16:.2f}",
                    "Name": "IVA",
                    "Base": f"{item['subtotal']:.2f}",
                    "Rate": "0.16",
                    "IsRetention": False,
                }
            ] if item["tiene_iva"] else [],
        })

    return {
        "Serie": "F",
        "Currency": "MXN",
        "ExpeditionPlace": "64000",
        "CfdiType": "I",
        "PaymentForm": "99" if sale.metodo_pago.value == "credito" else "03",
        "PaymentMethod": "PPD" if sale.metodo_pago.value == "credito" else "PUE",
        "Receiver": {
            "Rfc": client.rfc or "XAXX010101000",
            "Name": client.razon_social or client.nombre,
            "CfdiUse": client.uso_cfdi or "G03",
            "FiscalRegime": client.regimen_fiscal or "616",
            "TaxZipCode": client.cp or "00000",
        },
        "Items": line_items,
    }


async def emit_cfdi(db: AsyncSession, sale_id: int) -> dict:
    """
    Emit a CFDI 4.0 invoice for a sale via Facturama.
    Returns {"uuid": ..., "xml_url": ..., "pdf_url": ...}
    """
    if settings.FACTURAMA_MOCK:
        return await _emit_cfdi_mock(db, sale_id)

    if not settings.FACTURAMA_USER or not settings.FACTURAMA_PASSWORD:
        raise ValueError("Facturama no está configurado. Agregar FACTURAMA_USER y FACTURAMA_PASSWORD en .env")

    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.client), selectinload(Sale.quote).selectinload(Quote.items))
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise ValueError(f"Venta {sale_id} no encontrada")
    if sale.cfdi_uuid:
        raise ValueError("Esta venta ya tiene CFDI emitido")
    if not sale.quote:
        raise ValueError("La venta no tiene cotización asociada con partidas")

    seller_result = await db.execute(select(User).where(User.id == sale.seller_id))
    seller = seller_result.scalar_one_or_none()

    items_data = []
    for item in sale.quote.items:
        prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
        prod = prod_result.scalar_one_or_none()
        items_data.append({
            "clave": prod.clave if prod else "VARIOS",
            "descripcion": item.descripcion,
            "cantidad": float(item.cantidad),
            "unidad": item.unidad.value,
            "unidad_sat": "KGM" if item.unidad.value == "kg" else "H87",
            "clave_sat": "27111700",  # Structural steel products
            "precio_unitario": float(item.precio_unitario),
            "descuento_pct": float(item.descuento_pct),
            "subtotal": float(item.subtotal),
            "tiene_iva": item.tiene_iva,
        })

    payload = _build_cfdi_payload(sale, sale.quote, sale.client, seller, items_data)

    async with httpx.AsyncClient(auth=_auth(), timeout=30.0) as client_http:
        response = await client_http.post(f"{_base_url()}/api/3/cfdis", json=payload)
        if response.status_code not in (200, 201):
            raise ValueError(f"Facturama error {response.status_code}: {response.text}")
        data = response.json()

    cfdi_id = data.get("Id")
    uuid = data.get("Complement", {}).get("TaxStamp", {}).get("Uuid", cfdi_id)

    # Download XML and PDF
    base = _base_url()
    xml_url = f"{base}/api/3/cfdis/{cfdi_id}/content/xml"
    pdf_url = f"{base}/api/3/cfdis/{cfdi_id}/content/pdf"

    sale.cfdi_uuid = uuid
    sale.cfdi_xml_url = xml_url
    sale.cfdi_pdf_url = pdf_url
    from app.models.sale import SaleStatus
    sale.status = SaleStatus.facturada
    await db.commit()

    return {"uuid": uuid, "xml_url": xml_url, "pdf_url": pdf_url, "cfdi_id": cfdi_id}


async def _emit_cfdi_mock(db: AsyncSession, sale_id: int) -> dict:
    """Simulates CFDI emission without calling Facturama. Generates a minimal XML and saves it to disk."""
    from pathlib import Path
    from datetime import datetime, timezone

    result = await db.execute(
        select(Sale).options(selectinload(Sale.client)).where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise ValueError(f"Venta {sale_id} no encontrada")
    if sale.cfdi_uuid:
        raise ValueError("Esta venta ya tiene CFDI emitido")

    fake_uuid = str(_uuid.uuid4()).upper()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    rfc_receptor = sale.client.rfc if sale.client and sale.client.rfc else "XAXX010101000"
    nombre_receptor = sale.client.nombre if sale.client else "PÚBLICO EN GENERAL"

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Version="4.0" Serie="F" Folio="{sale.folio}"
  Fecha="{now}" Sello="MOCK_SELLO" FormaPago="03"
  NoCertificado="00000000000000000000" Certificado="MOCK"
  SubTotal="{float(sale.subtotal):.2f}" Moneda="MXN"
  Total="{float(sale.total):.2f}" TipoDeComprobante="I"
  MetodoPago="PUE" LugarExpedicion="64000">
  <cfdi:Emisor Rfc="FME121108UI1" Nombre="Aceros y Perfiles FreeLux S.A. de C.V." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="{rfc_receptor}" Nombre="{nombre_receptor}"
    DomicilioFiscalReceptor="00000" RegimenFiscalReceptor="616" UsoCFDI="G03"/>
  <cfdi:Conceptos/>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1" UUID="{fake_uuid}"
      FechaTimbrado="{now}"
      RfcProvCertif="SAT970701NN3"
      SelloCFD="MOCK" NoCertificadoSAT="00000000000000000000" SelloSAT="MOCK"/>
  </cfdi:Complemento>
</cfdi:Comprobante>"""

    cfdi_dir = Path(settings.MEDIA_DIR) / "cfdi"
    cfdi_dir.mkdir(parents=True, exist_ok=True)

    xml_path = cfdi_dir / f"{fake_uuid}.xml"
    xml_path.write_text(xml_content, encoding="utf-8")

    xml_rel = f"/media/cfdi/{fake_uuid}.xml"
    # PDF no existe en mock — apuntar al mismo XML para no romper el link
    pdf_rel = xml_rel

    sale.cfdi_uuid = fake_uuid
    sale.cfdi_xml_url = xml_rel
    sale.cfdi_pdf_url = pdf_rel
    from app.models.sale import SaleStatus
    sale.status = SaleStatus.facturada
    await db.commit()

    return {
        "uuid": fake_uuid,
        "xml_url": xml_rel,
        "pdf_url": pdf_rel,
        "cfdi_id": fake_uuid,
        "mock": True,
    }


async def cancel_cfdi(db: AsyncSession, sale_id: int, motivo: str = "02") -> dict:
    """Cancel a CFDI. Motivo: 01=error, 02=no transaction, 03=duplicate, 04=normativity."""
    if not settings.FACTURAMA_USER:
        raise ValueError("Facturama no configurado")

    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale or not sale.cfdi_uuid:
        raise ValueError("No hay CFDI emitido para esta venta")

    async with httpx.AsyncClient(auth=_auth(), timeout=30.0) as client_http:
        response = await client_http.delete(
            f"{_base_url()}/api/3/cfdis/{sale.cfdi_uuid}",
            params={"motive": motivo},
        )
        if response.status_code not in (200, 204):
            raise ValueError(f"Error cancelando CFDI: {response.text}")

    from app.models.sale import SaleStatus
    sale.status = SaleStatus.cancelada
    sale.cfdi_uuid = None
    await db.commit()
    return {"cancelled": True}
