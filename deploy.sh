#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Puesta en marcha local completa con Docker Compose
# Uso: bash deploy.sh
# =============================================================================

set -e  # Detener en cualquier error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

log()  { echo -e "${GREEN}[✔] $1${NC}"; }
info() { echo -e "${YELLOW}[→] $1${NC}"; }
err()  { echo -e "${RED}[✘] $1${NC}"; exit 1; }

echo ""
echo "=================================================="
echo "   CRM FreeLux — Despliegue con Docker Compose"
echo "=================================================="
echo ""

# ------------------------------------------------------------------
# 1. Verificar que Docker esté disponible
# ------------------------------------------------------------------
info "Verificando Docker..."
docker info > /dev/null 2>&1 || err "Docker no está en ejecución. Abre Docker Desktop e inténtalo de nuevo."
log "Docker disponible"

# ------------------------------------------------------------------
# 2. Crear archivo .env del backend si no existe
# ------------------------------------------------------------------
if [ ! -f backend/.env ]; then
  info "Creando backend/.env desde backend/.env.example..."
  cp backend/.env.example backend/.env
  log "backend/.env creado — revisa las variables antes de continuar en producción"
else
  log "backend/.env ya existe, se conserva"
fi

# ------------------------------------------------------------------
# 3. Construir imágenes y levantar contenedores
# ------------------------------------------------------------------
info "Construyendo imágenes y levantando contenedores..."
docker compose up -d --build
log "Contenedores en ejecución"

# ------------------------------------------------------------------
# 4. Esperar a que la base de datos esté lista (healthcheck)
# ------------------------------------------------------------------
info "Esperando a que PostgreSQL esté listo..."
MAX_WAIT=60
WAITED=0
until docker compose exec -T db pg_isready -U freelux > /dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    err "PostgreSQL no respondió en ${MAX_WAIT}s. Revisa los logs: docker compose logs db"
  fi
done
log "PostgreSQL listo"

# ------------------------------------------------------------------
# 5. Ejecutar migraciones de base de datos
# ------------------------------------------------------------------
info "Ejecutando migraciones Alembic..."
docker compose exec -T backend alembic upgrade head
log "Migraciones aplicadas"

# ------------------------------------------------------------------
# 6. Verificar que el backend responde
# ------------------------------------------------------------------
info "Verificando que el backend responde..."
MAX_WAIT=30
WAITED=0
until curl -sf http://localhost:8000/docs > /dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    err "El backend no respondió en ${MAX_WAIT}s. Revisa los logs: docker compose logs backend"
  fi
done
log "Backend respondiendo en http://localhost:8000"

# ------------------------------------------------------------------
# 7. Resultado final
# ------------------------------------------------------------------
echo ""
echo "=================================================="
echo -e "${GREEN}   ¡Despliegue completado exitosamente!${NC}"
echo "=================================================="
echo ""
echo "  Aplicación web:  http://localhost:3000"
echo "  API Docs:        http://localhost:8000/docs"
echo ""
echo "  Usuario:         admin@freelux.mx"
echo "  Contraseña:      Admin1234!"
echo ""
echo "  Para ver los logs en tiempo real:"
echo "    docker compose logs -f"
echo ""
