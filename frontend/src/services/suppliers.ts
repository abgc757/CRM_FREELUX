import api from './api'
import type { Supplier } from '../types'

export async function listSuppliers(params?: any): Promise<Supplier[]> {
  const { data } = await api.get('/suppliers', { params })
  return data
}

export async function searchSuppliers(query: string, filters?: any): Promise<any[]> {
  const { data } = await api.get('/suppliers/search', { params: { query, ...filters } })
  return data
}

export async function createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const { data } = await api.post('/suppliers', supplier)
  return data
}
