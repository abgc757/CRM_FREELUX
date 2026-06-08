import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Purchase, PaginatedResponse } from '@/types'

const PURCHASES_KEY = 'purchases'

export function usePurchases(page = 1, search = '') {
  return useQuery({
    queryKey: [PURCHASES_KEY, page, search],
    queryFn: async () => {
      const { data } = await api.get<Purchase[]>('/api/v1/purchases', {
        params: { search: search || undefined },
      })
      const items = Array.isArray(data) ? data : (data as any).value ?? []
      return { items, total: items.length, page: 1, per_page: items.length, pages: 1 } as PaginatedResponse<Purchase>
    },
  })
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: [PURCHASES_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Purchase>(`/api/v1/purchases/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Purchase, 'id'>) => {
      const { data } = await api.post<Purchase>('/api/v1/purchases', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PURCHASES_KEY] }),
  })
}

export function useUpdatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Purchase> & { id: string }) => {
      const { data } = await api.put<Purchase>(`/api/v1/purchases/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PURCHASES_KEY] }),
  })
}
