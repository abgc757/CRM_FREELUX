from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.supplier import Supplier
from app.models.user import User, UserRole
from app.schemas.supplier import SupplierCreate, SupplierOut, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=List[SupplierOut])
async def list_suppliers(
    query: Optional[str] = Query(None),
    familia: Optional[str] = Query(None),
    max_dias: Optional[int] = Query(None),
    min_fiabilidad: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Supplier).where(Supplier.activo == True)
    if query:
        q = q.where(
            or_(
                Supplier.nombre.ilike(f"%{query}%"),
                Supplier.ciudad.ilike(f"%{query}%"),
                Supplier.estado_mx.ilike(f"%{query}%"),
            )
        )
    if familia:
        q = q.where(Supplier.familias.any(familia))
    if max_dias is not None:
        q = q.where(Supplier.tiempo_entrega_promedio_dias <= max_dias)
    if min_fiabilidad is not None:
        q = q.where(Supplier.fiabilidad_score >= min_fiabilidad)
    result = await db.execute(q.order_by(Supplier.fiabilidad_score.desc()))
    return result.scalars().all()


@router.post("", response_model=SupplierOut, status_code=201)
async def create_supplier(
    data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.compras, UserRole.gerente)),
):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: UUID,
    data: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.compras, UserRole.gerente)),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    await db.flush()
    return supplier
