# Roadmap de Desarrollo — CRM FreeLux

**Proyecto**: Sistema CRM para Aceros y Perfiles / FreeLux  
**Duración**: 8 semanas  
**Equipo estimado**: 1–2 desarrolladores  
**Metodología**: Sprints de 1 semana con entregable funcional al cierre de cada semana

---

## Resumen Visual

```
Sem 1  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Arquitectura + Auth
Sem 2  ░░░░████░░░░░░░░░░░░░░░░░░░░░░░░  Catálogo completo
Sem 3  ░░░░░░░░████░░░░░░░░░░░░░░░░░░░░  Cotizaciones + PDF + WA
Sem 4  ░░░░░░░░░░░░████░░░░░░░░░░░░░░░░  Ventas (flujo completo)
Sem 5  ░░░░░░░░░░░░░░░░████░░░░░░░░░░░░  Inventario + alertas
Sem 6  ░░░░░░░░░░░░░░░░░░░░████░░░░░░░░  Integración Compras↔Ventas
Sem 7  ░░░░░░░░░░░░░░░░░░░░░░░░████░░░░  Tests + CI/CD + Docs
Sem 8  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  Staging + Observabilidad + ML plan
```

---

## Semana 1 — Arquitectura, Base de Datos y Autenticación

**Objetivo**: Repositorio funcional con autenticación completa y estructura de proyecto lista para construir.

### Tareas Backend
- [ ] Inicializar repositorio Git, estructura de carpetas (`backend/`, `frontend/`, `infra/`, `docs/`)
- [ ] Configurar Docker Compose (PostgreSQL 16, Redis 7, backend FastAPI)
- [ ] Diseñar y crear schema completo de base de datos:
  - Tabla `users` (id, email, hashed_password, full_name, role, is_active, created_at)
  - Tabla `clients` (id, company_name, rfc, contact_name, phone, email, address, credit_limit, created_at)
  - Tabla `products` (id, sku, name, description, category, unit, cost_price, list_price, stock_min, stock_max)
  - Tabla `suppliers` (id, company_name, rfc, contact_name, phone, email, payment_terms, lead_time_days)
  - Tabla `quotes` y `quote_items`
  - Tabla `sales` y `sale_items`
  - Tabla `inventory_movements` y `inventory` (stock actual)
  - Tabla `price_history` y `price_update_jobs`
  - Tabla `availability_requests`
- [ ] Configurar Alembic, primera migración
- [ ] Implementar autenticación JWT:
  - `POST /api/v1/auth/login` → access_token (30 min) + refresh_token (7 días en Redis)
  - `POST /api/v1/auth/refresh` → nuevo access_token
  - `POST /api/v1/auth/logout` → invalida refresh en Redis
  - Middleware de extracción de usuario desde token
- [ ] CRUD de usuarios con RBAC:
  - `GET/POST /api/v1/users` (solo ADMIN/GERENTE)
  - `GET/PUT /api/v1/users/{id}`
  - `PATCH /api/v1/users/{id}/role` (solo ADMIN)
  - Hashing bcrypt con `passlib`
- [ ] Seed inicial: usuario `admin@freelux.mx / Admin1234!`
- [ ] Health endpoint: `GET /health` → `{"status": "ok", "version": "0.1.0"}`

### Tareas Frontend
- [ ] Inicializar Next.js 14 con TypeScript, Tailwind CSS, shadcn/ui
- [ ] Página de Login (formulario, validación Zod, manejo de errores)
- [ ] Context de autenticación (`useAuth` hook con access_token en memory, refresh_token en HttpOnly cookie)
- [ ] Layout principal con sidebar navegación por rol
- [ ] Página de gestión de usuarios (CRUD básico, tabla con paginación)
- [ ] Protección de rutas por rol

### Entregable
- Repositorio en GitHub con rama `main` funcional
- Login funcional en `http://localhost:3000`
- CRUD usuarios completo con roles
- Docker Compose levanta todo con `docker-compose up --build`
- Documentación OpenAPI en `http://localhost:8000/docs`

---

## Semana 2 — Catálogo: Clientes, Proveedores y Productos

**Objetivo**: Catálogo maestro completo con búsqueda full-text y carga desde CSV.

### Tareas Backend
- [ ] CRUD Clientes (`/api/v1/clients`):
  - Validación RFC (formato mexicano)
  - Campos: razón social, RFC, contacto, teléfono, email, dirección, límite de crédito
  - Historial de compras agregado (total comprado, última compra, número de cotizaciones)
