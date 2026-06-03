import api from './api'
import type { Product } from '../types'

export async function getProducts(params?: any): Promise<Product[]> {
  const { data } = await api.get('/products', { params })
  return data
}

export async function getProductStock(sku: string): Promise<any> {
  const { data } = await api.get(`/products/${sku}/stock`)
  return data
}
