'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { RoleBadge } from '@/components/common/RoleBadge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import api from '@/lib/api'
import type { User, Role, PaginatedResponse } from '@/types'

const userSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(['admin', 'gerente', 'ventas', 'compras', 'almacen']),
})

type UserFormValues = z.infer<typeof userSchema>

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]'

const columns: Column<User>[] = [
  { key: 'nombre', header: 'Nombre' },
  { key: 'email', header: 'Email' },
  {
    key: 'role',
    header: 'Rol',
    render: (r) => <RoleBadge role={r.role} />,
  },
]

export default function UsersAdminPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>('/api/v1/admin/users')
      return data
    },
  })

  const { mutate: createUser, isPending } = useMutation({
    mutationFn: async (payload: UserFormValues) => {
      const { data } = await api.post<User>('/api/v1/admin/users', payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      reset()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({ resolver: zodResolver(userSchema) })

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Gestión de usuarios"
        description="Administra los usuarios del sistema"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nuevo usuario'}
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#1e3a5f]">Crear usuario</h3>
          <form
            onSubmit={handleSubmit((v) => createUser(v))}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input {...register('nombre')} className={inputCls} />
              {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className={inputCls} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input {...register('password')} type="password" className={inputCls} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select {...register('role')} className={inputCls}>
                <option value="ventas">Ventas</option>
                <option value="compras">Compras</option>
                <option value="almacen">Almacén</option>
                <option value="gerente">Gerente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-[#f97316] px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {isPending ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        keyExtractor={(r) => r.id as string}
        searchPlaceholder="Buscar usuario..."
        emptyTitle="Sin usuarios"
        emptyDescription="Crea el primer usuario del sistema."
      />
    </div>
  )
}