- [ ] CRUD Proveedores (`/api/v1/suppliers`):
  - Campos: empresa, RFC, contacto, teléfono, email, condiciones pago, días de entrega promedio
  - Relación con productos que suministra
- [ ] CRUD Productos (`/api/v1/products`):
  - Campos: SKU, nombre, descripción, categoría, unidad, precio costo, precio lista, stock mínimo
  - Relación con proveedores (tabla `product_suppliers` con precio y tiempo de entrega por proveedor)
  - Validaciones: SKU único, precio costo > 0
- [ ] Importación CSV:
  - `POST /api/v1/products/import` → archivo CSV con columnas: SKU, DESCRIPCIÓN, UNIDAD, PRECIO_COSTO, PRECIO_LISTA
  - Upsert por SKU (crea o actualiza)
  - Tarea Celery para procesar archivos grandes (> 100 registros)
  - Reporte de filas importadas / errores
- [ ] Integración Elasticsearch:
  - Indexar productos al crear/actualizar
  - `GET /api/v1/products/search?q=PTR+4x4` → búsqueda full-text con score
  - Autocompletar por nombre y SKU
  - Búsqueda fuzzy (tolera typos: "perfi" → "perfil")
- [ ] Cache Redis para listados (TTL 300s, invalida en writes)
- [ ] Paginación con cursor para listas > 100 items

### Tareas Frontend
- [ ] Pantalla Clientes: tabla con búsqueda, filtros, modal crear/editar
- [ ] Pantalla Proveedores: similar a clientes, con indicador de tiempo de entrega
- [ ] Pantalla Productos: tabla con imagen placeholder, SKU, precio, stock
  - Barra de búsqueda con autocompletar (Elasticsearch)
  - Filtro por categoría (Perfiles, Lamina, Tubería, PTR, Herraje, etc.)
  - Indicador visual de stock: Verde (OK) / Amarillo (bajo mínimo) / Rojo (agotado)
- [ ] Modal de importación CSV con preview de primeras 5 filas y progress bar
- [ ] Vista detalle de producto con historial de precios (gráfica simple)

### Entregable
- Catálogo de ~500 productos de acero cargado desde CSV
- Búsqueda full-text funcionando en < 200ms
- Importación CSV sin bloquear el UI

---

## Semana 3 — Cotizaciones: PDF, WhatsApp y UI

**Objetivo**: Flujo completo de creación y envío de cotizaciones.

### Tareas Backend
- [ ] CRUD Cotizaciones (`/api/v1/quotes`):
  - Crear cotización con N líneas (producto, cantidad, precio unitario, descuento)
  - Cálculo automático: subtotal, IVA 16%, total
  - Folio autoincremental con formato `COT-2024-0001`
  - Estados: `BORRADOR → ENVIADA → ACEPTADA → RECHAZADA → VENCIDA`
  - Versioning: editar cotización enviada crea nueva versión (`COT-2024-0001-v2`)
  - Precio mínimo por producto (costo + margen mínimo configurable)
  - Si precio < mínimo → `requires_approval = True`
- [ ] Generación PDF (ReportLab):
  - Logo ACEROS Y PERFILES
  - Encabezado: RFC FME121108UI1, AV 20 DE NOVIEMBRE MZ 26 105
  - Tabla de productos: CLAVE | DESCRIPCIÓN | UNIDAD | CANT | P.UNIT | IMPORTE
  - Pie: Subtotal, IVA 16%, Total
  - Nota: "Todos los precios son más IVA · Precios sujetos a cambio sin previo aviso"
  - Vigencia: 15 días naturales
  - `GET /api/v1/quotes/{id}/pdf` → streaming PDF
- [ ] Integración Twilio WhatsApp:
  - `POST /api/v1/quotes/{id}/send-whatsapp` → tarea Celery
  - Mensaje: "Hola {nombre}, adjunto su cotización {folio} por ${total}. Válida 15 días."
  - Attach PDF como media
  - Registra timestamp de envío en `quote.sent_at`
- [ ] Aprobación de precios:
  - `GET /api/v1/quotes/pending-approval` (solo GERENTE)
  - `POST /api/v1/quotes/{id}/approve` → desbloquea envío
  - `POST /api/v1/quotes/{id}/reject-price` → devuelve al vendedor con nota
- [ ] Hook ML price_suggestion (fallback a fórmula si no disponible)

### Tareas Frontend
- [ ] Formulario nueva cotización:
  - Selector de cliente con búsqueda
  - Agregar líneas con búsqueda de producto (autocompletar ES)
  - Precio sugerido ML mostrado como hint editable
  - Alerta visual si precio < mínimo
  - Preview del total en tiempo real
