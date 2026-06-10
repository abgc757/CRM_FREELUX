# CRM FreeLux

Sistema de gestión comercial para **Aceros y Perfiles FreeLux S.A. de C.V.** — empresa especializada en productos de acero estructural y ferretería industrial.

---

## Estado actual del proyecto

| Fase | Módulo | Estado |
|------|--------|--------|
| 1 | Infraestructura base (Docker, DB, Auth) | ✅ Completado |
| 1 | Catálogo de productos + importación CSV | ✅ Completado |
| 1 | Gestión de clientes | ✅ Completado |
| 2 | Cotizaciones (creación, PDF, búsqueda) | ✅ Completado |
| 2 | Ventas + pagos + conversión desde cotización | ✅ Completado |
| 2 | Generación de documentos (Nota de Venta, Remisión, PDF cotización) | ✅ Completado |
| 3 | CFDI 4.0 vía Facturama (modo sandbox/mock) | ✅ Completado |
| 3 | Compras y Órdenes de Compra | ✅ Completado |
| 3 | Proveedores | ✅ Completado |
| 3 | Inventario + movimientos | ✅ Completado |
| 4 | Cobranza y seguimiento de saldos | ✅ Completado |
| 5 | Dashboard con KPIs en tiempo real | ✅ Completado |
| 5 | Reportes y analytics (ventas, márgenes, top clientes) | ✅ Completado |

---

## Puesta en marcha con Docker

### Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución
- Puertos **3000**, **8000**, **5432** y **6379** libres en el sistema

---

### Paso 1 — Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd CRM_FREELUX
```

---

### Paso 2 — Configurar variables de entorno

**Backend** — copiar el archivo de ejemplo y ajustar si es necesario:

```bash
cp backend/.env.example backend/.env
```

El archivo `backend/.env` generado contiene valores funcionales para desarrollo local. Los campos más importantes:

```env
# Conexión a PostgreSQL (no cambiar si se usa Docker Compose)
DATABASE_URL=postgresql+asyncpg://freelux:freelux_pass@db:5432/freelux_crm

# Clave secreta para JWT — cambiar en producción
SECRET_KEY=change-me-in-production-use-openssl-rand-hex-32

# Facturama CFDI 4.0
# FACTURAMA_MOCK=true  →  genera CFDI localmente sin llamar a Facturama (recomendado para desarrollo)
FACTURAMA_MOCK=true
FACTURAMA_SANDBOX=true
FACTURAMA_USER=        # dejar vacío en modo mock
FACTURAMA_PASSWORD=    # dejar vacío en modo mock
```

**Frontend** — ya tiene valores por defecto, no requiere cambios para desarrollo local:

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

### Paso 3 — Construir e iniciar los contenedores

```bash
docker compose up -d --build
```

Este comando construye y levanta cuatro servicios:

| Servicio | Imagen | Puerto |
|----------|--------|--------|
| `db` | postgres:16-alpine | 5432 |
| `redis` | redis:7-alpine | 6379 |
| `backend` | Python 3.12 + FastAPI | 8000 |
| `frontend` | Node 22 + Next.js 15 | 3000 |

> La primera vez tarda entre 2 y 5 minutos mientras se descargan las imágenes base y se instalan dependencias.

Verificar que todos los contenedores estén en ejecución:

```bash
docker compose ps
```

Todos deben aparecer con estado **Up** (el servicio `db` mostrará **healthy**).

---

### Paso 4 — Ejecutar migraciones de base de datos

```bash
docker compose exec backend alembic upgrade head
```

Esto crea todas las tablas necesarias en PostgreSQL. Solo se necesita ejecutar la primera vez (o al actualizar el código con nuevas migraciones).

---

### Paso 5 — Acceder al sistema

| Recurso | URL |
|---------|-----|
| Aplicación web | http://localhost:3000 |
| API REST (Swagger) | http://localhost:8000/docs |
| API REST (ReDoc) | http://localhost:8000/redoc |

**Credenciales iniciales:**

| Campo | Valor |
|-------|-------|
| Email | `admin@freelux.mx` |
| Contraseña | `Admin1234!` |

---

### Comandos útiles de operación

```bash
# Ver logs de todos los servicios en tiempo real
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Ver logs solo del frontend
docker compose logs -f frontend

# Detener todos los servicios (conserva los datos)
docker compose down

# Detener y eliminar volúmenes (borra base de datos y archivos)
docker compose down -v

