import { useEffect, useState } from 'react'
import type { Purchase } from '../types'
import { Package } from 'lucide-react'

async function getPurchases(): Promise<Purchase[]> {
  const { default: api } = await import('../services/api')
  const { data } = await api.get('/purchases')
  return data
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPurchases()
      .then(setPurchases)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
      {loading ? (
        <p className="text-center py-8 text-gray-500">Cargando...</p>
      ) : purchases.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Sin órdenes de compra</p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <span className="font-semibold">{p.folio}</span>
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${
                  p.estado === 'recibida' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{p.estado}</span>
                <p className="text-sm text-gray-500 mt-1">Proveedor ID: {p.supplier_id}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${p.total.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
