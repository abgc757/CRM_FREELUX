"""
API endpoints for price management (Gerencia/Admin only).
"""

import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Product, PriceHistory, PriceUpdateJob
from app.schemas.price_management import (
    PriceParams, FilterCriteria, PreviewResponse, ApplyRequest, ApplyResponse,
    RollbackRequest, JobOut, PriceHistoryOut, MarginUpdateRequest,
    BulkMarginUpdateRequest, MLSuggestionRequest, MLSuggestionResponse,
)
from app.services.price_management import (
    preview_price_update, apply_price_update, rollback_price_update,
    calculate_price,
)
from app.tasks.price_tasks import apply_price_update_task, rollback_price_update_task

logger = logging.getLogger("ferrecrm.api.price_management")
router = APIRouter(prefix="/price-management", tags=["price-management"])

PRICE_MANAGERS = RoleChecker(["gerencia", "admin"])


@router.post("/preview", response_model=PreviewResponse)
async def preview_prices(
    filter_criteria: FilterCriteria,
    params: PriceParams,
    margin_override: Optional[float] = None,
    current_user: User = Depends(PRICE_MANAGERS),
    db: AsyncSession = Depends(get_db),
):
    """Preview price changes before applying them."""
    result = await preview_price_update(db, filter_criteria, params, margin_override)
    return result


@router.post("/apply", response_model=ApplyResponse, status_code=status.HTTP_202_ACCEPTED)
async def apply_prices(
    body: ApplyRequest,
    current_user: User = Depends(PRICE_MANAGERS),
    db: AsyncSession = Depends(get_db),
):
    """Create a price update job and enqueue it for async processing."""
    job = PriceUpdateJob(
        name=body.name or f"Price update {datetime.now(timezone.utc).isoformat()}",
        filter_criteria=body.filter.model_dump(),
        params=body.params.model_dump(),
        margin_override=body.margin_override,
        status="pending",
        created_by=current_user.id,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)

    # Enqueue async task
    apply_price_update_task.delay(job.id, body.batch_size)

    return ApplyResponse(
        job_id=job.id,
        status="pending",
        message=f"Price update job #{job.id} created and enqueued",
    )


@router.post("/rollback", response_model=ApplyResponse)
async def rollback_prices(
    body: RollbackRequest,
    current_user: User = Depends(PRICE_MANAGERS),
    db: AsyncSession = Depends(get_db),
):
    """Rollback a price update job, restoring prices from history."""
    result = await db.execute(
        select(PriceUpdateJob).where(PriceUpdateJob.id == body.job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status not in ("completed", "completed_with_errors"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot rollback job in status '{job.status}'",
        )

    rollback_price_update_task.delay(body.job_id, current_user.id, body.reason)

    return ApplyResponse(
        job_id=body.job_id,
        status="rollback_pending",
        message=f"Rollback of job #{body.job_id} enqueued",
    )


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(
    job_id: int,
    current_user: User = Depends(PRICE_MANAGERS),
    db: AsyncSession = Depends(get_db),
):
    """Get status and details of a price update job."""
    result = await db.execute(
        select(PriceUpdateJob).where(PriceUpdateJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobOut.model_validate(job)


@router.get("/jobs", response_model=List[JobOut])
async def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(PRICE_MANAGERS),
    db: AsyncSession = Depends(get_db),
):
    """List price update jobs."""
    query = select(PriceUpdateJob)
    if status_filter:
        query = query.where(PriceUpdateJob.status == status_filter)
    query = query.order_by(PriceUpdateJob.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [JobOut.model_validate(j) for j in result.scalars().all()]


@router.get("/products/{sku}/price-history", response_model=List[PriceHistoryOut])
async def get_product_price_history(
    sku: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(RoleChecker(["gerencia", "admin", "compras"])),
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a specific product by SKU."""
    prod = await db.execute(select(Product).where(Product.sku == sku))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.product_id == product.id)
        .order_by(PriceHistory.created_at.desc())
        .limit(limit)
    )
    return [PriceHistoryOut.model_validate(h) for h in result.scalars().all()]


@router.patch("/products/{sku}/margin", response_model=dict)
async def update_product_margin(
    sku: str,
    body: MarginUpdateRequest,
    current_user: User = Depends(PRICE_MANAGERS),
    db: AsyncSession = Depends(get_db),
):
    """Update margin for a single product by SKU."""
    prod = await db.execute(select(Product).where(Product.sku == sku))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    old_margin = product.margin or 0.20
    old_price = product.precio_venta_mxn or product.precio_venta or 0.0
    product.margin = body.margin
    product.version += 1
    product.updated_at = datetime.now(timezone.utc)

    history = PriceHistory(
        product_id=product.id,
        old_price=old_price,
        new_price=old_price,
        old_margin=old_margin,
        new_margin=body.margin,
        reason=body.reason or "Manual margin update",
        params={"changed_by": current_user.id},
        changed_by=current_user.id,
    )
    db.add(history)
    await db.flush()
    return {"message": "Margin updated", "sku": sku, "old_margin": old_margin, "new_margin": body.margin}


@router.patch("/products/bulk-margin", response_model=dict)
async def bulk_update_margin(
    body: BulkMarginUpdateRequest,
    current_user: User = Depends(PRICE_MANAGERS),
    db: AsyncSession = Depends(get_db),
):
    """Update margin for multiple products by SKU list."""
    result = await db.execute(
        select(Product).where(Product.sku.in_(body.skus))
    )
    products = result.scalars().all()
    updated = 0
    for product in products:
        old_margin = product.margin or 0.20
        old_price = product.precio_venta_mxn or product.precio_venta or 0.0
        product.margin = body.margin
        product.version += 1
        product.updated_at = datetime.now(timezone.utc)
        history = PriceHistory(
            product_id=product.id,
            old_price=old_price,
            new_price=old_price,
            old_margin=old_margin,
            new_margin=body.margin,
            reason=body.reason or "Bulk margin update",
            params={"changed_by": current_user.id, "bulk": True},
            changed_by=current_user.id,
        )
        db.add(history)
        updated += 1
    await db.flush()
    return {"message": f"Margin updated for {updated} products", "skus_requested": len(body.skus), "updated": updated}
