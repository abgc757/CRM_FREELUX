"""ERP: módulos de Logística y Punto de Venta (POS)

Revision ID: 004
Revises: 003
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Logística ─────────────────────────────────────────────────────────────
    op.create_table(
        "vehiculos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("placa", sa.String(20), unique=True, nullable=False),
        sa.Column("descripcion", sa.String(200), nullable=False),
        sa.Column("capacidad_kg", sa.Numeric(10, 2)),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_vehiculos_placa", "vehiculos", ["placa"])

    op.create_table(
        "operadores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("licencia", sa.String(50)),
        sa.Column("telefono", sa.String(30)),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "pedidos_entrega",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("folio", sa.String(20), unique=True, nullable=False),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id")),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("direccion_entrega", sa.Text(), nullable=False),
        sa.Column("ciudad", sa.String(100)),
        sa.Column("contacto_entrega", sa.String(200)),
        sa.Column("telefono_entrega", sa.String(30)),
        sa.Column("fecha_programada", sa.Date()),
        sa.Column("fecha_entrega_real", sa.Date()),
        sa.Column("vehiculo_id", sa.Integer(), sa.ForeignKey("vehiculos.id")),
        sa.Column("operador_id", sa.Integer(), sa.ForeignKey("operadores.id")),
        sa.Column("status", sa.Enum(
            "pendiente", "programado", "en_ruta", "entregado", "cancelado",
            name="deliverystatus",
        ), nullable=False, default="pendiente"),
        sa.Column("notas", sa.Text()),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )
    op.create_index("ix_pedidos_entrega_folio", "pedidos_entrega", ["folio"])
    op.create_index("ix_pedidos_entrega_status", "pedidos_entrega", ["status"])
    op.create_index("ix_pedidos_entrega_fecha_programada", "pedidos_entrega", ["fecha_programada"])
    op.create_index("ix_pedidos_entrega_client_id", "pedidos_entrega", ["client_id"])

    op.create_table(
        "pedido_entrega_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("pedido_id", sa.Integer(), sa.ForeignKey("pedidos_entrega.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id")),
        sa.Column("descripcion", sa.String(500), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 4), nullable=False),
        sa.Column("unidad", sa.String(20)),
    )
    op.create_index("ix_pedido_entrega_items_pedido_id", "pedido_entrega_items", ["pedido_id"])

    # ── POS ───────────────────────────────────────────────────────────────────
    op.create_table(
        "sesiones_caja",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("folio", sa.String(20), unique=True, nullable=False),
        sa.Column("cajero_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.Enum("abierta", "cerrada", name="sessionstatus"),
                  nullable=False, default="abierta"),
        sa.Column("fondo_inicial", sa.Numeric(14, 2), default=0),
        sa.Column("total_efectivo", sa.Numeric(14, 2), default=0),
        sa.Column("total_tarjeta", sa.Numeric(14, 2), default=0),
        sa.Column("total_transferencia", sa.Numeric(14, 2), default=0),
        sa.Column("total_ventas", sa.Numeric(14, 2), default=0),
        sa.Column("num_transacciones", sa.Integer(), default=0),
        sa.Column("efectivo_contado", sa.Numeric(14, 2)),
        sa.Column("diferencia", sa.Numeric(14, 2)),
        sa.Column("notas", sa.Text()),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_sesiones_caja_folio", "sesiones_caja", ["folio"])
    op.create_index("ix_sesiones_caja_cajero_id", "sesiones_caja", ["cajero_id"])
    op.create_index("ix_sesiones_caja_status", "sesiones_caja", ["status"])

    op.create_table(
        "pos_ventas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("folio", sa.String(20), unique=True, nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sesiones_caja.id"), nullable=False),
        sa.Column("cajero_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id")),
        sa.Column("subtotal", sa.Numeric(14, 2), default=0),
        sa.Column("iva", sa.Numeric(14, 2), default=0),
        sa.Column("total", sa.Numeric(14, 2), default=0),
        sa.Column("metodo_pago", sa.Enum(
            "efectivo", "tarjeta", "transferencia", "mixto",
            name="pospaymentmethod",
        ), default="efectivo"),
        sa.Column("monto_efectivo", sa.Numeric(14, 2), default=0),
        sa.Column("monto_tarjeta", sa.Numeric(14, 2), default=0),
        sa.Column("monto_transferencia", sa.Numeric(14, 2), default=0),
        sa.Column("cambio", sa.Numeric(14, 2), default=0),
        sa.Column("notas", sa.Text()),
        sa.Column("is_cancelled", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_pos_ventas_folio", "pos_ventas", ["folio"])
    op.create_index("ix_pos_ventas_session_id", "pos_ventas", ["session_id"])

    op.create_table(
        "pos_venta_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("venta_id", sa.Integer(), sa.ForeignKey("pos_ventas.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id")),
        sa.Column("descripcion", sa.String(500), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 4), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(14, 2), nullable=False),
        sa.Column("descuento_pct", sa.Numeric(5, 2), default=0),
        sa.Column("subtotal", sa.Numeric(14, 2), nullable=False),
        sa.Column("tiene_iva", sa.Boolean(), default=True),
    )
    op.create_index("ix_pos_venta_items_venta_id", "pos_venta_items", ["venta_id"])


def downgrade() -> None:
    op.drop_table("pos_venta_items")
    op.drop_table("pos_ventas")
    op.drop_table("sesiones_caja")
    op.drop_table("pedido_entrega_items")
    op.drop_table("pedidos_entrega")
    op.drop_table("operadores")
    op.drop_table("vehiculos")
    op.execute("DROP TYPE IF EXISTS deliverystatus")
    op.execute("DROP TYPE IF EXISTS sessionstatus")
    op.execute("DROP TYPE IF EXISTS pospaymentmethod")
