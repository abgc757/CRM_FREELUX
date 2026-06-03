from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    old_margin = Column(Float, nullable=False)
    new_margin = Column(Float, nullable=False)
    reason = Column(Text)
    params = Column(JSONB, default=dict)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("price_update_jobs.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="price_history", foreign_keys=[product_id])
    changed_by_user = relationship("User", foreign_keys=[changed_by])
    job = relationship("PriceUpdateJob", foreign_keys=[job_id])
