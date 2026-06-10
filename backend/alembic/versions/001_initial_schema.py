"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("gerencia","administracion","ventas","compras","almacen", name="userrole"), nullable=False, server_default="ventas"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # products
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clave", sa.String(50), nullable=False, unique=True),
        sa.Column("clave_alterna", sa.String(50)),
        sa.Column("descripcion", sa.String(500), nullable=False),
        sa.Column("departamento", sa.String(100)),
        sa.Column("categoria", sa.String(100)),
        sa.Column("caracteristicas", sa.Text()),
        sa.Column("imagen_url", sa.String(500)),
        sa.Column("tags", sa.String(500)),
        sa.Column("precio_compra", sa.Numeric(12, 4), server_default="0"),
        sa.Column("peso_kg", sa.Numeric(10, 4), server_default="0"),
        sa.Column("unidad_venta", sa.Enum("pza","kg","ton","metro","rollo", name="unittype"), server_default="pza"),
        sa.Column("granel", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("tiene_impuesto", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("stock_actual", sa.Numeric(12, 4), server_default="0"),
        sa.Column("stock_min", sa.Numeric(12, 4), server_default="0"),
        sa.Column("stock_max", sa.Numeric(12, 4), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("is_service", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_products_clave", "products", ["clave"])
    op.create_index("ix_products_categoria", "products", ["categoria"])
    op.create_index("ix_products_departamento", "products", ["departamento"])

    # product_prices
    op.create_table(
        "product_prices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_type", sa.Enum("publico_general","contratista","constructora","mayorista", name="clienttype"), nullable=False),
        sa.Column("precio", sa.Numeric(12, 4), nullable=False, server_default="0"),
        sa.Column("volumen_minimo", sa.Numeric(12, 4), server_default="0"),
    )
    op.create_index("ix_product_prices_product_id", "product_prices", ["product_id"])

    # product_price_history
    op.create_table(
        "product_price_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_type", sa.Enum("publico_general","contratista","constructora","mayorista", name="clienttype"), nullable=False),
        sa.Column("precio_anterior", sa.Numeric(12, 4)),
        sa.Column("precio_nuevo", sa.Numeric(12, 4)),
        sa.Column("changed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reason", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # suppliers
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("razon_social", sa.String(255)),
        sa.Column("rfc", sa.String(20)),
        sa.Column("contacto", sa.String(255)),
        sa.Column("email", sa.String(255)),
        sa.Column("telefono", sa.String(30)),
        sa.Column("direccion", sa.Text()),
        sa.Column("lead_time_dias", sa.Integer(), server_default="3"),
        sa.Column("notas", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("razon_social", sa.String(255)),
        sa.Column("rfc", sa.String(20)),
        sa.Column("tipo", sa.Enum("publico_general","contratista","constructora","mayorista", name="clienttype"), server_default="publico_general"),
        sa.Column("email", sa.String(255)),
        sa.Column("telefono", sa.String(30)),
        sa.Column("whatsapp", sa.String(30)),
        sa.Column("direccion", sa.Text()),
        sa.Column("ciudad", sa.String(100)),
        sa.Column("estado", sa.String(100)),
        sa.Column("cp", sa.String(10)),
        sa.Column("uso_cfdi", sa.String(10), server_default="G03"),
        sa.Column("regimen_fiscal", sa.String(10)),
        sa.Column("credito_activo", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("limite_credito", sa.Numeric(12, 2), server_default="0"),
        sa.Column("dias_credito", sa.Integer(), server_default="30"),
        sa.Column("saldo_pendiente", sa.Numeric(12, 2), server_default="0"),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("notas", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_clients_nombre", "clients", ["nombre"])
    op.create_index("ix_clients_rfc", "clients", ["rfc"])
    op.create_index("ix_clients_seller_id", "clients", ["seller_id"])

    # quotes
    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("folio", sa.String(20), nullable=False, unique=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.Enum("borrador","enviada","aprobada","convertida","cancelada", name="quotestatus"), server_default="borrador"),
        sa.Column("notas", sa.Text()),
        sa.Column("condiciones_pago", sa.String(100)),
        sa.Column("vigencia_dias", sa.Integer(), server_default="15"),
        sa.Column("subtotal", sa.Numeric(14, 2), server_default="0"),
        sa.Column("iva", sa.Numeric(14, 2), server_default="0"),
        sa.Column("total", sa.Numeric(14, 2), server_default="0"),
        sa.Column("pdf_url", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_quotes_folio", "quotes", ["folio"])
    op.create_index("ix_quotes_client_id", "quotes", ["client_id"])

    # quote_items
    op.create_table(
        "quote_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("descripcion", sa.String(500)),
        sa.Column("cantidad", sa.Numeric(12, 4)),
        sa.Column("unidad", sa.Enum("pza","kg","ton","metro","rollo", name="unittype"), server_default="pza"),
        sa.Column("precio_unitario", sa.Numeric(12, 4)),
        sa.Column("descuento_pct", sa.Numeric(5, 2), server_default="0"),
        sa.Column("subtotal", sa.Numeric(14, 2)),
        sa.Column("tiene_iva", sa.Boolean(), server_default=sa.text("true")),
    )

    # sales
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("folio", sa.String(20), nullable=False, unique=True),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id")),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.Enum("pendiente","facturada","nota_venta","entregada","cancelada", name="salestatus"), server_default="pendiente"),
        sa.Column("metodo_pago", sa.Enum("contado","credito","transferencia","cheque","efectivo", name="paymentmethod"), server_default="contado"),
        sa.Column("subtotal", sa.Numeric(14, 2), server_default="0"),
        sa.Column("iva", sa.Numeric(14, 2), server_default="0"),
        sa.Column("total", sa.Numeric(14, 2), server_default="0"),
        sa.Column("saldo_pendiente", sa.Numeric(14, 2), server_default="0"),
        sa.Column("cfdi_uuid", sa.String(50)),
        sa.Column("cfdi_xml_url", sa.String(500)),
        sa.Column("cfdi_pdf_url", sa.String(500)),
        sa.Column("remision_url", sa.String(500)),
        sa.Column("notas", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # payments
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("monto", sa.Numeric(14, 2)),
        sa.Column("metodo", sa.Enum("contado","credito","transferencia","cheque","efectivo", name="paymentmethod")),
        sa.Column("referencia", sa.String(100)),
        sa.Column("notas", sa.Text()),
        sa.Column("registered_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # purchase_orders
    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("folio", sa.String(20), nullable=False, unique=True),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.Enum("borrador","enviada","confirmada","recibida_parcial","recibida","cancelada", name="purchasestatus"), server_default="borrador"),
        sa.Column("fecha_requerida", sa.Date()),
        sa.Column("notas", sa.Text()),
        sa.Column("subtotal", sa.Numeric(14, 2), server_default="0"),
        sa.Column("iva", sa.Numeric(14, 2), server_default="0"),
        sa.Column("total", sa.Numeric(14, 2), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # purchase_order_items
    op.create_table(
        "purchase_order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("descripcion", sa.String(500)),
        sa.Column("cantidad_solicitada", sa.Numeric(12, 4)),
        sa.Column("cantidad_recibida", sa.Numeric(12, 4), server_default="0"),
        sa.Column("unidad", sa.Enum("pza","kg","ton","metro","rollo", name="unittype")),
        sa.Column("precio_unitario", sa.Numeric(12, 4)),
        sa.Column("subtotal", sa.Numeric(14, 2)),
    )


def downgrade() -> None:
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")
    op.drop_table("payments")
    op.drop_table("sales")
    op.drop_table("quote_items")
    op.drop_table("quotes")
    op.drop_table("clients")
    op.drop_table("suppliers")
    op.drop_table("product_price_history")
    op.drop_table("product_prices")
    op.drop_table("products")
    op.drop_table("users")
