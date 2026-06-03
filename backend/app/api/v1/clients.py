from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientOut])
async def list_clients(
    search: Optional[str] = Query(None),
    owner_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(RoleChecker(["ventas", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.is_active == True)
    if current_user.role.name == "ventas":
        query = query.where(Client.owner_user_id == current_user.id)
    elif current_user.role.name in ("gerencia", "admin") and owner_id:
        query = query.where(Client.owner_user_id == owner_id)
    if search:
        search_filter = or_(
            Client.nombre.ilike(f"%{search}%"),
            Client.rfc.ilike(f"%{search}%"),
            Client.email.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    query = query.order_by(Client.nombre).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [ClientOut.model_validate(c) for c in result.scalars().all()]


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if current_user.role.name == "ventas" and client.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your client")
    return ClientOut.model_validate(client)


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(
    body: ClientCreate,
    current_user: User = Depends(RoleChecker(["ventas", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Client).where(Client.rfc == body.rfc))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="RFC already exists")
    client = Client(**body.model_dump(), owner_user_id=current_user.id)
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return ClientOut.model_validate(client)


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    current_user: User = Depends(RoleChecker(["ventas", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if current_user.role.name == "ventas" and client.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your client")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(client, key, val)
    await db.flush()
    await db.refresh(client)
    return ClientOut.model_validate(client)
