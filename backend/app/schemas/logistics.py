from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, date
from typing import Optional, List
from app.models.logistics import DeliveryStatus


class VehicleIn(BaseModel):
    placa: str
    descripcion: str
    capacidad_kg: Optional[Decimal] = None

class VehicleOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    placa: str
    descripcion: str
    capacidad_kg: Optional[Decimal]
    is_active: bool


class OperatorIn(BaseModel):
    nombre: str
    licencia: Optional[str] = None
    telefono: Optional[str] = None

class OperatorOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    nombre: str
    licencia: Optional[str]
    telefono: Optional[str]
    is_active: bool


class DeliveryItemIn(BaseModel):
    product_id: Optional[int] = None
    descripcion: str
    cantidad: Decimal
    unidad: Optional[str] = None

class DeliveryItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: Optional[int]
    descripcion: str
    cantidad: Decimal
    unidad: Optional[str]


class DeliveryOrderIn(BaseModel):
    sale_id: Optional[int] = None
    client_id: int
    direccion_entrega: str
    ciudad: Optional[str] = None
    contacto_entrega: Optional[str] = None
    telefono_entrega: Optional[str] = None
    fecha_programada: Optional[date] = None
    vehiculo_id: Optional[int] = None
    operador_id: Optional[int] = None
    notas: Optional[str] = None
    items: List[DeliveryItemIn] = []

class DeliveryStatusUpdate(BaseModel):
    status: DeliveryStatus
    fecha_entrega_real: Optional[date] = None
    notas: Optional[str] = None

class DeliveryOrderOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    sale_id: Optional[int]
    client_id: int
    client_nombre: Optional[str] = None
    direccion_entrega: str
    ciudad: Optional[str]
    contacto_entrega: Optional[str]
    telefono_entrega: Optional[str]
    fecha_programada: Optional[date]
    fecha_entrega_real: Optional[date]
    vehiculo_id: Optional[int]
    operador_id: Optional[int]
    vehiculo_placa: Optional[str] = None
    operador_nombre: Optional[str] = None
    status: DeliveryStatus
    notas: Optional[str]
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    items: List[DeliveryItemOut] = []

class PaginatedDeliveries(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[DeliveryOrderOut]
