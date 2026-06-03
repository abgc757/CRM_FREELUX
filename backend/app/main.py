from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import Response
import time
import logging

from app.core.config import settings
from app.database import engine, Base
from app.api.v1.router import api_router

logger = logging.getLogger(settings.APP_NAME)

request_count = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint"])
request_duration = Histogram("http_request_duration_seconds", "HTTP request duration", ["method", "endpoint"])

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    logger.info("Shutting down")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="CRM para Ferretería - Ventas, Compras y Almacén",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    request_count.labels(method=request.method, endpoint=request.url.path).inc()
    request_duration.labels(method=request.method, endpoint=request.url.path).observe(duration)
    return response


app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION, "app": settings.APP_NAME}


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }
