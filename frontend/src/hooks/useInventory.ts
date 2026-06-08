import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { InventoryMovement, Product, PaginatedResponse } from '@/types'

const INVENTORY_KEY = 'inventory'

export function useInventory(page = 1, search = '') {
  return useQuery({
    queryKey: [INVENTORY_KEY, page, search],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/api/v1/inventory', {
        params: { search: search || undefined },
      })
      const items = Array.isArray(data) ? data : (data as any).value ?? []
      return { items, total: items.length, page: 1, per_page: items.length, pages: 1 } as PaginatedResponse<Product>
    },
  })
}

export function useInventoryMovements(page = 1) {
  return useQuery({
    queryKey: [INVENTORY_KEY, 'movements', page],
    queryFn: async () => {
      const { data } = await api.get<InventoryMovement[]>('/api/v1/inventory/movements')
      const items = Array.isArray(data) ? data : (data as any).value ?? []
      return { items, total: items.length, page: 1, per_page: items.length, pages: 1 } as PaginatedResponse<InventoryMovement>
    },
  })
}

export function useCreateMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<InventoryMovement, 'id' | 'created_at'>) => {
      const { data } = await api.post<InventoryMovement>('/api/v1/inventory/movements', payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVENTORY_KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
