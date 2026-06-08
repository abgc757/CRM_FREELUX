from decimal import Decimal
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import InventoryMovement, MovementType, ReferenciaType
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.quote import Quote, QuoteItem, QuoteStatus
from app.models.sale import Sale, SaleStatus, TipoDocumento
from app.models.supplier import Supplier
from app.schemas.quote import QuoteCreate, QuoteItemCreate, QuoteUpdate


IVA_RATE = Decimal("0.16")


def _calc_importe(cantidad: float, precio: float) -> Decimal:
    return Decimal(str(cantidad)) * Decimal(str(precio))


def _recalc_totals(items: List[QuoteItem], tiene_impuesto_map: dict) -> tuple:
    subtotal = Decimal("0")
    for item in items:
        subtotal += Decimal(str(item.importe))
    iva = Decimal("0")
    for item in items:
        pid = str(item.product_id) if item.product_id else None
        if pid and tiene_impuesto_map.get(pid, True):
            iva += Decimal(str(item.importe)) * IVA_RATE
    total = subtotal + iva
    return float(subtotal), float(iva), float(total)


async def create_quote(db: AsyncSession, data: QuoteCreate, vendedor_id: UUID) -> Quote:
    quote = Quote(
        cliente_id=data.cliente_id,
        vendedor_id=vendedor_id,
        fecha_validez=data.fecha_validez,
        moneda=data.moneda,
        notas=data.notas,
    )
    db.add(quote)
    await db.flush()

    product_ids = [str(i.product_id) for i in data.items if i.product_id]
    tiene_impuesto_map: dict = {}
    if product_ids:
        result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        for p in result.scalars():
            tiene_impuesto_map[str(p.id)] = p.tiene_impuesto

    items = []
    for i in data.items:
        importe = _calc_importe(i.cantidad, i.precio_unitario)
        qi = QuoteItem(
            quote_id=quote.id,
            product_id=i.product_id,
            descripcion=i.descripcion,
            cantidad=i.cantidad,
            precio_unitario=i.precio_unitario,
            importe=float(importe),
        )
        db.add(qi)
        items.append(qi)

    await db.flush()

    subtotal, iva, total = _recalc_totals(items, tiene_impuesto_map)
    quote.subtotal = subtotal
    quote.iva = iva
    quote.total = total
    await db.flush()

    await db.refresh(quote, ["items"])
    return quote


async def update_quote(db: AsyncSession, quote: Quote, data: QuoteUpdate) -> Quote:
    if data.fecha_validez is not None:
        quote.fecha_validez = data.fecha_validez
    if data.estado is not None:
        quote.estado = data.estado
    if data.notas is not None:
        quote.notas = data.notas

    if data.items is not None:
        for old_item in quote.items:
            await db.delete(old_item)
        await db.flush()

        product_ids = [str(i.product_id) for i in data.items if i.product_id]
        tiene_impuesto_map: dict = {}
        if product_ids:
            result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
            for p in result.scalars():
                tiene_impuesto_map[str(p.id)] = p.tiene_impuesto

        new_items = []
        for i in data.items:
            importe = _calc_importe(i.cantidad, i.precio_unitario)
            qi = QuoteItem(
                quote_id=quote.id,
                product_id=i.product_id,
                descripcion=i.descripcion,
                cantidad=i.cantidad,
                precio_unitario=i.precio_unitario,
                importe=float(importe),
            )
            db.add(qi)
            new_items.append(qi)
        await db.flush()

        subtotal, iva, total = _recalc_totals(new_items, tiene_impuesto_map)
        quote.subtotal = subtotal
        quote.iva = iva
        quote.total = total

    await db.flush()
    return quote


async def convert_quote_to_sale(
    db: AsyncSession, quote: Quote, usuario_id: UUID
) -> Sale:
    if quote.estado == QuoteStatus.convertida:
        raise HTTPException(status_code=400, detail="Quote already converted")
    if quote.estado == QuoteStatus.rechazada:
        raise HTTPException(status_code=400, detail="Cannot convert rejected quote")

    items_needing_po: List[QuoteItem] = []

    for item in quote.items:
        if item.product_id is None:
            continue
        result = await db.execute(
            select(Product).where(Product.id == item.product_id).with_for_update()
        )
        product = result.scalar_one_or_none()
        if product is None:
            continue

        cantidad = float(item.cantidad)
        if float(product.existencia) >= cantidad:
            prev_stock = float(product.existencia)
            product.existencia = float(product.existencia) - cantidad
            product.version += 1
            movement = InventoryMovement(
                product_id=product.id,
                tipo=MovementType.salida,
                cantidad=cantidad,
                cantidad_anterior=prev_stock,
                referencia_tipo=ReferenciaType.venta,
                referencia_id=quote.id,
                usuario_id=usuario_id,
                notas=f"Venta cotización folio {quote.folio}",
            )
            db.add(movement)
        else:
            items_needing_po.append(item)

    if items_needing_po:
        result = await db.execute(
            select(Supplier).where(Supplier.activo == True).order_by(Supplier.fiabilidad_score.desc())
        )
        best_supplier = result.scalars().first()
        if best_supplier:
            po = Purchase(
                supplier_id=best_supplier.id,
                solicitante_id=usuario_id,
                estado=PurchaseStatus.borrador,
                notas=f"Auto-generado desde cotización folio {quote.folio}",
            )
            db.add(po)
            await db.flush()
            subtotal = Decimal("0")
            for item in items_needing_po:
                pu = PurchaseItem(
                    purchase_id=po.id,
                    product_id=item.product_id,
                    descripcion=item.descripcion,
                    cantidad=float(item.cantidad),
                    precio_unitario=float(item.precio_unitario),
                    cantidad_recibida=0,
                )
                db.add(pu)
                subtotal += Decimal(str(item.cantidad)) * Decimal(str(item.precio_unitario))
            po.subtotal = float(subtotal)
            po.iva = float(subtotal * IVA_RATE)
            po.total = float(subtotal + subtotal * IVA_RATE)

    sale = Sale(
        quote_id=quote.id,
        vendedor_id=quote.vendedor_id,
        cliente_id=quote.cliente_id,
        tipo_documento=TipoDocumento.nota_venta,
        estado=SaleStatus.pendiente,
        subtotal=quote.subtotal,
        iva=quote.iva,
        total=quote.total,
    )
    db.add(sale)
    quote.estado = QuoteStatus.convertida
    await db.flush()
    return sale
