from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class SupplierBase(BaseModel):
    nombre: str
    rfc: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado_mx: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    familias: Optional[List[str]] = None
    tiempo_entrega_promedio_dias: Optional[int] = 7
    fiabilidad_score: Optional[int] = 50
    activo: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    nombre: Optional[str] = None
    rfc: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado_mx: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    familias: Optional[List[str]] = None
    tiempo_entrega_promedio_dias: Optional[int] = None
    fiabilidad_score: Optional[int] = None
    activo: Optional[bool] = None


class SupplierOut(SupplierBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
