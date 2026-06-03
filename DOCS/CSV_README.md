# CSV Product Import - FerreCRM

## Overview

Products can be imported from CSV files using the CLI script `scripts/import_products_from_csv.py`. The script supports:

- Automatic encoding detection
- Column name normalization (handles variants like "CODIGO", "SKU", "NOMBRE", etc.)
- Upsert (update existing products by SKU)
- Dry-run mode for preview
- Failed rows report generation

## Reference CSV: `BASE_PRODUCTOS.csv`

The original product catalog (`1878 rows`) is expected at the project root as `BASE_PRODUCTOS.csv`. This file contains the complete hardware store inventory.

### Columns

| Column | Required | Description |
|--------|----------|-------------|
| `CLAVE` | Yes | Product SKU (unique) |
| `DESCRIPCION` | Yes | Product name/description |
| `CLAVE ALTERNA` | No | Alternate SKU |
| `SERVICIO (S/N)` | No | Is a service? (true/false) |
| `INV_MIN` | No | Minimum inventory |
| `INV_MAX` | No | Maximum inventory |
| `PRECIO COMPRA` | No | Cost price (MXN) |
| `PRECIO 1` | No | Selling price 1 (MXN) |
| `PRECIO 2` | No | Selling price 2 (mayoreo) |
| `MAYOREO 2` | No | Min qty for price 2 |
| `PRECIO 3` | No | Selling price 3 |
| `MAYOREO 3` | No | Min qty for price 3 |
| `PRECIO 4` | No | Selling price 4 |
| `MAYOREO 4` | No | Min qty for price 4 |
| `EXIST.` | No | Current stock |
| `PESO` | No | Weight in kg |
| `CARACTERISTICAS` | No | Product characteristics |
| `DEPARTAMENTO` | No | Department name |
| `CATEGORIA` | No | Category name |
| `RECETA (S/N)` | No | Recipe required? |
| `GRANEL (S/N)` | No | Bulk product? |
| `IMPUESTO (S/N)` | No | Taxable? |

## Synthetic Fallback: `seed_products.csv`

If `BASE_PRODUCTOS.csv` is not available, a **synthetic dataset** with **20 representative products** is provided at `backend/data/seed_products.csv`. This covers:

- **ACEROS** (Refuerzo, Lamina, Tuberia) — 13 products
- **VENTAS** (Perfiles) — 5 products
- **SOLDADURA** (Electrodos) — 2 products

Each product includes realistic `costo_mxn`, `precio_venta_mxn`, `peso_kg`, `stock` values and `margin` defaults.

## Usage

### Basic import

```bash
python -m scripts.import_products_from_csv path/to/BASE_PRODUCTOS.csv
```

### Import with upsert

```bash
python -m scripts.import_products_from_csv path/to/BASE_PRODUCTOS.csv --update-on-duplicate
```

### Dry run (no DB changes)

```bash
python -m scripts.import_products_from_csv path/to/BASE_PRODUCTOS.csv --dry-run
```

### Specify encoding

```bash
python -m scripts.import_products_from_csv path/to/BASE_PRODUCTOS.csv --encoding latin-1
```

### Seed fallback

If the main CSV is missing, the seed script (`python -m scripts.seed`) will:

1. Try loading `BASE_PRODUCTOS.csv`
2. If not found, attempt `backend/data/seed_products.csv`
3. If neither found, log a warning and skip product seeding

## Auto-detection

The import script uses `chardet` to detect file encoding automatically. If `chardet` is not installed, it tries common encodings: `utf-8-sig`, `utf-8`, `latin-1`, `cp1252`.

## Error Handling

- Rows with missing SKU or name are skipped and logged
- Invalid numeric values default to 0 (with warning)
- A `failed_rows.csv` report is generated in the same directory as the input file
- Departments and categories are auto-created if they don't exist

## Best Practices

1. Always run with `--dry-run` first to preview changes
2. Back up the database before bulk imports
3. Use `--update-on-duplicate` only when you intend to refresh existing products
4. Verify the failed rows report after import
