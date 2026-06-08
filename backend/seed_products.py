"""
Seed products from BASE_PRODUCTOS.csv into the database.
Usage:
    python seed_products.py [path_to_csv]

Default CSV path: D:/docs_freelux/BASE_PRODUCTOS.csv
"""
import asyncio
import csv
import sys
from pathlib import Path

CSV_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("D:/docs_freelux/BASE_PRODUCTOS.csv")
FALLBACK_PATH = Path("../docs/BASE_PRODUCTOS.csv")


def _parse_float(val: str) -> float:
    if not val or val.strip() == "":
        return 0.0
    try:
        return float(val.replace(",", "").strip())
    except ValueError:
        return 0.0


def _parse_int(val: str) -> int:
    try:
        return int(float(val.replace(",", "").strip()))
    except (ValueError, AttributeError):
        return 0


def _parse_bool(val: str) -> bool:
    return val.strip().upper() == "S"


def _read_csv(path: Path) -> list[dict]:
    for enc in ("utf-8-sig", "latin-1", "cp1252"):
        try:
            rows = []
            with open(path, encoding=enc, newline="") as f:
                for row in csv.DictReader(f):
                    rows.append(row)
            return rows
        except UnicodeDecodeError:
            continue
    raise ValueError(f"No se pudo leer {path} con ninguna codificación conocida")


async def seed(csv_path: Path):
    import os
    os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://freelux:freelux@localhost:5432/freelux_crm")

    from app.database import AsyncSessionLocal
    from app.models.product import Product
    from sqlalchemy import select

    rows = _read_csv(csv_path)
    print(f"Found {len(rows)} rows in {csv_path}")

    async with AsyncSessionLocal() as db:
        created = 0
        updated = 0
        for row in rows:
            sku = row.get("CLAVE", "").strip()
            if not sku:
                continue

            result = await db.execute(select(Product).where(Product.sku == sku))
            product = result.scalar_one_or_none()

            nombre = row.get("DESCRIPCION", "").strip() or sku
            costo = _parse_float(row.get("PRECIO COMPRA", "0"))
            precio_1 = _parse_float(row.get("PRECIO 1", "0"))
            precio_2 = _parse_float(row.get("PRECIO 2", "0")) or None
            precio_3 = _parse_float(row.get("PRECIO 3", "0")) or None
            precio_4 = _parse_float(row.get("PRECIO 4", "0")) or None
            mayoreo_2 = _parse_int(row.get("MAYOREO 2", "0")) or None
            mayoreo_3 = _parse_int(row.get("MAYOREO 3", "0")) or None
            mayoreo_4 = _parse_int(row.get("MAYOREO 4", "0")) or None
            existencia = _parse_float(row.get("EXIST.", "0"))
            inv_min = _parse_float(row.get("INV_MIN", "0")) or None
            inv_max = _parse_float(row.get("INV_MAX", "0")) or None
            peso_kg = _parse_float(row.get("PESO", "0"))
            tiene_impuesto = _parse_bool(row.get("IMPUESTO", "S"))
            departamento = row.get("DEPARTAMENTO", "").strip() or None
            categoria = row.get("CATEGORIA", "").strip() or None
            caracteristicas = row.get("CARACTERISTICAS", "").strip() or None

            if product is None:
                product = Product(
                    sku=sku,
                    nombre=nombre,
                    departamento=departamento,
                    categoria=categoria,
                    peso_kg=peso_kg,
                    costo=costo,
                    precio_1=precio_1,
                    precio_2=precio_2,
                    precio_3=precio_3,
                    precio_4=precio_4,
                    mayoreo_2=mayoreo_2,
                    mayoreo_3=mayoreo_3,
                    mayoreo_4=mayoreo_4,
                    tiene_impuesto=tiene_impuesto,
                    existencia=existencia,
                    inv_min=inv_min,
                    inv_max=inv_max,
                    caracteristicas=caracteristicas,
                )
                db.add(product)
                created += 1
            else:
                product.nombre = nombre
                product.costo = costo
                product.precio_1 = precio_1
                product.precio_2 = precio_2
                product.precio_3 = precio_3
                product.precio_4 = precio_4
                product.existencia = existencia
                product.inv_min = inv_min
                product.inv_max = inv_max
                product.departamento = departamento
                product.categoria = categoria
                product.tiene_impuesto = tiene_impuesto
                updated += 1

        await db.commit()
        print(f"Done. Created: {created}, Updated: {updated}")


if __name__ == "__main__":
    path = CSV_PATH if CSV_PATH.exists() else FALLBACK_PATH
    if not path.exists():
        print(f"CSV not found at {CSV_PATH} or {FALLBACK_PATH}")
        sys.exit(1)
    asyncio.run(seed(path))
