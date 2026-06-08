from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.client import Client
from app.models.user import User, UserRole
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientOut])
async def list_clients(
    owner_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Client)
    if current_user.role == UserRole.ventas:
        q = q.where(Client.owner_user_id == current_user.id)
    elif owner_id:
        q = q.where(Client.owner_user_id == owner_id)

    if search:
        q = q.where(
            or_(
                Client.nombre.ilike(f"%{search}%"),
                Client.rfc.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
            )
        )
    result = await db.execute(q.order_by(Client.nombre))
    return result.scalars().all()


@router.post("", response_model=ClientOut, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner_id = data.owner_user_id or current_user.id
    client = Client(
        nombre=data.nombre,
        rfc=data.rfc,
        telefono=data.telefono,
        email=data.email,
        direccion=data.direccion,
        ciudad=data.ciudad,
        owner_user_id=owner_id,
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if current_user.role == UserRole.ventas and client.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client")
    return client


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: UUID,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if current_user.role == UserRole.ventas and client.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.flush()
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if current_user.role == UserRole.ventas and client.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client")
    await db.delete(client)
