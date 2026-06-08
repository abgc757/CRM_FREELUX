import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Product, PaginatedResponse } from '@/types'

const PRODUCTS_KEY = 'products'

export function useProducts(page = 1, search = '') {
  return useQuery({
    queryKey: [PRODUCTS_KEY, page, search],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/api/v1/products', {
        params: { search: search || undefined },
      })
      const items = Array.isArray(data) ? data : (data as any).value ?? []
      return { items, total: items.length, page: 1, per_page: items.length, pages: 1 } as PaginatedResponse<Product>
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Product>(`/api/v1/products/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'search', query],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/api/v1/products', {
        params: { search: query },
      })
      return Array.isArray(data) ? data : (data as any).value ?? []
    },
    enabled: query.length >= 2,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Product, 'id'>) => {
      const { data } = await api.post<Product>('/api/v1/products', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Product> & { id: string }) => {
      const { data } = await api.put<Product>(`/api/v1/products/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }),
  })
}
