"""
Initial database schema.

Revision ID: 001
Revises:
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Users & Roles
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("description", sa.String(255)),
        sa.Column("permissions", sa.String(1000), server_default="[]"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("phone", sa.String(20)),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # Products
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "supplier_family_catalog",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("rfc", sa.String(20), nullable=False, unique=True),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("contact_name", sa.String(150)),
        sa.Column("address", sa.String(500)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("ubicacion", sa.String(200)),
        sa.Column("website", sa.String(500)),
        sa.Column("tiempo_entrega_promedio", sa.Integer(), server_default="0"),
        sa.Column("fiabilidad_score", sa.Float(), server_default="0.0"),
        sa.Column("distancia_km", sa.Float(), server_default="0.0"),
        sa.Column("familias", sa.Text(), server_default="[]"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "warehouses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("location", sa.String(200)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sku", sa.String(50), nullable=False, unique=True),
        sa.Column("clave_alterna", sa.String(50)),
        sa.Column("nombre", sa.String(300), nullable=False),
        sa.Column("descripcion", sa.Text()),
        sa.Column("servicio", sa.Boolean(), server_default="false"),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id")),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id")),
        sa.Column("inv_min", sa.Integer(), server_default="0"),
        sa.Column("inv_max", sa.Integer(), server_default="0"),
        sa.Column("costo", sa.Float(), server_default="0.0"),
        sa.Column("costo_mxn", sa.Float(), server_default="0.0"),
        sa.Column("precio_venta", sa.Float(), server_default="0.0"),
        sa.Column("precio_venta_mxn", sa.Float(), server_default="0.0"),
        sa.Column("precio_2", sa.Float(), server_default="0.0"),
        sa.Column("mayoreo_2", sa.Integer(), server_default="0"),
        sa.Column("precio_3", sa.Float(), server_default="0.0"),
        sa.Column("mayoreo_3", sa.Integer(), server_default="0"),
        sa.Column("precio_4", sa.Float(), server_default="0.0"),
        sa.Column("mayoreo_4", sa.Integer(), server_default="0"),
        sa.Column("peso", sa.Float(), server_default="0.0"),
        sa.Column("peso_kg", sa.Float(), server_default="0.0"),
        sa.Column("stock", sa.Float(), server_default="0.0"),
        sa.Column("caracteristicas", sa.Text()),
        sa.Column("margin", sa.Float(), server_default="0.20"),
        sa.Column("receta", sa.Boolean(), server_default="false"),
        sa.Column("granel", sa.Boolean(), server_default="false"),
        sa.Column("impuesto", sa.Boolean(), server_default="true"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # Clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("rfc", sa.String(20), nullable=False, unique=True),
        sa.Column("email", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("contact_name", sa.String(150)),
        sa.Column("address", sa.String(500)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("zip_code", sa.String(10)),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("credit_limit", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("notes", sa.String(1000)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # Quotes
    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("folio", sa.String(20), nullable=False, unique=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subtotal", sa.Float(), server_default="0.0"),
        sa.Column("descuento", sa.Float(), server_default="0.0"),
        sa.Column("impuesto", sa.Float(), server_default="0.0"),
        sa.Column("total", sa.Float(), server_default="0.0"),
        sa.Column("validez_dias", sa.Integer(), server_default="15"),
        sa.Column("notas", sa.Text()),
        sa.Column("estado", sa.String(20), server_default="borrador"),
        sa.Column("requires_price_approval", sa.Boolean(), server_default="false"),
        sa.Column("price_approval_status", sa.String(20), server_default="none"),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("pdf_generated", sa.Boolean(), server_default="false"),
        sa.Column("pdf_url", sa.String(500)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "quote_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("precio_unitario", sa.Float(), nullable=False),
        sa.Column("descuento", sa.Float(), server_default="0.0"),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.Column("notas", sa.Text()),
        sa.PrimaryKeyConstraint("id"),
    )

    # Sales
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("folio", sa.String(20), nullable=False, unique=True),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id")),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("vendedor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subtotal", sa.Float(), server_default="0.0"),
        sa.Column("descuento", sa.Float(), server_default="0.0"),
        sa.Column("impuesto", sa.Float(), server_default="0.0"),
        sa.Column("total", sa.Float(), server_default="0.0"),
        sa.Column("tipo", sa.String(20), server_default="contado"),
        sa.Column("factura_solicitada", sa.Boolean(), server_default="false"),
        sa.Column("factura_uuid", sa.String(100)),
        sa.Column("notas", sa.Text()),
        sa.Column("estado", sa.String(20), server_default="completada"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "sale_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("precio_unitario", sa.Float(), nullable=False),
        sa.Column("descuento", sa.Float(), server_default="0.0"),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "remissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("folio", sa.String(20), nullable=False, unique=True),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("fecha_entrega", sa.DateTime(timezone=True)),
        sa.Column("direccion_entrega", sa.String(500)),
        sa.Column("recibio_nombre", sa.String(150)),
        sa.Column("recibio_firma", sa.String(500)),
        sa.Column("notas", sa.Text()),
        sa.Column("estado", sa.String(20), server_default="pendiente"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # Purchases
    op.create_table(
        "purchases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("folio", sa.String(20), nullable=False, unique=True),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subtotal", sa.Float(), server_default="0.0"),
        sa.Column("impuesto", sa.Float(), server_default="0.0"),
        sa.Column("total", sa.Float(), server_default="0.0"),
        sa.Column("estado", sa.String(20), server_default="solicitada"),
        sa.Column("eta", sa.DateTime(timezone=True)),
        sa.Column("notas", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "purchase_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("purchase_id", sa.Integer(), sa.ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("precio_unitario", sa.Float(), nullable=False),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Inventory
    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("referencia", sa.String(100)),
        sa.Column("referencia_tipo", sa.String(50)),
        sa.Column("notes", sa.Text()),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # Availability
    op.create_table(
        "availability_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id")),
        sa.Column("purchase_id", sa.Integer(), sa.ForeignKey("purchases.id")),
        sa.Column("requested_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("estado", sa.String(20), server_default="pendiente"),
        sa.Column("eta_response", sa.DateTime(timezone=True)),
        sa.Column("response_notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("availability_requests")
    op.drop_table("inventory_movements")
    op.drop_table("purchase_items")
    op.drop_table("purchases")
    op.drop_table("remissions")
    op.drop_table("sale_items")
    op.drop_table("sales")
    op.drop_table("quote_items")
    op.drop_table("quotes")
    op.drop_table("clients")
    op.drop_table("products")
    op.drop_table("warehouses")
    op.drop_table("suppliers")
    op.drop_table("supplier_family_catalog")
    op.drop_table("categories")
    op.drop_table("departments")
    op.drop_table("users")
    op.drop_table("roles")