# Reconstruir solo el frontend (necesario tras cambios en código)
docker compose up -d --build frontend

# Reconstruir solo el backend
docker compose up -d --build backend

# Abrir una shell en el contenedor backend
docker compose exec backend bash

# Ejecutar una migración nueva
docker compose exec backend alembic upgrade head
```

---

### Desarrollo local (sin Docker)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS
pip install -r requirements.txt
cp .env.example .env
# Editar .env: cambiar @db: por @localhost: en DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Módulos y funcionalidades

### Autenticación y usuarios
- Login con JWT (access token + refresh token)
- Roles: `gerencia`, `administracion`, `ventas`, `compras`, `almacen`
- Acceso seguro a todas las rutas del dashboard

### Catálogo de productos
- Alta, edición y baja de productos
- Campos: clave, descripción, categoría, unidad base, peso por kg, stock
- Precios diferenciados por tipo de cliente (público, mayorista, distribuidor, gobierno)
- Importación masiva desde CSV (formato SICAR)
- Conversión automática de precio entre unidades: `pza ↔ kg ↔ ton`

### Clientes
- CRUD completo de clientes
- Campos fiscales: RFC, razón social, régimen fiscal, uso CFDI, código postal
- Tipo de cliente para aplicar lista de precios correspondiente
- Historial de compras y crédito disponible

### Cotizaciones
- Creación de cotizaciones con buscador de productos en tiempo real
- Cálculo automático de precio unitario al cambiar unidad (pza/kg/ton)
- Descuentos por partida, IVA configurable por producto
- Flujo de estados: `Borrador → Enviada → Aprobada → Convertida`
- Generación de PDF descargable con autenticación JWT
- **Búsqueda por folio o nombre de cliente** con debounce
- Filtros rápidos por estado

### Ventas
- Conversión directa desde cotización aprobada
- Métodos de pago: contado, crédito, transferencia, cheque, efectivo
- Registro de pagos parciales y seguimiento de saldo pendiente
- Generación de **Nota de Venta** y **Remisión** en PDF
- Emisión de **CFDI 4.0** vía Facturama (modo sandbox o producción)
- Descarga autenticada de XML y PDF del CFDI
- **Búsqueda por folio o nombre de cliente** con debounce
- Filtros rápidos por estado

### Facturación CFDI 4.0
- Integración con **Facturama API** (sandbox: `apisandbox.facturama.mx`)
- Modo mock (`FACTURAMA_MOCK=true`): genera XML y PDF localmente sin llamar a Facturama
- El PDF CFDI mock es un documento real generado con WeasyPrint
- Cancelación de CFDI vía API
- Almacenamiento de UUID, URL de XML y PDF en la venta

### Compras y proveedores
- CRUD de proveedores
- Órdenes de compra con partidas y seguimiento de estado
- Recepción parcial o total de mercancía

### Inventario
- Movimientos de entrada, salida y ajuste
- Consulta de stock actual por producto
- Historial de movimientos con trazabilidad

### Cobranza
- Seguimiento de saldos vencidos por cliente
- Registro de pagos contra saldo abierto

### Dashboard y reportes
- **KPIs en tiempo real:** ventas totales, cotizaciones, tasa de conversión, ticket promedio, margen bruto
- **Tendencia de ventas** — gráfica de líneas (Recharts)
- **Top 10 clientes** por ingresos
- **Top 10 productos** más vendidos (gráfica horizontal)
- **Embudo de conversión** cotizaciones → ventas
- **Márgenes brutos** por categoría de producto
- Selector de período: 7 días, 30 días, mes actual, año

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4, diseño propio (sin componentes externos) |
| Estado / Datos | TanStack Query v5 |
| Gráficas | Recharts |
| Backend | FastAPI (Python 3.12), SQLAlchemy 2 async |
| Base de datos | PostgreSQL 16 |
| Migraciones | Alembic |
| Autenticación | JWT — python-jose, passlib/bcrypt |
| PDFs | WeasyPrint + Jinja2 |
| Facturación | Facturama API (CFDI 4.0) |
| Contenedores | Docker Compose |
| Caché | Redis (sesiones y tareas en background) |

---

## Variables de entorno relevantes

```env
# backend/.env

DATABASE_URL=postgresql+asyncpg://freelux:freelux_pass@db:5432/freelux_crm
SECRET_KEY=super-secret-key
FACTURAMA_USER=usuario_sandbox
FACTURAMA_PASSWORD=contrasena_sandbox
FACTURAMA_SANDBOX=true

