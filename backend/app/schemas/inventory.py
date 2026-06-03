from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InventoryMovementCreate(BaseModel):
    product_id: int
    warehouse_id: int
    cantidad: float
    tipo: str
    referencia: Optional[str] = None
    referencia_tipo: Optional[str] = None
    notes: Optional[str] = None


class InventoryMovementOut(BaseModel):
    id: int
    product_id: int
    warehouse_id: int
    cantidad: float
    tipo: str
    referencia: Optional[str] = None
    referencia_tipo: Optional[str] = None
    notes: Optional[str] = None
    user_id: int
    product: Optional[dict] = None
    warehouse: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WarehouseOut(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
