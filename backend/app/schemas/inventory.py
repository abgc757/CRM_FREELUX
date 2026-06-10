from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from app.models.inventory import MovementType


class MovementIn(BaseModel):
    product_id: int
    tipo: MovementType
    cantidad: Decimal
    referencia: Optional[str] = None
    notas: Optional[str] = None


class MovementOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    product_id: int
    tipo: MovementType
    cantidad: Decimal
    stock_antes: Decimal
    stock_despues: Decimal
    referencia: Optional[str]
    notas: Optional[str]
    created_by_id: Optional[int]
    created_at: datetime


class StockAlertOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    clave: str
    descripcion: str
    stock_actual: Decimal
    stock_min: Decimal
    departamento: Optional[str]
    categoria: Optional[str]


class PaginatedMovements(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[MovementOut]
