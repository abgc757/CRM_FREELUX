export interface User {
  id: number
  nombre: string
  email: string
  role_id: number
  role?: Role
  vendedor_id?: number
  is_active: boolean
  phone?: string
  created_at: string
}

export interface Role {
  id: number
  name: string
  description?: string
  permissions: string
}

export interface Client {
  id: number
  nombre: string
  rfc: string
  email?: string
  phone?: string
  contact_name?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  owner_user_id: number
  credit_limit: number
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  sku: string
  clave_alterna?: string
  nombre: string
  descripcion?: string
  servicio: boolean
  department?: Department
  category?: Category
  costo: number
  precio_venta: number
  stock: number
  peso: number
  is_active: boolean
  version: number
}

export interface Department {
  id: number
  name: string
  description?: string
}

export interface Category {
  id: number
  name: string
  department_id: number
}

export interface Quote {
  id: number
  folio: string
  cliente_id: number
  vendedor_id: number
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  validez_dias: number
  estado: string
  requires_price_approval: boolean
  price_approval_status: string
  is_active: boolean
  cliente?: Client
  vendedor?: User
  items: QuoteItem[]
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: number
  product_id: number
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
  product?: Product
}

export interface Sale {
  id: number
  folio: string
  quote_id?: number
  cliente_id: number
  vendedor_id: number
  total: number
  factura_solicitada: boolean
  estado: string
  items: SaleItem[]
  remissions: Remission[]
  created_at: string
}

export interface SaleItem {
  id: number
  product_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Remission {
  id: number
  folio: string
  sale_id: number
  estado: string
  created_at: string
}

export interface Supplier {
  id: number
  nombre: string
  rfc: string
  email?: string
  phone?: string
  tiempo_entrega_promedio: number
  fiabilidad_score: number
  distancia_km: number
  familias: string
  is_active: boolean
}

export interface Purchase {
  id: number
  folio: string
  supplier_id: number
  user_id: number
  total: number
  estado: string
  eta?: string
  items: PurchaseItem[]
  created_at: string
}

export interface PurchaseItem {
  id: number
  product_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface InventoryMovement {
  id: number
  product_id: number
  warehouse_id: number
  cantidad: number
  tipo: 'entrada' | 'salida' | 'ajuste'
  referencia?: string
  notes?: string
  user_id: number
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}
