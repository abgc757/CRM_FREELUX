from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DepartmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class CategoryOut(BaseModel):
    id: int
    name: str
    department_id: int
    is_active: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    sku: str
    clave_alterna: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    servicio: Optional[bool] = False
    department_id: Optional[int] = None
    category_id: Optional[int] = None
    inv_min: Optional[int] = 0
    inv_max: Optional[int] = 0
    costo: Optional[float] = 0.0
    precio_venta: Optional[float] = 0.0
    precio_2: Optional[float] = 0.0
    mayoreo_2: Optional[int] = 0
    precio_3: Optional[float] = 0.0
    mayoreo_3: Optional[int] = 0
    precio_4: Optional[float] = 0.0
    mayoreo_4: Optional[int] = 0
    peso: Optional[float] = 0.0
    stock: Optional[float] = 0.0
    caracteristicas: Optional[str] = None
    receta: Optional[bool] = False
    granel: Optional[bool] = False
    impuesto: Optional[bool] = True


class ProductOut(BaseModel):
    id: int
    sku: str
    clave_alterna: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    servicio: bool
    department_id: Optional[int] = None
    category_id: Optional[int] = None
    department: Optional[DepartmentOut] = None
    category: Optional[CategoryOut] = None
    inv_min: int
    inv_max: int
    costo: float
    precio_venta: float
    precio_2: float
    mayoreo_2: int
    precio_3: float
    mayoreo_3: int
    precio_4: float
    mayoreo_4: int
    peso: float
    stock: float
    caracteristicas: Optional[str] = None
    receta: bool
    granel: bool
    impuesto: bool
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StockOut(BaseModel):
    product_id: int
    sku: str
    nombre: str
    stock: float
    warehouse_id: int
    warehouse_name: str

    class Config:
        from_attributes = True
