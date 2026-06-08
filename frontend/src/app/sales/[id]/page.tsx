'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency } from '@/lib/formatters'
import api from '@/lib/api'
import type { Sale } from '@/types'

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: sale, isLoading } = useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      const { data } = await api.get<Sale>(`/api/v1/sales/${id}`)
      return data
    },
    enabled: !!id,
  })

  if (isLoading) return <PageLoader />
  if (!sale) return <p className="text-gray-500">Venta no encontrada.</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/sales" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a ventas
        </Link>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#1e3a5f]">
            Venta — {sale.tipo_documento.replace('_', ' ')}
          </h1>
          <StatusBadge status={sale.estado} />
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Cotización origen</dt>
            <dd className="mt-0.5 text-sm font-medium">
              <Link href={`/quotes/${sale.quote_id}`} className="text-[#1e3a5f] hover:underline">
                {sale.quote_id.slice(0, 12)}...
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Total</dt>
            <dd className="mt-0.5 text-lg font-bold text-[#f97316]">{formatCurrency(sale.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
