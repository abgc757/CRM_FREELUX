'use client'

import Link from 'next/link'
import { Eye, Pencil } from 'lucide-react'
import { DataTable, type Column } from './DataTable'
import type { Supplier } from '@/types'

interface Props {
  data: Supplier[]
  isLoading?: boolean
  actions?: React.ReactNode
}

const columns: Column<Supplier>[] = [
  { key: 'nombre', header: 'Nombre' },
  {
    key: 'familias',
    header: 'Familias',
    render: (r) => r.familias?.join(', ') ?? '—',
  },
  {
    key: 'tiempo_entrega_promedio_dias',
    header: 'Entrega (días)',
  },
  {
    key: 'fiabilidad_score',
    header: 'Fiabilidad',
    render: (r) => `${(r.fiabilidad_score * 100).toFixed(0)}%`,
  },
  { key: 'ciudad', header: 'Ciudad' },
  { key: 'estado_mx', header: 'Estado' },
  {
    key: 'actions',
    header: '',
    render: (r) => (
      <div className="flex items-center gap-1">
        <Link
          href={`/suppliers/${r.id}`}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <Link
          href={`/suppliers/${r.id}?edit=1`}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#f97316]"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>
    ),
  },
]

export function SuppliersTable({ data, isLoading, actions }: Props) {
  return (
    <DataTable
      data={data as unknown as Record<string, unknown>[]}
      columns={columns as Column<Record<string, unknown>>[]}
      isLoading={isLoading}
      keyExtractor={(r) => r.id as string}
      searchPlaceholder="Buscar proveedor..."
      emptyTitle="Sin proveedores"
      emptyDescription="Agrega tu primer proveedor."
      actions={actions}
    />
  )
}
