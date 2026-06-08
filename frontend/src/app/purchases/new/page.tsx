'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PurchaseForm } from '@/components/forms/PurchaseForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCreatePurchase } from '@/hooks/usePurchases'

export default function NewPurchasePage() {
  const router = useRouter()
  const { mutate, isPending } = useCreatePurchase()

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/purchases" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a compras
        </Link>
      </div>
      <PageHeader title="Nueva orden de compra" description="Genera una nueva orden a proveedor" />
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PurchaseForm
          onSubmit={(values) =>
            mutate(values, { onSuccess: (p) => router.push(`/purchases/${p.id}`) })
          }
          isLoading={isPending}
        />
      </div>
    </div>
  )
}
