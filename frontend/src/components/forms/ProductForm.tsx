'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  sku: z.string().min(1, 'SKU requerido'),
  nombre: z.string().min(2, 'Nombre requerido'),
  familia: z.string().min(1, 'Familia requerida'),
  categoria: z.string().min(1, 'Categoría requerida'),
  peso_kg: z.coerce.number().min(0),
  costo: z.coerce.number().min(0),
  precio_1: z.coerce.number().min(0),
  precio_2: z.coerce.number().min(0),
  precio_3: z.coerce.number().min(0),
  precio_4: z.coerce.number().min(0),
  inv_min: z.coerce.number().min(0),
  tiene_impuesto: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<FormValues>
  onSubmit: (values: FormValues) => void
  isLoading?: boolean
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]'

export function ProductForm({ defaultValues, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tiene_impuesto: true, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="SKU" error={errors.sku?.message}>
          <input {...register('sku')} className={inputCls} />
        </Field>
        <Field label="Nombre" error={errors.nombre?.message}>
          <input {...register('nombre')} className={inputCls} />
        </Field>
        <Field label="Familia" error={errors.familia?.message}>
          <input {...register('familia')} className={inputCls} />
        </Field>
        <Field label="Categoría" error={errors.categoria?.message}>
          <input {...register('categoria')} className={inputCls} />
        </Field>
        <Field label="Peso (kg)" error={errors.peso_kg?.message}>
          <input {...register('peso_kg')} type="number" step="0.001" className={inputCls} />
        </Field>
        <Field label="Stock mínimo" error={errors.inv_min?.message}>
          <input {...register('inv_min')} type="number" step="1" className={inputCls} />
        </Field>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">Precios</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {(['costo', 'precio_1', 'precio_2', 'precio_3', 'precio_4'] as const).map((field) => (
            <Field
              key={field}
              label={field === 'costo' ? 'Costo' : `Lista ${field.replace('precio_', '')}`}
              error={errors[field]?.message}
            >
              <input
                {...register(field)}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('tiene_impuesto')}
          type="checkbox"
          id="tiene_impuesto"
          className="h-4 w-4 rounded border-gray-300 text-[#f97316]"
        />
        <label htmlFor="tiene_impuesto" className="text-sm font-medium text-gray-700">
          Aplica IVA (16%)
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-[#f97316] px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Guardar producto'}
        </button>
      </div>
    </form>
  )
}
