import { useEffect, useState } from 'react'
import type { InventoryMovement } from '../types'
import { Warehouse, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

async function getMovements(): Promise<InventoryMovement[]> {
  const { default: api } = await import('../services/api')
  const { data } = await api.get('/inventory/movements', { params: { size: 50 } })
  return data
}

export default function InventoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMovements()
      .then(setMovements)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Movimientos de Inventario</h1>
      {loading ? (
        <p className="text-center py-8 text-gray-500">Cargando...</p>
      ) : movements.length === 0 ? (
        <div className="card text-center py-12">
          <Warehouse className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Sin movimientos registrados</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Producto ID</th>
                  <th className="text-right px-4 py-3">Cantidad</th>
                  <th className="text-left px-4 py-3">Referencia</th>
                  <th className="text-left px-4 py-3">Notas</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        m.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                        m.tipo === 'salida' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {m.tipo === 'entrada' ? <ArrowDownToLine className="w-3 h-3" /> :
                         m.tipo === 'salida' ? <ArrowUpFromLine className="w-3 h-3" /> : null}
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">{m.product_id}</td>
                    <td className="px-4 py-3 text-right font-medium">{m.cantidad}</td>
                    <td className="px-4 py-3 text-gray-500">{m.referencia || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.notes || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
