"""
Robust CSV product importer. Reads any CSV with the FerreCRM format and upserts into DB.

Usage:
    python -m scripts.import_products_from_csv path/to/products.csv
    python -m scripts.import_products_from_csv path/to/products.csv --update-on-duplicate --encoding utf-8-sig
    python -m scripts.import_products_from_csv --dry-run path/to/products.csv
"""

import asyncio
import csv
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("csv_importer")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.database import Base
from app.models import Product, Department, Category


# Expected columns for validation
REQUIRED_COLUMNS = ["CLAVE", "DESCRIPCION"]
OPTIONAL_COLUMNS = [
    "CLAVE ALTERNA", "SERVICIO (S/N)", "INV_MIN", "INV_MAX",
    "PRECIO COMPRA", "PRECIO 1", "PRECIO 2", "MAYOREO 2",
    "PRECIO 3", "MAYOREO 3", "PRECIO 4", "MAYOREO 4",
    "EXIST.", "PESO", "CARACTERISTICAS", "DEPARTAMENTO",
    "CATEGORIA", "RECETA (S/N)", "GRANEL (S/N)", "IMPUESTO (S/N)",
]

# Fallback column name variants (some CSVs use different headers)
COLUMN_ALIASES = {
    "CODIGO": "CLAVE",
    "COD": "CLAVE",
    "SKU": "CLAVE",
    "NOMBRE": "DESCRIPCION",
    "PRODUCTO": "DESCRIPCION",
    "PRECIO_COMPRA": "PRECIO COMPRA",
    "PRECIO_VENTA": "PRECIO 1",
    "EXISTENCIA": "EXIST.",
    "EXISTENCIAS": "EXIST.",
    "STOCK": "EXIST.",
    "DEPARTAMENTO": "DEPARTAMENTO",
    "CATEGORIA": "CATEGORIA",
    "FAMILIA": "DEPARTAMENTO",
    "PESO_KG": "PESO",
}


def detect_encoding(file_path: Path) -> str:
    """Detect file encoding, trying common ones."""
    import chardet
    try:
        raw = file_path.read_bytes()
        result = chardet.detect(raw)
        return result.get("encoding", "utf-8-sig") or "utf-8-sig"
    except ImportError:
        # chardet not installed, try common encodings
        for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                file_path.read_text(encoding=enc)
                return enc
            except (UnicodeDecodeError, UnicodeError):
                continue
        return "utf-8-sig"


def normalize_columns(headers: List[str]) -> Dict[str, str]:
    """Map CSV header names to canonical column names."""
    mapping = {}
    for h in headers:
        h_stripped = h.strip().upper()
        if h_stripped in {k.upper() for k in REQUIRED_COLUMNS + OPTIONAL_COLUMNS}:
            # Direct match (case-insensitive)
            for canon in REQUIRED_COLUMNS + OPTIONAL_COLUMNS:
                if h_stripped == canon.upper():
                    mapping[h] = canon
                    break
        elif h_stripped in COLUMN_ALIASES:
            mapping[h] = COLUMN_ALIASES[h_stripped]
        else:
            mapping[h] = h.strip()
    return mapping


def safe_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value.replace(",", "").strip()) if value.strip() else default
    except (ValueError, AttributeError):
        return default


def safe_int(value: str, default: int = 0) -> int:
    try:
        return int(float(value.replace(",", "").strip())) if value.strip() else default
    except (ValueError, AttributeError):
        return default


def safe_bool(value: str, default: bool = False) -> bool:
    val = value.strip().lower() if value else ""
    return val in ("true", "yes", "1", "s", "si", "sí")


