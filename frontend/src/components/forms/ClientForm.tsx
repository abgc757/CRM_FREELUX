'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Client } from '@/types'

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  rfc: z.string().min(12, 'RFC inválido').max(13),
  telefono: z.string().min(10, 'Teléfono inválido'),
  email: z.string().email('Email inválido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<FormValues>
  onSubmit: (values: FormValues) => void
  isLoading?: boolean
}

export function ClientForm({ defaultValues, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre / Razón Social
          </label>
          <input
            {...register('nombre')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
          />
          {errors.nombre && (
            <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
          <input
            {...register('rfc')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
          />
          {errors.rfc && (
            <p className="mt-1 text-xs text-red-500">{errors.rfc.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            {...register('telefono')}
            type="tel"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
          />
          {errors.telefono && (
            <p className="mt-1 text-xs text-red-500">{errors.telefono.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input
            {...register('ciudad')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
          />
          {errors.ciudad && (
            <p className="mt-1 text-xs text-red-500">{errors.ciudad.message}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-[#f97316] px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Guardar cliente'}
        </button>
      </div>
    </form>
  )
}
