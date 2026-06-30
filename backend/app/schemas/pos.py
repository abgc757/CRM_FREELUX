from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from app.models.pos import SessionStatus, POSPaymentMethod


class OpenSessionIn(BaseModel):
    fondo_inicial: Decimal = Decimal("0")
    notas: Optional[str] = None

class CloseSessionIn(BaseModel):
    efectivo_contado: Decimal
    notas: Optional[str] = None

class SessionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    cajero_id: int
    cajero_nombre: Optional[str] = None
    status: SessionStatus
    fondo_inicial: Decimal
    total_efectivo: Decimal
    total_tarjeta: Decimal
    total_transferencia: Decimal
    total_ventas: Decimal
    num_transacciones: int
    efectivo_contado: Optional[Decimal]
    diferencia: Optional[Decimal]
    notas: Optional[str]
    opened_at: datetime
    closed_at: Optional[datetime]


class POSSaleItemIn(BaseModel):
    product_id: Optional[int] = None
    descripcion: str
    cantidad: Decimal
    precio_unitario: Decimal
    descuento_pct: Decimal = Decimal("0")
    tiene_iva: bool = True

class POSSaleItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: Optional[int]
    descripcion: str
    cantidad: Decimal
    precio_unitario: Decimal
    descuento_pct: Decimal
    subtotal: Decimal
    tiene_iva: bool

class POSSaleIn(BaseModel):
    client_id: Optional[int] = None
    metodo_pago: POSPaymentMethod = POSPaymentMethod.efectivo
    monto_efectivo: Decimal = Decimal("0")
    monto_tarjeta: Decimal = Decimal("0")
    monto_transferencia: Decimal = Decimal("0")
    notas: Optional[str] = None
    items: List[POSSaleItemIn]

class POSSaleOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    session_id: int
    cajero_id: int
    client_id: Optional[int]
    subtotal: Decimal
    iva: Decimal
    total: Decimal
    metodo_pago: POSPaymentMethod
    monto_efectivo: Decimal
    monto_tarjeta: Decimal
    monto_transferencia: Decimal
    cambio: Decimal
    notas: Optional[str]
    is_cancelled: bool
    created_at: datetime
    items: List[POSSaleItemOut] = []

class PaginatedPOSSales(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[POSSaleOut]
