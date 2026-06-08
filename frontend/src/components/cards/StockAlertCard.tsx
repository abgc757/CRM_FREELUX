import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  product: Product
}

function getStockLevel(product: Product): 'critical' | 'warning' | 'ok' {
  if (product.existencia <= 0) return 'critical'
  if (product.existencia <= product.inv_min) return 'warning'
  return 'ok'
}

const levelConfig = {
  critical: { label: 'Sin stock', bar: 'bg-red-500', text: 'text-red-600' },
  warning: { label: 'Stock mínimo', bar: 'bg-yellow-400', text: 'text-yellow-600' },
  ok: { label: 'OK', bar: 'bg-green-500', text: 'text-green-600' },
}

export function StockAlertCard({ product }: Props) {
  const level = getStockLevel(product)
  const config = levelConfig[level]
  const pct = product.inv_min > 0
    ? Math.min(100, (product.existencia / (product.inv_min * 2)) * 100)
    : 100

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1e3a5f]">{product.nombre}</p>
          <p className="text-xs text-gray-400">{product.sku}</p>
        </div>
        {level !== 'ok' && (
          <AlertTriangle className={cn('h-4 w-4 shrink-0', config.text)} />
        )}
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Existencia: <span className="font-medium">{product.existencia}</span></span>
          <span>Mín: {product.inv_min}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className={cn('h-1.5 rounded-full transition-all', config.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={cn('mt-1 text-xs font-medium', config.text)}>{config.label}</p>
      </div>
      <Link
        href={`/products/${product.id}`}
        className="mt-2 block text-xs font-medium text-[#1e3a5f] hover:underline"
      >
        Ver producto →
      </Link>
    </div>
  )
}
