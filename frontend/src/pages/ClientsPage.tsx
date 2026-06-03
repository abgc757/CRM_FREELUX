import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getClients } from '../services/clients'
import type { Client } from '../types'
import { Plus, Search, Edit } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function ClientsPage() {
  const { hasRole } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getClients({ search })
        setClients(data)
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
        <h1 className="text-2xl font-bold">Clientes</h1>
        {hasRole('ventas') && (
          <Link to="/clientes/nuevo" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Nuevo
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">RFC</th>
                <th className="text-left px-4 py-3 font-medium">Contacto</th>
                <th className="text-left px-4 py-3 font-medium">Teléfono</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Cargando...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Sin clientes</td></tr>
              ) : clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{client.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{client.rfc}</td>
                  <td className="px-4 py-3">{client.contact_name || '-'}</td>
                  <td className="px-4 py-3">{client.phone || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/clientes/${client.id}/editar`} className="btn-secondary py-1 px-2 text-xs">
                      <Edit className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
