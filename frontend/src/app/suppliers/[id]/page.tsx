'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'
import { SupplierForm } from '@/components/forms/SupplierForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/common/LoadingSpinner'

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const router = useRouter()

  const { data: supplier, isLoading } = useSupplier(id)
  const { mutate: update, isPending } = useUpdateSupplier()

  if (isLoading) return <PageLoader />
  if (!supplier) return <p className="text-gray-500">Proveedor no encontrado.</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/suppliers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a proveedores
        </Link>
      </div>
      <PageHeader
        title={supplier.nombre}
        description={`${supplier.ciudad}, ${supplier.estado_mx}`}
        actions={
          !isEditing && (
            <Link
              href={`/suppliers/${id}?edit=1`}
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
          <SupplierForm
            defaultValues={supplier}
            onSubmit={(values) =>
              update(
                { id, ...values },
                { onSuccess: () => router.push(`/suppliers/${id}`) }
              )
            }
            isLoading={isPending}
          />
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            {[
              { label: 'Familias', value: supplier.familias?.join(', ') },
              { label: 'Tiempo entrega', value: `${supplier.tiempo_entrega_promedio_dias} días` },
              { label: 'Fiabilidad', value: `${(supplier.fiabilidad_score * 100).toFixed(0)}%` },
              { label: 'Ciudad', value: supplier.ciudad },
              { label: 'Estado', value: supplier.estado_mx },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-800">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
