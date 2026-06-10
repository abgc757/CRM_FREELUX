from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.purchase import Supplier
from app.core.dependencies import get_current_user, require_roles
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut

router = APIRouter(prefix="/suppliers", tags=["suppliers"])
WRITE_ROLES = (UserRole.gerencia, UserRole.administracion, UserRole.compras)


@router.get("/", response_model=list[SupplierOut])
async def list_suppliers(
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    conditions = [Supplier.is_active == True]
    if q:
        term = f"%{q}%"
        conditions.append(or_(Supplier.nombre.ilike(term), Supplier.rfc.ilike(term), Supplier.contacto.ilike(term)))
    result = await db.execute(select(Supplier).where(and_(*conditions)).order_by(Supplier.nombre))
    return result.scalars().all()


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return s


@router.post("/", response_model=SupplierOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_supplier(body: SupplierCreate, db: AsyncSession = Depends(get_db)):
    s = Supplier(**body.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


@router.patch("/{supplier_id}", response_model=SupplierOut, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_supplier(supplier_id: int, body: SupplierUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    await db.commit()
    await db.refresh(s)
    return s
