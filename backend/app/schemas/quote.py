from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.quote import QuoteStatus


class QuoteItemBase(BaseModel):
    product_id: Optional[UUID] = None
    descripcion: str
    cantidad: float
    precio_unitario: float


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItemOut(QuoteItemBase):
    id: UUID
    importe: float

    model_config = {"from_attributes": True}


class QuoteBase(BaseModel):
    cliente_id: UUID
    fecha_validez: Optional[datetime] = None
    moneda: str = "MXN"
    notas: Optional[str] = None


class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate]


class QuoteUpdate(BaseModel):
    fecha_validez: Optional[datetime] = None
    estado: Optional[QuoteStatus] = None
    notas: Optional[str] = None
    items: Optional[List[QuoteItemCreate]] = None


class QuoteOut(QuoteBase):
    id: UUID
    folio: int
    vendedor_id: UUID
    estado: QuoteStatus
    subtotal: float
    iva: float
    total: float
    created_at: datetime
    items: List[QuoteItemOut] = []

    model_config = {"from_attributes": True}


class PriceRequestCreate(BaseModel):
    quote_id: Optional[UUID] = None
    producto_id: UUID
    precio_solicitado: float
    notas: Optional[str] = None
