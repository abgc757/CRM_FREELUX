import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Quote, PaginatedResponse } from '@/types'

const QUOTES_KEY = 'quotes'

export function useQuotes(page = 1, search = '') {
  return useQuery({
    queryKey: [QUOTES_KEY, page, search],
    queryFn: async () => {
      const { data } = await api.get<Quote[]>('/api/v1/quotes', {
        params: { search: search || undefined },
      })
      const items = Array.isArray(data) ? data : (data as any).value ?? []
      return { items, total: items.length, page: 1, per_page: items.length, pages: 1 } as PaginatedResponse<Quote>
    },
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: [QUOTES_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Quote>(`/api/v1/quotes/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Quote, 'id' | 'folio' | 'subtotal' | 'iva' | 'total'>) => {
      const { data } = await api.post<Quote>('/api/v1/quotes', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUOTES_KEY] }),
  })
}

export function useUpdateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Quote> & { id: string }) => {
      const { data } = await api.put<Quote>(`/api/v1/quotes/${id}`, payload)
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [QUOTES_KEY] })
      qc.invalidateQueries({ queryKey: [QUOTES_KEY, vars.id] })
    },
  })
}

export function useSendQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Quote>(`/api/v1/quotes/${id}/send`)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUOTES_KEY] }),
  })
}

export function useConvertQuoteToSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      tipo_documento,
    }: {
      id: string
      tipo_documento: 'factura' | 'nota_venta' | 'remision'
    }) => {
      const { data } = await api.post(`/api/v1/quotes/${id}/convert`, { tipo_documento })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUOTES_KEY] })
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}
