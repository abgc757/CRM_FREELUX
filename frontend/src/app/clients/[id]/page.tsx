'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { ClientForm } from '@/components/forms/ClientForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/common/LoadingSpinner'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const router = useRouter()

  const { data: client, isLoading } = useClient(id)
  const { mutate: update, isPending } = useUpdateClient()

  if (isLoading) return <PageLoader />
  if (!client) return <p className="text-gray-500">Cliente no encontrado.</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/clients" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
      </div>

      <PageHeader
        title={client.nombre}
        description={`RFC: ${client.rfc}`}
        actions={
          !isEditing && (
            <Link
              href={`/clients/${id}?edit=1`}
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
          <ClientForm
            defaultValues={client}
            onSubmit={(values) =>
              update(
                { id, ...values },
                { onSuccess: () => router.push(`/clients/${id}`) }
              )
            }
            isLoading={isPending}
          />
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: 'Nombre', value: client.nombre },
              { label: 'RFC', value: client.rfc },
              { label: 'Teléfono', value: client.telefono },
              { label: 'Email', value: client.email },
              { label: 'Ciudad', value: client.ciudad },
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
