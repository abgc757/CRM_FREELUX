# Price Management - FerreCRM

## Overview

The Price Management module allows Gerencia/Admin users to perform **massive price updates** based on the **steel weight formula** and manage per-product margins. All changes are tracked in `price_history` and executed asynchronously via Celery jobs for reliable batch processing.

## Role-Based Access

| Role | Permissions |
|------|------------|
| **admin** | All price management features |
| **gerencia** | Full price management: preview, apply, rollback, margin edit |
| **ventas** | Read-only price visibility (costo hidden) |
| **compras** | Can view cost and price history |
| **almacen** | No price access |

> **Security**: The `price_management` permission flag is checked on every endpoint. Cost data (`costo_mxn`) is filtered out for Ventas users at the API level.

## Price Formula

```
c_prime = costo_mxn + (peso_kg × precio_acero_mxn_per_kg)
c_double = c_prime × factor_logistico × (1 + impuestos_pct)
new_price = round(c_double × (1 + margin), 2)
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `precio_acero_mxn_per_kg` | float | **required** | Current steel price in MXN per kg |
| `factor_logistico` | float | 1.0 | Logistics multiplier (≥ 1.0) |
| `impuestos_pct` | float | 0.0 | Tax rate as decimal (e.g., 0.16 for 16%) |
| `margin_override` | float | null | Override all product margins (0.0 to 1.0) |

### Default Margin

Each product has a `margin` field (default **0.20 = 20%**). Gerencia can change margins:
- Globally (by updating default in seed/UI)
- Per family/brand via bulk-margin endpoint
- Per SKU via single-product margin endpoint

## API Endpoints

### `POST /api/v1/price-management/preview`

Simulate price changes **without modifying the database**.

```json
{
  "filter_criteria": {
    "department_id": 1,
    "is_active": true
  },
  "params": {
    "precio_acero_mxn_per_kg": 25.0,
    "factor_logistico": 1.15,
    "impuestos_pct": 0.16
  },
  "margin_override": 0.20
}
```

### `POST /api/v1/price-management/apply`

Create and enqueue a price update job (async).

```json
{
  "name": "Q2 2026 Steel Price Update",
  "filter": {
    "is_active": true,
    "sku_prefix": "TUB"
  },
  "params": {
    "precio_acero_mxn_per_kg": 28.5,
    "factor_logistico": 1.12,
    "impuestos_pct": 0.16
  },
  "margin_override": 0.22,
  "batch_size": 100,
  "create_purchase_order_for_missing": false
}
```

Response: `202 Accepted` with `{"job_id": 42, "status": "pending"}`

### `POST /api/v1/price-management/rollback`

Rollback a previously completed job.

```json
{
  "job_id": 42,
  "reason": "Steel price changed before implementation"
}
```

### `GET /api/v1/price-management/jobs/{id}`

Check job status and results.

### `PATCH /api/v1/price-management/products/{sku}/margin`

Update a single product's margin.

```json
{
  "margin": 0.25,
  "reason": "Strategic pricing for high-volume item"
}
```

### `PATCH /api/v1/price-management/products/bulk-margin`

Update margins for multiple products at once.

```json
{
  "skus": ["TUB-1", "TUB-2", "VAR-1"],
  "margin": 0.30,
  "reason": "Bulk adjustment for steel line"
}
```

## Filter Criteria

| Field | Type | Description |
|-------|------|-------------|
| `department_id` | int | Filter by department |
| `category_id` | int | Filter by category |
| `sku_prefix` | string | SKU prefix (e.g., "TUB" for all tubes) |
| `sku_list` | [string] | List of specific SKUs |
| `peso_min` | float | Minimum weight in kg |
| `peso_max` | float | Maximum weight in kg |
| `precio_min` | float | Minimum current price |
| `precio_max` | float | Maximum current price |
| `is_active` | bool | Active products only (default: true) |

## CLI Usage

```bash
# Preview changes
python -m scripts.price_update_job --preview \
  --filter '{"department_id": 1}' \
  --params '{"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.15, "impuestos_pct": 0.16}'

