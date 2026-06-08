import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { Quote } from '@/types'

interface Props {
  quote: Quote
}

export function QuoteSummaryCard({ quote }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">Folio #{quote.folio}</p>
          <p className="mt-0.5 font-semibold text-[#1e3a5f]">
            {quote.cliente?.nombre ?? quote.cliente_id}
          </p>
        </div>
        <StatusBadge status={quote.estado} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">Válida: {formatDate(quote.fecha_validez)}</p>
        <p className="font-bold text-[#f97316]">{formatCurrency(quote.total)}</p>
      </div>
      <Link
        href={`/quotes/${quote.id}`}
        className="mt-3 block text-center text-xs font-medium text-[#1e3a5f] hover:underline"
      >
        Ver detalle →
      </Link>
    </div>
  )
}
