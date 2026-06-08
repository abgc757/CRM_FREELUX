# CRM FreeLux

[![CI/CD](https://github.com/abgc757/CRM_FREELUX/actions/workflows/ci.yml/badge.svg)](https://github.com/abgc757/CRM_FREELUX/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-312/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org)

Sistema CRM especializado para **Aceros y Perfiles FreeLux** — gestión de cotizaciones, ventas, inventario y compras con integración WhatsApp, generación de PDF y hooks de Machine Learning.

```
┌─────────────┐    ┌───────────────┐    ┌──────────────────────────────┐
│  Next.js 14  │───▶│  FastAPI      │───▶│  PostgreSQL · Redis · ES     │
│  (Frontend)  │    │  (Backend)    │    │  Celery · Flower             │
└─────────────┘    └───────────────┘    └──────────────────────────────┘
        │                  │                          │
        │          PDF, WhatsApp              Prometheus + Grafana
        ▼                  ▼
   Puerto 3000        Puerto 8000
```

---

## Stack Tecnológico

![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=flat&logo=elasticsearch&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37814A?style=flat&logo=celery&logoColor=white)

| Capa | Tecnología |
|------|-----------|
| API | FastAPI 0.111+ · Python 3.12 · Pydantic v2 |
| ORM | SQLAlchemy 2.0 async · Alembic · asyncpg |
| Base de datos | PostgreSQL 16 |
| Cache / Broker | Redis 7 |
| Workers | Celery 5.3 · Flower |
| Búsqueda | Elasticsearch 8.15 |
| Frontend | Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui |
| PDF | ReportLab 4.x |
| WhatsApp | Twilio API |
| Monitoreo | Prometheus + Grafana |
| CI/CD | GitHub Actions |
| Contenedores | Docker · Docker Compose · Kubernetes (staging) |

---

## Prerrequisitos

- **Docker** 24.0+ con Docker Compose v2
- **Git** 2.40+
- (Opcional) Node.js 20+ para desarrollo frontend local
- (Opcional) Python 3.12+ para desarrollo backend local

---

## Quickstart — Docker Compose

```bash
# 1. Clonar repositorio
git clone https://github.com/abgc757/CRM_FREELUX.git
cd CRM_FREELUX

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env si es necesario (ver sección Variables de Entorno)

# 3. Levantar todos los servicios
docker-compose up --build

# 4. Seed de productos desde CSV (en otra terminal)
docker-compose exec backend python seed_products.py

# 5. Acceder al sistema
#   Frontend:      http://localhost:3000
#   API REST:      http://localhost:8000
#   API Docs:      http://localhost:8000/docs
#   Grafana:       http://localhost:3001   (admin / freelux_grafana_2024)
#   Flower:        http://localhost:5555   (admin / freelux2024)
#   Prometheus:    http://localhost:9090

# 6. Credenciales demo
#   Admin:    admin@freelux.mx   / Admin1234!
#   Vendedor: juan.garcia@freelux.mx / Vendedor1234!
#   Gerente:  gerente@freelux.mx / Gerente1234!
```

### Levantar solo servicios esenciales (sin observabilidad)

```bash
docker-compose up db redis backend frontend celery_worker
```

### Levantar con Kibana (monitoreo Elasticsearch)

```bash
docker-compose --profile monitoring up
```

---

## Desarrollo Local (sin Docker)

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate         # Linux/Mac
.venv\Scripts\activate            # Windows

# Instalar dependencias
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con conexión a PostgreSQL local

# Ejecutar migraciones
alembic upgrade head

# Seed inicial
python seed_products.py

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# (En otra terminal) Iniciar worker Celery
celery -A app.tasks.celery_app worker -l info
```

### Frontend

```bash
cd frontend

npm install

# Configurar variables
cp .env.local.example .env.local

# Servidor de desarrollo
npm run dev
# → http://localhost:3000
```

---

## Variables de Entorno

### `backend/.env`

| Variable | Descripción | Valor por defecto (dev) |
|---|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL async | `postgresql+asyncpg://freelux:freelux_dev_2024@db:5432/freelux_crm` |
| `SECRET_KEY` | Clave JWT (min. 32 chars) | **CAMBIAR EN PRODUCCIÓN** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiración access token | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Expiración refresh token | `7` |
| `REDIS_URL` | URL de Redis | `redis://redis:6379/0` |
| `CELERY_BROKER_URL` | Broker Celery | `redis://redis:6379/1` |
| `CELERY_RESULT_BACKEND` | Backend de resultados | `redis://redis:6379/2` |
| `ELASTICSEARCH_URL` | URL Elasticsearch | `http://elasticsearch:9200` |
| `ENVIRONMENT` | Entorno (`development`/`staging`/`production`) | `development` |
| `LOG_LEVEL` | Nivel de log | `info` |
| `TWILIO_ACCOUNT_SID` | SID cuenta Twilio | — |
| `TWILIO_AUTH_TOKEN` | Token auth Twilio | — |
| `TWILIO_WHATSAPP_FROM` | Número WhatsApp Twilio | `whatsapp:+14155238886` |
| `SENDGRID_API_KEY` | API Key SendGrid (emails) | — |
| `MIN_MARGIN_FACTOR` | Margen mínimo sobre costo | `1.06` (6%) |
| `QUOTE_VALIDITY_DAYS` | Días de vigencia default cotización | `15` |

### `frontend/.env.local`

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend | `http://localhost:8000` |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la app | `CRM FreeLux` |

---

## Estructura del Repositorio

```
CRM_FREELUX/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints FastAPI por módulo
│   │   ├── core/            # Config, security, dependencies
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic schemas (request/response)
│   │   ├── services/        # Lógica de negocio
│   │   └── tasks/           # Tareas Celery
│   ├── alembic/             # Migraciones de base de datos
│   ├── tests/               # Tests pytest
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (páginas)
│   │   ├── components/      # Componentes React reutilizables
│   │   ├── hooks/           # Custom hooks (useAuth, useQuotes, etc.)
│   │   ├── lib/             # Utilidades, cliente API
│   │   └── types/           # TypeScript types
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── infra/
│   ├── docker/nginx/        # Configuración Nginx reverse proxy
│   ├── k8s/                 # Manifiestos Kubernetes
│   ├── prometheus/          # Configuración scraping
│   └── grafana/             # Dashboards y provisioning
│
├── docs/
│   ├── architecture.md      # Arquitectura del sistema
│   ├── roadmap.md           # Plan de desarrollo 8 semanas
│   ├── COTIZACION.md        # Formato de cotización
│   ├── api/
│   │   ├── openapi.yaml     # Spec OpenAPI 3.1
│   │   └── postman_collection.json
│   └── ui/
│       └── mockups.md       # Mockups ASCII de pantallas
│
├── .github/workflows/
│   └── ci.yml               # Pipeline CI/CD GitHub Actions
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Roles y Permisos

| Rol | Clientes | Cotizaciones | Ventas | Compras | Inventario | Usuarios | Precios |
|-----|----------|--------------|--------|---------|------------|----------|---------|
| **ADMIN** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| **GERENTE** | CRUD | CRUD + Aprobar | CRUD + Cancelar | CRUD | CRUD | Read | Aprobar |
| **VENDEDOR** | CRUD | CRUD (propias) | Read | Solicitar disp. | Read | — | Ver |
| **COMPRAS** | Read | Read | Read | CRUD | Read | — | Ver |
| **ALMACEN** | Read | Read | Read + Estado | Read | CRUD | — | — |

---

## Módulos del Sistema

### Cotizaciones
- Creación con productos de acero y perfiles
- Precio sugerido por ML (hook `price_suggestion`)
- Aprobación de precios por Gerente cuando precio < mínimo
- Generación de PDF con logo y datos de empresa
- Envío por WhatsApp (Twilio) o email
- Versioning automático al editar cotizaciones enviadas
- Conversión a Venta con un click

### Inventario
- Control en tiempo real con optimistic locking
- Entradas por compra / ajuste / devolución
- Alertas automáticas cuando stock < mínimo (email diario 8 AM)
- Kardex completo con costo promedio ponderado
- Valorización del inventario

### Compras ↔ Ventas
- Solicitudes de disponibilidad de área Ventas a Compras
- Respuesta con ETA y proveedor sugerido
- Escalamiento automático en 24h sin respuesta
- Make-To-Order para productos especiales

### ML / IA (Hooks)
- `price_suggestion` — precio óptimo por cliente y volumen
- `demand_forecasting` — pronóstico de demanda 30 días
- `supplier_ranking` — ranking de proveedores por confiabilidad

---

## Tests

```bash
# Ejecutar todos los tests
cd backend
pytest tests/ -v --cov=app --cov-report=html

# Tests rápidos (sin integración DB)
pytest tests/unit/ -v

# Un módulo específico
pytest tests/test_quote_service.py -v
```

Cobertura mínima: **80%** — enforced en CI.

---

## Roadmap

| Semana | Entregable |
|--------|-----------|
| 1 | Arquitectura, DB schema, autenticación JWT, CRUD usuarios |
| 2 | Catálogo: clientes, proveedores, productos + búsqueda ES + CSV |
| 3 | Cotizaciones: PDF, WhatsApp, aprobación de precios |
| 4 | Flujo ventas: conversión, remisión, nota de venta |
| 5 | Inventario: entradas/salidas, alertas, kardex |
| 6 | Compras ↔ Ventas: solicitudes disponibilidad, OC, MTO |
| 7 | Tests 80% cobertura, CI/CD GitHub Actions, docs OpenAPI |
| 8 | Deploy staging, Prometheus + Grafana, plan ML/IA |

Ver [docs/roadmap.md](docs/roadmap.md) para detalle completo.

---

## Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nombre-de-la-feature`
3. Commit con mensaje descriptivo: `git commit -m "feat: descripción corta"`
4. Push: `git push origin feature/nombre-de-la-feature`
5. Abre un Pull Request a `develop`

### Convenciones de commit

- `feat:` — nueva funcionalidad
- `fix:` — corrección de bug
- `docs:` — solo documentación
- `test:` — agregar o corregir tests
- `refactor:` — refactorización sin cambio de funcionalidad
- `chore:` — cambios en build, CI, dependencias

---

## Licencia

[MIT](https://opensource.org/licenses/MIT) — Copyright 2024 FreeLux
