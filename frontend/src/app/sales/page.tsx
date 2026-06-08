'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency } from '@/lib/formatters'
import api from '@/lib/api'
import type { Sale, PaginatedResponse } from '@/types'
import Link from 'next/link'
import { Eye } from 'lucide-react'

const columns: Column<Sale>[] = [
  {
    key: 'tipo_documento',
    header: 'Tipo',
    render: (r) => (
      <span className="capitalize text-gray-700">{r.tipo_documento.replace('_', ' ')}</span>
    ),
  },
  { key: 'quote_id', header: 'Cotización', render: (r) => `Cot. ${r.quote_id.slice(0, 8)}` },
  {
    key: 'estado',
    header: 'Estado',
    render: (r) => <StatusBadge status={r.estado} />,
  },
  {
    key: 'total',
    header: 'Total',
    render: (r) => (
      <span className="font-semibold text-[#1e3a5f]">{formatCurrency(r.total)}</span>
    ),
  },
  {
    key: 'actions',
    header: '',
    render: (r) => (
      <Link
        href={`/sales/${r.id}`}
        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]"
      >
        <Eye className="h-4 w-4" />
      </Link>
    ),
  },
]

export default function SalesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Sale>>('/api/v1/sales')
      return data
    },
  })

  return (
    <div>
      <PageHeader title="Ventas" description="Historial de ventas y documentos generados" />
      <DataTable
        data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        isLoading={isLoading}
        keyExtractor={(r) => r.id as string}
        searchPlaceholder="Buscar venta..."
        emptyTitle="Sin ventas"
        emptyDescription="Las ventas aparecerán aquí cuando conviertas cotizaciones."
      />
    </div>
  )
}