- [ ] Lista de cotizaciones con filtros (estado, vendedor, fecha, cliente)
- [ ] Vista detalle cotización con timeline de estados
- [ ] Botones de acción: "Enviar PDF", "Enviar WhatsApp", "Convertir a Venta"
- [ ] Panel Gerente: cola de aprobaciones pendientes con diff de precio

### Entregable
- Cotización se crea, genera PDF y se envía por WhatsApp en < 30 segundos
- Flujo de aprobación de precios funcionando

---

## Semana 4 — Conversión a Venta y Documentos de Entrega

**Objetivo**: Flujo completo de ventas desde cotización aceptada hasta entrega.

### Tareas Backend
- [ ] Conversión Cotización → Venta:
  - `POST /api/v1/quotes/{id}/convert-to-sale` → crea Sale + decrementos inventario
  - Optimistic locking en inventario (version_id)
  - Si stock insuficiente → error 409 con detalle por producto
- [ ] CRUD Ventas (`/api/v1/sales`):
  - Estados: `CONFIRMADA → EN_PREPARACION → LISTA → ENTREGADA → CANCELADA`
  - Remisión: número folio `REM-2024-0001`
  - Nota de venta: `NV-2024-0001`
  - `sale.billing_requested` → marca para facturación externa
- [ ] PDF Remisión (ReportLab):
  - Datos empresa + cliente + RFC + dirección entrega
  - Tabla de productos: SKU | DESCRIPCIÓN | CANTIDAD | UNIDAD
  - Sin precios (documento de entrega)
  - Firma de recibido (campo vacío)
- [ ] Historial de ventas por cliente:
  - `GET /api/v1/clients/{id}/sales` → lista con totales
  - Estadísticas: total comprado YTD, ticket promedio, productos más comprados
- [ ] Módulo de cancelaciones:
  - Cancelar venta restores inventario
  - Requiere nota de cancelación
  - Solo GERENTE puede cancelar ventas entregadas

### Tareas Frontend
- [ ] Lista de ventas con Kanban de estados (drag-drop para cambiar estado)
- [ ] Vista detalle de venta con documentos (PDF inline viewer)
- [ ] Modal "Marcar como entregada" con campo de firma/confirmación
- [ ] Dashboard vendedor:
  - Mis ventas del mes (vs meta)
  - Cotizaciones pendientes de seguimiento
  - Top 5 clientes por monto

### Entregable
- Flujo cotización → venta → remisión → entrega completo
- Dashboard con KPIs del vendedor

---

## Semana 5 — Inventario: Entradas, Salidas y Alertas

**Objetivo**: Control de inventario con trazabilidad completa y alertas automáticas.

### Tareas Backend
- [ ] Módulo de Inventario (`/api/v1/inventory`):
  - `GET /api/v1/inventory` → stock actual por producto (con filtros)
  - `POST /api/v1/inventory/entry` → entrada por compra o ajuste (tipo: COMPRA, AJUSTE, DEVOLUCION)
  - Cada movimiento registra: fecha, tipo, cantidad, referencia, usuario, costo unitario
  - Balance automático: `stock_actual = entradas - salidas`
- [ ] Ajustes de inventario:
  - Ajuste positivo/negativo con nota obligatoria
  - Solo ALMACEN o GERENTE pueden ajustar
  - Registro en `inventory_movements` con `movement_type = 'AJUSTE'`
- [ ] Alertas de stock bajo:
  - Tarea Celery Beat diaria (8:00 AM)
  - Encuentra productos donde `stock_actual < stock_minimo`
  - Envía email a GERENTE y COMPRAS con lista de productos
  - Endpoint: `GET /api/v1/inventory/alerts` → productos bajo mínimo en tiempo real
- [ ] Valorización de inventario:
  - Costo promedio ponderado (CPP) para cada movimiento
  - `GET /api/v1/inventory/valuation` → valor total del inventario al costo
- [ ] Reporte de kardex:
  - `GET /api/v1/inventory/{product_id}/kardex?from=&to=` → movimientos con saldo acumulado
  - Exportable a CSV/PDF

### Tareas Frontend
- [ ] Pantalla de inventario: tabla con semáforo stock (verde/amarillo/rojo)
- [ ] Modal registro de entrada: producto, cantidad, costo, proveedor, referencia
- [ ] Pantalla Kardex por producto con gráfica de movimientos
- [ ] Panel de alertas: lista de productos bajo mínimo con botón "Crear solicitud de compra"
- [ ] Reporte de valorización con exportación CSV

