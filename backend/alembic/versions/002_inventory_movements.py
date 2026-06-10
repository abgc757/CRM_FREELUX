"""inventory movements table

Revision ID: 002
Revises: 001
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("tipo", sa.Enum(
            "entrada", "salida", "ajuste_positivo", "ajuste_negativo", "devolucion",
            name="movementtype"
        ), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 4), nullable=False),
        sa.Column("stock_antes", sa.Numeric(12, 4), nullable=False),
        sa.Column("stock_despues", sa.Numeric(12, 4), nullable=False),
        sa.Column("referencia", sa.String(100)),
        sa.Column("notas", sa.Text()),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_inventory_movements_product_id", "inventory_movements", ["product_id"])
    op.create_index("ix_inventory_movements_created_at", "inventory_movements", ["created_at"])


def downgrade() -> None:
    op.drop_table("inventory_movements")
