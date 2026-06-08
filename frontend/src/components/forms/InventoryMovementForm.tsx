'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  product_id: z.string().min(1, 'Producto requerido'),
  tipo: z.enum(['entrada', 'salida', 'ajuste', 'devolucion']),
  cantidad: z.coerce.number().min(0.01, 'Cantidad inválida'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  defaultProductId?: string
  onSubmit: (values: FormValues) => void
  isLoading?: boolean
  onCancel?: () => void
}

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]'

export function InventoryMovementForm({ defaultProductId, onSubmit, isLoading, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'entrada', product_id: defaultProductId },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ID / SKU Producto</label>
        <input {...register('product_id')} className={inputCls} placeholder="SKU o ID" />
        {errors.product_id && (
          <p className="mt-1 text-xs text-red-500">{errors.product_id.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento</label>
        <select {...register('tipo')} className={inputCls}>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          <option value="ajuste">Ajuste</option>
          <option value="devolucion">Devolución</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
        <input {...register('cantidad')} type="number" step="0.01" min="0" className={inputCls} />
        {errors.cantidad && (
          <p className="mt-1 text-xs text-red-500">{errors.cantidad.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-[#f97316] px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  )
}
