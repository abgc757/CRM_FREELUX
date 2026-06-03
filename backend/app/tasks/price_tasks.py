"""
Celery tasks for async price update processing.
"""

import logging
import asyncio
from typing import Optional

from celery import chain, group

from app.tasks.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger("ferrecrm.tasks.price_tasks")


def run_async(coro):
    """Run an async function in the Celery task context."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def apply_price_update_task(self, job_id: int, batch_size: int = 100):
    """
    Execute a price update job asynchronously.

    Args:
        job_id: ID of the PriceUpdateJob to execute
        batch_size: Number of products per batch
    """
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from app.database import Base
    from app.services.price_management import apply_price_update

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _run():
        async with session_factory() as db:
            try:
                result = await apply_price_update(db, job_id, batch_size)
                logger.info(
                    f"Job {job_id} completed: {result.processed_count} processed, "
                    f"{result.failed_count} failed, status={result.status}"
                )
                return {
                    "job_id": job_id,
                    "status": result.status,
                    "processed": result.processed_count,
                    "failed": result.failed_count,
                }
            except Exception as e:
                logger.error(f"Job {job_id} failed: {e}")
                # Update job status to failed
                from sqlalchemy import select, update
                from app.models import PriceUpdateJob
                stmt = (
                    update(PriceUpdateJob)
                    .where(PriceUpdateJob.id == job_id)
                    .values(status="failed")
                )
                await db.execute(stmt)
                await db.commit()
                raise self.retry(exc=e)
            finally:
                await engine.dispose()

    return run_async(_run())


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def rollback_price_update_task(self, job_id: int, user_id: int, reason: Optional[str] = None):
    """
    Execute a price update rollback asynchronously.

    Args:
        job_id: ID of the PriceUpdateJob to roll back
        user_id: User performing the rollback
        reason: Optional reason for rollback
    """
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from app.services.price_management import rollback_price_update

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _run():
        async with session_factory() as db:
            try:
                result = await rollback_price_update(db, job_id, user_id, reason)
                logger.info(
                    f"Rollback of job {job_id} completed: {result.processed_count} restored, "
                    f"{result.failed_count} failed"
                )
                return {
                    "rollback_job_id": result.id,
                    "status": result.status,
                    "processed": result.processed_count,
                    "failed": result.failed_count,
                }
            except Exception as e:
                logger.error(f"Rollback of job {job_id} failed: {e}")
                raise self.retry(exc=e)
            finally:
                await engine.dispose()

    return run_async(_run())
