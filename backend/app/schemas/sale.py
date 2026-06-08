from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.sale import SaleStatus, TipoDocumento


class SaleOut(BaseModel):
    id: UUID
    quote_id: Optional[UUID]
    vendedor_id: UUID
    cliente_id: UUID
    tipo_documento: TipoDocumento
    estado: SaleStatus
    subtotal: float
    iva: float
    total: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SaleUpdate(BaseModel):
    tipo_documento: Optional[TipoDocumento] = None
    estado: Optional[SaleStatus] = None
