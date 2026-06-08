import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Supplier, PaginatedResponse } from '@/types'

const SUPPLIERS_KEY = 'suppliers'

export function useSuppliers(page = 1, search = '') {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, page, search],
    queryFn: async () => {
      const { data } = await api.get<Supplier[]>('/api/v1/suppliers', {
        params: { search: search || undefined },
      })
      const items = Array.isArray(data) ? data : (data as any).value ?? []
      return { items, total: items.length, page: 1, per_page: items.length, pages: 1 } as PaginatedResponse<Supplier>
    },
  })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Supplier>(`/api/v1/suppliers/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Supplier, 'id'>) => {
      const { data } = await api.post<Supplier>('/api/v1/suppliers', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUPPLIERS_KEY] }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Supplier> & { id: string }) => {
      const { data } = await api.put<Supplier>(`/api/v1/suppliers/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUPPLIERS_KEY] }),
  })
}
