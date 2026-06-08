"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS quote_folio_seq START 1000 INCREMENT 1")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "gerente", "ventas", "compras", "almacen", name="userrole"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("rfc", sa.String(13), nullable=True),
        sa.Column("telefono", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("direccion", sa.String(500), nullable=True),
        sa.Column("ciudad", sa.String(100), nullable=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_clients_owner_user_id", "clients", ["owner_user_id"])

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sku", sa.String(50), nullable=False, unique=True),
        sa.Column("nombre", sa.String(500), nullable=False),
        sa.Column("familia", sa.String(100), nullable=True),
        sa.Column("categoria", sa.String(100), nullable=True),
        sa.Column("departamento", sa.String(100), nullable=True),
        sa.Column("peso_kg", sa.Float, nullable=True),
        sa.Column("costo", sa.Numeric(12, 4), nullable=False, default=0),
        sa.Column("precio_1", sa.Numeric(12, 4), nullable=False, default=0),
        sa.Column("precio_2", sa.Numeric(12, 4), nullable=True),
        sa.Column("precio_3", sa.Numeric(12, 4), nullable=True),
        sa.Column("precio_4", sa.Numeric(12, 4), nullable=True),
        sa.Column("mayoreo_2", sa.Integer, nullable=True),
        sa.Column("mayoreo_3", sa.Integer, nullable=True),
        sa.Column("mayoreo_4", sa.Integer, nullable=True),
        sa.Column("tiene_impuesto", sa.Boolean, nullable=False, default=True),
        sa.Column("existencia", sa.Numeric(12, 4), nullable=False, default=0),
        sa.Column("inv_min", sa.Numeric(12, 4), nullable=True),
        sa.Column("inv_max", sa.Numeric(12, 4), nullable=True),
        sa.Column("caracteristicas", sa.String(1000), nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, default=True),
        sa.Column("version", sa.Integer, nullable=False, default=0),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_products_sku", "products", ["sku"])

    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("rfc", sa.String(13), nullable=True),
        sa.Column("contacto", sa.String(200), nullable=True),
        sa.Column("telefono", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("direccion", sa.String(500), nullable=True),
        sa.Column("ciudad", sa.String(100), nullable=True),
        sa.Column("estado_mx", sa.String(100), nullable=True),
        sa.Column("lat", sa.Float, nullable=True),
        sa.Column("lng", sa.Float, nullable=True),
        sa.Column("familias", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("tiempo_entrega_promedio_dias", sa.Integer, nullable=True),
        sa.Column("fiabilidad_score", sa.Integer, nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "quotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "folio",
            sa.Integer,
            sa.Sequence("quote_folio_seq"),
            server_default=sa.text("nextval('quote_folio_seq')"),
            unique=True,
        ),
        sa.Column("cliente_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("vendedor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("fecha_validez", sa.DateTime, nullable=True),
        sa.Column("moneda", sa.String(3), nullable=False, default="MXN"),
        sa.Column(
            "estado",
            sa.Enum("borrador", "enviada", "aprobada", "rechazada", "convertida", name="quotestatus"),
            nullable=False,
        ),
        sa.Column("subtotal", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("iva", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("total", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "quote_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quote_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("quotes.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("descripcion", sa.String(500), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 4), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(12, 4), nullable=False),
        sa.Column("importe", sa.Numeric(14, 4), nullable=False),
    )

    op.create_table(
        "sales",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quote_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("quotes.id"), nullable=True),
        sa.Column("vendedor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("cliente_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column(
            "tipo_documento",
            sa.Enum("factura", "nota_venta", "remision", name="tipodocumento"),
            nullable=False,
        ),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "completada", "cancelada", name="salestatus"),
            nullable=False,
        ),
        sa.Column("subtotal", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("iva", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("total", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("solicitante_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("borrador", "enviada", "recibida", "cancelada", name="purchasestatus"),
            nullable=False,
        ),
        sa.Column("fecha_esperada", sa.DateTime, nullable=True),
        sa.Column("subtotal", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("iva", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("total", sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "purchase_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("purchase_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchases.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("descripcion", sa.String(500), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 4), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(12, 4), nullable=False),
        sa.Column("cantidad_recibida", sa.Numeric(12, 4), nullable=False, default=0),
    )

    op.create_table(
        "warehouses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("ubicacion", sa.String(500), nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, default=True),
    )

    op.create_table(
        "inventory_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("almacen_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column(
            "tipo",
            sa.Enum("entrada", "salida", "ajuste", "devolucion", name="movementtype"),
            nullable=False,
        ),
        sa.Column("cantidad", sa.Numeric(12, 4), nullable=False),
        sa.Column("cantidad_anterior", sa.Numeric(12, 4), nullable=False),
        sa.Column(
            "referencia_tipo",
            sa.Enum("venta", "compra", "ajuste", name="referenciatype"),
            nullable=True,
        ),
        sa.Column("referencia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "price_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("precio_anterior", sa.Numeric(12, 4), nullable=True),
        sa.Column("precio_nuevo", sa.Numeric(12, 4), nullable=True),
        sa.Column("costo_anterior", sa.Numeric(12, 4), nullable=True),
        sa.Column("costo_nuevo", sa.Numeric(12, 4), nullable=True),
        sa.Column("motivo", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "price_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quote_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("quotes.id"), nullable=True),
        sa.Column("vendedor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("gerente_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("producto_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("precio_solicitado", sa.Numeric(12, 4), nullable=False),
        sa.Column("precio_aprobado", sa.Numeric(12, 4), nullable=True),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "aprobado", "rechazado", name="pricerequeststatus"),
            nullable=False,
        ),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("price_requests")
    op.drop_table("price_history")
    op.drop_table("inventory_movements")
    op.drop_table("warehouses")
    op.drop_table("purchase_items")
    op.drop_table("purchases")
    op.drop_table("sales")
    op.drop_table("quote_items")
    op.drop_table("quotes")
    op.drop_table("suppliers")
    op.drop_table("products")
    op.drop_table("clients")
    op.drop_table("users")
    op.execute("DROP SEQUENCE IF EXISTS quote_folio_seq")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS quotestatus")
    op.execute("DROP TYPE IF EXISTS tipodocumento")
    op.execute("DROP TYPE IF EXISTS salestatus")
    op.execute("DROP TYPE IF EXISTS purchasestatus")
    op.execute("DROP TYPE IF EXISTS movementtype")
    op.execute("DROP TYPE IF EXISTS referenciatype")
    op.execute("DROP TYPE IF EXISTS pricerequeststatus")
