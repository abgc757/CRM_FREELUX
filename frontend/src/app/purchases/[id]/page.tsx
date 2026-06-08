'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { usePurchase, useUpdatePurchase } from '@/hooks/usePurchases'
import { PurchaseForm } from '@/components/forms/PurchaseForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const router = useRouter()

  const { data: purchase, isLoading } = usePurchase(id)
  const { mutate: update, isPending } = useUpdatePurchase()

  if (isLoading) return <PageLoader />
  if (!purchase) return <p className="text-gray-500">Orden no encontrada.</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/purchases" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a compras
        </Link>
      </div>
      <PageHeader
        title={`Orden — ${purchase.supplier?.nombre ?? purchase.supplier_id}`}
        description={`Fecha esperada: ${formatDate(purchase.fecha_esperada)}`}
        actions={
          !isEditing && (
            <Link
              href={`/purchases/${id}?edit=1`}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          )
        }
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {isEditing ? (
          <PurchaseForm
            defaultValues={purchase}
            onSubmit={(values) =>
              update(
                { id, ...values },
                { onSuccess: () => router.push(`/purchases/${id}`) }
              )
            }
            isLoading={isPending}
          />
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Estado</dt>
              <dd className="mt-0.5"><StatusBadge status={purchase.estado} /></dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Total</dt>
              <dd className="mt-0.5 text-lg font-bold text-[#f97316]">{formatCurrency(purchase.total)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Proveedor</dt>
              <dd className="mt-0.5 text-sm font-medium">{purchase.supplier?.nombre ?? purchase.supplier_id}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Fecha esperada</dt>
              <dd className="mt-0.5 text-sm font-medium">{formatDate(purchase.fecha_esperada)}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  )
}
