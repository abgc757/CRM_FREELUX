from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SupplierCreate(BaseModel):
    nombre: str
    rfc: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    ubicacion: Optional[str] = None
    website: Optional[str] = None
    tiempo_entrega_promedio: Optional[int] = 0
    fiabilidad_score: Optional[float] = 0.0
    distancia_km: Optional[float] = 0.0
    familias: Optional[str] = "[]"
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    ubicacion: Optional[str] = None
    website: Optional[str] = None
    tiempo_entrega_promedio: Optional[int] = None
    fiabilidad_score: Optional[float] = None
    distancia_km: Optional[float] = None
    familias: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierOut(BaseModel):
    id: int
    nombre: str
    rfc: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    ubicacion: Optional[str] = None
    website: Optional[str] = None
    tiempo_entrega_promedio: int
    fiabilidad_score: float
    distancia_km: float
    familias: str
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SupplierSearchOut(BaseModel):
    id: int
    nombre: str
    familias: str
    distancia_km: float
    tiempo_entrega_promedio: int
    fiabilidad_score: float
    score: Optional[float] = None
