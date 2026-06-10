from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.client import Client
from app.models.product import ClientType
from app.core.dependencies import get_current_user, require_roles
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut, ClientListOut, PaginatedClients

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("/", response_model=PaginatedClients)
async def list_clients(
    q: Optional[str] = None,
    tipo: Optional[ClientType] = None,
    seller_id: Optional[int] = None,
    con_credito: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = [Client.is_active == True]
    # Vendedores only see their own clients unless gerencia/admin
    if current_user.role == UserRole.ventas:
        conditions.append(Client.seller_id == current_user.id)
    if q:
        term = f"%{q}%"
        conditions.append(or_(Client.nombre.ilike(term), Client.rfc.ilike(term), Client.telefono.ilike(term)))
    if tipo:
        conditions.append(Client.tipo == tipo)
    if seller_id:
        conditions.append(Client.seller_id == seller_id)
    if con_credito is not None:
        conditions.append(Client.credito_activo == con_credito)

    total = (await db.execute(select(func.count()).select_from(Client).where(and_(*conditions)))).scalar()
    result = await db.execute(
        select(Client).where(and_(*conditions)).order_by(Client.nombre)
        .offset((page - 1) * page_size).limit(page_size)
    )
    return PaginatedClients(total=total, page=page, page_size=page_size, items=result.scalars().all())


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.post("/", response_model=ClientOut)
async def create_client(
    body: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.seller_id:
        body.seller_id = current_user.id
    client = Client(**body.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    # Vendedores can only edit their own
    if current_user.role == UserRole.ventas and client.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client
