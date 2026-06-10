#!/usr/bin/env bash
# =============================================================================
# start.sh — Script de inicio del backend para Render.com
# Ejecuta migraciones y luego inicia Uvicorn.
# =============================================================================

set -e

echo "[start.sh] Ejecutando migraciones Alembic..."
alembic upgrade head

echo "[start.sh] Iniciando servidor Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
