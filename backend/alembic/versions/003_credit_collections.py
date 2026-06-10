"""credit and collections fields

Revision ID: 003
Revises: 002
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # fecha_vencimiento on sales (due date = created_at + client.dias_credito)
    op.add_column("sales", sa.Column("fecha_vencimiento", sa.Date(), nullable=True))

    # fecha_pago on payments (explicit payment date, defaults to registration date)
    op.add_column("payments", sa.Column("fecha_pago", sa.Date(), nullable=True))

    # Index to speed up overdue queries
    op.create_index("ix_sales_fecha_vencimiento", "sales", ["fecha_vencimiento"])
    op.create_index("ix_sales_saldo_pendiente", "sales", ["saldo_pendiente"])


def downgrade() -> None:
    op.drop_index("ix_sales_saldo_pendiente", "sales")
    op.drop_index("ix_sales_fecha_vencimiento", "sales")
    op.drop_column("payments", "fecha_pago")
    op.drop_column("sales", "fecha_vencimiento")
