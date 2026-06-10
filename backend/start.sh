#!/usr/bin/env bash
# =============================================================================
# start.sh — Script de inicio del backend para Render.com
# Ejecuta migraciones y luego inicia Uvicorn.
# =============================================================================

set -e

# Render inyecta DATABASE_URL como postgresql://...
# SQLAlchemy async requiere postgresql+asyncpg://...
# Esta línea lo convierte automáticamente.
if [[ "$DATABASE_URL" == postgresql://* ]]; then
  export DATABASE_URL="${DATABASE_URL/postgresql:\/\//postgresql+asyncpg://}"
  echo "[start.sh] DATABASE_URL convertida a asyncpg"
fi

echo "[start.sh] Ejecutando migraciones Alembic..."
alembic upgrade head

echo "[start.sh] Iniciando servidor Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
