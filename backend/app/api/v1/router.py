from fastapi import APIRouter
from app.api.v1 import auth, users, products, clients, quotes, sales, documents, suppliers, purchases, inventory, collections, reports

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(clients.router)
api_router.include_router(quotes.router)
api_router.include_router(sales.router)
api_router.include_router(documents.router)
api_router.include_router(suppliers.router)
api_router.include_router(purchases.router)
api_router.include_router(inventory.router)
api_router.include_router(collections.router)
api_router.include_router(reports.router)