# Preview with margin override
python -m scripts.price_update_job --preview \
  --filter '{"is_active": true}' \
  --params '{"precio_acero_mxn_per_kg": 25.0}' \
  --margin-override 0.25

# Apply (creates and runs job synchronously)
python -m scripts.price_update_job --apply \
  --filter '{"sku_prefix": "TUB"}' \
  --params '{"precio_acero_mxn_per_kg": 25.0}' \
  --batch-size 50

# Rollback a job
python -m scripts.price_update_job --rollback --job-id 5 --reason "Price error"

# Dry run (same as preview with extra logging)
python -m scripts.price_update_job --dry-run \
  --filter '{}' \
  --params '{"precio_acero_mxn_per_kg": 25.0}'
```

## Rollback Procedure

1. Call `POST /api/v1/price-management/rollback` with the job ID
2. System creates a new rollback job that reads `price_history` entries
3. Each product is restored to its `old_price` and `old_margin` using optimistic locking
4. New `price_history` entries are created for the rollback (audit trail)
5. The original job gets linked to the rollback via `rollback_job_id`

### Manual fallback

If the async rollback fails, you can restore from the daily DB snapshot:

```bash
pg_dump -U ferrecrm ferrecrm --table=products --data-only > /backup/products_$(date +%Y%m%d).sql
psql -U ferrecrm ferrecrm < /backup/products_20260602.sql
```

> **Before applying any price update in production**, take a snapshot of the `products` table:
> ```sql
> CREATE TABLE products_snapshot_20260602 AS SELECT * FROM products;
> ```

## Price History

Every price change (manual or batch) is recorded in `price_history`:

| Column | Description |
|--------|-------------|
| `old_price` | Previous selling price |
| `new_price` | New selling price |
| `old_margin` | Previous margin |
| `new_margin` | New margin |
| `params` | JSONB: job parameters used for calculation |
| `changed_by` | User ID who made the change |
| `job_id` | Link to the PriceUpdateJob |
| `reason` | Human-readable reason |

Query price history for a product:

```sql
SELECT * FROM price_history
WHERE product_id = (SELECT id FROM products WHERE sku = 'TUB-1')
ORDER BY created_at DESC
LIMIT 20;
```

## Optimistic Locking

Products use a `version` integer for optimistic concurrency control. Before updating:

```sql
UPDATE products
SET precio_venta_mxn = :new_price, version = version + 1
WHERE id = :product_id AND version = :expected_version;
```

If another process modified the product concurrently, the update affects 0 rows and the job logs the conflict in `price_update_jobs.errors`.

## ML Integration

The `params` column in `price_update_jobs` stores all parameters used. This data feeds future ML models:

- **Price suggestion**: `POST /api/v1/ml/price-suggestion` (stub)
- **Demand forecasting**: Feature engineering from `params + price_history`
- **Optimal margin prediction**: Train on historical price changes and sales impact

Export training data:

```bash
python -m scripts.ml_export --model-type price_history --output /data/ml/training/
```

### Dataset export endpoints

- `GET /api/v1/ml/export/dataset?model_type=price_history` — Price change history
- `GET /api/v1/ml/export/dataset?model_type=sales` — Sales with product features
- `GET /api/v1/ml/export/dataset?model_type=stock` — Inventory movements
- `GET /api/v1/ml/export/dataset?model_type=suppliers` — Supplier performance

## Recommended Backup Strategy

1. **Before each price update**: `pg_dump --table=products --data-only`
2. **Daily**: Full database backup
3. **After each job**: Verify job status and spot-check 5-10 products
4. **Rollback plan**: Keep 30 days of `price_history` for manual recovery

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Job stuck in "running" state | Check Celery worker logs; restart worker if needed |
| Optimistic lock conflicts | Re-run the job; conflicts are retried automatically |
| Price below cost error | Check parameters: `precio_acero_mxn_per_kg` too low or `factor_logistico` too low |
| "Insufficient permissions" | User needs `gerencia` or `admin` role with `price_management` permission |
