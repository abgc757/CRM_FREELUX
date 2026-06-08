'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  estado_mx: z.string().min(2, 'Estado requerido'),
  familias: z.string().min(1, 'Al menos una familia'),
  tiempo_entrega_promedio_dias: z.coerce.number().min(1),
  fiabilidad_score: z.coerce.number().min(0).max(1),
})

type FormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<FormValues & { familias: string[] }>
  onSubmit: (values: Omit<FormValues, 'familias'> & { familias: string[] }) => void
  isLoading?: boolean
}

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]'

export function SupplierForm({ defaultValues, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? { ...defaultValues, familias: defaultValues.familias?.join(', ') }
      : undefined,
  })

  const handleSubmitTransform = (values: FormValues) => {
    onSubmit({
      ...values,
      familias: values.familias.split(',').map((f) => f.trim()).filter(Boolean),
    })
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitTransform)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input {...register('nombre')} className={inputCls} />
          {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input {...register('ciudad')} className={inputCls} />
          {errors.ciudad && <p className="mt-1 text-xs text-red-500">{errors.ciudad.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <input {...register('estado_mx')} className={inputCls} />
          {errors.estado_mx && <p className="mt-1 text-xs text-red-500">{errors.estado_mx.message}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Familias de productos
          </label>
          <input
            {...register('familias')}
            placeholder="Acero, Perfiles, Varilla"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">Separadas por comas</p>
          {errors.familias && <p className="mt-1 text-xs text-red-500">{errors.familias.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tiempo entrega (días)
          </label>
          <input {...register('tiempo_entrega_promedio_dias')} type="number" min={1} className={inputCls} />
          {errors.tiempo_entrega_promedio_dias && (
            <p className="mt-1 text-xs text-red-500">{errors.tiempo_entrega_promedio_dias.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Score fiabilidad (0–1)
          </label>
          <input
            {...register('fiabilidad_score')}
            type="number"
            min={0}
            max={1}
            step="0.01"
            className={inputCls}
          />
          {errors.fiabilidad_score && (
            <p className="mt-1 text-xs text-red-500">{errors.fiabilidad_score.message}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-[#f97316] px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Guardar proveedor'}
        </button>
      </div>
    </form>
  )
}