async def import_csv(
    file_path: Path,
    update_on_duplicate: bool = False,
    encoding: Optional[str] = None,
    dry_run: bool = False,
) -> Tuple[int, int, List[Dict]]:
    """Import products from CSV file. Returns (created, updated, errors)."""
    if encoding is None:
        encoding = detect_encoding(file_path)
    logger.info(f"Detected encoding: {encoding}")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    created = 0
    updated = 0
    errors = []

    async with session_factory() as session:
        # Load existing departments and products for caching
        dept_cache = {}
        cat_cache = {}
        existing_skus = set()

        if update_on_duplicate:
            from sqlalchemy import select
            result = await session.execute(select(Product.sku))
            existing_skus = {row[0] for row in result.all()}

        with open(file_path, encoding=encoding) as f:
            sample = f.read(4096)
            f.seek(0)
            has_bom = sample.startswith("\ufeff")
            dialect = csv.Sniffer().sniff(sample)
            reader = csv.DictReader(f, dialect=dialect)
            col_mapping = normalize_columns(reader.fieldnames or [])

            missing = [c for c in REQUIRED_COLUMNS if c not in col_mapping.values()]
            if missing:
                logger.warning(f"Missing required columns: {missing}. Attempting to continue...")

            row_count = 0
            for row in reader:
                row_count += 1
                try:
                    # Map columns
                    mapped = {}
                    for orig, canon in col_mapping.items():
                        mapped[canon] = row.get(orig, "")

                    sku = mapped.get("CLAVE", "").strip()
                    nombre = mapped.get("DESCRIPCION", "").strip()
                    if not sku or not nombre:
                        errors.append({"row": row_count + 1, "error": "Missing SKU or name"})
                        continue

                    # Get or create department
                    dept_name = mapped.get("DEPARTAMENTO", "General").strip()
                    if dept_name not in dept_cache:
                        if dry_run:
                            dept_cache[dept_name] = None
                        else:
                            from sqlalchemy import select
                            result = await session.execute(
                                select(Department).where(Department.name == dept_name)
                            )
                            dept = result.scalar_one_or_none()
                            if not dept:
                                dept = Department(name=dept_name)
                                session.add(dept)
                                await session.flush()
                            dept_cache[dept_name] = dept

                    # Get or create category
                    cat_name = mapped.get("CATEGORIA", "").strip()
                    cat_key = f"{dept_name}:{cat_name}" if cat_name else None
                    if cat_key and cat_key not in cat_cache:
                        if dry_run:
                            cat_cache[cat_key] = None
                        else:
                            from sqlalchemy import select
                            dept_id = dept_cache[dept_name].id if dept_cache[dept_name] else None
                            if dept_id:
                                result = await session.execute(
                                    select(Category).where(
                                        Category.name == cat_name,
                                        Category.department_id == dept_id,
                                    )
                                )
                                cat = result.scalar_one_or_none()
                                if not cat:
                                    cat = Category(name=cat_name, department_id=dept_id)
                                    session.add(cat)
                                    await session.flush()
                                cat_cache[cat_key] = cat

                    costo = safe_float(mapped.get("PRECIO COMPRA", "0"))
                    precio_venta = safe_float(mapped.get("PRECIO 1", "0"))
                    peso = safe_float(mapped.get("PESO", "0"))

                    product_data = {
                        "sku": sku,
                        "clave_alterna": mapped.get("CLAVE ALTERNA", "").strip(),
                        "nombre": nombre,
                        "servicio": safe_bool(mapped.get("SERVICIO (S/N)", "false")),
                        "department_id": dept_cache[dept_name].id if dept_cache.get(dept_name) else None,
                        "category_id": cat_cache[cat_key].id if cat_key and cat_cache.get(cat_key) else None,
                        "inv_min": safe_int(mapped.get("INV_MIN", "0")),
                        "inv_max": safe_int(mapped.get("INV_MAX", "0")),
                        "costo": costo,
                        "costo_mxn": costo,
                        "precio_venta": precio_venta,
                        "precio_venta_mxn": precio_venta,
                        "peso": peso,
                        "peso_kg": peso,
                        "stock": safe_float(mapped.get("EXIST.", "0")),
                        "caracteristicas": mapped.get("CARACTERISTICAS", ""),
                        "receta": safe_bool(mapped.get("RECETA (S/N)", "false")),
                        "granel": safe_bool(mapped.get("GRANEL (S/N)", "false")),
                        "impuesto": mapped.get("IMPUESTO (S/N)", "true").strip().lower() not in ("false", "no", "n"),
                    }

                    if dry_run:
                        if sku in existing_skus:
                            logger.info(f"[DRY-RUN] Would update: {sku} - {nombre}")
                            updated += 1
                        else:
                            logger.info(f"[DRY-RUN] Would create: {sku} - {nombre}")
                            created += 1
                    else:
                        if update_on_duplicate and sku in existing_skus:
                            from sqlalchemy import update
                            stmt = (
                                update(Product)
                                .where(Product.sku == sku)
                                .values(**product_data)
                            )
                            await session.execute(stmt)
                            updated += 1
                        else:
                            product = Product(**product_data)
                            session.add(product)
                            created += 1
                            existing_skus.add(sku)

                except Exception as e:
                    errors.append({"row": row_count + 1, "error": str(e)})
                    logger.warning(f"Error at row {row_count + 1}: {e}")

                if row_count % 100 == 0 and not dry_run:
                    await session.flush()

            if not dry_run:
                await session.commit()

        logger.info(f"Import complete: {created} created, {updated} updated, {len(errors)} errors")
        if errors:
            # Write failed rows report
            failed_path = file_path.parent / "failed_rows.csv"
            import json
            with open(failed_path, "w", encoding="utf-8") as f:
                f.write("row,error\n")
                for err in errors:
                    f.write(f"{err['row']},{err['error']}\n")
            logger.info(f"Failed rows written to: {failed_path}")

    await engine.dispose()
    return created, updated, errors


def main():
    parser = argparse.ArgumentParser(
        description="Import products from CSV file into FerreCRM database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("file", type=str, help="Path to the CSV file")
    parser.add_argument("--encoding", type=str, default=None, help="File encoding (auto-detected if not specified)")
    parser.add_argument("--update-on-duplicate", action="store_true", help="Update existing products by SKU")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without modifying DB")
    args = parser.parse_args()

    file_path = Path(args.file)
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        sys.exit(1)

    result = asyncio.run(import_csv(
        file_path=file_path,
        update_on_duplicate=args.update_on_duplicate,
        encoding=args.encoding,
        dry_run=args.dry_run,
    ))
    created, updated, errors = result
    print(f"\nImport results: {created} created, {updated} updated, {len(errors)} errors")


if __name__ == "__main__":
    main()
