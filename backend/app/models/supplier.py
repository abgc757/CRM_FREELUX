from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, func, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

supplier_family_association = Table(
    "supplier_families",
    Base.metadata,
    Column("supplier_id", Integer, ForeignKey("suppliers.id"), primary_key=True),
    Column("family_name", String(100), primary_key=True),
)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    rfc = Column(String(20), unique=True, nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    contact_name = Column(String(150))
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(100))
    ubicacion = Column(String(200))
    website = Column(String(500))
    tiempo_entrega_promedio = Column(Integer, default=0)
    fiabilidad_score = Column(Float, default=0.0)
    distancia_km = Column(Float, default=0.0)
    familias = Column(Text, default="[]")
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    purchases = relationship("Purchase", back_populates="supplier")


class SupplierFamily(Base):
    __tablename__ = "supplier_family_catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
