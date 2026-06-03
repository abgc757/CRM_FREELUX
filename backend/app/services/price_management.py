"""
Price management service: calculation, preview, batch apply, and rollback.
"""

import logging
import json
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_
from sqlalchemy.orm import selectinload

from app.models import Product, PriceHistory, PriceUpdateJob, User
from app.schemas.price_management import (
    PriceParams, FilterCriteria, PreviewItem, PreviewResponse,
    ApplyRequest, ApplyResponse, JobOut,
)

logger = logging.getLogger("ferrecrm.price_management")


def calculate_price(
    costo_mxn: float,
    peso_kg: float,
    params: PriceParams,
    margin_override: Optional[float] = None,
    current_margin: float = 0.20,
) -> Tuple[float, float]:
    """
    Calculate new price using the steel-weight formula.

    Formula:
        c_prime = costo_mxn + (peso_kg * params.precio_acero_mxn_per_kg)
        c_double = c_prime * params.factor_logistico * (1 + params.impuestos_pct)
        m = margin_override if margin_override is not None else current_margin
        new_price = round(c_double * (1 + m), 2)

    Returns:
        Tuple of (new_price, effective_margin)
    """
    if peso_kg <= 0:
        raise ValueError(f"peso_kg must be > 0, got {peso_kg}")
    if costo_mxn < 0:
        raise ValueError(f"costo_mxn must be >= 0, got {costo_mxn}")

    c_prime = costo_mxn + (peso_kg * params.precio_acero_mxn_per_kg)
    c_double = c_prime * params.factor_logistico * (1 + params.impuestos_pct)
    m = margin_override if margin_override is not None else current_margin
    new_price = round(c_double * (1 + m), 2)

    if new_price < costo_mxn:
        raise ValueError(
            f"Calculated price ({new_price}) is below cost ({costo_mxn}). "
            f"Check parameters: acero={params.precio_acero_mxn_per_kg}, "
            f"logistico={params.factor_logistico}, impuestos={params.impuestos_pct}"
        )

    return new_price, m


def apply_price_to_product(
    product: Product,
    params: PriceParams,
    margin_override: Optional[float] = None,
) -> Tuple[float, float]:
    """
    Apply price calculation to a single product in-memory.
    Returns (new_price, effective_margin).
    """
    costo = getattr(product, "costo_mxn", None) or product.costo or 0.0
    peso = getattr(product, "peso_kg", None) or product.peso or 0.0
    current_margin = getattr(product, "margin", 0.20) or 0.20
    return calculate_price(costo, peso, params, margin_override, current_margin)


async def preview_price_update(
    db: AsyncSession,
    filter_criteria: FilterCriteria,
    params: PriceParams,
    margin_override: Optional[float] = None,
) -> PreviewResponse:
    """Preview price changes without modifying DB."""
    products = await _fetch_filtered_products(db, filter_criteria)
    items = []
    for p in products:
        try:
            costo = p.costo_mxn or p.costo or 0.0
            peso = p.peso_kg or p.peso or 0.0
            current_margin = p.margin or 0.20
            precio_actual = p.precio_venta_mxn or p.precio_venta or 0.0
            new_price, effective_margin = calculate_price(
                costo, peso, params, margin_override, current_margin
            )
            delta_abs = round(new_price - precio_actual, 2)
            delta_pct = round((delta_abs / precio_actual * 100), 2) if precio_actual else 0.0
            items.append(PreviewItem(
                product_id=p.id,
                sku=p.sku,
                nombre=p.nombre,
                peso_kg=peso,
                costo_mxn=costo,
                precio_actual=precio_actual,
                margin_actual=current_margin,
                precio_nuevo=new_price,
                margin_nuevo=effective_margin,
                delta_abs=delta_abs,
                delta_pct=delta_pct,
            ))
        except (ValueError, ZeroDivisionError) as e:
            items.append(PreviewItem(
                product_id=p.id,
                sku=p.sku,
                nombre=p.nombre,
                peso_kg=p.peso_kg or p.peso or 0.0,
                costo_mxn=p.costo_mxn or p.costo or 0.0,
                precio_actual=p.precio_venta_mxn or p.precio_venta or 0.0,
                margin_actual=p.margin or 0.20,
                precio_nuevo=0.0,
                margin_nuevo=0.0,
                delta_abs=0.0,
                delta_pct=0.0,
                error=str(e),
            ))
    return PreviewResponse(total_products=len(items), items=items, params=params, margin_override=margin_override)


