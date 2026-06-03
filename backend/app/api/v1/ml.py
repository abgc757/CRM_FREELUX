"""
ML integration endpoints (stubs for future AI/ML features).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Product
from app.schemas.price_management import MLSuggestionRequest, MLSuggestionResponse

logger = logging.getLogger("ferrecrm.api.ml")
router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/price-suggestion", response_model=MLSuggestionResponse)
async def suggest_price(
    body: MLSuggestionRequest,
    current_user: User = Depends(RoleChecker(["gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a price/margin suggestion based on product features.

    This is a **stub** for future ML integration.
    Currently returns baseline suggestions based on simple heuristics.
    When ML models are deployed, this endpoint will call the model registry.
    """
    product = await db.get(Product, body.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    costo = body.costo_mxn or product.costo_mxn or product.costo or 0.0
    peso = body.peso_kg or product.peso_kg or product.peso or 0.0

    # Heuristic baseline (replace with ML model prediction)
    suggested_margin = round(0.20 + (0.05 / max(peso, 0.1)), 4)
    suggested_price = round(costo * (1 + suggested_margin), 2)

    return MLSuggestionResponse(
        product_id=body.product_id,
        suggested_margin=suggested_margin,
        suggested_price=suggested_price,
        confidence=0.0,
        model_version="heuristic-v0",
        features_used={
            "product_id": body.product_id,
            "costo_mxn": costo,
            "peso_kg": peso,
            "market_price": body.market_price,
            "competitor_price": body.competitor_price,
            "season_factor": body.season_factor or 1.0,
        },
    )


@router.get("/export/dataset")
async def export_dataset(
    model_type: str = "sales",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["gerencia", "admin"])),
):
    """
    Export training dataset for ML models.

    Available model types: sales, stock, suppliers, price_history
    Returns a query template that can be used to extract data for training.
    """
    datasets = {
        "sales": {
            "query": """
                SELECT s.created_at, s.total, s.descuento, si.product_id,
                       p.sku, p.nombre, p.costo_mxn, p.precio_venta_mxn,
                       p.peso_kg, p.margin
                FROM sales s
                JOIN sale_items si ON si.sale_id = s.id
                JOIN products p ON p.id = si.product_id
                WHERE s.created_at BETWEEN :start_date AND :end_date
            """,
            "description": "Sales data with product features for demand forecasting",
        },
        "stock": {
            "query": """
                SELECT im.created_at, im.tipo, im.cantidad,
                       p.sku, p.nombre, p.stock, p.peso_kg, p.margin
                FROM inventory_movements im
                JOIN products p ON p.id = im.product_id
                WHERE im.created_at BETWEEN :start_date AND :end_date
            """,
            "description": "Inventory movement data for stock optimization",
        },
        "suppliers": {
            "query": """
                SELECT s.nombre, s.tiempo_entrega_promedio, s.fiabilidad_score,
                       s.distancia_km, s.familias, pr.sku, pr.nombre
                FROM suppliers s
                JOIN purchases pu ON pu.supplier_id = s.id
                JOIN purchase_items pi ON pi.purchase_id = pu.id
                JOIN products pr ON pr.id = pi.product_id
            """,
            "description": "Supplier performance data for supplier ranking",
        },
        "price_history": {
            "query": """
                SELECT ph.created_at, ph.old_price, ph.new_price,
                       ph.old_margin, ph.new_margin, ph.params,
                       p.sku, p.nombre, p.peso_kg, p.costo_mxn
                FROM price_history ph
                JOIN products p ON p.id = ph.product_id
                WHERE ph.created_at BETWEEN :start_date AND :end_date
            """,
            "description": "Price change history for price optimization models",
        },
    }
    ds = datasets.get(model_type)
    if not ds:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown model_type: {model_type}")
    return {
        "model_type": model_type,
        "description": ds["description"],
        "query_template": ds["query"],
        "params": {"start_date": start_date, "end_date": end_date},
        "note": "Export via PostgreSQL COPY or use scripts/ml_export.py for full ETL pipeline",
    }
