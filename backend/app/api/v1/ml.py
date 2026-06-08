from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.user import User, UserRole
from app.services.ml import demand_forecast, export_inventory_dataset, export_sales_dataset, price_suggestion

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/export/sales")
async def export_sales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente)),
):
    return await export_sales_dataset(db)


@router.get("/export/inventory")
async def export_inventory(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente)),
):
    return await export_inventory_dataset(db)


@router.post("/price-suggestion/{product_id}")
async def price_suggest(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente)),
):
    return await price_suggestion(db, product_id)


@router.post("/demand-forecast/{product_id}")
async def demand_forecast_endpoint(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente)),
):
    return await demand_forecast(db, product_id)
