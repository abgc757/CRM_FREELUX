import { useEffect, useState } from 'react'
import { listSuppliers, searchSuppliers } from '../services/suppliers'
import type { Supplier } from '../types'
import { Search, Star } from 'lucide-react'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = search ? await searchSuppliers(search) : await listSuppliers()
        setSuppliers(data)
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
      <h1 className="text-2xl font-bold">Proveedores</h1>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-10" placeholder="Buscar por nombre, familia o ubicación..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="col-span-full text-center py-8 text-gray-500">Cargando...</p>
        ) : suppliers.length === 0 ? (
          <p className="col-span-full text-center py-8 text-gray-500">Sin proveedores</p>
        ) : suppliers.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{s.nombre}</h3>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {s.fiabilidad_score.toFixed(1)}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>RFC: {s.rfc}</p>
              <p>Entrega: {s.tiempo_entrega_promedio} días</p>
              <p>Distancia: {s.distancia_km} km</p>
              {s.familias && <p>Familias: {s.familias}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
