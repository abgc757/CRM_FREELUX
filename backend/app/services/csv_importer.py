"""
CSV/Excel importer for product catalog.
Maps SICAR column format to FreeLux product model.

SICAR columns:
CLAVE, CLAVE ALTERNA, DESCRIPCION, SERVICIO (S/N), INV_MIN, INV_MAX,
PRECIO COMPRA, PRECIO 1, PRECIO 2, MAYOREO 2, PRECIO 3, MAYOREO 3,
PRECIO 4, MAYOREO 4, EXIST., PESO, CARACTERISTICAS, DEPARTAMENTO,
CATEGORIA, RECETA (S/N), GRANEL (S/N), IMPUESTO (S/N)
"""
import io
from decimal import Decimal, InvalidOperation
from typing import List, Tuple
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product, ProductPrice, ClientType


CLIENT_TYPE_MAP = [
    ClientType.publico_general,
    ClientType.contratista,
    ClientType.constructora,
    ClientType.mayorista,
]

PRICE_COLS = ["PRECIO 1", "PRECIO 2", "PRECIO 3", "PRECIO 4"]
VOL_COLS = ["", "MAYOREO 2", "MAYOREO 3", "MAYOREO 4"]


def _dec(val) -> Decimal:
    try:
        return Decimal(str(val)).quantize(Decimal("0.0001"))
    except (InvalidOperation, TypeError):
        return Decimal("0")


def _bool_col(val) -> bool:
    if isinstance(val, bool):
        return val
    return str(val).strip().upper() in ("S", "SI", "TRUE", "1", "Y", "YES")


def parse_file(content: bytes, filename: str) -> pd.DataFrame:
    if filename.lower().endswith(".csv"):
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=enc, dtype=str)
                return df
            except Exception:
                continue
    else:
        return pd.read_excel(io.BytesIO(content), dtype=str)
    raise ValueError("No se pudo leer el archivo")


async def import_products(
    db: AsyncSession,
    content: bytes,
    filename: str,
    user_id: int,
) -> dict:
    df = parse_file(content, filename)
    df.columns = [c.strip().upper() for c in df.columns]

    created = 0
    updated = 0
    errors: List[str] = []

    for idx, row in df.iterrows():
        clave = str(row.get("CLAVE", "")).strip()
        if not clave:
            errors.append(f"Fila {idx+2}: CLAVE vacía, omitida")
            continue

        descripcion = str(row.get("DESCRIPCION", "")).strip()
        if not descripcion:
            errors.append(f"Fila {idx+2}: DESCRIPCION vacía para clave {clave}")
            continue

        # Check if product exists
        result = await db.execute(select(Product).where(Product.clave == clave))
        product = result.scalar_one_or_none()
        is_new = product is None

        if is_new:
            product = Product(clave=clave)

        product.clave_alterna = str(row.get("CLAVE ALTERNA", "") or "").strip() or None
        product.descripcion = descripcion
        product.departamento = str(row.get("DEPARTAMENTO", "") or "").strip() or None
        product.categoria = str(row.get("CATEGORIA", "") or "").strip() or None
        product.caracteristicas = str(row.get("CARACTERISTICAS", "") or "").strip() or None
        product.precio_compra = _dec(row.get("PRECIO COMPRA", 0))
        product.peso_kg = _dec(row.get("PESO", 0))
        product.stock_actual = _dec(row.get("EXIST.", 0))
        product.stock_min = _dec(row.get("INV_MIN", 0))
        product.stock_max = _dec(row.get("INV_MAX", 0))
        product.is_service = _bool_col(row.get("SERVICIO (S/N)", False))
        product.granel = _bool_col(row.get("GRANEL (S/N)", False))
        product.tiene_impuesto = _bool_col(row.get("IMPUESTO (S/N)", True))

        if is_new:
            db.add(product)
            await db.flush()  # get product.id

        # Upsert prices
        for i, client_type in enumerate(CLIENT_TYPE_MAP):
            col = PRICE_COLS[i]
            vol_col = VOL_COLS[i]
            precio = _dec(row.get(col, 0))
            volumen = _dec(row.get(vol_col, 0)) if vol_col else Decimal("0")

            result = await db.execute(
                select(ProductPrice).where(
                    ProductPrice.product_id == product.id,
                    ProductPrice.client_type == client_type,
                )
            )
            pp = result.scalar_one_or_none()
            if pp is None:
                pp = ProductPrice(product_id=product.id, client_type=client_type)
                db.add(pp)
            pp.precio = precio
            pp.volumen_minimo = volumen

        if is_new:
            created += 1
        else:
            updated += 1

    await db.commit()
    return {"created": created, "updated": updated, "errors": errors, "total_rows": len(df)}
