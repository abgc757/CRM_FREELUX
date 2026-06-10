from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://freelux:freelux_pass@localhost:5432/freelux_crm"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    FACTURAMA_USER: Optional[str] = None
    FACTURAMA_PASSWORD: Optional[str] = None
    FACTURAMA_SANDBOX: bool = True
    FACTURAMA_MOCK: bool = False   # True = simula CFDI sin llamar a Facturama (para desarrollo)

    FRONTEND_URL: str = "http://localhost:3000"
    MEDIA_DIR: str = "/app/media"

    APP_NAME: str = "CRM FreeLux"
    VERSION: str = "1.0.0"


settings = Settings()
