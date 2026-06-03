from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SaleItemOut(BaseModel):
    id: int
    sale_id: int
    product_id: int
    cantidad: float
    precio_unitario: float
    descuento: float
    subtotal: float
    product: Optional[dict] = None

    class Config:
        from_attributes = True


class RemissionOut(BaseModel):
    id: int
    folio: str
    sale_id: int
    fecha_entrega: Optional[datetime] = None
    direccion_entrega: Optional[str] = None
    recibio_nombre: Optional[str] = None
    estado: str
    notas: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SaleOut(BaseModel):
    id: int
    folio: str
    quote_id: Optional[int] = None
    cliente_id: int
    vendedor_id: int
    subtotal: float
    descuento: float
    impuesto: float
    total: float
    tipo: str
    factura_solicitada: bool
    factura_uuid: Optional[str] = None
    notas: Optional[str] = None
    estado: str
    items: List[SaleItemOut] = []
    remissions: List[RemissionOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RemissionCreate(BaseModel):
    sale_id: int
    direccion_entrega: Optional[str] = None
    notas: Optional[str] = None
