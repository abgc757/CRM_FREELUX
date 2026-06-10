import enum
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    String, Boolean, Enum, DateTime, Integer, Numeric,
    Text, ForeignKey, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ClientType(str, enum.Enum):
    publico_general = "publico_general"
    contratista = "contratista"
    constructora = "constructora"
    mayorista = "mayorista"


class UnitType(str, enum.Enum):
    pza = "pza"
    kg = "kg"
    ton = "ton"
    metro = "metro"
    rollo = "rollo"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    clave: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    clave_alterna: Mapped[str | None] = mapped_column(String(50), index=True)
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    departamento: Mapped[str | None] = mapped_column(String(100), index=True)
    categoria: Mapped[str | None] = mapped_column(String(100), index=True)
    caracteristicas: Mapped[str | None] = mapped_column(Text)
    imagen_url: Mapped[str | None] = mapped_column(String(500))
    tags: Mapped[str | None] = mapped_column(String(500))  # comma-separated

    # pricing
    precio_compra: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0)
    peso_kg: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=0)  # weight per piece
    unidad_venta: Mapped[UnitType] = mapped_column(Enum(UnitType), default=UnitType.pza)
    granel: Mapped[bool] = mapped_column(Boolean, default=False)
    tiene_impuesto: Mapped[bool] = mapped_column(Boolean, default=True)

    # stock
    stock_actual: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0)
    stock_min: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0)
    stock_max: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_service: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    prices = relationship("ProductPrice", back_populates="product", cascade="all, delete-orphan")
    price_history = relationship("ProductPriceHistory", back_populates="product", cascade="all, delete-orphan")
    quote_items = relationship("QuoteItem", back_populates="product")

    __table_args__ = (
        Index("ix_products_search", "descripcion", "clave", "tags"),
    )


class ProductPrice(Base):
    """One row per client_type — 4 rows per product."""
    __tablename__ = "product_prices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    client_type: Mapped[ClientType] = mapped_column(Enum(ClientType), nullable=False)
    precio: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False, default=0)
    # volume threshold: apply this price when qty >= volumen_minimo
    volumen_minimo: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0)

    product = relationship("Product", back_populates="prices")


class ProductPriceHistory(Base):
    """Tracks every price change with who made it."""
    __tablename__ = "product_price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    client_type: Mapped[ClientType] = mapped_column(Enum(ClientType), nullable=False)
    precio_anterior: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    precio_nuevo: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reason: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="price_history")
