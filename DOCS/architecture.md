# Arquitectura del Sistema — CRM FreeLux

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTES / USUARIOS                            │
│              Navegador Web   ·   WhatsApp   ·   Dispositivo Móvil           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌───────────────────────────────────────────────────────────────┐
│                         NGINX (Reverse Proxy)                 │
│   Rate Limiting · SSL Termination · Gzip · Static Cache       │
│   Puerto 80/443 → backend:8000 ó frontend:3000               │
└──────────────────┬────────────────────────────────────────────┘
         ┌─────────┴─────────┐
         ▼                   ▼
┌────────────────┐  ┌────────────────────────────────────────────┐
│  FRONTEND      │  │              BACKEND API                   │
│  Next.js 14    │  │         FastAPI + Python 3.12              │
│  (App Router)  │  │                                            │
│  TypeScript    │  │  ┌─────────────────────────────────────┐  │
│  Tailwind CSS  │  │  │         API Router v1               │  │
│  shadcn/ui     │  │  │  /auth /clients /products /quotes   │  │
│                │  │  │  /sales /purchases /inventory /ml   │  │
│  Puerto 3000   │  │  └────────────┬────────────────────────┘  │
└────────────────┘  │               │                            │
                    │  ┌────────────▼────────────────────────┐  │
                    │  │     Capa de Servicios (Async)        │  │
                    │  │  QuoteService · SaleService          │  │
                    │  │  InventoryService · PriceService     │  │
                    │  │  MLHookService                       │  │
                    │  └────────────┬────────────────────────┘  │
                    │               │                            │
                    │  ┌────────────▼────────────────────────┐  │
                    │  │   SQLAlchemy Async ORM (asyncpg)     │  │
                    │  │   Alembic (migraciones)              │  │
                    │  └────────────┬────────────────────────┘  │
                    │  Puerto 8000  │                            │
                    └──────────────┼─────────────────────────────┘
                                   │
         ┌─────────────────────────┼───────────────────────────────┐
         ▼                         ▼                               ▼
┌──────────────────┐  ┌────────────────────┐  ┌──────────────────────────┐
│   PostgreSQL 16  │  │    Redis 7         │  │   Elasticsearch 8.15     │
│                  │  │                    │  │                          │
│  Tablas:         │  │  DB 0: App Cache   │  │  Índices:                │
│  users           │  │  DB 1: Celery Broker│  │  products_index          │
│  clients         │  │  DB 2: Task Results│  │  clients_index           │
│  products        │  │                    │  │  suppliers_index         │
│  suppliers       │  │  TTL: 300s–3600s   │  │                          │
│  quotes          │  │  Política: LRU     │  │  Full-text + autocomplete│
│  sales           │  │  Max: 256MB        │  │  Puerto 9200             │
│  inventory       │  │  Puerto 6379       │  │                          │
│  price_history   │  └────────────────────┘  └──────────────────────────┘
│  price_upd_jobs  │
│  Puerto 5432     │          ┌──────────────────────────────────────┐
└──────────────────┘          │         CELERY (Workers Async)       │
                              │                                      │
                              │  Colas:                              │
                              │  • default — operaciones generales   │
                              │  • quotes  — PDF, WhatsApp           │
                              │  • notifications — emails/alertas    │
                              │                                      │
                              │  Tareas programadas (Beat):          │
                              │  • Actualización precios cada 6h     │
                              │  • Alertas stock bajo (diario 8am)   │
                              │  • Limpieza cotizaciones expiradas   │
                              └──────────────────────────────────────┘

         ┌─────────────────────────────────────────────────────────┐
         │               OBSERVABILIDAD                            │
         │                                                         │
         │  Prometheus :9090 ─── scrape ──► Backend /metrics      │
         │       │                                                 │
         │       ▼                                                 │
         │  Grafana :3001 ──► Dashboards (latencia, RPS, errores) │
         │                                                         │
         │  Flower :5555 ──► Monitor tareas Celery                │
         └─────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico y Justificación

### Backend

| Tecnología | Versión | Justificación |
|---|---|---|
| **Python** | 3.12 | Último estable; mejoras de performance respecto a 3.11 |
| **FastAPI** | 0.111+ | Alto rendimiento async, OpenAPI automático, tipado estricto con Pydantic v2 |
| **SQLAlchemy** | 2.0 async | API async nativa con `asyncpg`; avoid N+1 con `selectinload`/`joinedload` |
| **Alembic** | 1.13 | Migraciones versionadas; autogeneración desde modelos SQLAlchemy |
| **PostgreSQL** | 16 | Soporte JSONB para datos semiestructurados, `pg_trgm` para búsqueda fuzzy |
| **Redis** | 7 | Cache L2, broker Celery, rate-limiting distribuido |
| **Celery** | 5.3 | Procesamiento asíncrono: PDF, WhatsApp, actualización masiva de precios |
| **Elasticsearch** | 8.15 | Búsqueda full-text de productos (por SKU, descripción, sinónimos) |
| **ReportLab** | 4.x | Generación PDF de cotizaciones con logo, tablas y firma |

