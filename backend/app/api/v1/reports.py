from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.models.sale import Sale, SaleStatus
from app.models.quote import Quote, QuoteItem, QuoteStatus
from app.models.client import Client
from app.models.product import Product

router = APIRouter(prefix="/reports", tags=["reports"])

# Statuses that count as revenue-generating sales
COMPLETED = [SaleStatus.facturada, SaleStatus.nota_venta, SaleStatus.entregada]


def _date_range(period: str) -> tuple[date, date]:
    today = date.today()
    if period == "7d":
        return today - timedelta(days=6), today
    if period == "30d":
        return today - timedelta(days=29), today
    if period == "month":
        return today.replace(day=1), today
    if period == "year":
        return today.replace(month=1, day=1), today
    return today - timedelta(days=29), today


@router.get("/kpis")
async def get_kpis(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(get_current_user),
) -> dict:
    start, end = _date_range(period)

    sales_q = await db.execute(
        select(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0))
        .where(Sale.status.in_(COMPLETED))
        .where(func.date(Sale.created_at) >= start)
        .where(func.date(Sale.created_at) <= end)
    )
    num_sales, ventas_total = sales_q.one()

    num_quotes = (await db.execute(
        select(func.count(Quote.id))
        .where(func.date(Quote.created_at) >= start)
        .where(func.date(Quote.created_at) <= end)
    )).scalar_one()

    ticket = round(float(ventas_total) / num_sales, 2) if num_sales else 0
    conversion = round((num_sales / num_quotes * 100), 1) if num_quotes else 0

    # Margin via Quote items linked to completed Sales
    margin_q = await db.execute(
        select(
            func.sum(QuoteItem.cantidad * QuoteItem.precio_unitario).label("ingresos"),
            func.sum(QuoteItem.cantidad * Product.precio_compra).label("costos"),
        )
        .join(Quote, QuoteItem.quote_id == Quote.id)
        .join(Sale, Sale.quote_id == Quote.id)
        .join(Product, QuoteItem.product_id == Product.id)
        .where(Sale.status.in_(COMPLETED))
        .where(func.date(Sale.created_at) >= start)
        .where(func.date(Sale.created_at) <= end)
    )
    row = margin_q.one()
    ingresos = float(row.ingresos or 0)
    costos   = float(row.costos   or 0)
    margen   = round((ingresos - costos) / ingresos * 100, 1) if ingresos else 0

    return {
        "ventas_total":       float(ventas_total),
        "cotizaciones_total": num_quotes,
        "tasa_conversion":    conversion,
        "ticket_promedio":    ticket,
        "margen_promedio":    margen,
    }


@router.get("/sales-trend")
async def get_sales_trend(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(get_current_user),
) -> list[dict]:
    start, end = _date_range(period)

    sales_by_day = await db.execute(
        select(
            func.date(Sale.created_at).label("fecha"),
            func.coalesce(func.sum(Sale.total), 0).label("total"),
        )
        .where(Sale.status.in_(COMPLETED))
        .where(func.date(Sale.created_at) >= start)
        .where(func.date(Sale.created_at) <= end)
        .group_by(func.date(Sale.created_at))
        .order_by(func.date(Sale.created_at))
    )
    sales_map = {str(r.fecha): float(r.total) for r in sales_by_day}

    quotes_by_day = await db.execute(
        select(
            func.date(Quote.created_at).label("fecha"),
            func.count(Quote.id).label("cnt"),
        )
        .where(func.date(Quote.created_at) >= start)
        .where(func.date(Quote.created_at) <= end)
        .group_by(func.date(Quote.created_at))
        .order_by(func.date(Quote.created_at))
    )
    quotes_map = {str(r.fecha): r.cnt for r in quotes_by_day}

    result = []
    current = start
    while current <= end:
        key = str(current)
        result.append({
            "fecha":        current.strftime("%d/%m"),
            "total":        sales_map.get(key, 0),
            "cotizaciones": quotes_map.get(key, 0),
        })
        current += timedelta(days=1)
    return result


