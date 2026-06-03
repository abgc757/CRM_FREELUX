from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime, timezone
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Sale, SaleItem, Remission, Quote, Client
from app.schemas.sale import SaleOut, RemissionCreate, RemissionOut

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=List[SaleOut])
async def list_sales(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Sale)
    if current_user.role.name == "ventas":
        query = query.where(Sale.vendedor_id == current_user.id)
    query = query.order_by(Sale.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [SaleOut.model_validate(s) for s in result.scalars().all()]


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    return SaleOut.model_validate(sale)


@router.post("/{sale_id}/request-invoice", response_model=SaleOut)
async def request_invoice(
    sale_id: int,
    current_user: User = Depends(RoleChecker(["ventas", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    sale.factura_solicitada = True
    await db.flush()
    await db.refresh(sale)
    return SaleOut.model_validate(sale)


@router.post("/{sale_id}/remission", response_model=RemissionOut, status_code=status.HTTP_201_CREATED)
async def create_remission(
    sale_id: int,
    body: RemissionCreate,
    current_user: User = Depends(RoleChecker(["ventas", "almacen", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    folio = f"REM-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    remission = Remission(
        folio=folio,
        sale_id=sale.id,
        direccion_entrega=body.direccion_entrega,
        notas=body.notas,
    )
    db.add(remission)
    await db.flush()
    await db.refresh(remission)
    return RemissionOut.model_validate(remission)
