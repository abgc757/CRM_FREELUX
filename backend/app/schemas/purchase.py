from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PurchaseItemCreate(BaseModel):
    product_id: int
    cantidad: float
    precio_unitario: float


class PurchaseItemOut(BaseModel):
    id: int
    purchase_id: int
    product_id: int
    cantidad: float
    precio_unitario: float
    subtotal: float
    product: Optional[dict] = None

    class Config:
        from_attributes = True


class PurchaseCreate(BaseModel):
    supplier_id: int
    items: List[PurchaseItemCreate]
    notas: Optional[str] = None


class PurchaseOut(BaseModel):
    id: int
    folio: str
    supplier_id: int
    user_id: int
    subtotal: float
    impuesto: float
    total: float
    estado: str
    eta: Optional[datetime] = None
    notas: Optional[str] = None
    items: List[PurchaseItemOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AvailabilityRequestCreate(BaseModel):
    product_id: int
    cantidad: float
    sale_id: Optional[int] = None
    notes: Optional[str] = None


class AvailabilityRequestResponse(BaseModel):
    request_id: int
    eta: Optional[datetime] = None
    notes: Optional[str] = None
    estado: str = "respondida"
