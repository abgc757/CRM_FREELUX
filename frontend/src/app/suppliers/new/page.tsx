'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SupplierForm } from '@/components/forms/SupplierForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCreateSupplier } from '@/hooks/useSuppliers'

export default function NewSupplierPage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateSupplier()

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/suppliers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a proveedores
        </Link>
      </div>
      <PageHeader title="Nuevo proveedor" description="Registra un nuevo proveedor" />
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SupplierForm
          onSubmit={(values) =>
            mutate(values, { onSuccess: () => router.push('/suppliers') })
          }
          isLoading={isPending}
        />
      </div>
    </div>
  )
}
