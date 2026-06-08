import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Client, PaginatedResponse } from '@/types'

const CLIENTS_KEY = 'clients'

export function useClients(page = 1, search = '') {
  return useQuery({
    queryKey: [CLIENTS_KEY, page, search],
    queryFn: async () => {
      const { data } = await api.get<Client[]>('/api/v1/clients', {
        params: { search: search || undefined },
      })
      const items = Array.isArray(data) ? data : (data as any).value ?? []
      return { items, total: items.length, page: 1, per_page: items.length, pages: 1 } as PaginatedResponse<Client>
    },
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [CLIENTS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Client>(`/api/v1/clients/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Client, 'id'>) => {
      const { data } = await api.post<Client>('/api/v1/clients', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY] }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Client> & { id: string }) => {
      const { data } = await api.put<Client>(`/api/v1/clients/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY] }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/clients/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY] }),
  })
}