### Frontend

| Tecnología | Versión | Justificación |
|---|---|---|
| **Next.js** | 14 (App Router) | SSR/SSG donde aplica; layout persistente; Server Actions para formularios |
| **TypeScript** | 5.x | Contratos de tipo fuertes; detección temprana de errores |
| **Tailwind CSS** | 3.x | Utilidades atómicas; consistencia visual sin CSS custom complejo |
| **shadcn/ui** | latest | Componentes accesibles (Radix UI) con tema personalizable |
| **React Query** | 5.x | Cache de datos servidor, invalidación, optimistic updates |
| **React Hook Form** | 7.x | Formularios performantes con validación Zod |
| **Zod** | 3.x | Validación schemas compartida frontend/backend |

---

## Decisiones de Diseño

### 1. RBAC por Enum (no ABAC completo)

El sistema de roles usa un enum `UserRole` con 5 niveles:

```
ADMIN → GERENTE → VENDEDOR → COMPRAS → ALMACEN
```

**Razón**: Para una PYME con ~20 usuarios, un ABAC completo (atributo-based) añade complejidad operacional innecesaria. El enum cubre el 95% de los casos de uso. La regla de permisos se aplica como `Depends()` en FastAPI y se evalúa en el token JWT (campo `role`).

Si el negocio crece a >100 usuarios con permisos granulares por sucursal, se migra a una tabla `permissions` con relación M:N.

### 2. Optimistic Locking en Inventario

Los movimientos de inventario usan `version_id` (integer) en la tabla `inventory`:

```sql
UPDATE inventory
SET quantity = quantity - :qty,
    version_id = version_id + 1
WHERE product_id = :pid
  AND version_id = :expected_version
  AND quantity >= :qty;
-- Si affected_rows = 0 → StaleDataError → reintentar
```

**Razón**: En operaciones de venta simultáneas (vendedor A y vendedor B quieren el mismo PTR 4x4x6m), el locking pesimista (`SELECT FOR UPDATE`) crea deadlocks bajo carga. El optimistic locking es adecuado cuando los conflictos son infrecuentes (< 5% de las transacciones).

### 3. SQLAlchemy Async con `asyncpg`

Todo acceso a DB es async:

```python
async with get_db() as session:
    result = await session.execute(
        select(Product).where(Product.sku == sku)
    )
```

**Razón**: FastAPI es ASGI; mezclar código síncrono bloquea el event loop. Con `asyncpg` se logra ~3x más throughput vs `psycopg2` síncrono bajo carga concurrente.

### 4. Redis Cache con TTL por Contexto

| Dato | TTL | Justificación |
|---|---|---|
| Sesión JWT (refresh) | 7 días | Permite logout invalidando el token en Redis |
| Lista de productos | 300s | Catálogo cambia poco; tolera 5 min de stale |
| Cotización individual | 60s | Puede ser editada; TTL corto reduce inconsistencia |
| Precios de proveedor | 3600s | Se actualizan batch; 1 hora es aceptable |
| Stock disponible | 30s | Dato crítico; TTL corto evita sobreventa |

### 5. Separación Compras / Ventas

Las áreas operan en colas Celery distintas y se comunican via tabla `availability_requests`:

```
Vendedor crea Quote → Verifica stock local
  └─ Si stock < needed → crea AvailabilityRequest
       └─ Compras recibe notificación → responde con ETA
            └─ Quote se actualiza con fecha estimada
                 └─ Vendedor notifica al cliente
```

El Make-To-Order (MTO) se activa cuando `product.stock_type = 'MTO'`, saltando el proceso de reserva de inventario.

---

## Flujo de Cotización → Venta

