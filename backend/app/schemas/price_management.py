from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class PriceParams(BaseModel):
    precio_acero_mxn_per_kg: float = Field(..., gt=0, description="Steel price in MXN per kg")
    factor_logistico: float = Field(1.0, ge=1.0, description="Logistics multiplier")
    impuestos_pct: float = Field(0.0, ge=0.0, le=1.0, description="Tax rate as decimal (e.g. 0.16 for 16%)")


class FilterCriteria(BaseModel):
    department_id: Optional[int] = None
    category_id: Optional[int] = None
    sku_prefix: Optional[str] = None
    sku_list: Optional[List[str]] = None
    peso_min: Optional[float] = None
    peso_max: Optional[float] = None
    precio_min: Optional[float] = None
    precio_max: Optional[float] = None
    is_active: Optional[bool] = True


class PreviewItem(BaseModel):
    product_id: int
    sku: str
    nombre: str
    peso_kg: float
    costo_mxn: float
    precio_actual: float
    margin_actual: float
    precio_nuevo: float
    margin_nuevo: float
    delta_abs: float
    delta_pct: float
    error: Optional[str] = None


class PreviewResponse(BaseModel):
    total_products: int
    items: List[PreviewItem]
    params: PriceParams
    margin_override: Optional[float] = None


class ApplyRequest(BaseModel):
    name: Optional[str] = None
    filter: FilterCriteria
    params: PriceParams
    margin_override: Optional[float] = None
    batch_size: int = Field(100, ge=1, le=1000)
    create_purchase_order_for_missing: bool = False


class ApplyResponse(BaseModel):
    job_id: int
    status: str
    message: str


class RollbackRequest(BaseModel):
    job_id: int
    reason: Optional[str] = None


class JobOut(BaseModel):
    id: int
    name: Optional[str] = None
    filter_criteria: Any
    params: Any
    margin_override: Optional[float] = None
    status: str
    total_products: int
    processed_count: int
    failed_count: int
    errors: List[Any] = []
    created_by: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    rollback_job_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PriceHistoryOut(BaseModel):
    id: int
    product_id: int
    old_price: float
    new_price: float
    old_margin: float
    new_margin: float
    reason: Optional[str] = None
    params: Any
    changed_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class MarginUpdateRequest(BaseModel):
    margin: float = Field(..., ge=0.0, le=1.0, description="New margin as decimal (0.0 to 1.0)")
    reason: Optional[str] = None


class BulkMarginUpdateRequest(BaseModel):
    skus: List[str]
    margin: float = Field(..., ge=0.0, le=1.0)
    reason: Optional[str] = None


class MLSuggestionRequest(BaseModel):
    product_id: int
    peso_kg: Optional[float] = None
    costo_mxn: Optional[float] = None
    market_price: Optional[float] = None
    competitor_price: Optional[float] = None
    season_factor: Optional[float] = 1.0


class MLSuggestionResponse(BaseModel):
    product_id: int
    suggested_margin: float
    suggested_price: float
    confidence: float
    model_version: str
    features_used: dict
