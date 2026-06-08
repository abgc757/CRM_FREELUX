'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import { DataTable, type Column } from './DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Quote } from '@/types'

interface Props {
  data: Quote[]
  isLoading?: boolean
  actions?: React.ReactNode
}

const columns: Column<Quote>[] = [
  { key: 'folio', header: 'Folio', render: (r) => `#${r.folio}` },
  {
    key: 'cliente',
    header: 'Cliente',
    render: (r) => r.cliente?.nombre ?? r.cliente_id,
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (r) => <StatusBadge status={r.estado} />,
  },
  {
    key: 'fecha_validez',
    header: 'Validez',
    render: (r) => formatDate(r.fecha_validez),
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
        href={`/quotes/${r.id}`}
        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]"
      >
        <Eye className="h-4 w-4" />
      </Link>
    ),
  },
]

export function QuotesTable({ data, isLoading, actions }: Props) {
  return (
    <DataTable
      data={data as unknown as Record<string, unknown>[]}
      columns={columns as Column<Record<string, unknown>>[]}
      isLoading={isLoading}
      keyExtractor={(r) => r.id as string}
      searchPlaceholder="Buscar cotización..."
      emptyTitle="Sin cotizaciones"
      emptyDescription="Crea tu primera cotización."
      actions={actions}
    />
  )
}
