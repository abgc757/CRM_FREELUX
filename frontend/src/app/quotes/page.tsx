'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useQuotes } from '@/hooks/useQuotes'
import { QuotesTable } from '@/components/tables/QuotesTable'
import { PageHeader } from '@/components/layout/PageHeader'

export default function QuotesPage() {
  const { data, isLoading } = useQuotes()

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        description="Historial y gestión de cotizaciones"
        actions={
          <Link
            href="/quotes/new"
            className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Nueva cotización
          </Link>
        }
      />
      <QuotesTable data={data?.items ?? []} isLoading={isLoading} />
    </div>
  )
}
