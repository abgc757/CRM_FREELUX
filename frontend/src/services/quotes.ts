import api from './api'
import type { Quote } from '../types'

export async function getQuotes(params?: any): Promise<Quote[]> {
  const { data } = await api.get('/quotes', { params })
  return data
}

export async function getQuote(id: number): Promise<Quote> {
  const { data } = await api.get(`/quotes/${id}`)
  return data
}

export async function createQuote(quote: Partial<Quote> & { items: any[] }): Promise<Quote> {
  const { data } = await api.post('/quotes', quote)
  return data
}

export async function convertQuote(id: number): Promise<any> {
  const { data } = await api.post(`/quotes/${id}/convert`)
  return data
}

export async function approveQuotePrice(id: number, approved: boolean, notes?: string): Promise<Quote> {
  const { data } = await api.post(`/quotes/${id}/approve-price`, { approved, notes })
  return data
}
