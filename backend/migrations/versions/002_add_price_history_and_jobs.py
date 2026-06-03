"""
Add price_history and price_update_jobs tables, plus margin column to products.

Revision ID: 002
Revises: 001
Create Date: 2026-06-02
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add margin column to products (default 20% = 0.20)
    op.add_column("products", sa.Column("margin", sa.Float(), server_default="0.20", nullable=False))

    # Add aliases for MXN/kg columns (can be populated from existing columns)
    op.add_column("products", sa.Column("costo_mxn", sa.Float(), server_default="0.0"))
    op.add_column("products", sa.Column("precio_venta_mxn", sa.Float(), server_default="0.0"))
    op.add_column("products", sa.Column("peso_kg", sa.Float(), server_default="0.0"))

    # Populate new columns from existing ones
    op.execute("UPDATE products SET costo_mxn = costo, precio_venta_mxn = precio_venta, peso_kg = peso")

    # Create price_history table
    op.create_table(
        "price_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False, index=True),
        sa.Column("old_price", sa.Float(), nullable=False),
        sa.Column("new_price", sa.Float(), nullable=False),
        sa.Column("old_margin", sa.Float(), nullable=False),
        sa.Column("new_margin", sa.Float(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("params", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("changed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("price_update_jobs.id"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_price_history_product_created", "price_history", ["product_id", "created_at"])

    # Create price_update_jobs table
    op.create_table(
        "price_update_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("filter_criteria", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("params", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("margin_override", sa.Float(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
        sa.Column("total_products", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("processed_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("errors", postgresql.JSONB(), nullable=True, server_default="[]"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rollback_job_id", sa.Integer(), sa.ForeignKey("price_update_jobs.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_price_update_jobs_status", "price_update_jobs", ["status", "created_at"])


def downgrade():
    op.drop_table("price_history")
    op.drop_table("price_update_jobs")
    op.drop_column("products", "margin")
    op.drop_column("products", "costo_mxn")
    op.drop_column("products", "precio_venta_mxn")
    op.drop_column("products", "peso_kg")
