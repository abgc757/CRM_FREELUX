from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuoteItemCreate(BaseModel):
    product_id: int
    cantidad: float
    precio_unitario: float
    descuento: Optional[float] = 0.0
    notas: Optional[str] = None


class QuoteItemOut(BaseModel):
    id: int
    quote_id: int
    product_id: int
    cantidad: float
    precio_unitario: float
    descuento: float
    subtotal: float
    notas: Optional[str] = None
    product: Optional["ProductOut"] = None

    class Config:
        from_attributes = True


class QuoteCreate(BaseModel):
    cliente_id: int
    items: List[QuoteItemCreate]
    validez_dias: Optional[int] = 15
    notas: Optional[str] = None
    descuento: Optional[float] = 0.0


class QuoteUpdate(BaseModel):
    items: Optional[List[QuoteItemCreate]] = None
    validez_dias: Optional[int] = None
    notas: Optional[str] = None
    descuento: Optional[float] = None


class PriceApprovalRequest(BaseModel):
    quote_id: int
    notes: Optional[str] = None


class PriceApprovalResponse(BaseModel):
    quote_id: int
    approved: bool
    notes: Optional[str] = None


class QuoteOut(BaseModel):
    id: int
    folio: str
    cliente_id: int
    vendedor_id: int
    subtotal: float
    descuento: float
    impuesto: float
    total: float
    validez_dias: int
    notas: Optional[str] = None
    estado: str
    requires_price_approval: bool
    price_approval_status: str
    pdf_generated: bool
    pdf_url: Optional[str] = None
    is_active: bool
    cliente: Optional["ClientOut"] = None
    vendedor: Optional["UserOut"] = None
    items: List[QuoteItemOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


from app.schemas.client import ClientOut
from app.schemas.user import UserOut
from app.schemas.product import ProductOut
QuoteItemOut.model_rebuild()
QuoteOut.model_rebuild()
