'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { usePurchases } from '@/hooks/usePurchases'
import { PurchasesTable } from '@/components/tables/PurchasesTable'
import { PageHeader } from '@/components/layout/PageHeader'

export default function PurchasesPage() {
  const { data, isLoading } = usePurchases()

  return (
    <div>
      <PageHeader
        title="Órdenes de compra"
        description="Gestión de compras a proveedores"
        actions={
          <Link
            href="/purchases/new"
            className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Nueva orden
          </Link>
        }
      />
      <PurchasesTable data={data?.items ?? []} isLoading={isLoading} />
    </div>
  )
}
