import { useEffect, useState } from 'react'
import { getQuotes, convertQuote } from '../services/quotes'
import type { Quote } from '../types'
import { ShoppingCart, CheckCircle } from 'lucide-react'

export default function SalesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await getQuotes()
      setQuotes(data.filter((q) => q.estado !== 'borrador'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleConvert = async (id: number) => {
    try {
      await convertQuote(id)
      load()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ventas</h1>
      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-8 text-gray-500">Cargando...</p>
        ) : quotes.length === 0 ? (
          <div className="card text-center py-12">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay cotizaciones aprobadas para convertir</p>
          </div>
        ) : quotes.filter((q) => q.estado === 'aprobada').map((quote) => (
          <div key={quote.id} className="card flex items-center justify-between">
            <div>
              <span className="font-semibold">{quote.folio}</span>
              <p className="text-sm text-gray-500">Cliente: {quote.cliente?.nombre || `ID ${quote.cliente_id}`}</p>
              <p className="text-sm text-gray-500">Total: ${quote.total.toFixed(2)}</p>
            </div>
            <button onClick={() => handleConvert(quote.id)} className="btn-primary">
              <CheckCircle className="w-4 h-4 mr-2" /> Convertir a Venta
            </button>
          </div>
        ))}
        {quotes.filter((q) => q.estado === 'convertida').length > 0 && (
          <>
            <h2 className="text-lg font-semibold mt-6">Cotizaciones convertidas</h2>
            {quotes.filter((q) => q.estado === 'convertida').map((quote) => (
              <div key={quote.id} className="card bg-green-50">
                <span className="font-semibold">{quote.folio}</span>
                <span className="ml-3 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Convertida</span>
                <p className="text-sm text-gray-600 mt-1">Total: ${quote.total.toFixed(2)}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
