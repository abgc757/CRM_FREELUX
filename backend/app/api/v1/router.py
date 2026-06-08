from fastapi import APIRouter

from app.api.v1 import auth, clients, inventory, ml, price_management, products, purchases, quotes, sales, suppliers

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(products.router)
api_router.include_router(suppliers.router)
api_router.include_router(quotes.router)
api_router.include_router(sales.router)
api_router.include_router(purchases.router)
api_router.include_router(inventory.router)
api_router.include_router(price_management.router)
api_router.include_router(ml.router)
