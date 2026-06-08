'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import { DataTable, type Column } from './DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Purchase } from '@/types'

interface Props {
  data: Purchase[]
  isLoading?: boolean
  actions?: React.ReactNode
}

const columns: Column<Purchase>[] = [
  {
    key: 'supplier',
    header: 'Proveedor',
    render: (r) => r.supplier?.nombre ?? r.supplier_id,
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (r) => <StatusBadge status={r.estado} />,
  },
  {
    key: 'fecha_esperada',
    header: 'Fecha esperada',
    render: (r) => formatDate(r.fecha_esperada),
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
        href={`/purchases/${r.id}`}
        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]"
      >
        <Eye className="h-4 w-4" />
      </Link>
    ),
  },
]

export function PurchasesTable({ data, isLoading, actions }: Props) {
  return (
    <DataTable
      data={data as unknown as Record<string, unknown>[]}
      columns={columns as Column<Record<string, unknown>>[]}
      isLoading={isLoading}
      keyExtractor={(r) => r.id as string}
      searchPlaceholder="Buscar orden de compra..."
      emptyTitle="Sin órdenes de compra"
      emptyDescription="Crea tu primera orden de compra."
      actions={actions}
    />
  )
}
