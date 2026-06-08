'use client'

import Link from 'next/link'
import { Eye, Pencil } from 'lucide-react'
import { DataTable, type Column } from './DataTable'
import type { Client } from '@/types'

interface Props {
  data: Client[]
  isLoading?: boolean
  actions?: React.ReactNode
}

const columns: Column<Client>[] = [
  { key: 'nombre', header: 'Nombre' },
  { key: 'rfc', header: 'RFC' },
  { key: 'telefono', header: 'Teléfono' },
  { key: 'email', header: 'Email' },
  { key: 'ciudad', header: 'Ciudad' },
  {
    key: 'actions',
    header: '',
    render: (row) => (
      <div className="flex items-center gap-1">
        <Link
          href={`/clients/${row.id}`}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <Link
          href={`/clients/${row.id}?edit=1`}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#f97316]"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>
    ),
  },
]

export function ClientsTable({ data, isLoading, actions }: Props) {
  return (
    <DataTable
      data={data as unknown as Record<string, unknown>[]}
      columns={columns as Column<Record<string, unknown>>[]}
      isLoading={isLoading}
      keyExtractor={(r) => r.id as string}
      searchPlaceholder="Buscar cliente..."
      emptyTitle="Sin clientes"
      emptyDescription="Agrega tu primer cliente."
      actions={actions}
    />
  )
}
