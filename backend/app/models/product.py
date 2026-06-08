import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(500), nullable=False)
    familia: Mapped[str] = mapped_column(String(100), nullable=True)
    categoria: Mapped[str] = mapped_column(String(100), nullable=True)
    departamento: Mapped[str] = mapped_column(String(100), nullable=True)
    peso_kg: Mapped[float] = mapped_column(Float, default=0.0, nullable=True)
    costo: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=False)
    precio_1: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=False)
    precio_2: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=True)
    precio_3: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=True)
    precio_4: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=True)
    mayoreo_2: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    mayoreo_3: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    mayoreo_4: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    tiene_impuesto: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    existencia: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=False)
    inv_min: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=True)
    inv_max: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0, nullable=True)
    caracteristicas: Mapped[str] = mapped_column(String(1000), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    price_history = relationship("PriceHistory", back_populates="product")
    inventory_movements = relationship("InventoryMovement", back_populates="product")
