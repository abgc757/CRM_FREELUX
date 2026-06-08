from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.sale import Sale, SaleStatus, TipoDocumento
from app.models.user import User, UserRole
from app.schemas.sale import SaleOut

router = APIRouter(prefix="/sales", tags=["sales"])


async def _get_sale_or_404(db: AsyncSession, sale_id: UUID, user: User) -> Sale:
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if user.role == UserRole.ventas and sale.vendedor_id != user.id:
        raise HTTPException(status_code=403, detail="Not your sale")
    return sale


@router.get("", response_model=List[SaleOut])
async def list_sales(
    vendedor_id: Optional[UUID] = Query(None),
    estado: Optional[SaleStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Sale)
    if current_user.role == UserRole.ventas:
        q = q.where(Sale.vendedor_id == current_user.id)
    elif vendedor_id:
        q = q.where(Sale.vendedor_id == vendedor_id)
    if estado:
        q = q.where(Sale.estado == estado)
    result = await db.execute(q.order_by(Sale.created_at.desc()))
    return result.scalars().all()


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_sale_or_404(db, sale_id, current_user)


@router.post("/{sale_id}/remision", response_model=SaleOut)
async def generate_remision(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sale = await _get_sale_or_404(db, sale_id, current_user)
    sale.tipo_documento = TipoDocumento.remision
    await db.flush()
    return sale


@router.post("/{sale_id}/request-invoice", response_model=SaleOut)
async def request_invoice(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sale = await _get_sale_or_404(db, sale_id, current_user)
    sale.tipo_documento = TipoDocumento.factura
    await db.flush()
    return sale
