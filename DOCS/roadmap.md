# Roadmap - FerreCRM (8 semanas)

## Semana 1: Arquitectura y base
- Definir stack, estructura de repo
- Crear Dockerfile, docker-compose
- Configurar PostgreSQL + Redis
- Implementar autenticación JWT + roles
- Migraciones iniciales (Alembic)

**Entregables:**
- Repositorio con backend/frontend/infra
- Docker compose funcional (backend + db + redis)
- Endpoint `/auth/login` funcional
- Seed de roles y usuarios por defecto

## Semana 2: CRUDs y catálogo
- CRUD Clientes
- CRUD Proveedores
- CRUD Productos
- Seed desde `base_productos.csv`
- Departamentos y Categorías

**Entregables:**
- Frontend: páginas de listado/creación de clientes
- Frontend: listado de productos con búsqueda
- API documentada para los 3 CRUDs
- 1800+ productos cargados desde CSV

## Semana 3: Cotizaciones
- Crear cotización con items
- Editar cotización
- Cálculo de totales (subtotal, IVA, descuento)
- PDF de cotización (ReportLab)
- UI de cotización con búsqueda de productos

**Entregables:**
- Página de creación de cotizaciones
- Listado de cotizaciones por vendedor
- Generación de PDF (placeholder)
- Validación de precios vs costo

## Semana 4: Ventas y remisiones
- Conversión cotización → venta
- Decremento de stock automático
- Solicitud de factura
- Generación de remisión
- Nota de venta

**Entregables:**
- Flujo completo cotización → venta
- Historial de ventas
- Remisiones asociadas

## Semana 5: Inventario
- CRUD almacenes
- Entradas y salidas de producto
- Historial de movimientos
- Bloqueo optimista (versión de producto)
- Control estadístico de pesos

**Entregables:**
- Página de movimientos de inventario
- Validación de stock suficiente
- Estadísticas de pesos por departamento

## Semana 6: Compras e integración
- CRUD órdenes de compra
- Recepción de compra → entrada a inventario
- Solicitudes de disponibilidad (Ventas → Compras)
- Búsqueda inteligente de proveedores
- Make To Order flow

**Entregables:**
- Flujo completo de compras
- Integración Ventas ↔ Compras
- Mecanismo de AvailabilityRequest

## Semana 7: Tests, CI, documentación
- Tests unitarios (pytest, vitest)
- Tests de integración (API)
- Tests E2E (Playwright)
- CI/CD con GitHub Actions
- Documentación OpenAPI completa
- Postman collection

**Entregables:**
- Pipeline CI verde
- Cobertura > 80% en rutas críticas
- Postman collection exportable
- README completo

## Semana 8: Despliegue y ML
- Despliegue staging (K8s minikube / cloud)
- Prometheus + Grafana
- Logging estructurado (JSON)
- Hooks para modelos ML
- Feature store setup
- Plan de escalabilidad

**Entregables:**
- Staging accesible
- Dashboards de monitoreo
- Stubs de ML functions
- Documentación de integración ML