# true = genera CFDI localmente sin llamar a Facturama
FACTURAMA_MOCK=true
```

---

## Estructura del proyecto

```
CRM_FREELUX/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST
│   │   │   ├── auth.py
│   │   │   ├── clients.py
│   │   │   ├── collections.py
│   │   │   ├── documents.py  # PDF, Nota de Venta, Remisión, CFDI
│   │   │   ├── inventory.py
│   │   │   ├── products.py
│   │   │   ├── purchases.py
│   │   │   ├── quotes.py
│   │   │   ├── reports.py    # KPIs y analytics
│   │   │   ├── sales.py
│   │   │   ├── suppliers.py
│   │   │   └── users.py
│   │   ├── models/           # ORM SQLAlchemy
│   │   ├── schemas/          # Pydantic v2
│   │   ├── services/         # Lógica de negocio
│   │   │   ├── facturama.py  # Emisión de CFDI
│   │   │   └── pdf_generator.py
│   │   └── core/             # Config, seguridad, dependencias
│   └── alembic/              # Migraciones de BD
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/
│   │   └── (dashboard)/
│   │       ├── dashboard/    # Inicio con KPIs
│   │       ├── clients/
│   │       ├── collections/
│   │       ├── inventory/
│   │       ├── products/
│   │       ├── purchases/
│   │       ├── quotes/       # Lista + detalle + nueva cotización
│   │       ├── reports/      # Analytics y gráficas
│   │       └── sales/        # Lista + detalle de venta
│   ├── components/
│   └── lib/                  # api.ts (axios + openFile), auth-store, utils
└── docker-compose.yml
```

---

## Notas de operación

### Rebuild del frontend
Los cambios en el frontend requieren rebuild del contenedor (no hay hot-reload en producción Docker):
```bash
docker compose up -d --build frontend
```

### Cambio de contraseña de usuario
```bash
docker compose exec backend python -c "
import asyncio, sys; sys.path.insert(0, '/app')
from app.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from sqlalchemy import update

async def reset():
    async with AsyncSessionLocal() as db:
        h = hash_password('NuevaContraseña123!')
        await db.execute(update(User).where(User.email == 'admin@freelux.mx').values(hashed_password=h))
        await db.commit()

asyncio.run(reset())
"
```

### Modo CFDI mock vs producción
- `FACTURAMA_MOCK=true` → el CFDI se genera localmente, sin timbrado real. Útil para desarrollo y demos.
- Para producción: configurar `FACTURAMA_USER`, `FACTURAMA_PASSWORD`, `FACTURAMA_SANDBOX=false` y `FACTURAMA_MOCK=false`.

---

## Configuración para producción (PAC / Puesta en marcha)

Esta sección cubre los pasos necesarios para llevar el sistema a un entorno de producción real, incluyendo dominio propio, HTTPS y timbrado CFDI con PAC certificado.

---

### 1. Servidor recomendado

| Recurso | Mínimo recomendado |
|---------|-------------------|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Disco | 40 GB SSD |
| SO | Ubuntu 22.04 LTS o Debian 12 |
| Docker | 24+ con Docker Compose v2 |

---

### 2. Variables de entorno para producción

Editar `backend/.env` con los valores reales de producción:

```env
# ─── Base de datos ────────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://freelux:CONTRASEÑA_SEGURA@db:5432/freelux_crm
POSTGRES_USER=freelux
POSTGRES_PASSWORD=CONTRASEÑA_SEGURA        # cambiar por una contraseña fuerte
POSTGRES_DB=freelux_crm

# ─── Seguridad JWT ────────────────────────────────────────────────────────────
# Generar con: openssl rand -hex 32
SECRET_KEY=clave-secreta-de-64-caracteres-generada-con-openssl
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# ─── CORS ─────────────────────────────────────────────────────────────────────
FRONTEND_URL=https://crm.freelux.mx        # dominio real del frontend

# ─── Facturama PAC — CFDI 4.0 producción ─────────────────────────────────────
FACTURAMA_USER=usuario_produccion_facturama
FACTURAMA_PASSWORD=contraseña_produccion_facturama
FACTURAMA_SANDBOX=false                    # false = timbrado real ante el SAT
FACTURAMA_MOCK=false                       # false = llamar a la API de Facturama

