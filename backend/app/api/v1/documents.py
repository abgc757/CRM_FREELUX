"""
Endpoints for PDF generation and CFDI emission.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from app.database import get_db
from app.models.user import User, UserRole
from app.models.sale import Sale
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.services.pdf_generator import generate_quote_pdf, generate_nota_venta_pdf, generate_remision_pdf
from app.services.facturama import emit_cfdi, cancel_cfdi, _base_url, _auth

router = APIRouter(prefix="/documents", tags=["documents"])

ADMIN_ROLES = (UserRole.gerencia, UserRole.administracion)


@router.post("/quotes/{quote_id}/pdf")
async def quote_pdf(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        url = await generate_quote_pdf(db, quote_id)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")


@router.post("/sales/{sale_id}/nota-venta")
async def nota_venta_pdf(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        url = await generate_nota_venta_pdf(db, sale_id)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")


@router.post("/sales/{sale_id}/remision")
async def remision_pdf(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        url = await generate_remision_pdf(db, sale_id)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")


@router.post("/sales/{sale_id}/cfdi", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def emit_invoice(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await emit_cfdi(db, sale_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error emitiendo CFDI: {e}")


@router.delete("/sales/{sale_id}/cfdi", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def cancel_invoice(
    sale_id: int,
    motivo: str = "02",
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await cancel_cfdi(db, sale_id, motivo)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelando CFDI: {e}")


@router.get("/sales/{sale_id}/cfdi/download")
async def download_cfdi(
    sale_id: int,
    tipo: str = Query("xml", pattern="^(xml|pdf)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Proxy que descarga el XML o PDF del CFDI.
    - Modo mock/media: sirve el archivo estático desde MEDIA_DIR.
    - Modo Facturama real: descarga desde la API con auth y lo reenvía.
    """
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if not sale.cfdi_uuid:
        raise HTTPException(status_code=404, detail="Esta venta no tiene CFDI emitido")

    url = sale.cfdi_xml_url if tipo == "xml" else sale.cfdi_pdf_url
    if not url:
        raise HTTPException(status_code=404, detail=f"URL de {tipo.upper()} no disponible")

    # Normalizar path legacy /mock/cfdi/ → /media/cfdi/
    if url.startswith("/mock/cfdi/"):
        url = "/media/cfdi/" + url[len("/mock/cfdi/"):]
        # Actualizar el registro para futuras consultas
        if tipo == "xml":
            sale.cfdi_xml_url = url
        else:
            sale.cfdi_pdf_url = url
        await db.commit()

    # Archivo local (mock o guardado en media)
    if url.startswith("/media/"):
        import os
        from pathlib import Path
        from datetime import datetime, timezone

        # Resolver path del XML (el PDF mock apunta al mismo .xml)
        xml_url = sale.cfdi_xml_url or url
        if xml_url.startswith("/mock/cfdi/"):
            xml_url = "/media/cfdi/" + xml_url[len("/mock/cfdi/"):]
        xml_local = os.path.join(settings.MEDIA_DIR, xml_url[len("/media/"):])

        # Si el XML no existe en disco, regenerarlo
        if not os.path.exists(xml_local) and sale.cfdi_uuid:
            from app.models.client import Client
            cl_result = await db.execute(select(Client).where(Client.id == sale.client_id))
            cl = cl_result.scalar_one_or_none()
            rfc = cl.rfc if cl and cl.rfc else "XAXX010101000"
            nombre = cl.nombre if cl else "PÚBLICO EN GENERAL"
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
            xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Version="4.0" Serie="F" Folio="{sale.folio}"
  Fecha="{now}" Sello="MOCK" FormaPago="03"
  NoCertificado="00000000000000000000" Certificado="MOCK"
  SubTotal="{float(sale.subtotal):.2f}" Moneda="MXN"
  Total="{float(sale.total):.2f}" TipoDeComprobante="I"
  MetodoPago="PUE" LugarExpedicion="64000">
  <cfdi:Emisor Rfc="FME121108UI1" Nombre="Aceros y Perfiles FreeLux S.A. de C.V." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="{rfc}" Nombre="{nombre}"
    DomicilioFiscalReceptor="00000" RegimenFiscalReceptor="616" UsoCFDI="G03"/>
  <cfdi:Conceptos/>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1" UUID="{sale.cfdi_uuid}"
      FechaTimbrado="{now}" RfcProvCertif="SAT970701NN3"
      SelloCFD="MOCK" NoCertificadoSAT="00000000000000000000" SelloSAT="MOCK"/>
  </cfdi:Complemento>
