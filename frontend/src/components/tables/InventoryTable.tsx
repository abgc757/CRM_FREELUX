'use client'

import { DataTable, type Column } from './DataTable'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  data: Product[]
  isLoading?: boolean
  actions?: React.ReactNode
}

function StockIndicator({ product }: { product: Product }) {
  const level =
    product.existencia <= 0
      ? 'critical'
      : product.existencia <= product.inv_min
      ? 'warning'
      : 'ok'

  const dot = {
    critical: 'bg-red-500',
    warning: 'bg-yellow-400',
    ok: 'bg-green-500',
  }[level]

  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      <span
        className={cn(
          'font-semibold',
          level === 'critical' && 'text-red-600',
          level === 'warning' && 'text-yellow-600',
          level === 'ok' && 'text-green-700'
        )}
      >
        {formatNumber(product.existencia, 0)}
      </span>
    </div>
  )
}

const columns: Column<Product>[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'familia', header: 'Familia' },
  {
    key: 'existencia',
    header: 'Existencia',
    render: (r) => <StockIndicator product={r} />,
  },
  {
    key: 'inv_min',
    header: 'Mínimo',
    render: (r) => formatNumber(r.inv_min, 0),
  },
]

export function InventoryTable({ data, isLoading, actions }: Props) {
  return (
    <DataTable
      data={data as unknown as Record<string, unknown>[]}
      columns={columns as Column<Record<string, unknown>>[]}
      isLoading={isLoading}
      keyExtractor={(r) => r.id as string}
      searchPlaceholder="Buscar producto..."
      emptyTitle="Sin productos"
      emptyDescription="No hay registros de inventario."
      actions={actions}
    />
  )
}
