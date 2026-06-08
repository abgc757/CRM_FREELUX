'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { ProductsTable } from '@/components/tables/ProductsTable'
import { PageHeader } from '@/components/layout/PageHeader'

export default function ProductsPage() {
  const { data, isLoading } = useProducts()

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de productos y precios"
        actions={
          <Link
            href="/products/new"
            className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Link>
        }
      />
      <ProductsTable data={data?.items ?? []} isLoading={isLoading} />
    </div>
  )
}
