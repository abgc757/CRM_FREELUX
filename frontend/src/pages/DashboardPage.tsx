import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getClients } from '../services/clients'
import { getProducts } from '../services/products'
import { getQuotes } from '../services/quotes'
import { Users, Package, FileText, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const [stats, setStats] = useState({ clients: 0, products: 0, quotes: 0 })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [clients, products, quotes] = await Promise.all([
          getClients({ size: 1 }),
          getProducts({ size: 1 }),
          getQuotes({ size: 1 }),
        ])
        // The total isn't returned directly, but we get the counts from headers
        // For now, we show what's available
        setStats({
          clients: clients.length,
          products: products.length,
          quotes: quotes.length,
        })
      } catch (err) {
        // silent
      }
    }
    loadStats()
  }, [])

  const cards = [
    { label: 'Clientes', value: stats.clients, icon: Users, color: 'bg-blue-500' },
    { label: 'Productos', value: stats.products, icon: Package, color: 'bg-green-500' },
    { label: 'Cotizaciones', value: stats.quotes, icon: FileText, color: 'bg-purple-500' },
    { label: 'Ventas Hoy', value: 0, icon: TrendingUp, color: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bienvenido, {user?.nombre}</h1>
        <p className="text-gray-500">Panel de {user?.role?.name}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="card flex items-center gap-4">
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Acceso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hasRole('ventas') && (
            <>
              <a href="/clientes/nuevo" className="btn-secondary justify-center">Nuevo Cliente</a>
              <a href="/cotizaciones/nueva" className="btn-secondary justify-center">Nueva Cotización</a>
            </>
          )}
          {hasRole('compras') && (
            <a href="/compras" className="btn-secondary justify-center">Nueva Orden de Compra</a>
          )}
          {hasRole('almacen') && (
            <a href="/inventario" className="btn-secondary justify-center">Registrar Movimiento</a>
          )}
        </div>
      </div>
    </div>
  )
}
