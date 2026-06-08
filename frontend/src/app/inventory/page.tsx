'use client'

import { useState } from 'react'
import Link from 'next/link'
import { History, Plus } from 'lucide-react'
import { useInventory, useCreateMovement } from '@/hooks/useInventory'
import { InventoryTable } from '@/components/tables/InventoryTable'
import { InventoryMovementForm } from '@/components/forms/InventoryMovementForm'
import { PageHeader } from '@/components/layout/PageHeader'

export default function InventoryPage() {
  const { data, isLoading } = useInventory()
  const { mutate: createMovement, isPending } = useCreateMovement()
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Control de existencias y stock"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/inventory/movements"
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <History className="h-4 w-4" />
              Historial
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Registrar movimiento
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Nuevo movimiento</h3>
          <InventoryMovementForm
            onSubmit={(values) =>
              createMovement(values, { onSuccess: () => setShowForm(false) })
            }
            isLoading={isPending}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Sin stock
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-400" /> En mínimo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" /> OK
        </span>
      </div>

      <InventoryTable data={data?.items ?? []} isLoading={isLoading} />
    </div>
  )
}
