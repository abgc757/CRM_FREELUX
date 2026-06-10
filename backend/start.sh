#!/usr/bin/env bash
# =============================================================================
# start.sh — Script de inicio del backend para Render.com
# 1. Convierte DATABASE_URL a asyncpg
# 2. Ejecuta migraciones Alembic
# 3. Crea el usuario administrador si no existe
# 4. Inicia Uvicorn
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# 1. Convertir DATABASE_URL de postgresql:// a postgresql+asyncpg://
# ---------------------------------------------------------------------------
if [[ "$DATABASE_URL" == postgresql://* ]]; then
  export DATABASE_URL="${DATABASE_URL/postgresql:\/\//postgresql+asyncpg://}"
  echo "[start.sh] DATABASE_URL convertida a asyncpg"
fi

# ---------------------------------------------------------------------------
# 2. Migraciones
# ---------------------------------------------------------------------------
echo "[start.sh] Ejecutando migraciones Alembic..."
alembic upgrade head

# ---------------------------------------------------------------------------
# 3. Seed: crear usuario administrador si no existe
# ---------------------------------------------------------------------------
echo "[start.sh] Verificando usuario administrador..."
python - <<'PYEOF'
import asyncio, sys, os
sys.path.insert(0, '/app')

ADMIN_EMAIL    = os.environ.get("ADMIN_EMAIL",    "admin@freelux.mx")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin1234!")
ADMIN_NOMBRE   = os.environ.get("ADMIN_NOMBRE",   "Administrador FreeLux")

async def seed():
    from app.database import AsyncSessionLocal
    from app.core.security import hash_password
    from app.models.user import User, UserRole
    from sqlalchemy import select, update

    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        ).scalar_one_or_none()

        if existing:
            await db.execute(
                update(User)
                .where(User.email == ADMIN_EMAIL)
                .values(hashed_password=hash_password(ADMIN_PASSWORD), is_active=True)
            )
            await db.commit()
            print(f"[seed] Contraseña de {ADMIN_EMAIL} actualizada")
        else:
            db.add(User(
                email=ADMIN_EMAIL,
                hashed_password=hash_password(ADMIN_PASSWORD),
                full_name=ADMIN_NOMBRE,
                role=UserRole.gerencia,
                is_active=True,
            ))
            await db.commit()
            print(f"[seed] Usuario {ADMIN_EMAIL} creado con rol gerencia")

asyncio.run(seed())
PYEOF

# ---------------------------------------------------------------------------
# 4. Iniciar Uvicorn
# ---------------------------------------------------------------------------
echo "[start.sh] Iniciando servidor Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
