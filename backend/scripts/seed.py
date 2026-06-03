"""
Seed database with initial data from base_productos.csv and default users/roles/warehouses.
Usage: python -m scripts.seed
"""

import asyncio
import csv
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.database import Base
from app.core.security import hash_password
from app.models import (
    Role, User, Department, Category, Product, Warehouse,
)


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Create roles
        roles_data = [
            {"name": "admin", "description": "Administrador del sistema", "permissions": '["all"]'},
            {"name": "gerencia", "description": "Gerencia - aprueba precios, ve todo", "permissions": '["read","write","approve_prices"]'},
            {"name": "ventas", "description": "Ventas - clientes, cotizaciones", "permissions": '["read","write","create_quotes","create_clients"]'},
            {"name": "compras", "description": "Compras - proveedores, órdenes", "permissions": '["read","write","create_purchases","manage_suppliers"]'},
            {"name": "almacen", "description": "Almacén - inventario", "permissions": '["read","write","inventory_movements"]'},
        ]
        roles = {}
        for r_data in roles_data:
            role = Role(**r_data)
            session.add(role)
            roles[r_data["name"]] = role
        await session.flush()

        # Create admin user
        admin = User(
            nombre="Administrador",
            email="admin@ferrecrm.com",
            password_hash=hash_password("admin123"),
            role_id=roles["admin"].id,
        )
        session.add(admin)
        await session.flush()

        # Create default users per department
        users_data = [
            {"nombre": "Gerente General", "email": "gerencia@ferrecrm.com", "password": "gerencia123", "role": "gerencia"},
            {"nombre": "Vendedor 1", "email": "ventas@ferrecrm.com", "password": "ventas123", "role": "ventas"},
            {"nombre": "Comprador 1", "email": "compras@ferrecrm.com", "password": "compras123", "role": "compras"},
            {"nombre": "Almacenista 1", "email": "almacen@ferrecrm.com", "password": "almacen123", "role": "almacen"},
        ]
        users = {}
        for u_data in users_data:
            user = User(
                nombre=u_data["nombre"],
                email=u_data["email"],
                password_hash=hash_password(u_data["password"]),
                role_id=roles[u_data["role"]].id,
            )
            session.add(user)
            users[u_data["role"]] = user
        await session.flush()

        # Create warehouse
        warehouse = Warehouse(name="Almacén Principal", location="Matriz")
        session.add(warehouse)
        await session.flush()

        # Create departments and categories from CSV
        csv_path = Path(__file__).parent.parent.parent / "BASE_PRODUCTOS.csv"
        if csv_path.exists():
            with open(csv_path, encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                dept_cache = {}
                cat_cache = {}
                row_count = 0
                for row in reader:
                    dept_name = row.get("DEPARTAMENTO", "General").strip()
                    cat_name = row.get("CATEGORIA", "General").strip()
                    if dept_name not in dept_cache:
                        dept = Department(name=dept_name)
                        session.add(dept)
                        await session.flush()
                        dept_cache[dept_name] = dept
                    cat_key = f"{dept_name}:{cat_name}"
                    if cat_name and cat_key not in cat_cache:
                        cat = Category(name=cat_name, department_id=dept_cache[dept_name].id)
                        session.add(cat)
                        await session.flush()
                        cat_cache[cat_key] = cat

                    sku = row.get("CLAVE", "").strip()
                    nombre = row.get("DESCRIPCION", "").strip()
                    costo_str = row.get("PRECIO COMPRA", "0").strip()
                    precio_str = row.get("PRECIO 1", "0").strip()
                    exist_str = row.get("EXIST.", "0").strip()
                    peso_str = row.get("PESO", "0").strip()
                    try:
                        product = Product(
                            sku=sku,
                            clave_alterna=row.get("CLAVE ALTERNA", "").strip(),
                            nombre=nombre,
                            servicio=row.get("SERVICIO (S/N)", "false").strip().lower() == "true",
                            department_id=dept_cache.get(dept_name).id if dept_name in dept_cache else None,
                            category_id=cat_cache.get(cat_key).id if cat_key in cat_cache else None,
                            inv_min=int(float(row.get("INV_MIN", 0) or 0)),
                            inv_max=int(float(row.get("INV_MAX", 0) or 0)),
                            costo=float(costo_str) if costo_str else 0.0,
                            precio_venta=float(precio_str) if precio_str else 0.0,
                            precio_2=float(row.get("PRECIO 2", 0) or 0),
                            mayoreo_2=int(float(row.get("MAYOREO 2", 0) or 0)),
                            precio_3=float(row.get("PRECIO 3", 0) or 0),
                            mayoreo_3=int(float(row.get("MAYOREO 3", 0) or 0)),
                            precio_4=float(row.get("PRECIO 4", 0) or 0),
                            mayoreo_4=int(float(row.get("MAYOREO 4", 0) or 0)),
                            peso=float(peso_str) if peso_str else 0.0,
                            stock=float(exist_str) if exist_str else 0.0,
                            caracteristicas=row.get("CARACTERISTICAS", ""),
                            receta=row.get("RECETA (S/N)", "false").strip().lower() == "true",
                            granel=row.get("GRANEL (S/N)", "false").strip().lower() == "true",
                            impuesto=row.get("IMPUESTO (S/N)", "true").strip().lower() != "false",
                        )
                        session.add(product)
                        row_count += 1
                    except (ValueError, KeyError) as e:
                        print(f"Error processing row {row_count + 2}: {e}")
                        continue
                    if row_count % 100 == 0:
                        await session.flush()
                await session.flush()
                print(f"Seeded {row_count} products from CSV")
        else:
            print(f"CSV not found at {csv_path}, skipping product seed")

        await session.commit()
        print("Seed completed successfully!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