</cfdi:Comprobante>"""
            cfdi_dir = Path(settings.MEDIA_DIR) / "cfdi"
            cfdi_dir.mkdir(parents=True, exist_ok=True)
            Path(xml_local).write_text(xml_content, encoding="utf-8")
            new_xml_rel = f"/media/cfdi/{sale.cfdi_uuid}.xml"
            sale.cfdi_xml_url = new_xml_rel
            sale.cfdi_pdf_url = new_xml_rel
            await db.commit()
            xml_local = os.path.join(settings.MEDIA_DIR, f"cfdi/{sale.cfdi_uuid}.xml")

        if not os.path.exists(xml_local):
            raise HTTPException(status_code=404, detail=f"Archivo CFDI no encontrado en disco")

        filename = f"CFDI-{sale.cfdi_uuid}.{tipo}"

        if tipo == "xml":
            with open(xml_local, "rb") as f:
                data = f.read()
            return Response(
                content=data,
                media_type="text/xml; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        # Para PDF: generar representación PDF del CFDI con reportlab
        pdf_data = _generate_cfdi_pdf_mock(sale)
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )

    # URL de Facturama real — proxy con auth
    if url.startswith("http"):
        async with httpx.AsyncClient(auth=_auth(), timeout=20.0) as client:
            r = await client.get(url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Facturama devolvió {r.status_code} al descargar {tipo.upper()}")
        content_type = r.headers.get("content-type", "application/octet-stream")
        filename = f"CFDI-{sale.cfdi_uuid}.{tipo}"
        return Response(
            content=r.content,
            media_type=content_type,
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )

    raise HTTPException(status_code=404, detail="URL de CFDI no reconocida")


def _generate_cfdi_pdf_mock(sale: Sale) -> bytes:
    """Genera un PDF representativo del CFDI mock usando weasyprint."""
    from weasyprint import HTML

    def money(v):
        try:
            return f"${float(v):,.2f} MXN"
        except Exception:
            return str(v)

    fecha = str(sale.created_at)[:19] if sale.created_at else "—"
    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; font-size: 11px; color: #222; padding: 30px; }}
  .header {{ border-bottom: 3px solid #e55c00; padding-bottom: 12px; margin-bottom: 16px; }}
  .header h1 {{ font-size: 18px; color: #e55c00; margin-bottom: 4px; }}
  .header p {{ color: #666; font-size: 10px; }}
  .badge-sandbox {{ display: inline-block; background: #fff3cd; border: 1px solid #ffc107;
    color: #856404; font-size: 9px; padding: 2px 8px; border-radius: 4px; margin-top: 6px; }}
  .section {{ margin-bottom: 14px; }}
  .section-title {{ font-size: 10px; font-weight: bold; color: #e55c00;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
  table.info {{ width: 100%; border-collapse: collapse; }}
  table.info td {{ padding: 4px 8px; font-size: 10px; }}
  table.info td:first-child {{ font-weight: bold; color: #555; width: 140px; }}
  .uuid {{ font-family: monospace; font-size: 10px; background: #f4f4f4;
    padding: 6px 10px; border-radius: 4px; border: 1px solid #ddd;
    word-break: break-all; margin-top: 4px; }}
  table.totals {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
  table.totals td {{ padding: 5px 10px; font-size: 11px; }}
  table.totals td:last-child {{ text-align: right; font-weight: bold; }}
  .total-row {{ border-top: 2px solid #e55c00; color: #e55c00; font-size: 13px; }}
  .footer {{ margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc;
    font-size: 9px; color: #999; text-align: center; }}
</style>
</head>
<body>
  <div class="header">
    <h1>Comprobante Fiscal Digital (CFDI 4.0)</h1>
    <p>Aceros y Perfiles FreeLux S.A. de C.V. &nbsp;·&nbsp; RFC: FME121108UI1</p>
    <p>Régimen Fiscal: 601 – General de Ley Personas Morales &nbsp;·&nbsp; Lugar de expedición: 64000</p>
    <span class="badge-sandbox">⚠ DOCUMENTO SANDBOX — NO VÁLIDO ANTE EL SAT</span>
  </div>

  <div class="section">
    <div class="section-title">Datos del comprobante</div>
    <table class="info">
      <tr><td>Folio:</td><td>{sale.folio or "—"}</td><td>Serie:</td><td>F</td></tr>
      <tr><td>Fecha:</td><td>{fecha}</td><td>Tipo:</td><td>I – Ingreso</td></tr>
      <tr><td>Forma de pago:</td><td>03 – Transferencia electrónica</td><td>Método:</td><td>PUE – Pago en una sola exhibición</td></tr>
      <tr><td>Moneda:</td><td>MXN – Peso Mexicano</td><td>Tipo de cambio:</td><td>1.00</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">UUID / Folio Fiscal</div>
    <div class="uuid">{sale.cfdi_uuid or "—"}</div>
  </div>

  <div class="section">
    <div class="section-title">Importes</div>
    <table class="totals">
      <tr><td>Subtotal</td><td>{money(sale.subtotal)}</td></tr>
      <tr><td>IVA (16%)</td><td>{money(sale.iva)}</td></tr>
      <tr class="total-row"><td>Total</td><td>{money(sale.total)}</td></tr>
    </table>
  </div>

  <div class="footer">
    Este CFDI fue generado en modo de simulación (FACTURAMA_MOCK=true).<br>
    Para timbrado real configure las credenciales de Facturama en producción.
  </div>
</body>
</html>"""

    return HTML(string=html).write_pdf()
