from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.price_history import PriceHistory
from app.models.price_update_job import PriceRequest, PriceRequestStatus
from app.models.user import User, UserRole
from app.schemas.price_management import (
    PriceHistoryOut,
    PriceRequestApprove,
    PriceRequestOut,
    PriceRequestReject,
)
from app.services.price_management import approve_price_request, reject_price_request

router = APIRouter(prefix="/price-requests", tags=["price-management"])


@router.get("", response_model=List[PriceRequestOut])
async def list_price_requests(
    estado: Optional[PriceRequestStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(PriceRequest)
    if estado:
        q = q.where(PriceRequest.estado == estado)
    result = await db.execute(q.order_by(PriceRequest.created_at.desc()))
    return result.scalars().all()


@router.put("/{request_id}/approve", response_model=PriceRequestOut)
async def approve(
    request_id: UUID,
    data: PriceRequestApprove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente)),
):
    return await approve_price_request(db, request_id, data.precio_aprobado, data.notas, current_user.id)


@router.put("/{request_id}/reject", response_model=PriceRequestOut)
async def reject(
    request_id: UUID,
    data: PriceRequestReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.gerente)),
):
    return await reject_price_request(db, request_id, data.notas, current_user.id)


@router.get("/history", response_model=List[PriceHistoryOut])
async def price_history(
    product_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(PriceHistory)
    if product_id:
        q = q.where(PriceHistory.product_id == product_id)
    result = await db.execute(q.order_by(PriceHistory.created_at.desc()).limit(200))
    return result.scalars().all()