async def apply_price_update(
    db: AsyncSession,
    job_id: int,
    batch_size: int = 100,
) -> JobOut:
    """Execute a price update job in batches with optimistic locking."""
    result = await db.execute(
        select(PriceUpdateJob).where(PriceUpdateJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise ValueError(f"Job {job_id} not found")

    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    await db.flush()

    filter_criteria = FilterCriteria(**job.filter_criteria)
    params = PriceParams(**job.params)
    margin_override = job.margin_override
    products = await _fetch_filtered_products(db, filter_criteria)
    job.total_products = len(products)
    await db.flush()

    processed = 0
    failed = 0
    errors_list = []

    for i in range(0, len(products), batch_size):
        batch = products[i:i + batch_size]
        for product in batch:
            try:
                costo = product.costo_mxn or product.costo or 0.0
                peso = product.peso_kg or product.peso or 0.0
                current_margin = product.margin or 0.20
                old_price = product.precio_venta_mxn or product.precio_venta or 0.0
                old_margin = current_margin

                new_price, effective_margin = calculate_price(
                    costo, peso, params, margin_override, current_margin
                )

                # Optimistic lock: version check
                expected_version = product.version
                update_result = await db.execute(
                    update(Product)
                    .where(and_(
                        Product.id == product.id,
                        Product.version == expected_version,
                    ))
                    .values(
                        precio_venta_mxn=new_price,
                        precio_venta=new_price,
                        margin=effective_margin,
                        version=expected_version + 1,
                        updated_at=datetime.now(timezone.utc),
                    )
                )
                if update_result.rowcount == 0:
                    raise ValueError(f"Optimistic lock conflict for product {product.sku} (version {expected_version})")

                # Record history
                history = PriceHistory(
                    product_id=product.id,
                    old_price=old_price,
                    new_price=new_price,
                    old_margin=old_margin,
                    new_margin=effective_margin,
                    reason=f"Price update job #{job_id}",
                    params={
                        "precio_acero_mxn_per_kg": params.precio_acero_mxn_per_kg,
                        "factor_logistico": params.factor_logistico,
                        "impuestos_pct": params.impuestos_pct,
                        "margin_override": margin_override,
                    },
                    changed_by=job.created_by,
                    job_id=job.id,
                )
                db.add(history)
                processed += 1
            except Exception as e:
                failed += 1
                errors_list.append({
                    "product_id": product.id,
                    "sku": product.sku,
                    "error": str(e),
                })
                logger.warning(f"Failed to update price for {product.sku}: {e}")

        await db.flush()
        logger.info(f"Job {job_id}: processed {processed}/{len(products)} (batch {i // batch_size + 1})")

    job.processed_count = processed
    job.failed_count = failed
    job.errors = errors_list
    job.status = "completed" if failed == 0 else "completed_with_errors"
    job.finished_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(job)
    return JobOut.model_validate(job)


async def rollback_price_update(
    db: AsyncSession,
    job_id: int,
    user_id: int,
    reason: Optional[str] = None,
) -> JobOut:
    """Rollback a price update job by restoring prices from history."""
    result = await db.execute(
        select(PriceUpdateJob).where(PriceUpdateJob.id == job_id)
    )
    original_job = result.scalar_one_or_none()
    if not original_job:
        raise ValueError(f"Job {job_id} not found")

    # Create rollback job
    rollback_job = PriceUpdateJob(
        name=f"Rollback of job #{job_id} - {original_job.name or 'unnamed'}",
        filter_criteria=original_job.filter_criteria,
        params=original_job.params,
        status="running",
        created_by=user_id,
        started_at=datetime.now(timezone.utc),
    )
    db.add(rollback_job)
    await db.flush()

    # Fetch all price history entries for this job
    history_result = await db.execute(
        select(PriceHistory).where(PriceHistory.job_id == job_id)
    )
    history_entries = history_result.scalars().all()

    processed = 0
    failed = 0
    errors_list = []

    for entry in history_entries:
        try:
            product_result = await db.execute(
                select(Product).where(Product.id == entry.product_id)
            )
            product = product_result.scalar_one_or_none()
            if not product:
                raise ValueError(f"Product {entry.product_id} not found")

            expected_version = product.version
            update_result = await db.execute(
                update(Product)
                .where(and_(
                    Product.id == product.id,
                    Product.version == expected_version,
                ))
                .values(
                    precio_venta_mxn=entry.old_price,
                    precio_venta=entry.old_price,
                    margin=entry.old_margin,
                    version=expected_version + 1,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            if update_result.rowcount == 0:
                raise ValueError(f"Optimistic lock conflict rolling back product {product.sku}")

            # Record rollback in history
            rollback_history = PriceHistory(
                product_id=product.id,
                old_price=entry.new_price,
                new_price=entry.old_price,
                old_margin=entry.new_margin,
                new_margin=entry.old_margin,
                reason=reason or f"Rollback of job #{job_id}",
                params={"rollback_job_id": rollback_job.id, "original_job_id": job_id},
                changed_by=user_id,
                job_id=rollback_job.id,
            )
            db.add(rollback_history)
            processed += 1
        except Exception as e:
            failed += 1
            errors_list.append({
                "product_id": entry.product_id,
                "error": str(e),
            })
            logger.warning(f"Rollback failed for product {entry.product_id}: {e}")

    original_job.rollback_job_id = rollback_job.id
    rollback_job.processed_count = processed
    rollback_job.failed_count = failed
    rollback_job.errors = errors_list
    rollback_job.status = "completed" if failed == 0 else "completed_with_errors"
    rollback_job.finished_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(rollback_job)
    return JobOut.model_validate(rollback_job)


async def _fetch_filtered_products(
    db: AsyncSession,
    filter_criteria: FilterCriteria,
) -> List[Product]:
    """Fetch products matching filter criteria."""
    query = select(Product)
    conditions = []

    if filter_criteria.is_active is not None:
        conditions.append(Product.is_active == filter_criteria.is_active)
    if filter_criteria.department_id:
        conditions.append(Product.department_id == filter_criteria.department_id)
    if filter_criteria.category_id:
        conditions.append(Product.category_id == filter_criteria.category_id)
    if filter_criteria.sku_prefix:
        conditions.append(Product.sku.like(f"{filter_criteria.sku_prefix}%"))
    if filter_criteria.sku_list:
        conditions.append(Product.sku.in_(filter_criteria.sku_list))
    if filter_criteria.peso_min is not None:
        conditions.append(Product.peso >= filter_criteria.peso_min)
    if filter_criteria.peso_max is not None:
        conditions.append(Product.peso <= filter_criteria.peso_max)
    if filter_criteria.precio_min is not None:
        conditions.append(Product.precio_venta >= filter_criteria.precio_min)
    if filter_criteria.precio_max is not None:
        conditions.append(Product.precio_venta <= filter_criteria.precio_max)

    if conditions:
        query = query.where(and_(*conditions))
    result = await db.execute(query)
    return list(result.scalars().all())
