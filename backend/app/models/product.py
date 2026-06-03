from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    categories = relationship("Category", back_populates="department")
    products = relationship("Product", back_populates="department")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    department = relationship("Department", back_populates="categories")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    clave_alterna = Column(String(50))
    nombre = Column(String(300), nullable=False)
    descripcion = Column(Text)
    servicio = Column(Boolean, default=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    inv_min = Column(Integer, default=0)
    inv_max = Column(Integer, default=0)
    costo = Column(Float, default=0.0)
    costo_mxn = Column(Float, default=0.0)
    precio_venta = Column(Float, default=0.0)
    precio_venta_mxn = Column(Float, default=0.0)
    precio_2 = Column(Float, default=0.0)
    mayoreo_2 = Column(Integer, default=0)
    precio_3 = Column(Float, default=0.0)
    mayoreo_3 = Column(Integer, default=0)
    precio_4 = Column(Float, default=0.0)
    mayoreo_4 = Column(Integer, default=0)
    peso = Column(Float, default=0.0)
    peso_kg = Column(Float, default=0.0)
    stock = Column(Float, default=0.0)
    caracteristicas = Column(Text)
    margin = Column(Float, default=0.20)
    receta = Column(Boolean, default=False)
    granel = Column(Boolean, default=False)
    impuesto = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    version = Column(Integer, default=1)

    department = relationship("Department", back_populates="products", foreign_keys=[department_id])
    category = relationship("Category", back_populates="products", foreign_keys=[category_id])
    inventory_movements = relationship("InventoryMovement", back_populates="product")
    quote_items = relationship("QuoteItem", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")
