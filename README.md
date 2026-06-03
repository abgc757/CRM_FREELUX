# FerreCRM 🛠️

CRM para ferretería que integra **Ventas, Compras y Almacén** en un sistema web responsive, minimalista e intuitivo.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Base de datos | PostgreSQL 16 |
| Cache / Queue | Redis 7 + Celery |
| Auth | JWT + bcrypt + RBAC |
| Testing | pytest + Playwright + Vitest |
| Infra | Docker + docker-compose + Kubernetes |

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone <repo-url> ferrecrm
cd ferrecrm

# 2. Copiar variables de entorno
cp backend/.env.example backend/.env

# 3. Levantar todo con Docker
docker-compose -f infra/docker-compose.yml up --build -d

# 4. Poblar la base de datos (usuarios, productos desde CSV)
docker exec -it ferrecrm-backend-1 python -m scripts.seed
```

El sistema estará disponible en:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Documentación Swagger**: http://localhost:8000/docs
- **Métricas**: http://localhost:8000/metrics

## Usuarios por defecto

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@ferrecrm.com | admin123 |
| Gerencia | gerencia@ferrecrm.com | gerencia123 |
| Ventas | ventas@ferrecrm.com | ventas123 |
| Compras | compras@ferrecrm.com | compras123 |
| Almacén | almacen@ferrecrm.com | almacen123 |

## Estructura del proyecto

```
ferrecrm/
├── backend/                # API FastAPI
│   ├── app/
│   │   ├── api/v1/        # Endpoints REST
│   │   ├── core/          # Config, seguridad, dependencias
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Lógica de negocio
│   │   └── tasks/         # Tareas Celery (async)
│   ├── migrations/        # Alembic
│   ├── scripts/           # Seed, ETL
│   ├── tests/
│   └── Dockerfile
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas
│   │   ├── services/      # Clientes API
│   │   ├── hooks/         # Custom hooks
│   │   └── types/         # TypeScript types
│   └── Dockerfile
├── infra/                  # Docker, K8s, Nginx
│   ├── docker-compose.yml
│   ├── k8s/               # Manifiestos Kubernetes
│   └── nginx/
├── docs/                   # Documentación
│   ├── api/               # OpenAPI, Postman
│   ├── ui/                # Mockups
│   ├── architecture.md
│   └── roadmap.md
├── .github/workflows/     # CI pipeline
└── BASE_PRODUCTOS.csv     # Catálogo inicial (1878 productos)
```

## API endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|------------|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/register` | Registrar usuario |
| GET | `/api/v1/clients` | Listar clientes (ventas ve solo los suyos) |
| POST | `/api/v1/clients` | Crear cliente |
| GET | `/api/v1/products` | Listar productos con búsqueda |
| GET | `/api/v1/products/{sku}/stock` | Consultar stock |
| POST | `/api/v1/quotes` | Crear cotización |
| POST | `/api/v1/quotes/{id}/convert` | Convertir cotización a venta |
| POST | `/api/v1/quotes/{id}/approve-price` | Aprobar precio (gerencia) |
| POST | `/api/v1/purchases` | Crear orden de compra |
| POST | `/api/v1/purchases/{id}/receive` | Recibir compra (+ stock) |
| POST | `/api/v1/purchases/availability` | Solicitar disponibilidad |
| POST | `/api/v1/inventory/movement` | Registrar entrada/salida |
| GET | `/api/v1/inventory/movements` | Historial de movimientos |
| GET | `/api/v1/suppliers/search` | Búsqueda inteligente proveedores |
| **POST** | **`/api/v1/price-management/preview`** | **Simular actualización masiva de precios** |
| **POST** | **`/api/v1/price-management/apply`** | **Aplicar actualización masiva (job async)** |
| **POST** | **`/api/v1/price-management/rollback`** | **Revertir actualización de precios** |
| **GET** | **`/api/v1/price-management/jobs/{id}`** | **Estado de un job de precios** |
| **PATCH** | **`/api/v1/price-management/products/{sku}/margin`** | **Modificar margen por SKU** |
| **PATCH** | **`/api/v1/price-management/products/bulk-margin`** | **Modificar margen masivo** |
| **GET** | **`/api/v1/price-management/products/{sku}/price-history`** | **Historial de precios** |
| **POST** | **`/api/v1/ml/price-suggestion`** | **Sugerencia de precio (stub ML)** |
| **GET** | **`/api/v1/ml/export/dataset`** | **Exportar dataset para entrenamiento** |

Ver documentación completa en `docs/api/openapi.yaml` y `docs/PRICE_MANAGEMENT.md`.

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| **admin** | Todo el sistema + price_management |
| **gerencia** | Todo + aprobar precios + price_management |
| **ventas** | Clientes propios, cotizaciones, ventas (costo oculto) |
| **compras** | Proveedores, órdenes de compra, ver costos |
| **almacén** | Inventario, movimientos |

## Price Management (Gerencia)

Actualización masiva de precios basada en peso del acero:

```bash
# Preview (simulación sin cambios)
python -m scripts.price_update_job --preview \
  --filter '{"department_id": 1}' \
  --params '{"precio_acero_mxn_per_kg": 25.0, "factor_logistico": 1.15, "impuestos_pct": 0.16}'

# Aplicar cambios
python -m scripts.price_update_job --apply \
  --filter '{"sku_prefix": "TUB"}' \
  --params '{"precio_acero_mxn_per_kg": 25.0}' \
  --batch-size 50

# Rollback
python -m scripts.price_update_job --rollback --job-id 5 --reason "Precio incorrecto"
```

Ver `docs/PRICE_MANAGEMENT.md` para especificación completa.

## CSV Import

Importar productos desde CSV con detección automática de encoding:

```bash
python -m scripts.import_products_from_csv BASE_PRODUCTOS.csv --update-on-duplicate
python -m scripts.import_products_from_csv data/seed_products.csv --dry-run
```

Ver `docs/CSV_README.md` para detalles.

## Desarrollo

```bash
# Backend (sin Docker)
cd backend
python -m venv venv
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (sin Docker)
cd frontend
npm install
npm run dev

# Tests backend
cd backend
python -m pytest tests/ -v

# Tests específicos de price management
python -m pytest tests/unit/test_price_calc.py -v
python -m pytest tests/integration/test_price_job.py -v
python -m pytest tests/e2e/test_price_flow.py -v

# Frontend tests
cd frontend
npm test
```

## Integración ML

El proyecto expone endpoints para modelos de ML/IA:
- **Price suggestion**: `POST /api/v1/ml/price-suggestion` (stub)
- **Dataset export**: `GET /api/v1/ml/export/dataset?model_type=price_history`
- **Feature store**: datos exportables desde `price_history` y `price_update_jobs.params`
- **Pipeline ETL**: scripts en `backend/scripts/`, DAGs Airflow

## Roadmap

Ver [`docs/roadmap.md`](docs/roadmap.md) para el plan de 8 semanas con entregables detallados.

## Licencia

Proyecto interno - FerreCRM
