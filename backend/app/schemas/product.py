from pydantic import BaseModel, field_validator
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from app.models.product import ClientType, UnitType


class ProductPriceIn(BaseModel):
    client_type: ClientType
    precio: Decimal
    volumen_minimo: Decimal = Decimal("0")


class ProductPriceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    client_type: ClientType
    precio: Decimal
    volumen_minimo: Decimal


class ProductCreate(BaseModel):
    clave: str
    clave_alterna: Optional[str] = None
    descripcion: str
    departamento: Optional[str] = None
    categoria: Optional[str] = None
    caracteristicas: Optional[str] = None
    tags: Optional[str] = None
    precio_compra: Decimal = Decimal("0")
    peso_kg: Decimal = Decimal("0")
    unidad_venta: UnitType = UnitType.pza
    granel: bool = False
    tiene_impuesto: bool = True
    stock_actual: Decimal = Decimal("0")
    stock_min: Decimal = Decimal("0")
    stock_max: Decimal = Decimal("0")
    is_service: bool = False
    prices: List[ProductPriceIn] = []


class ProductUpdate(BaseModel):
    descripcion: Optional[str] = None
    departamento: Optional[str] = None
    categoria: Optional[str] = None
    caracteristicas: Optional[str] = None
    tags: Optional[str] = None
    precio_compra: Optional[Decimal] = None
    peso_kg: Optional[Decimal] = None
    unidad_venta: Optional[UnitType] = None
    granel: Optional[bool] = None
    tiene_impuesto: Optional[bool] = None
    stock_min: Optional[Decimal] = None
    stock_max: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    clave: str
    clave_alterna: Optional[str]
    descripcion: str
    departamento: Optional[str]
    categoria: Optional[str]
    caracteristicas: Optional[str]
    imagen_url: Optional[str]
    tags: Optional[str]
    precio_compra: Decimal
    peso_kg: Decimal
    unidad_venta: UnitType
    granel: bool
    tiene_impuesto: bool
    stock_actual: Decimal
    stock_min: Decimal
    stock_max: Decimal
    is_active: bool
    is_service: bool
    prices: List[ProductPriceOut] = []
    created_at: datetime
    updated_at: datetime


class ProductListOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    clave: str
    descripcion: str
    departamento: Optional[str]
    categoria: Optional[str]
    precio_compra: Decimal
    peso_kg: Decimal
    unidad_venta: UnitType
    granel: bool
    tiene_impuesto: bool
    stock_actual: Decimal
    is_active: bool
    imagen_url: Optional[str]
    prices: List[ProductPriceOut] = []


class PriceUpdateBulk(BaseModel):
    """Apply a % increase/decrease to prices."""
    porcentaje: Decimal  # e.g. 5.5 means +5.5%, -3 means -3%
    client_types: Optional[List[ClientType]] = None  # None = all
    departamentos: Optional[List[str]] = None         # None = all
    categorias: Optional[List[str]] = None            # None = all
    reason: Optional[str] = None


class PaginatedProducts(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProductListOut]