### Entregable
- Inventario con trazabilidad completa
- Alertas automáticas por email funcionando
- Kardex exportable

---

## Semana 6 — Integración Compras ↔ Ventas

**Objetivo**: Flujo de solicitudes de disponibilidad con ETA y Make-To-Order.

### Tareas Backend
- [ ] Módulo Solicitudes de Disponibilidad (`/api/v1/purchases/availability`):
  - Vendedor crea solicitud: `{product_id, qty_needed, needed_by, quote_id}`
  - Compras ve solicitudes pendientes: `GET /api/v1/purchases/availability?status=PENDING`
  - Compras responde con ETA: `{supplier_id, eta_date, estimated_price}`
  - Quote se actualiza automáticamente con fecha de entrega estimada
  - Notificación al vendedor via Celery (email + in-app)
- [ ] Órdenes de Compra (`/api/v1/purchases/orders`):
  - Crear OC: proveedor, productos, cantidades, precios
  - Folio: `OC-2024-0001`
  - Estados: `BORRADOR → ENVIADA → CONFIRMADA → PARCIAL → RECIBIDA`
  - Al recibir → entra automáticamente al inventario
  - PDF de orden de compra (similar a cotización pero para proveedor)
- [ ] Make-To-Order (MTO):
  - Campo `product.fulfillment_type = 'STOCK' | 'MTO'`
  - Para productos MTO: al confirmar venta no reserva stock, crea OC automática
  - Flujo: Venta confirmada → OC creada → Recepción → Entrega al cliente
- [ ] Escalamiento automático:
  - Si solicitud de disponibilidad sin respuesta en 24h → notifica al Gerente
  - Tarea Celery Beat cada hora revisa solicitudes pendientes
- [ ] Ranking de proveedores (hook ML con fallback SQL)

### Tareas Frontend
- [ ] Vista Compras: panel de solicitudes pendientes de disponibilidad
  - Formulario de respuesta con ETA y proveedor seleccionado
  - Historial de solicitudes resueltas
- [ ] Gestión de Órdenes de Compra: CRUD completo
- [ ] Modal de recepción: confirmar productos y cantidades recibidas (puede ser parcial)
- [ ] Vista Make-To-Order: ventas pendientes de material con semáforo de avance

### Entregable
- Flujo completo Ventas → solicita disponibilidad → Compras responde → actualiza cotización
- MTO funcionando para productos especiales (PTR sobre medida, etc.)

---

## Semana 7 — Tests, CI/CD y Documentación

**Objetivo**: Suite de tests con 80% de cobertura, pipeline CI/CD y documentación completa.

### Tests Backend (pytest)
- [ ] Tests unitarios de servicios:
  - `test_quote_service.py` — crear, calcular totales, validar precios mínimos
  - `test_inventory_service.py` — entrada, salida, optimistic lock, alertas
  - `test_price_service.py` — actualización masiva, historial
  - `test_auth_service.py` — login, refresh, logout, expiración
- [ ] Tests de integración (con DB real PostgreSQL en Docker):
  - `test_quote_flow.py` — cotización → venta → inventario actualizado
  - `test_availability_flow.py` — solicitud → respuesta Compras → Quote actualizada
  - `test_import_csv.py` — importación con errores parciales
- [ ] Tests de endpoints (FastAPI TestClient):
  - Cada endpoint con casos: happy path, errores 4xx, errores de autorización
  - Total: ~80 tests
- [ ] Configurar `pytest.ini`, `conftest.py` con fixtures de DB y cliente de prueba
- [ ] Cobertura mínima: 80% (`--cov-fail-under=80`)

### Tests Frontend (Jest + Testing Library)
- [ ] Tests de componentes críticos:
  - `QuoteForm.test.tsx` — validaciones, cálculo total
  - `InventoryTable.test.tsx` — renderizado, filtros
  - `LoginForm.test.tsx` — validación, submit
- [ ] Tests de hooks:
  - `useAuth.test.ts` — flujo de login, refresh, logout

### CI/CD (GitHub Actions)
- [ ] Pipeline completo (ver `.github/workflows/ci.yml`):
  - `backend-test` con servicios DB y Redis
  - `frontend-lint` (ESLint + tsc)
  - `frontend-test` (Jest)
  - `docker-build` — build + push a ghcr.io en push a main
  - `deploy-staging` — kubectl apply (trigger manual)
- [ ] Secrets configurados en GitHub:
  - `CODECOV_TOKEN`, `KUBECONFIG_STAGING`
- [ ] Badge de CI en README

