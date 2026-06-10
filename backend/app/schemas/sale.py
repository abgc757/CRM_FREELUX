from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, date
from typing import Optional, List
from app.models.sale import SaleStatus, PaymentMethod


class SaleCreate(BaseModel):
    quote_id: int
    metodo_pago: PaymentMethod = PaymentMethod.contado
    notas: Optional[str] = None


class PaymentIn(BaseModel):
    monto: Decimal
    metodo: PaymentMethod
    referencia: Optional[str] = None
    fecha_pago: Optional[date] = None
    notas: Optional[str] = None


class PaymentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    sale_id: int
    monto: Decimal
    metodo: PaymentMethod
    referencia: Optional[str]
    fecha_pago: Optional[date]
    notas: Optional[str]
    created_at: datetime


class SaleOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    quote_id: Optional[int]
    client_id: int
    seller_id: int
    status: SaleStatus
    metodo_pago: PaymentMethod
    subtotal: Decimal
    iva: Decimal
    total: Decimal
    saldo_pendiente: Decimal
    cfdi_uuid: Optional[str]
    cfdi_pdf_url: Optional[str]
    cfdi_xml_url: Optional[str]
    remision_url: Optional[str]
    fecha_vencimiento: Optional[date]
    notas: Optional[str]
    payments: List[PaymentOut] = []
    created_at: datetime
    updated_at: datetime


class SaleListOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    client_id: int
    client_nombre: Optional[str] = None
    status: SaleStatus
    metodo_pago: PaymentMethod
    total: Decimal
    saldo_pendiente: Decimal
    created_at: datetime


class PaginatedSales(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[SaleListOut]
