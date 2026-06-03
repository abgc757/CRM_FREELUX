import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQuotes } from '../services/quotes'
import type { Quote } from '../types'
import { Plus, FileText } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function QuotesPage() {
  const { hasRole } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQuotes()
        setQuotes(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const estadoColor: Record<string, string> = {
    borrador: 'bg-gray-100 text-gray-700',
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    aprobada: 'bg-green-100 text-green-700',
    convertida: 'bg-blue-100 text-blue-700',
    rechazada: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cotizaciones</h1>
        {hasRole('ventas') && (
          <Link to="/cotizaciones/nueva" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Nueva
          </Link>
        )}
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center py-8 text-gray-500">Cargando...</p>
        ) : quotes.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Sin cotizaciones</p>
          </div>
        ) : quotes.map((quote) => (
          <div key={quote.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold">{quote.folio}</span>
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${estadoColor[quote.estado] || 'bg-gray-100'}`}>
                  {quote.estado}
                </span>
              </div>
              <span className="text-lg font-bold">${quote.total.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Cliente: {quote.cliente?.nombre || `ID ${quote.cliente_id}`}</p>
              <p>Vendedor: {quote.vendedor?.nombre || `ID ${quote.vendedor_id}`}</p>
              <p>Items: {quote.items?.length || 0} · Creada: {new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
            {hasRole('gerencia') && quote.requires_price_approval && quote.price_approval_status === 'pending' && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                Requiere aprobación de precio
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