# ─── Almacenamiento de archivos ───────────────────────────────────────────────
MEDIA_DIR=/app/media

# ─── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0
```

Editar `frontend/.env.local` con la URL pública del backend:

```env
NEXT_PUBLIC_API_URL=https://api.freelux.mx/api/v1
```

> **Importante:** nunca subir los archivos `.env` ni `.env.local` al repositorio. Están incluidos en `.gitignore`.

---

### 3. Generar clave secreta JWT

```bash
# En el servidor o localmente con OpenSSL
openssl rand -hex 32
```

Copiar la salida y pegarla en `SECRET_KEY` del `.env`.

---

### 4. Proxy inverso con Nginx + HTTPS (Certbot)

Instalar Nginx y Certbot en el servidor:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

Crear el archivo de configuración `/etc/nginx/sites-available/crm-freelux`:

```nginx
# Frontend
server {
    listen 80;
    server_name crm.freelux.mx;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.freelux.mx;

    # Aumentar límite para subida de archivos (PDFs, imágenes)
    client_max_body_size 20M;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Activar el sitio y obtener certificados SSL:

```bash
sudo ln -s /etc/nginx/sites-available/crm-freelux /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtener certificados HTTPS (reemplazar con los dominios reales)
sudo certbot --nginx -d crm.freelux.mx -d api.freelux.mx
```

Certbot renueva los certificados automáticamente. Verificar con:

```bash
sudo certbot renew --dry-run
```

---

### 5. Configuración de Facturama para timbrado real

1. Crear cuenta en [facturama.mx](https://facturama.mx) (cuenta de producción, no sandbox)
2. Cargar el **Certificado de Sello Digital (CSD)** del emisor en el portal de Facturama:
   - Archivo `.cer` (certificado)
   - Archivo `.key` (llave privada)
   - Contraseña del CSD
3. Configurar los datos fiscales del emisor (RFC, razón social, régimen fiscal, código postal)
4. Obtener las credenciales de API en **Configuración → API** dentro del portal
5. Actualizar el `.env` del backend:

```env
FACTURAMA_USER=tu_usuario_api
FACTURAMA_PASSWORD=tu_contraseña_api
FACTURAMA_SANDBOX=false
FACTURAMA_MOCK=false
```

6. Reiniciar el backend:

```bash
docker compose up -d --build backend
```

> Los datos fiscales del **emisor** en `backend/app/services/facturama.py` (RFC `FME121108UI1`, nombre, régimen) deben coincidir exactamente con los registrados en Facturama. Actualizar antes de ir a producción.

---

### 6. Levantar en producción

```bash
# En el servidor, desde la carpeta del proyecto
docker compose up -d --build

# Ejecutar migraciones (solo la primera vez o al actualizar)
docker compose exec backend alembic upgrade head

# Verificar que todos los servicios estén corriendo
docker compose ps
```

---

### 7. Respaldos de base de datos

Crear un respaldo manual:

```bash
docker compose exec db pg_dump -U freelux freelux_crm > respaldo_$(date +%Y%m%d).sql
```

Restaurar un respaldo:

```bash
cat respaldo_20260610.sql | docker compose exec -T db psql -U freelux freelux_crm
```

Automatizar respaldo diario con cron (en el servidor):

```bash
# Editar crontab
crontab -e

# Agregar esta línea para respaldo a las 2:00 AM cada día
0 2 * * * cd /ruta/al/proyecto && docker compose exec -T db pg_dump -U freelux freelux_crm > /backups/crm_$(date +\%Y\%m\%d).sql
```

---

### 8. Checklist antes de salir a producción

- [ ] `SECRET_KEY` generada con `openssl rand -hex 32` (no usar el valor de ejemplo)
- [ ] `POSTGRES_PASSWORD` cambiada por una contraseña segura
- [ ] `FACTURAMA_MOCK=false` y `FACTURAMA_SANDBOX=false`
- [ ] Credenciales de Facturama de producción configuradas
- [ ] CSD del emisor cargado en el portal de Facturama
- [ ] RFC, razón social y régimen fiscal del emisor actualizados en `facturama.py`
- [ ] `FRONTEND_URL` apuntando al dominio real (para CORS)
- [ ] `NEXT_PUBLIC_API_URL` apuntando a la URL pública del backend
- [ ] Certificados HTTPS activos en ambos dominios
- [ ] Respaldo automático de la base de datos configurado
- [ ] Contraseña del usuario administrador cambiada desde el valor inicial
