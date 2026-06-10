from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from app.models.quote import QuoteStatus
from app.models.product import UnitType


class QuoteItemIn(BaseModel):
    product_id: int
    descripcion: str
    cantidad: Decimal
    unidad: UnitType = UnitType.pza
    precio_unitario: Decimal
    descuento_pct: Decimal = Decimal("0")
    tiene_iva: bool = True


class QuoteItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    descripcion: str
    cantidad: Decimal
    unidad: UnitType
    precio_unitario: Decimal
    descuento_pct: Decimal
    subtotal: Decimal
    tiene_iva: bool


class QuoteCreate(BaseModel):
    client_id: int
    notas: Optional[str] = None
    condiciones_pago: Optional[str] = None
    vigencia_dias: int = 15
    items: List[QuoteItemIn]


class QuoteUpdate(BaseModel):
    status: Optional[QuoteStatus] = None
    notas: Optional[str] = None
    condiciones_pago: Optional[str] = None
    vigencia_dias: Optional[int] = None
    items: Optional[List[QuoteItemIn]] = None


class QuoteOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    client_id: int
    seller_id: int
    status: QuoteStatus
    notas: Optional[str]
    condiciones_pago: Optional[str]
    vigencia_dias: int
    subtotal: Decimal
    iva: Decimal
    total: Decimal
    pdf_url: Optional[str]
    items: List[QuoteItemOut]
    created_at: datetime
    updated_at: datetime


class QuoteListOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    client_id: int
    client_nombre: Optional[str] = None
    seller_id: int
    status: QuoteStatus
    total: Decimal
    created_at: datetime


class PaginatedQuotes(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[QuoteListOut]
