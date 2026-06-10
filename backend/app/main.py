from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.config import settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.MEDIA_DIR, exist_ok=True)
    os.makedirs(f"{settings.MEDIA_DIR}/products", exist_ok=True)
    os.makedirs(f"{settings.MEDIA_DIR}/pdfs", exist_ok=True)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

_origins = [
    "http://localhost:3000",
    "https://crm-freelux-frontend.onrender.com",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in _origins:
    # Normaliza: agrega https:// si viene sin scheme (desde Render fromService)
    url = settings.FRONTEND_URL
    if not url.startswith("http"):
        url = f"https://{url}"
    _origins.append(url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    # Acepta cualquier subdominio onrender.com (cubre sufijos aleatorios de Render)
    allow_origin_regex=r"https://crm-freelux-.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

media_dir = settings.MEDIA_DIR
if os.path.exists(media_dir):
    app.mount("/media", StaticFiles(directory=media_dir), name="media")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
