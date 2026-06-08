import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PriceRequest, PaginatedResponse } from '@/types'

const PRICE_REQUESTS_KEY = 'price-requests'

export function usePriceRequests(page = 1) {
  return useQuery({
    queryKey: [PRICE_REQUESTS_KEY, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PriceRequest>>(
        '/api/v1/price-management/requests',
        { params: { page, per_page: 20 } }
      )
      return data
    },
  })
}

export function useCreatePriceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: Pick<PriceRequest, 'quote_id' | 'product_id' | 'precio_solicitado' | 'motivo'>
    ) => {
      const { data } = await api.post<PriceRequest>(
        '/api/v1/price-management/requests',
        payload
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRICE_REQUESTS_KEY] }),
  })
}

export function useResolvePriceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      estado,
      comentario,
    }: {
      id: string
      estado: 'aprobada' | 'rechazada'
      comentario?: string
    }) => {
      const { data } = await api.patch<PriceRequest>(
        `/api/v1/price-management/requests/${id}`,
        { estado, comentario }
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRICE_REQUESTS_KEY] }),
  })
}
