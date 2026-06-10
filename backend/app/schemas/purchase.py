from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, date
from typing import Optional, List
from app.models.purchase import PurchaseStatus
from app.models.product import UnitType


class PurchaseItemIn(BaseModel):
    product_id: int
    descripcion: str
    cantidad_solicitada: Decimal
    unidad: UnitType = UnitType.pza
    precio_unitario: Decimal


class PurchaseItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    descripcion: str
    cantidad_solicitada: Decimal
    cantidad_recibida: Decimal
    unidad: UnitType
    precio_unitario: Decimal
    subtotal: Decimal


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    fecha_requerida: Optional[date] = None
    notas: Optional[str] = None
    items: List[PurchaseItemIn]


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    fecha_requerida: Optional[date] = None
    notas: Optional[str] = None
    status: Optional[PurchaseStatus] = None


class ReceiveItemIn(BaseModel):
    item_id: int
    cantidad_recibida: Decimal


class PurchaseOrderOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    supplier_id: int
    created_by_id: int
    status: PurchaseStatus
    fecha_requerida: Optional[date]
    notas: Optional[str]
    subtotal: Decimal
    iva: Decimal
    total: Decimal
    items: List[PurchaseItemOut] = []
    created_at: datetime
    updated_at: datetime


class PurchaseOrderListOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    supplier_id: int
    status: PurchaseStatus
    total: Decimal
    fecha_requerida: Optional[date]
    created_at: datetime


class PaginatedPurchases(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[PurchaseOrderListOut]
