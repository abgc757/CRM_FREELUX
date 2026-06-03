# Arquitectura de FerreCRM

## Diagrama de alto nivel

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Frontend  │────▶│   Backend    │────▶│ Database  │
│  React+Vite │     │  FastAPI     │     │ PostgreSQL│
│  Tailwind   │◀────│  + Celery    │◀────│ + Redis   │
└─────────────┘     └──────┬───────┘     └───────────┘
                           │
                    ┌──────▼───────┐
                    │  ElasticSearch│
                    │  (futuro)     │
                    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │ ML Pipeline  │
                    │  (futuro)    │
                    └──────────────┘
```

## Stack tecnológico

| Capa        | Tecnología                | Justificación                            |
|-------------|---------------------------|------------------------------------------|
| Backend     | Python + FastAPI          | Async, moderno, auto-docs, tipo seguro   |
| Frontend    | React + Vite + TypeScript | Componentes reutilizables, rápido dev    |
| Estilos     | Tailwind CSS              | Utility-first, responsive nativo         |
| DB          | PostgreSQL 16             | Relacional, ACID, full-text search       |
| Cache/Queue | Redis 7                   | Caché de consultas, broker Celery        |
| Tareas      | Celery                    | Notificaciones, sync, ETL                |
| ORM         | SQLAlchemy 2.0 async      | Async, maduro, migrations con Alembic    |
| Auth        | JWT + bcrypt              | Stateless, seguro                        |
| Contenedores| Docker + docker-compose   | Desarrollo reproducible                  |
| Orquestación| Kubernetes (manifiestos)  | Escalabilidad en producción              |
| Monitoreo   | Prometheus + OpenTelemetry| Métricas y tracing                       |

## Patrones de diseño

### RBAC (Role-Based Access Control)
- Roles: `admin`, `gerencia`, `ventas`, `compras`, `almacen`
- Cada endpoint valida el rol mediante `RoleChecker` (dependencia FastAPI)
- Ventas solo ve sus clientes/cotizaciones (filtro por `owner_user_id`)

### Bloqueo optimista
- Los productos tienen campo `version` (entero)
- Antes de actualizar stock, se verifica que `version` no haya cambiado
- Evita sobreventa en concurrencia

### ACID en inventario
- Transacciones SQLAlchemy: commit/rollback automáticos por request
- `with_for_update()` en consultas críticas de stock

### API RESTful
- Rutas nominales: `/api/v1/{recurso}`
- Verbos HTTP estándar: GET, POST, PUT, DELETE
- Respuestas consistentes con códigos HTTP y mensajes en español

## Flujos principales

### Cotización → Venta
1. Vendedor crea cotización con productos y precios
2. Si precio < costo → solicita aprobación a gerencia
3. Gerencia aprueba/rechaza
4. Cotización aprobada → se convierte a venta
5. Sistema decrementa stock (o crea orden de compra si falta)
6. Opcional: generar remisión, solicitar factura

### Make To Order (Ventas ↔ Compras)
1. Ventas detecta stock insuficiente
2. Crea `AvailabilityRequest` → notifica a Compras
3. Compras responde con ETA y notas
4. Ventas comunica fecha estimada al cliente

### Inventario
1. Almacén registra entrada (compra recibida) o salida (venta/ajuste)
2. Sistema actualiza stock con bloqueo optimista
3. Historial completo de movimientos disponible

## Integración ML futura

### Puntos de extensión
- `app/services/ml.py` contiene stubs para modelos
- Endpoints para exportar datasets (`/api/v1/ml/export`)
- Feature store en S3 (parquet files) + metadata en PostgreSQL
- Hooks para: price_suggestion, demand_forecasting, supplier_ranking
- Airflow DAGs para ETL periódico (scripts en `backend/scripts/`)

### Versionado de modelos
- Model registry: `/data/models/{model_name}/{version}/`
- Metadata: fecha, métricas, features usados, hash del dataset
