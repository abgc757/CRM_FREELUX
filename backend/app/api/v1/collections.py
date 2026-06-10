from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.models.user import User, UserRole
from app.models.sale import Sale, PaymentMethod
from app.models.client import Client
from app.core.dependencies import get_current_user, require_roles
from app.schemas.collections import (
    AgingReport, AgingBucket, ClientAgingRow,
    CollectionsSummary, OverdueSaleOut, CreditUpdateIn,
)

router = APIRouter(prefix="/collections", tags=["collections"])
CREDIT_ROLES = (UserRole.gerencia, UserRole.administracion)


def _dias_vencido(fecha_vencimiento: Optional[date], today: date) -> int:
    if not fecha_vencimiento:
        return 0
    delta = (today - fecha_vencimiento).days
    return max(0, delta)


def _assign_bucket(dias: int) -> str:
    if dias == 0:
        return "al_corriente"
    if dias <= 15:
        return "dias_1_15"
    if dias <= 30:
        return "dias_16_30"
    if dias <= 60:
        return "dias_31_60"
    return "dias_60_plus"


@router.get("/summary", response_model=CollectionsSummary)
async def collections_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*CREDIT_ROLES)),
):
    today = date.today()

    result = await db.execute(
        select(Sale).where(
            Sale.saldo_pendiente > 0,
            Sale.metodo_pago == PaymentMethod.credito,
        )
    )
    sales = result.scalars().all()

    summary = CollectionsSummary(
        cartera_total=Decimal("0"), al_corriente=Decimal("0"),
        vencido_total=Decimal("0"), dias_1_15=Decimal("0"),
        dias_16_30=Decimal("0"), dias_31_60=Decimal("0"), dias_60_plus=Decimal("0"),
        num_clientes_vencidos=0, num_ventas_vencidas=0,
    )

    clientes_vencidos: set[int] = set()

    for s in sales:
        dias = _dias_vencido(s.fecha_vencimiento, today)
        bucket = _assign_bucket(dias)
        summary.cartera_total += s.saldo_pendiente
        setattr(summary, bucket, getattr(summary, bucket) + s.saldo_pendiente)
        if dias > 0:
            summary.vencido_total += s.saldo_pendiente
            summary.num_ventas_vencidas += 1
            clientes_vencidos.add(s.client_id)

    summary.num_clientes_vencidos = len(clientes_vencidos)
    return summary


@router.get("/aging", response_model=AgingReport)
async def aging_report(
    fecha_corte: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*CREDIT_ROLES)),
):
    today = fecha_corte or date.today()

    sales_result = await db.execute(
        select(Sale).where(
            Sale.saldo_pendiente > 0,
            Sale.metodo_pago == PaymentMethod.credito,
        )
    )
    sales = sales_result.scalars().all()

    if not sales:
        return AgingReport(fecha_corte=today, totales=AgingBucket(), clientes=[])

    client_ids = list({s.client_id for s in sales})
    clients_result = await db.execute(select(Client).where(Client.id.in_(client_ids)))
    clients_map = {c.id: c for c in clients_result.scalars().all()}

    # Aggregate per client
    rows: dict[int, dict] = {}
    for s in sales:
        cid = s.client_id
        if cid not in rows:
            c = clients_map.get(cid)
            rows[cid] = {
                "client_id": cid,
                "client_nombre": c.nombre if c else f"Cliente #{cid}",
                "rfc": c.rfc if c else None,
                "telefono": c.telefono if c else None,
                "whatsapp": c.whatsapp if c else None,
                "dias_credito": c.dias_credito if c else 30,
                "limite_credito": c.limite_credito if c else Decimal("0"),
                "saldo_total": Decimal("0"),
                "al_corriente": Decimal("0"),
                "dias_1_15": Decimal("0"),
                "dias_16_30": Decimal("0"),
                "dias_31_60": Decimal("0"),
                "dias_60_plus": Decimal("0"),
                "num_facturas_vencidas": 0,
            }

        dias = _dias_vencido(s.fecha_vencimiento, today)
        bucket = _assign_bucket(dias)
        rows[cid]["saldo_total"] += s.saldo_pendiente
        rows[cid][bucket] += s.saldo_pendiente
        if dias > 0:
            rows[cid]["num_facturas_vencidas"] += 1

    client_rows = [ClientAgingRow(**r) for r in rows.values()]
    client_rows.sort(key=lambda r: r.dias_60_plus + r.dias_31_60, reverse=True)

    totales = AgingBucket(
        al_corriente=sum(r.al_corriente for r in client_rows),
        dias_1_15=sum(r.dias_1_15 for r in client_rows),
        dias_16_30=sum(r.dias_16_30 for r in client_rows),
        dias_31_60=sum(r.dias_31_60 for r in client_rows),
        dias_60_plus=sum(r.dias_60_plus for r in client_rows),
        total=sum(r.saldo_total for r in client_rows),
    )

    return AgingReport(fecha_corte=today, totales=totales, clientes=client_rows)


