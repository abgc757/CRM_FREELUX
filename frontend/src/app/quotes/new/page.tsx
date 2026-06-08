'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuoteForm } from '@/components/forms/QuoteForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCreateQuote } from '@/hooks/useQuotes'
import { useAuthStore } from '@/store/authStore'

export default function NewQuotePage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateQuote()
  const { user } = useAuthStore()
  const canEditPrice = user?.role === 'gerente' || user?.role === 'admin'

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Link href="/quotes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a cotizaciones
        </Link>
      </div>
      <PageHeader
        title="Nueva cotización"
        description="Crea una cotización para tu cliente"
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <QuoteForm
          canEditPrice={canEditPrice}
          onSubmit={(values, estado) =>
            mutate(
              {
                ...values,
                vendedor_id: user?.id ?? '',
                estado,
                moneda: values.moneda ?? 'MXN',
              },
              { onSuccess: (q) => router.push(`/quotes/${q.id}`) }
            )
          }
          isLoading={isPending}
        />
      </div>
    </div>
  )
}