@router.get("/top-clients")
async def get_top_clients(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(get_current_user),
) -> list[dict]:
    start, end = _date_range(period)

    rows = await db.execute(
        select(
            Client.id.label("client_id"),
            Client.nombre,
            func.count(Sale.id).label("num_ventas"),
            func.coalesce(func.sum(Sale.total), 0).label("total"),
        )
        .join(Sale, Sale.client_id == Client.id)
        .where(Sale.status.in_(COMPLETED))
        .where(func.date(Sale.created_at) >= start)
        .where(func.date(Sale.created_at) <= end)
        .group_by(Client.id, Client.nombre)
        .order_by(func.sum(Sale.total).desc())
        .limit(10)
    )
    return [
        {"client_id": r.client_id, "nombre": r.nombre, "num_ventas": r.num_ventas, "total": float(r.total)}
        for r in rows
    ]


@router.get("/top-products")
async def get_top_products(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(get_current_user),
) -> list[dict]:
    start, end = _date_range(period)

    rows = await db.execute(
        select(
            Product.id,
            Product.descripcion,
            Product.categoria,
            func.sum(QuoteItem.cantidad).label("cantidad"),
            func.sum(QuoteItem.cantidad * QuoteItem.precio_unitario).label("total"),
        )
        .join(QuoteItem, QuoteItem.product_id == Product.id)
        .join(Quote, QuoteItem.quote_id == Quote.id)
        .join(Sale, Sale.quote_id == Quote.id)
        .where(Sale.status.in_(COMPLETED))
        .where(func.date(Sale.created_at) >= start)
        .where(func.date(Sale.created_at) <= end)
        .group_by(Product.id, Product.descripcion, Product.categoria)
        .order_by(func.sum(QuoteItem.cantidad * QuoteItem.precio_unitario).desc())
        .limit(10)
    )
    return [
        {"id": r.id, "descripcion": r.descripcion, "categoria": r.categoria,
         "cantidad": float(r.cantidad), "total": float(r.total)}
        for r in rows
    ]


@router.get("/conversion")
async def get_conversion(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(get_current_user),
) -> dict:
    start, end = _date_range(period)

    num_quotes = (await db.execute(
        select(func.count(Quote.id))
        .where(func.date(Quote.created_at) >= start)
        .where(func.date(Quote.created_at) <= end)
    )).scalar_one()

    num_sent = (await db.execute(
        select(func.count(Quote.id))
        .where(Quote.status.in_([QuoteStatus.enviada, QuoteStatus.aprobada, QuoteStatus.convertida]))
        .where(func.date(Quote.created_at) >= start)
        .where(func.date(Quote.created_at) <= end)
    )).scalar_one()

    num_sales = (await db.execute(
        select(func.count(Sale.id))
        .where(Sale.status.in_(COMPLETED))
        .where(func.date(Sale.created_at) >= start)
        .where(func.date(Sale.created_at) <= end)
    )).scalar_one()

    tc = round((num_sales / num_quotes * 100), 1) if num_quotes else 0
    return {
        "cotizaciones":    num_quotes,
        "enviadas":        num_sent,
        "ventas":          num_sales,
        "tasa_conversion": tc,
    }


@router.get("/margins")
async def get_margins(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(get_current_user),
) -> list[dict]:
    start, end = _date_range(period)

    rows = await db.execute(
        select(
            Product.categoria,
            func.sum(QuoteItem.cantidad * QuoteItem.precio_unitario).label("ingresos"),
            func.sum(QuoteItem.cantidad * Product.precio_compra).label("costos"),
        )
        .join(QuoteItem, QuoteItem.product_id == Product.id)
        .join(Quote, QuoteItem.quote_id == Quote.id)
        .join(Sale, Sale.quote_id == Quote.id)
        .where(Sale.status.in_(COMPLETED))
        .where(func.date(Sale.created_at) >= start)
        .where(func.date(Sale.created_at) <= end)
        .where(Product.categoria.isnot(None))
        .group_by(Product.categoria)
        .order_by(func.sum(QuoteItem.cantidad * QuoteItem.precio_unitario).desc())
    )

    result = []
    for r in rows:
        ing = float(r.ingresos or 0)
        cos = float(r.costos   or 0)
        margen = round((ing - cos) / ing * 100, 1) if ing else 0
        result.append({"categoria": r.categoria or "Sin categoría", "margen": margen, "ingresos": ing})
    return result
