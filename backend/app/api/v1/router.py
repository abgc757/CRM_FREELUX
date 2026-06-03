from fastapi import APIRouter
from . import auth, clients, products, quotes, sales, suppliers, purchases, inventory, price_management, ml

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(products.router)
api_router.include_router(quotes.router)
api_router.include_router(sales.router)
api_router.include_router(suppliers.router)
api_router.include_router(purchases.router)
api_router.include_router(inventory.router)
api_router.include_router(price_management.router)
api_router.include_router(ml.router)
