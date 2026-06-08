from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.inventory import MovementType, ReferenciaType


class MovementCreate(BaseModel):
    product_id: UUID
    almacen_id: Optional[UUID] = None
    tipo: MovementType
    cantidad: float
    referencia_tipo: Optional[ReferenciaType] = None
    referencia_id: Optional[UUID] = None
    notas: Optional[str] = None


class MovementOut(BaseModel):
    id: UUID
    product_id: UUID
    almacen_id: Optional[UUID]
    tipo: MovementType
    cantidad: float
    cantidad_anterior: float
    referencia_tipo: Optional[ReferenciaType]
    referencia_id: Optional[UUID]
    usuario_id: UUID
    notas: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class WarehouseOut(BaseModel):
    id: UUID
    nombre: str
    ubicacion: Optional[str]
    activo: bool

    model_config = {"from_attributes": True}


class LowStockItem(BaseModel):
    product_id: UUID
    sku: str
    nombre: str
    existencia: float
    inv_min: Optional[float]

    model_config = {"from_attributes": True}
