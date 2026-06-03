from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class PriceUpdateJob(Base):
    __tablename__ = "price_update_jobs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    filter_criteria = Column(JSONB, default=dict)
    params = Column(JSONB, default=dict)
    margin_override = Column(Float)
    status = Column(String(20), default="pending", index=True)
    total_products = Column(Integer, default=0)
    processed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    errors = Column(JSONB, default=list)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
    rollback_job_id = Column(Integer, ForeignKey("price_update_jobs.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    rollback_job = relationship("PriceUpdateJob", remote_side=[id], foreign_keys=[rollback_job_id])
    price_history = relationship("PriceHistory", back_populates="job", foreign_keys="PriceHistory.job_id")
