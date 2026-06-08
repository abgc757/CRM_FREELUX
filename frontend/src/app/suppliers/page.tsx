'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useSuppliers } from '@/hooks/useSuppliers'
import { SuppliersTable } from '@/components/tables/SuppliersTable'
import { PageHeader } from '@/components/layout/PageHeader'

export default function SuppliersPage() {
  const { data, isLoading } = useSuppliers()

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Directorio de proveedores"
        actions={
          <Link
            href="/suppliers/new"
            className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Link>
        }
      />
      <SuppliersTable data={data?.items ?? []} isLoading={isLoading} />
    </div>
  )
}
