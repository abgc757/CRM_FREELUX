"""
CLI script for price update jobs: preview, apply, rollback, and dry-run.

Usage:
    python -m scripts.price_update_job --preview --filter '{"department_id": 1}' --params '{"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.15, "impuestos_pct": 0.16}' --margin-override 0.25
    python -m scripts.price_update_job --apply --filter '{"sku_prefix": "C0"}' --params '{"precio_acero_mxn_per_kg": 25.0}' --batch-size 50
    python -m scripts.price_update_job --dry-run --filter '{}' --params '{"precio_acero_mxn_per_kg": 25.0}'
    python -m scripts.price_update_job --rollback --job-id 5
"""

import asyncio
import json
import sys
import argparse
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("price_update_job")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.models import Product, PriceUpdateJob, User
from app.schemas.price_management import PriceParams, FilterCriteria
from app.services.price_management import preview_price_update, apply_price_update, rollback_price_update


def parse_json(value: str) -> dict:
    try:
        return json.loads(value)
    except json.JSONDecodeError as e:
        raise argparse.ArgumentTypeError(f"Invalid JSON: {e}")


async def run_preview(filter_data: dict, params_data: dict, margin_override: float | None):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as db:
        try:
            filter_criteria = FilterCriteria(**filter_data)
            params = PriceParams(**params_data)
            result = await preview_price_update(db, filter_criteria, params, margin_override)
            print(f"\nPreview Results: {result.total_products} products")
            print(f"Params: precio_acero={params.precio_acero_mxn_per_kg}, "
                  f"logistico={params.factor_logistico}, impuestos={params.impuestos_pct}")
            if margin_override is not None:
                print(f"Margin override: {margin_override}")
            print(f"\n{'SKU':<15} {'Name':<30} {'Weight':>8} {'Cost':>10} {'Current':>10} {'New':>10} {'Delta':>10} {'%':>8} {'Error':<20}")
            print("-" * 121)
            for item in result.items:
                err = item.error or ""
                delta_str = f"{item.delta_abs:+.2f}"
                pct_str = f"{item.delta_pct:+.2f}%" if not item.error else ""
                print(f"{item.sku:<15} {item.nombre[:29]:<30} {item.peso_kg:>8.3f} "
                      f"{item.costo_mxn:>10.2f} {item.precio_actual:>10.2f} "
                      f"{item.precio_nuevo:>10.2f} {delta_str:>10} {pct_str:>8} {err:<20}")
            print(f"\nTotal: {result.total_products} products")
        except Exception as e:
            logger.error(f"Preview failed: {e}")
            raise
        finally:
            await engine.dispose()


async def run_apply(filter_data: dict, params_data: dict, margin_override: float | None, batch_size: int):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as db:
        try:
            # Create a job (need a user - use admin ID 1)
            job = PriceUpdateJob(
                name=f"CLI job {asyncio.get_event_loop().time()}",
                filter_criteria=filter_data,
                params=params_data,
                margin_override=margin_override,
                status="pending",
                created_by=1,
            )
            db.add(job)
            await db.flush()
            await db.refresh(job)
            job_id = job.id

            logger.info(f"Created job #{job_id}, executing...")
            result = await apply_price_update(db, job_id, batch_size)
            print(f"\nJob #{job_id} completed:")
            print(f"  Status: {result.status}")
            print(f"  Processed: {result.processed_count}")
            print(f"  Failed: {result.failed_count}")
            if result.errors:
                print(f"  Errors: {json.dumps(result.errors[:5], indent=2)}")
        except Exception as e:
            logger.error(f"Apply failed: {e}")
            raise
        finally:
            await engine.dispose()


async def run_rollback(job_id: int, reason: str | None):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as db:
        try:
            result = await rollback_price_update(db, job_id, 1, reason)
            print(f"\nRollback completed:")
            print(f"  Rollback job ID: {result.id}")
            print(f"  Status: {result.status}")
            print(f"  Restored: {result.processed_count}")
            print(f"  Failed: {result.failed_count}")
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            raise
        finally:
            await engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Price Update Job CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scripts.price_update_job --preview --filter '{}' --params '{"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.15, "impuestos_pct": 0.16}'
  python -m scripts.price_update_job --apply --filter '{"department_id": 1}' --params '{"precio_acero_mxn_per_kg": 25.0}' --batch-size 50
  python -m scripts.price_update_job --rollback --job-id 5
        """,
    )

    mutex = parser.add_mutually_exclusive_group(required=True)
    mutex.add_argument("--preview", action="store_true", help="Preview price changes without modifying DB")
    mutex.add_argument("--apply", action="store_true", help="Apply price changes (creates and runs a job)")
    mutex.add_argument("--dry-run", action="store_true", help="Dry run: preview with extra logging, no DB changes")
    mutex.add_argument("--rollback", action="store_true", help="Rollback a previous job")

    parser.add_argument("--filter", type=parse_json, default="{}", help='JSON filter criteria (e.g. \'{"department_id": 1}\')')
    parser.add_argument("--params", type=parse_json, required=True, help='JSON params (e.g. \'{"precio_acero_mxn_per_kg": 25.0}\')')
    parser.add_argument("--margin-override", type=float, help="Override margin for all products")
    parser.add_argument("--job-id", type=int, help="Job ID for rollback")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size for processing")
    parser.add_argument("--reason", type=str, default=None, help="Reason for rollback")

    args = parser.parse_args()

    if args.dry_run:
        logger.info("DRY RUN MODE: no changes will be made to the database")
        args.preview = True

    if args.preview or args.dry_run:
        asyncio.run(run_preview(args.filter, args.params, args.margin_override))
    elif args.apply:
        asyncio.run(run_apply(args.filter, args.params, args.margin_override, args.batch_size))
    elif args.rollback:
        if not args.job_id:
            parser.error("--job-id is required for --rollback")
        asyncio.run(run_rollback(args.job_id, args.reason))


if __name__ == "__main__":
    main()
