"""
Price engine for FreeLux.

Handles:
- Bulk price updates by % (global, by departamento, by categoria)
- Per-unit price calculation (pza → kg → ton)
- Price lookup by client type and quantity
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.product import Product, ProductPrice, ProductPriceHistory, ClientType, UnitType
from app.schemas.product import PriceUpdateBulk


IVA_RATE = Decimal("0.16")
KG_PER_TON = Decimal("1000")


def price_per_kg(precio_pza: Decimal, peso_kg: Decimal) -> Decimal:
    """Convert price-per-piece to price-per-kg."""
    if peso_kg <= 0:
        return Decimal("0")
    return (precio_pza / peso_kg).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def price_per_ton(precio_pza: Decimal, peso_kg: Decimal) -> Decimal:
    """Convert price-per-piece to price-per-ton."""
    if peso_kg <= 0:
        return Decimal("0")
    return (precio_pza / peso_kg * KG_PER_TON).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def apply_percentage(precio: Decimal, pct: Decimal) -> Decimal:
    """Apply +/- percentage to a price."""
    factor = Decimal("1") + (pct / Decimal("100"))
    return (precio * factor).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def get_price_for_client(
    prices: list[ProductPrice],
    client_type: ClientType,
    cantidad: Decimal,
    unidad: UnitType,
    peso_kg: Decimal,
) -> Decimal:
    """
    Returns the correct unit price for a given client type and quantity.
    Handles pza/kg/ton unit conversion.
    """
    # find the matching price row
    matching = [p for p in prices if p.client_type == client_type]
    if not matching:
        return Decimal("0")

    # pick base price-per-piece
    price_row = matching[0]
    precio_pza = price_row.precio

    if unidad == UnitType.pza:
        return precio_pza
    elif unidad == UnitType.kg:
        return price_per_kg(precio_pza, peso_kg)
    elif unidad == UnitType.ton:
        return price_per_ton(precio_pza, peso_kg)
    return precio_pza


async def bulk_update_prices(
    db: AsyncSession,
    payload: PriceUpdateBulk,
    user_id: int,
) -> dict:
    """
    Apply percentage change to product prices.
    Filters by departamento, categoria, client_types as specified.
    Returns count of updated price rows.
    """
    # Build product filter
    conditions = [Product.is_active == True]
    if payload.departamentos:
        conditions.append(Product.departamento.in_(payload.departamentos))
    if payload.categorias:
        conditions.append(Product.categoria.in_(payload.categorias))

    result = await db.execute(select(Product.id).where(and_(*conditions)))
    product_ids = [row[0] for row in result.fetchall()]

    if not product_ids:
        return {"updated": 0}

    # Build price filter
    price_conditions = [ProductPrice.product_id.in_(product_ids)]
    if payload.client_types:
        price_conditions.append(ProductPrice.client_type.in_(payload.client_types))

    result = await db.execute(select(ProductPrice).where(and_(*price_conditions)))
    price_rows: list[ProductPrice] = result.scalars().all()

    history_entries = []
    for row in price_rows:
        old_price = row.precio
        new_price = apply_percentage(old_price, payload.porcentaje)
        row.precio = new_price
        history_entries.append(
            ProductPriceHistory(
                product_id=row.product_id,
                client_type=row.client_type,
                precio_anterior=old_price,
                precio_nuevo=new_price,
                changed_by_id=user_id,
                reason=payload.reason or f"Ajuste {payload.porcentaje}%",
            )
        )

    db.add_all(history_entries)
    await db.commit()
    return {"updated": len(price_rows), "product_count": len(product_ids)}
