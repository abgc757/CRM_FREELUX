import asyncio

from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.price_tasks.check_low_stock")
def check_low_stock():
    async def _run():
        from sqlalchemy import select
        from app.database import AsyncSessionLocal
        from app.models.product import Product

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Product).where(
                    Product.activo == True,
                    Product.inv_min.isnot(None),
                    Product.existencia <= Product.inv_min,
                )
            )
            products = result.scalars().all()
            return [{"sku": p.sku, "nombre": p.nombre, "existencia": float(p.existencia)} for p in products]

    return asyncio.get_event_loop().run_until_complete(_run())


@celery_app.task(name="app.tasks.price_tasks.bulk_price_update")
def bulk_price_update(product_ids: list, markup_pct: float, usuario_id: str):
    async def _run():
        from sqlalchemy import select
        from app.database import AsyncSessionLocal
        from app.models.product import Product
        from app.models.price_history import PriceHistory
        import uuid

        async with AsyncSessionLocal() as db:
            for pid in product_ids:
                result = await db.execute(select(Product).where(Product.id == uuid.UUID(pid)))
                product = result.scalar_one_or_none()
                if product:
                    old_precio = float(product.precio_1)
                    new_precio = round(float(product.costo) * (1 + markup_pct / 100), 4)
                    history = PriceHistory(
                        product_id=product.id,
                        usuario_id=uuid.UUID(usuario_id),
                        precio_anterior=old_precio,
                        precio_nuevo=new_precio,
                        motivo=f"Bulk update {markup_pct}% markup",
                    )
                    db.add(history)
                    product.precio_1 = new_precio
                    product.version += 1
            await db.commit()

    asyncio.get_event_loop().run_until_complete(_run())
