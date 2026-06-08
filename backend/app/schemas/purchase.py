from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.purchase import PurchaseStatus


class PurchaseItemBase(BaseModel):
    product_id: Optional[UUID] = None
    descripcion: str
    cantidad: float
    precio_unitario: float


class PurchaseItemCreate(PurchaseItemBase):
    pass


class PurchaseItemOut(PurchaseItemBase):
    id: UUID
    cantidad_recibida: float

    model_config = {"from_attributes": True}


class PurchaseItemReceive(BaseModel):
    item_id: UUID
    cantidad_recibida: float


class PurchaseBase(BaseModel):
    supplier_id: UUID
    fecha_esperada: Optional[datetime] = None
    notas: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    items: List[PurchaseItemCreate]


class PurchaseUpdate(BaseModel):
    estado: Optional[PurchaseStatus] = None
    fecha_esperada: Optional[datetime] = None
    notas: Optional[str] = None


class PurchaseReceive(BaseModel):
    items: List[PurchaseItemReceive]


class PurchaseOut(PurchaseBase):
    id: UUID
    solicitante_id: UUID
    estado: PurchaseStatus
    subtotal: float
    iva: float
    total: float
    created_at: datetime
    items: List[PurchaseItemOut] = []

    model_config = {"from_attributes": True}
