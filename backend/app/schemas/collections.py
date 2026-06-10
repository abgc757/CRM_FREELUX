from pydantic import BaseModel
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List
from app.models.sale import PaymentMethod


class OverdueSaleOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    folio: str
    client_id: int
    client_nombre: str
    total: Decimal
    saldo_pendiente: Decimal
    fecha_vencimiento: Optional[date]
    dias_vencido: int
    metodo_pago: PaymentMethod
    created_at: datetime


class AgingBucket(BaseModel):
    al_corriente: Decimal = Decimal("0")
    dias_1_15: Decimal = Decimal("0")
    dias_16_30: Decimal = Decimal("0")
    dias_31_60: Decimal = Decimal("0")
    dias_60_plus: Decimal = Decimal("0")
    total: Decimal = Decimal("0")


class ClientAgingRow(BaseModel):
    client_id: int
    client_nombre: str
    rfc: Optional[str]
    telefono: Optional[str]
    whatsapp: Optional[str]
    dias_credito: int
    limite_credito: Decimal
    saldo_total: Decimal
    al_corriente: Decimal
    dias_1_15: Decimal
    dias_16_30: Decimal
    dias_31_60: Decimal
    dias_60_plus: Decimal
    num_facturas_vencidas: int


class AgingReport(BaseModel):
    fecha_corte: date
    totales: AgingBucket
    clientes: List[ClientAgingRow]


class CollectionsSummary(BaseModel):
    cartera_total: Decimal
    al_corriente: Decimal
    vencido_total: Decimal
    dias_1_15: Decimal
    dias_16_30: Decimal
    dias_31_60: Decimal
    dias_60_plus: Decimal
    num_clientes_vencidos: int
    num_ventas_vencidas: int


class CreditUpdateIn(BaseModel):
    credito_activo: Optional[bool] = None
    limite_credito: Optional[Decimal] = None
    dias_credito: Optional[int] = None
