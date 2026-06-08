'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSuppliers } from '@/hooks/useSuppliers'

const schema = z.object({
  supplier_id: z.string().min(1, 'Proveedor requerido'),
  fecha_esperada: z.string().min(1, 'Fecha requerida'),
  total: z.coerce.number().min(0),
  estado: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<FormValues>
  onSubmit: (values: FormValues) => void
  isLoading?: boolean
}

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]'

export function PurchaseForm({ defaultValues, onSubmit, isLoading }: Props) {
  const { data: suppliersData } = useSuppliers()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'pendiente', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <select {...register('supplier_id')} className={inputCls}>
            <option value="">Seleccionar...</option>
            {suppliersData?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          {errors.supplier_id && (
            <p className="mt-1 text-xs text-red-500">{errors.supplier_id.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha esperada</label>
          <input {...register('fecha_esperada')} type="date" className={inputCls} />
          {errors.fecha_esperada && (
            <p className="mt-1 text-xs text-red-500">{errors.fecha_esperada.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select {...register('estado')} className={inputCls}>
            <option value="pendiente">Pendiente</option>
            <option value="enviada">Enviada</option>
            <option value="recibida">Recibida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total (MXN)</label>
          <input {...register('total')} type="number" step="0.01" min="0" className={inputCls} />
          {errors.total && <p className="mt-1 text-xs text-red-500">{errors.total.message}</p>}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-[#f97316] px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Guardar orden'}
        </button>
      </div>
    </form>
  )
}
