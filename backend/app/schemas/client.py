from pydantic import BaseModel, EmailStr
from decimal import Decimal
from datetime import datetime
from typing import Optional
from app.models.product import ClientType


class ClientCreate(BaseModel):
    nombre: str
    razon_social: Optional[str] = None
    rfc: Optional[str] = None
    tipo: ClientType = ClientType.publico_general
    email: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    cp: Optional[str] = None
    uso_cfdi: str = "G03"
    regimen_fiscal: Optional[str] = None
    credito_activo: bool = False
    limite_credito: Decimal = Decimal("0")
    dias_credito: int = 30
    seller_id: Optional[int] = None
    notas: Optional[str] = None


class ClientUpdate(BaseModel):
    nombre: Optional[str] = None
    razon_social: Optional[str] = None
    rfc: Optional[str] = None
    tipo: Optional[ClientType] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    cp: Optional[str] = None
    uso_cfdi: Optional[str] = None
    regimen_fiscal: Optional[str] = None
    credito_activo: Optional[bool] = None
    limite_credito: Optional[Decimal] = None
    dias_credito: Optional[int] = None
    seller_id: Optional[int] = None
    notas: Optional[str] = None
    is_active: Optional[bool] = None


class ClientOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    nombre: str
    razon_social: Optional[str]
    rfc: Optional[str]
    tipo: ClientType
    email: Optional[str]
    telefono: Optional[str]
    whatsapp: Optional[str]
    direccion: Optional[str]
    ciudad: Optional[str]
    estado: Optional[str]
    cp: Optional[str]
    uso_cfdi: Optional[str]
    regimen_fiscal: Optional[str]
    credito_activo: bool
    limite_credito: Decimal
    dias_credito: int
    saldo_pendiente: Decimal
    seller_id: Optional[int]
    notas: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ClientListOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    nombre: str
    rfc: Optional[str]
    tipo: ClientType
    telefono: Optional[str]
    whatsapp: Optional[str]
    credito_activo: bool
    saldo_pendiente: Decimal
    limite_credito: Decimal
    seller_id: Optional[int]
    is_active: bool


class PaginatedClients(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ClientListOut]
