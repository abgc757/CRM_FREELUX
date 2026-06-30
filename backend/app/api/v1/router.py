from fastapi import APIRouter
from app.api.v1 import (
    auth, users, products, clients, quotes, sales, documents,
    suppliers, purchases, inventory, collections, reports,
    logistics, pos,
)

def _build_router(prefix: str) -> APIRouter:
    r = APIRouter(prefix=prefix)
    r.include_router(auth.router)
    r.include_router(users.router)
    r.include_router(products.router)
    r.include_router(clients.router)
    r.include_router(quotes.router)
    r.include_router(sales.router)
    r.include_router(documents.router)
    r.include_router(suppliers.router)
    r.include_router(purchases.router)
    r.include_router(inventory.router)
    r.include_router(collections.router)
    r.include_router(reports.router)
    r.include_router(logistics.router)
    r.include_router(pos.router)
    return r

# Ruta canónica
api_router = _build_router("/api/v1")

# Alias /v1/* para compatibilidad con el proxy del frontend desplegado
api_router_v1 = _build_router("/v1")
