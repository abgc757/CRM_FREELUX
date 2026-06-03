import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createQuote } from '../services/quotes'
import { getClients } from '../services/clients'
import { getProducts } from '../services/products'
import type { Client, Product } from '../types'
import { Plus, Trash2, Search } from 'lucide-react'

interface QuoteItemEntry {
  product_id: number
  product_name: string
  cantidad: number
  precio_unitario: number
  descuento: number
}

export default function QuoteFormPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clienteId, setClienteId] = useState('')
  const [validez, setValidez] = useState(15)
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<QuoteItemEntry[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getClients().then(setClients)
    getProducts().then(setProducts)
  }, [])

  const filteredProducts = products.filter(
    (p) =>
      p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addItem = (product: Product) => {
    if (items.some((i) => i.product_id === product.id)) return
    setItems([...items, {
      product_id: product.id,
      product_name: product.nombre,
      cantidad: 1,
      precio_unitario: product.precio_venta,
      descuento: 0,
    }])
    setProductSearch('')
  }

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: keyof QuoteItemEntry, value: number) => {
    const updated = [...items]
    ;(updated[idx] as any)[field] = value
    setItems(updated)
  }

  const subtotal = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario * (1 - i.descuento / 100), 0)
  const impuesto = subtotal * 0.16
  const total = subtotal + impuesto

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId || items.length === 0) return
    setLoading(true)
    try {
      await createQuote({
        cliente_id: Number(clienteId),
        validez_dias: validez,
        notas,
        items: items.map((i) => ({
          product_id: i.product_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          descuento: i.descuento,
        })),
      })
      navigate('/cotizaciones')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nueva Cotización</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">Datos generales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} - {c.rfc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Validez (días)</label>
              <input type="number" className="input" value={validez} onChange={(e) => setValidez(Number(e.target.value))} min={1} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Productos</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-10"
              placeholder="Buscar producto por nombre o SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>
          {productSearch && (
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {filteredProducts.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex justify-between"
                  onClick={() => addItem(p)}
                >
                  <span>{p.sku} - {p.nombre}</span>
                  <span className="text-gray-500">${p.precio_venta.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Cantidad</th>
                    <th className="text-right py-2">P/U</th>
                    <th className="text-right py-2">Dto %</th>
                    <th className="text-right py-2">Subtotal</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{item.product_name}</td>
                      <td className="py-2">
                        <input type="number" className="input w-20 text-right ml-auto" value={item.cantidad} min={0.01} step={0.01}
                          onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))} />
                      </td>
                      <td className="py-2">
                        <input type="number" className="input w-24 text-right ml-auto" value={item.precio_unitario} min={0} step={0.01}
                          onChange={(e) => updateItem(idx, 'precio_unitario', Number(e.target.value))} />
                      </td>
                      <td className="py-2">
                        <input type="number" className="input w-16 text-right ml-auto" value={item.descuento} min={0} max={100}
                          onChange={(e) => updateItem(idx, 'descuento', Number(e.target.value))} />
                      </td>
                      <td className="py-2 text-right">${(item.cantidad * item.precio_unitario * (1 - item.descuento / 100)).toFixed(2)}</td>
                      <td className="py-2">
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end text-sm space-x-6">
            <span>Subtotal: <strong>${subtotal.toFixed(2)}</strong></span>
            <span>IVA (16%): <strong>${impuesto.toFixed(2)}</strong></span>
            <span className="text-lg">Total: <strong>${total.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/cotizaciones')} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading || items.length === 0}>
            {loading ? 'Creando...' : 'Crear Cotización'}
          </button>
        </div>
      </form>
    </div>
  )
}
