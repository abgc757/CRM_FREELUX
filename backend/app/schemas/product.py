from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ProductBase(BaseModel):
    sku: str
    nombre: str
    familia: Optional[str] = None
    categoria: Optional[str] = None
    departamento: Optional[str] = None
    peso_kg: Optional[float] = 0.0
    costo: float = 0.0
    precio_1: float = 0.0
    precio_2: Optional[float] = None
    precio_3: Optional[float] = None
    precio_4: Optional[float] = None
    mayoreo_2: Optional[int] = None
    mayoreo_3: Optional[int] = None
    mayoreo_4: Optional[int] = None
    tiene_impuesto: bool = True
    existencia: float = 0.0
    inv_min: Optional[float] = None
    inv_max: Optional[float] = None
    caracteristicas: Optional[str] = None
    activo: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    familia: Optional[str] = None
    categoria: Optional[str] = None
    departamento: Optional[str] = None
    peso_kg: Optional[float] = None
    costo: Optional[float] = None
    precio_1: Optional[float] = None
    precio_2: Optional[float] = None
    precio_3: Optional[float] = None
    precio_4: Optional[float] = None
    mayoreo_2: Optional[int] = None
    mayoreo_3: Optional[int] = None
    mayoreo_4: Optional[int] = None
    tiene_impuesto: Optional[bool] = None
    inv_min: Optional[float] = None
    inv_max: Optional[float] = None
    caracteristicas: Optional[str] = None
    activo: Optional[bool] = None


class ProductPriceUpdate(BaseModel):
    costo: Optional[float] = None
    precio_1: Optional[float] = None
    precio_2: Optional[float] = None
    precio_3: Optional[float] = None
    precio_4: Optional[float] = None
    motivo: Optional[str] = None


class ProductOut(ProductBase):
    id: UUID
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductStock(BaseModel):
    product_id: UUID
    sku: str
    nombre: str
    existencia: float
    inv_min: Optional[float]
    inv_max: Optional[float]

    model_config = {"from_attributes": True}