@router.get("/overdue", response_model=list[OverdueSaleOut])
async def overdue_sales(
    min_dias: int = Query(1, ge=1, description="Mínimo de días vencidos"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*CREDIT_ROLES)),
):
    today = date.today()

    result = await db.execute(
        select(Sale).where(
            Sale.saldo_pendiente > 0,
            Sale.metodo_pago == PaymentMethod.credito,
            Sale.fecha_vencimiento < today,
        ).order_by(Sale.fecha_vencimiento)
    )
    sales = result.scalars().all()

    client_ids = list({s.client_id for s in sales})
    if not client_ids:
        return []

    clients_result = await db.execute(select(Client).where(Client.id.in_(client_ids)))
    clients_map = {c.id: c for c in clients_result.scalars().all()}

    output = []
    for s in sales:
        dias = _dias_vencido(s.fecha_vencimiento, today)
        if dias < min_dias:
            continue
        c = clients_map.get(s.client_id)
        output.append(OverdueSaleOut(
            id=s.id, folio=s.folio, client_id=s.client_id,
            client_nombre=c.nombre if c else f"Cliente #{s.client_id}",
            total=s.total, saldo_pendiente=s.saldo_pendiente,
            fecha_vencimiento=s.fecha_vencimiento, dias_vencido=dias,
            metodo_pago=s.metodo_pago, created_at=s.created_at,
        ))

    return output


@router.get("/client/{client_id}", response_model=dict)
async def client_credit_detail(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*CREDIT_ROLES)),
):
    """Returns full credit position + open sales for a client."""
    c_result = await db.execute(select(Client).where(Client.id == client_id))
    client = c_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    sales_result = await db.execute(
        select(Sale).where(
            Sale.client_id == client_id,
            Sale.saldo_pendiente > 0,
            Sale.metodo_pago == PaymentMethod.credito,
        ).order_by(Sale.fecha_vencimiento)
    )
    open_sales = sales_result.scalars().all()

    today = date.today()
    disponible = max(Decimal("0"), client.limite_credito - client.saldo_pendiente)

    return {
        "client": {
            "id": client.id,
            "nombre": client.nombre,
            "rfc": client.rfc,
            "telefono": client.telefono,
            "whatsapp": client.whatsapp,
            "credito_activo": client.credito_activo,
            "limite_credito": client.limite_credito,
            "saldo_pendiente": client.saldo_pendiente,
            "disponible": disponible,
            "dias_credito": client.dias_credito,
            "utilizacion_pct": round(
                float(client.saldo_pendiente / client.limite_credito * 100), 1
            ) if client.limite_credito > 0 else 0,
        },
        "ventas_abiertas": [
            {
                "id": s.id,
                "folio": s.folio,
                "total": s.total,
                "saldo_pendiente": s.saldo_pendiente,
                "fecha_vencimiento": s.fecha_vencimiento,
                "dias_vencido": _dias_vencido(s.fecha_vencimiento, today),
                "created_at": s.created_at,
            }
            for s in open_sales
        ],
    }


@router.patch("/client/{client_id}/credit",
              dependencies=[Depends(require_roles(*CREDIT_ROLES))])
async def update_client_credit(
    client_id: int,
    body: CreditUpdateIn,
    db: AsyncSession = Depends(get_db),
):
    """Adjust credit limit, terms, or activation for a client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if body.credito_activo is not None:
        client.credito_activo = body.credito_activo
    if body.limite_credito is not None:
        client.limite_credito = body.limite_credito
    if body.dias_credito is not None:
        client.dias_credito = body.dias_credito

    await db.commit()
    return {
        "id": client.id,
        "credito_activo": client.credito_activo,
        "limite_credito": client.limite_credito,
        "dias_credito": client.dias_credito,
        "saldo_pendiente": client.saldo_pendiente,
    }