### Documentación
- [ ] OpenAPI 3.1 completo auto-generado por FastAPI (revisar y ajustar descripciones)
- [ ] Colección Postman con todos los endpoints y ejemplos de body
- [ ] `CLAUDE.md` con contexto del proyecto para futuras sesiones de desarrollo
- [ ] Comentarios en código: módulos de servicio y lógica de negocio no obvia

### Entregable
- CI/CD verde en GitHub Actions
- Cobertura tests > 80% reportada en Codecov
- Documentación OpenAPI completa

---

## Semana 8 — Deploy Staging, Observabilidad y Plan ML

**Objetivo**: Sistema desplegado en staging con monitoreo completo y plan documentado de ML/IA.

### Deploy Staging
- [ ] Provisionar servidor (VPS Ubuntu 22.04 / AWS ECS Fargate / DigitalOcean):
  - Mínimo: 4 vCPU, 8 GB RAM, 50 GB SSD
  - PostgreSQL en servicio gestionado (RDS / DO Managed PG) o StatefulSet K8s
- [ ] Configurar variables de entorno de staging (`backend/.env.staging`)
- [ ] Certificado SSL con Let's Encrypt (cert-manager en K8s o Certbot en VPS)
- [ ] Dominio: `crm.freelux.mx` → staging
- [ ] Seed de datos demo:
  - 100 productos de acero (PTR, perfiles, lámina, tubería)
  - 20 clientes demo
  - 5 proveedores
  - 10 cotizaciones de ejemplo
  - Usuario admin + 2 vendedores + 1 gerente

### Observabilidad
- [ ] Prometheus scrapeando backend `/metrics` (prometheus-fastapi-instrumentator)
- [ ] Dashboard Grafana "FreeLux CRM Overview":
  - Latencia API por endpoint (P50, P90, P99)
  - Requests/seg por código HTTP
  - Conexiones activas PostgreSQL
  - Uso de memoria Redis
  - Tareas Celery activas/pendientes/fallidas
- [ ] Alertas Grafana:
  - Error rate > 5% → email a dev team
  - P95 latency > 2s → email
  - Stock bajo 0 de producto crítico → email a Gerente

### Plan ML/IA (Documentación + Prototipo)
- [ ] Documentar interfaz de cada hook ML (ver docs/architecture.md)
- [ ] Prototipo `price_suggestion`:
  - Dataset: historial de cotizaciones (precio ofrecido, precio aceptado, cliente, producto, volumen)
  - Modelo: XGBoost o LightGBM de regresión (precio objetivo)
  - Entrenamiento: script Python en `ml/train_price_model.py`
  - Serving: FastAPI micro-endpoint en puerto 8001
  - Fallback: precio lista × factor_cliente (NUEVO=1.0, FRECUENTE=0.95, VIP=0.90)
- [ ] Estimación de datos mínimos para ML útil:
  - `price_suggestion`: 500+ cotizaciones con resultado (aceptada/rechazada)
  - `demand_forecast`: 6+ meses de datos de ventas diarias
  - `supplier_ranking`: 50+ órdenes de compra con evaluación de entrega
- [ ] Roadmap ML semestral documentado

### Entregable Final
- **Sistema funcionando en staging**: `https://crm.freelux.mx`
- **CI/CD automático**: push a main → deploy en < 10 minutos
- **Monitoreo activo**: Grafana con datos reales
- **Demo completa**: login → cotización → PDF → WhatsApp → venta → inventario
- **Documentación completa**: README, OpenAPI, Postman, Architecture
- **Plan ML**: documentado y prototipo `price_suggestion` corriendo

---

## Criterios de Aceptación Globales

| Criterio | Métrica |
|---|---|
| Cobertura de tests | ≥ 80% (backend) |
| Latencia API (P95) | < 500ms en condiciones normales |
| Tiempo de generación PDF | < 3 segundos |
| Uptime staging | > 99% en horario laboral |
| Tiempo de envío WhatsApp | < 30 segundos desde click |
| Búsqueda de productos | < 200ms (Elasticsearch) |

## Dependencias Externas

| Servicio | Para | Costo estimado |
|---|---|---|
| Twilio (WhatsApp Business API) | Envío de cotizaciones | ~$0.005 USD/mensaje |
| Servidor staging (VPS/ECS) | Deploy | ~$50–100 USD/mes |
| Codecov | Reporte de cobertura | Gratis (open source) |
| GitHub Actions | CI/CD | 2,000 min/mes gratis |
| SendGrid (opcional) | Emails de alertas | Gratis hasta 100/día |
