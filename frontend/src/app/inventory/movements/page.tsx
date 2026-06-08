'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useInventoryMovements } from '@/hooks/useInventory'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { InventoryMovement } from '@/types'

const tipoConfig: Record<string, { label: string; className: string }> = {
  entrada: { label: 'Entrada', className: 'bg-green-100 text-green-700' },
  salida: { label: 'Salida', className: 'bg-red-100 text-red-700' },
  ajuste: { label: 'Ajuste', className: 'bg-blue-100 text-blue-700' },
  devolucion: { label: 'Devolución', className: 'bg-purple-100 text-purple-700' },
}

const columns: Column<InventoryMovement>[] = [
  {
    key: 'created_at',
    header: 'Fecha',
    render: (r) => formatDateTime(r.created_at),
  },
  {
    key: 'product_id',
    header: 'Producto',
    render: (r) => r.product?.nombre ?? r.product_id,
  },
  {
    key: 'tipo',
    header: 'Tipo',
    render: (r) => {
      const cfg = tipoConfig[r.tipo]
      return (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
          {cfg.label}
        </span>
      )
    },
  },
  { key: 'cantidad', header: 'Cantidad' },
]

export default function MovementsPage() {
  const { data, isLoading } = useInventoryMovements()

  return (
    <div>
      <div className="mb-4">
        <Link href="/inventory" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a inventario
        </Link>
      </div>
      <PageHeader
        title="Movimientos de inventario"
        description="Historial de entradas, salidas y ajustes"
      />
      <DataTable
        data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        isLoading={isLoading}
        keyExtractor={(r) => r.id as string}
        searchPlaceholder="Buscar movimiento..."
        emptyTitle="Sin movimientos"
        emptyDescription="No hay movimientos registrados."
      />
    </div>
  )
}
