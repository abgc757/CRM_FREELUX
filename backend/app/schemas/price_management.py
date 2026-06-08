from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.price_update_job import PriceRequestStatus


class PriceRequestOut(BaseModel):
    id: UUID
    quote_id: Optional[UUID]
    vendedor_id: UUID
    gerente_id: Optional[UUID]
    producto_id: UUID
    precio_solicitado: float
    precio_aprobado: Optional[float]
    estado: PriceRequestStatus
    notas: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PriceRequestApprove(BaseModel):
    precio_aprobado: float
    notas: Optional[str] = None


class PriceRequestReject(BaseModel):
    notas: Optional[str] = None


class PriceHistoryOut(BaseModel):
    id: UUID
    product_id: UUID
    usuario_id: UUID
    precio_anterior: Optional[float]
    precio_nuevo: Optional[float]
    costo_anterior: Optional[float]
    costo_nuevo: Optional[float]
    motivo: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
