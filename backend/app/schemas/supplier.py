from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SupplierCreate(BaseModel):
    nombre: str
    razon_social: Optional[str] = None
    rfc: Optional[str] = None
    contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    lead_time_dias: int = 3
    notas: Optional[str] = None


class SupplierUpdate(BaseModel):
    nombre: Optional[str] = None
    razon_social: Optional[str] = None
    rfc: Optional[str] = None
    contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    lead_time_dias: Optional[int] = None
    notas: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    nombre: str
    razon_social: Optional[str]
    rfc: Optional[str]
    contacto: Optional[str]
    email: Optional[str]
    telefono: Optional[str]
    direccion: Optional[str]
    lead_time_dias: int
    notas: Optional[str]
    is_active: bool
    created_at: datetime
