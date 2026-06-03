from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, text
from typing import Optional, List
import json
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Supplier
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierOut, SupplierSearchOut,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=List[SupplierOut])
async def list_suppliers(
    search: Optional[str] = Query(None),
    familia: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Supplier).where(Supplier.is_active == True)
    if search:
        query = query.where(
            or_(
                Supplier.nombre.ilike(f"%{search}%"),
                Supplier.rfc.ilike(f"%{search}%"),
                Supplier.ubicacion.ilike(f"%{search}%"),
            )
        )
    if familia:
        query = query.where(Supplier.familias.ilike(f"%{familia}%"))
    query = query.order_by(Supplier.nombre).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [SupplierOut.model_validate(s) for s in result.scalars().all()]


@router.get("/search", response_model=List[SupplierSearchOut])
async def search_suppliers(
    query_str: str = Query(..., alias="query"),
    familia: Optional[str] = Query(None),
    max_distancia: Optional[float] = Query(None),
    max_entrega: Optional[int] = Query(None),
    min_fiabilidad: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Supplier).where(Supplier.is_active == True)
    if query_str:
        q = q.where(
            or_(
                Supplier.nombre.ilike(f"%{query_str}%"),
                Supplier.familias.ilike(f"%{query_str}%"),
                Supplier.ubicacion.ilike(f"%{query_str}%"),
            )
        )
    if familia:
        q = q.where(Supplier.familias.ilike(f"%{familia}%"))
    if max_distancia:
        q = q.where(Supplier.distancia_km <= max_distancia)
    if max_entrega:
        q = q.where(Supplier.tiempo_entrega_promedio <= max_entrega)
    if min_fiabilidad:
        q = q.where(Supplier.fiabilidad_score >= min_fiabilidad)
    result = await db.execute(q)
    suppliers = result.scalars().all()
    return [
        SupplierSearchOut(
            id=s.id,
            nombre=s.nombre,
            familias=s.familias,
            distancia_km=s.distancia_km,
            tiempo_entrega_promedio=s.tiempo_entrega_promedio,
            fiabilidad_score=s.fiabilidad_score,
            score=round(
                (s.fiabilidad_score * 0.4)
                + (1 / max(s.tiempo_entrega_promedio, 1) * 0.3)
                + (1 / max(s.distancia_km, 1) * 0.3),
                2,
            ),
        )
        for s in suppliers
    ]


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return SupplierOut.model_validate(supplier)


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    body: SupplierCreate,
    current_user: User = Depends(RoleChecker(["compras", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Supplier).where(Supplier.rfc == body.rfc))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="RFC already exists")
    supplier = Supplier(**body.model_dump())
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return SupplierOut.model_validate(supplier)


@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: int,
    body: SupplierUpdate,
    current_user: User = Depends(RoleChecker(["compras", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(supplier, key, val)
    await db.flush()
    await db.refresh(supplier)
    return SupplierOut.model_validate(supplier)
