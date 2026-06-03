from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    APP_NAME: str = "FerreCRM"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://ferrecrm:ferrecrm@localhost:5432/ferrecrm"
    DATABASE_URL_SYNC: str = "postgresql://ferrecrm:ferrecrm@localhost:5432/ferrecrm"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    RATE_LIMIT_PER_MINUTE: int = 60

    ML_ENABLED: bool = False
    FEATURE_STORE_PATH: str = "/data/features"
    MODEL_REGISTRY_PATH: str = "/data/models"

    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