```
1. COTIZACIÓN (Quote)
   ├── Vendedor selecciona cliente y productos
   ├── Sistema sugiere precio (price_suggestion ML hook)
   ├── Si precio < costo_mínimo → requiere aprobación Gerente
   ├── Se genera PDF (ReportLab) con logo ACEROS Y PERFILES
   ├── PDF se envía por WhatsApp (Twilio) o email
   └── Quote.status = ENVIADA

2. APROBACIÓN / NEGOCIACIÓN
   ├── Cliente acepta → vendedor marca Quote.status = ACEPTADA
   ├── Cliente pide cambio → vendedor edita (nueva versión)
   └── Quote vence en 15 días → tarea Celery lo marca VENCIDA

3. CONVERSIÓN A VENTA (Sale)
   ├── Se crea Sale desde Quote (copia líneas + precios)
   ├── Se decrementan inventarios (con optimistic lock)
   ├── Se genera Remisión / Nota de Venta
   ├── Si requiere factura → Sale.billing_requested = True
   └── Sale.status = CONFIRMADA

4. ENTREGA Y CIERRE
   ├── Almacén confirma salida → Sale.status = ENTREGADA
   └── Se registra en historial de ventas del cliente
```

---

## Flujo de Solicitud de Disponibilidad (Ventas ↔ Compras)

```
Ventas                           Sistema                         Compras
  │                                │                                │
  │── crea AvailabilityRequest ──► │                                │
  │   (product_id, qty, needed_by) │                                │
  │                                │── notifica via Celery ────────►│
  │                                │   (email + WebSocket)          │
  │                                │                                │
  │                                │◄── responde con ETA ──────────│
  │                                │    + supplier_id               │
  │◄── actualiza Quote ───────────│                                │
  │    (fecha estimada entrega)    │                                │
  │                                │                                │
  │── confirma al cliente ────────►│                                │
```

Si Compras no responde en 24h → tarea Celery Beat escala al Gerente.

---

## Hooks ML — Interfaz Esperada

Los tres hooks ML son **opcionales y pluggables**. Si no están disponibles, el sistema usa valores por defecto. Se comunican via HTTP interno (pueden ser microservicios Python separados o endpoints en el mismo backend).

### 1. `price_suggestion`

**Cuándo**: Al crear/editar una cotización, para cada línea de producto.

**Endpoint esperado**:
```
POST /ml/price-suggestion
Content-Type: application/json

{
  "product_id": "PTR-4X4X6",
  "client_id": "CLI-00042",
  "quantity": 50,
  "context": {
    "client_purchase_history": [...],   // últimas 10 compras
    "current_stock": 120,
    "cost_price": 850.00,
    "last_sale_price": 980.00,
    "competitor_prices": [920.0, 950.0] // opcional
  }
}

Respuesta:
{
  "suggested_price": 965.00,
  "confidence": 0.87,
  "reason": "Cliente frecuente, volumen alto, precio mercado $950-980"
}
```

**Fallback**: `suggested_price = cost_price * margin_factor` donde `margin_factor` es configurable por categoría.

### 2. `demand_forecasting`

**Cuándo**: Al revisar inventario (reporte semanal) y en el batch nocturno.

**Endpoint esperado**:
```
POST /ml/demand-forecast
{
  "product_id": "PERFIL-IPR-6",
  "horizon_days": 30,
  "historical_sales": [           // ventas diarias últimos 90 días
    {"date": "2024-10-01", "qty": 12},
    ...
  ],
  "include_seasonality": true
}

Respuesta:
{
  "forecast": [
    {"date": "2024-11-01", "qty_predicted": 15, "lower_bound": 10, "upper_bound": 22},
    ...
  ],
  "suggested_reorder_qty": 200,
  "suggested_reorder_date": "2024-11-10"
}
```

**Fallback**: Media móvil de 30 días × factor estacional por mes.

### 3. `supplier_ranking`

**Cuándo**: Al crear una solicitud de compra (AvailabilityRequest), para sugerir el mejor proveedor.

**Endpoint esperado**:
```
POST /ml/supplier-ranking
{
  "product_id": "PTR-3X3X6",
  "quantity": 100,
  "needed_by": "2024-11-20",
  "candidates": [
    {"supplier_id": "PROV-001", "name": "Aceros del Norte"},
    {"supplier_id": "PROV-007", "name": "Perfiles Industriales SA"}
  ]
}

Respuesta:
{
  "ranked_suppliers": [
    {
      "supplier_id": "PROV-007",
      "score": 0.92,
      "factors": {
        "delivery_reliability": 0.95,   // % entregas a tiempo históricas
        "price_competitiveness": 0.88,  // vs precio promedio mercado
        "quality_score": 0.94           // basado en devoluciones
      },
      "estimated_price": 820.00,
      "estimated_delivery_days": 3
    },
    ...
  ]
}
```

**Fallback**: Ordenar proveedores por `(precio_promedio * 0.5 + días_entrega_promedio * 0.3 + tasa_rechazo * 0.2)` calculado desde historial de compras en PostgreSQL.
