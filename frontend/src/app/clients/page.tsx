'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { ClientsTable } from '@/components/tables/ClientsTable'
import { PageHeader } from '@/components/layout/PageHeader'

export default function ClientsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useClients(page, search)

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestiona tu cartera de clientes"
        actions={
          <Link
            href="/clients/new"
            className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Link>
        }
      />
      <ClientsTable
        data={data?.items ?? []}
        isLoading={isLoading}
      />
    </div>
  )
}
