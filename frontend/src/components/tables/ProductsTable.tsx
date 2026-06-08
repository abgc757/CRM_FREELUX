'use client'

import Link from 'next/link'
import { Eye, Pencil } from 'lucide-react'
import { DataTable, type Column } from './DataTable'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  data: Product[]
  isLoading?: boolean
  actions?: React.ReactNode
}

const columns: Column<Product>[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'familia', header: 'Familia' },
  {
    key: 'existencia',
    header: 'Existencia',
    render: (r) => (
      <span
        className={cn(
          'font-semibold',
          r.existencia <= 0
            ? 'text-red-600'
            : r.existencia <= r.inv_min
            ? 'text-yellow-600'
            : 'text-green-600'
        )}
      >
        {formatNumber(r.existencia, 0)}
      </span>
    ),
  },
  {
    key: 'precio_1',
    header: 'Precio',
    render: (r) => formatCurrency(r.precio_1),
  },
  {
    key: 'actions',
    header: '',
    render: (r) => (
      <div className="flex items-center gap-1">
        <Link
          href={`/products/${r.id}`}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <Link
          href={`/products/${r.id}?edit=1`}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#f97316]"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>
    ),
  },
]

export function ProductsTable({ data, isLoading, actions }: Props) {
  return (
    <DataTable
      data={data as unknown as Record<string, unknown>[]}
      columns={columns as Column<Record<string, unknown>>[]}
      isLoading={isLoading}
      keyExtractor={(r) => r.id as string}
      searchPlaceholder="Buscar por SKU o nombre..."
      emptyTitle="Sin productos"
      emptyDescription="No hay productos registrados."
      actions={actions}
    />
  )
}
