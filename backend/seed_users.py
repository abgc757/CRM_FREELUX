"""
Seed demo users into the database.
Users created:
  admin@freelux.mx       / Admin1234!      (admin)
  gerente@freelux.mx     / Gerente1234!    (gerente)
  juan.garcia@freelux.mx / Vendedor1234!   (ventas)
"""
import asyncio
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select


USERS = [
    {"nombre": "Administrador",   "email": "admin@freelux.mx",          "password": "Admin1234!",    "role": UserRole.admin},
    {"nombre": "Gerente General", "email": "gerente@freelux.mx",        "password": "Gerente1234!",  "role": UserRole.gerente},
    {"nombre": "Juan García",     "email": "juan.garcia@freelux.mx",    "password": "Vendedor1234!", "role": UserRole.ventas},
]


async def seed():
    async with AsyncSessionLocal() as db:
        created = 0
        for u in USERS:
            result = await db.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if existing is None:
                db.add(User(
                    nombre=u["nombre"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    is_active=True,
                ))
                created += 1
                print(f"  + {u['email']} ({u['role'].value})")
            else:
                existing.password_hash = get_password_hash(u["password"])
                print(f"  ~ {u['email']} — password re-hasheado")
        await db.commit()
        print(f"Done. Usuarios creados: {created}")


if __name__ == "__main__":
    asyncio.run(seed())
