from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class ClientBase(BaseModel):
    nombre: str
    rfc: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None


class ClientCreate(ClientBase):
    owner_user_id: Optional[UUID] = None


class ClientUpdate(BaseModel):
    nombre: Optional[str] = None
    rfc: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None


class ClientOut(ClientBase):
    id: UUID
    owner_user_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
