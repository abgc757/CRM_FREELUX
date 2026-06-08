export type Role = 'admin' | 'gerente' | 'ventas' | 'compras' | 'almacen'

export interface User {
  id: string
  nombre: string
  email: string
  role: Role
}

export interface Client {
  id: string
  nombre: string
  rfc: string
  telefono: string
  email: string
  ciudad: string
  owner_user_id: string
}

export interface Product {
  id: string
  sku: string
  nombre: string
  familia: string
  categoria: string
  peso_kg: number
  costo: number
  precio_1: number
  precio_2: number
  precio_3: number
  precio_4: number
  existencia: number
  inv_min: number
  tiene_impuesto: boolean
}

export interface QuoteItem {
  product_id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  importe: number
  product?: Product
}

export interface Quote {
  id: string
  folio: number
  cliente_id: string
  vendedor_id: string
  fecha_validez: string
  moneda: string
  estado: 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'convertida'
  subtotal: number
  iva: number
  total: number
  items: QuoteItem[]
  cliente?: Client
}

export interface Sale {
  id: string
  quote_id: string
  tipo_documento: 'factura' | 'nota_venta' | 'remision'
  estado: string
  total: number
}

export interface Supplier {
  id: string
  nombre: string
  familias: string[]
  tiempo_entrega_promedio_dias: number
  fiabilidad_score: number
  ciudad: string
  estado_mx: string
}

export interface Purchase {
  id: string
  supplier_id: string
  estado: string
  fecha_esperada: string
  total: number
  supplier?: Supplier
}

export interface InventoryMovement {
  id: string
  product_id: string
  tipo: 'entrada' | 'salida' | 'ajuste' | 'devolucion'
  cantidad: number
  created_at: string
  product?: Product
}

export interface PriceRequest {
  id: string
  quote_id: string
  product_id: string
  vendedor_id: string
  precio_solicitado: number
  precio_actual: number
  motivo: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  created_at: string
}

export interface DashboardStats {
  cotizaciones_pendientes?: number
  clientes_total?: number
  ventas_mes?: number
  ordenes_pendientes?: number
  solicitudes_disponibilidad?: number
  productos_bajo_minimo?: number
  movimientos_hoy?: number
  solicitudes_precio_pendientes?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}
