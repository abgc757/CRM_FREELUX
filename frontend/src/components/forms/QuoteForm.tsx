'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Search } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { useProductSearch } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Product, Client, Quote } from '@/types'

const itemSchema = z.object({
  product_id: z.string().min(1),
  descripcion: z.string().min(1),
  cantidad: z.coerce.number().min(0.01),
  precio_unitario: z.coerce.number().min(0),
  importe: z.coerce.number(),
  tiene_impuesto: z.boolean().optional(),
})

const quoteSchema = z.object({
  cliente_id: z.string().min(1, 'Cliente requerido'),
  fecha_validez: z.string().min(1, 'Fecha de validez requerida'),
  moneda: z.string().default('MXN'),
  items: z.array(itemSchema).min(1, 'Agrega al menos un producto'),
})

type FormValues = z.infer<typeof quoteSchema>

interface Props {
  defaultValues?: Partial<Quote>
  onSubmit: (values: FormValues, estado: 'borrador' | 'enviada') => void
  isLoading?: boolean
  canEditPrice?: boolean
}

function ClientSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string, nombre: string) => void
}) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState('')
  const { data } = useClients(1, q)
  const [open, setOpen] = useState(false)

  const handleSelect = (c: Client) => {
    setSelected(c.nombre)
    setQ('')
    setOpen(false)
    onChange(c.id, c.nombre)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={selected || q}
          onChange={(e) => {
            setQ(e.target.value)
            setSelected('')
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
        />
      </div>
      {open && data && data.items.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {data.items.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <span className="font-medium">{c.nombre}</span>
              <span className="text-gray-400">— {c.rfc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductSearch({
  onSelect,
}: {
  onSelect: (product: Product) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const { data: results } = useProductSearch(q)

  const handleSelect = (p: Product) => {
    onSelect(p)
    setQ('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar SKU o nombre..."
          className="w-full rounded-lg border border-dashed border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
        />
      </div>
      {open && results && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.slice(0, 8).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="flex w-full items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <div className="text-left">
                <p className="font-medium text-[#1e3a5f]">{p.sku}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{p.nombre}</p>
              </div>
              <span className="ml-auto shrink-0 text-xs font-medium text-gray-600">
                {formatCurrency(p.precio_1)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function QuoteForm({ defaultValues, onSubmit, isLoading, canEditPrice = false }: Props) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id ?? '',
      fecha_validez: defaultValues?.fecha_validez ?? '',
      moneda: defaultValues?.moneda ?? 'MXN',
      items: defaultValues?.items?.map((i) => ({
        ...i,
        tiene_impuesto: i.product?.tiene_impuesto ?? false,
      })) ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = watch('items')

  const subtotal = items.reduce((sum, item) => {
    const importe = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
    return sum + (item.tiene_impuesto ? 0 : importe) + (item.tiene_impuesto ? 0 : 0) + importe
  }, 0)

  const ivaAmount = items.reduce((sum, item) => {
    if (!item.tiene_impuesto) return sum
    const importe = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
    return sum + importe * 0.16
  }, 0)

  const subtotalBase = items.reduce((sum, item) => {
    return sum + (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
  }, 0)

  const total = subtotalBase + ivaAmount

  useEffect(() => {
    items.forEach((item, idx) => {
      const importe = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
      if (importe !== item.importe) {
        setValue(`items.${idx}.importe`, importe)
      }
    })
  }, [JSON.stringify(items.map((i) => ({ c: i.cantidad, p: i.precio_unitario })))])

  const addProduct = useCallback(
    (product: Product) => {
      append({
        product_id: product.id,
        descripcion: product.nombre,
        cantidad: 1,
        precio_unitario: product.precio_1,
        importe: product.precio_1,
        tiene_impuesto: product.tiene_impuesto,
      })
    },
    [append]
  )

  const handleFormSubmit = (estado: 'borrador' | 'enviada') =>
    handleSubmit((data) => onSubmit(data, estado))()

  const inputCls =
    'w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#1e3a5f]'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
          <Controller
            name="cliente_id"
            control={control}
            render={({ field }) => (
              <ClientSearch
                value={field.value}
                onChange={(id) => field.onChange(id)}
              />
            )}
          />
          {errors.cliente_id && (
            <p className="mt-1 text-xs text-red-500">{errors.cliente_id.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Válida hasta *</label>
          <input
            {...register('fecha_validez')}
            type="date"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
          />
          {errors.fecha_validez && (
            <p className="mt-1 text-xs text-red-500">{errors.fecha_validez.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
          <select
            {...register('moneda')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f]"
          >
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Productos
          </h3>
          <ProductSearch onSelect={addProduct} />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2.5 text-left w-full">Descripción / Clave</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">Cant.</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">P. Unit.</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">Importe</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                    Busca un producto para agregarlo a la cotización
                  </td>
                </tr>
              )}
              {fields.map((field, idx) => {
                const importe =
                  (Number(items[idx]?.cantidad) || 0) *
                  (Number(items[idx]?.precio_unitario) || 0)
                return (
                  <tr key={field.id} className="border-b border-gray-50 last:border-b-0">
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${idx}.descripcion`)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input
                        {...register(`items.${idx}.cantidad`)}
                        type="number"
                        step="0.01"
                        min="0"
                        className={cn(inputCls, 'text-right')}
                      />
                    </td>
                    <td className="px-3 py-2 w-28">
                      <input
                        {...register(`items.${idx}.precio_unitario`)}
                        type="number"
                        step="0.01"
                        min="0"
                        readOnly={!canEditPrice}
                        className={cn(inputCls, 'text-right', !canEditPrice && 'bg-gray-50')}
                      />
                    </td>
                    <td className="px-3 py-2 w-28 text-right font-medium">
                      {formatCurrency(importe)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {errors.items && (
          <p className="mt-1 text-xs text-red-500">
            {typeof errors.items.message === 'string' ? errors.items.message : 'Revisa los productos'}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotalBase)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>IVA (16%)</span>
            <span>{formatCurrency(ivaAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-[#1e3a5f]">
            <span>Total</span>
            <span className="text-[#f97316]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => handleFormSubmit('borrador')}
          disabled={isLoading}
          className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={() => handleFormSubmit('enviada')}
          disabled={isLoading}
          className="rounded-lg bg-[#f97316] px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Enviar cotización'}
        </button>
      </div>
    </div>
  )
}
