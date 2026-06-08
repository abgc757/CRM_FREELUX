'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useProduct, useUpdateProduct } from '@/hooks/useProducts'
import { ProductForm } from '@/components/forms/ProductForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { formatCurrency } from '@/lib/formatters'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const router = useRouter()

  const { data: product, isLoading } = useProduct(id)
  const { mutate: update, isPending } = useUpdateProduct()

  if (isLoading) return <PageLoader />
  if (!product) return <p className="text-gray-500">Producto no encontrado.</p>

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link href="/products" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a productos
        </Link>
      </div>
      <PageHeader
        title={product.nombre}
        description={`SKU: ${product.sku} · ${product.familia}`}
        actions={
          !isEditing && (
            <Link
              href={`/products/${id}?edit=1`}
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
          <ProductForm
            defaultValues={product}
            onSubmit={(values) =>
              update(
                { id, ...values },
                { onSuccess: () => router.push(`/products/${id}`) }
              )
            }
            isLoading={isPending}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'SKU', value: product.sku },
                { label: 'Familia', value: product.familia },
                { label: 'Categoría', value: product.categoria },
                { label: 'Peso (kg)', value: product.peso_kg },
                { label: 'Existencia', value: product.existencia },
                { label: 'Stock mínimo', value: product.inv_min },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-gray-800">{value}</dd>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Precios</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { label: 'Costo', value: product.costo },
                  { label: 'Lista 1', value: product.precio_1 },
                  { label: 'Lista 2', value: product.precio_2 },
                  { label: 'Lista 3', value: product.precio_3 },
                  { label: 'Lista 4', value: product.precio_4 },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="mt-0.5 font-bold text-[#1e3a5f]">{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
