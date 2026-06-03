import { useEffect, useState } from 'react'
import { getProducts } from '../services/products'
import type { Product } from '../types'
import { Search } from 'lucide-react'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getProducts({ search })
        setProducts(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-10" placeholder="Buscar por SKU o nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-right px-4 py-3 font-medium">Stock</th>
                <th className="text-right px-4 py-3 font-medium">Costo</th>
                <th className="text-right px-4 py-3 font-medium">Precio</th>
                <th className="text-right px-4 py-3 font-medium">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Sin productos</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">{p.nombre}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.stock <= 0 ? 'text-red-600' : ''}`}>{p.stock}</td>
                  <td className="px-4 py-3 text-right">${p.costo.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">${p.precio_venta.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{p.peso} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
