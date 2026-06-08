from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryMovement
from app.models.product import Product
from app.models.sale import Sale


async def export_sales_dataset(db: AsyncSession) -> list:
    result = await db.execute(
        select(Sale).order_by(Sale.created_at.desc()).limit(10000)
    )
    sales = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "vendedor_id": str(s.vendedor_id),
            "cliente_id": str(s.cliente_id),
            "subtotal": float(s.subtotal),
            "iva": float(s.iva),
            "total": float(s.total),
            "tipo_documento": s.tipo_documento,
            "estado": s.estado,
            "created_at": s.created_at.isoformat(),
        }
        for s in sales
    ]


async def export_inventory_dataset(db: AsyncSession) -> list:
    result = await db.execute(
        select(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(10000)
    )
    movements = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "product_id": str(m.product_id),
            "tipo": m.tipo,
            "cantidad": float(m.cantidad),
            "cantidad_anterior": float(m.cantidad_anterior),
            "referencia_tipo": m.referencia_tipo,
            "created_at": m.created_at.isoformat(),
        }
        for m in movements
    ]


async def price_suggestion(db: AsyncSession, product_id: UUID) -> dict:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        return {"error": "Product not found"}
    costo = float(product.costo)
    suggested = round(costo * 1.35, 4)
    return {
        "product_id": str(product_id),
        "costo": costo,
        "precio_actual": float(product.precio_1),
        "precio_sugerido": suggested,
        "margen_pct": 35.0,
        "method": "cost_plus_static",
    }


async def demand_forecast(db: AsyncSession, product_id: UUID) -> dict:
    result = await db.execute(
        select(InventoryMovement).where(
            InventoryMovement.product_id == product_id,
            InventoryMovement.tipo == "salida",
        ).order_by(InventoryMovement.created_at.desc()).limit(90)
    )
    movements = result.scalars().all()
    total_qty = sum(float(m.cantidad) for m in movements)
    avg_daily = total_qty / 90 if movements else 0
    return {
        "product_id": str(product_id),
        "avg_daily_demand": round(avg_daily, 4),
        "forecast_30d": round(avg_daily * 30, 4),
        "data_points": len(movements),
        "method": "moving_average_90d",
    }
