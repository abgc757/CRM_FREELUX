from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Product


async def check_stock(product_id: int, cantidad: float, db: AsyncSession) -> bool:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        return False
    return product.stock >= cantidad


async def reserve_stock(product_id: int, cantidad: float, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Product).where(Product.id == product_id).with_for_update()
    )
    product = result.scalar_one_or_none()
    if not product or product.stock < cantidad:
        return False
    product.stock -= cantidad
    product.version += 1
    return True
