'use client'

import { useRouter } from 'next/navigation'
import { ClientForm } from '@/components/forms/ClientForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCreateClient } from '@/hooks/useClients'

export default function NewClientPage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateClient()

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nuevo cliente" description="Registra un nuevo cliente en el sistema" />
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ClientForm
          onSubmit={(values) =>
            mutate(
              { ...values } as any,
              { onSuccess: () => router.push('/clients') }
            )
          }
          isLoading={isPending}
        />
      </div>
    </div>
  )
}
