import api from './api'
import type { Client } from '../types'

export async function getClients(params?: any): Promise<Client[]> {
  const { data } = await api.get('/clients', { params })
  return data
}

export async function getClient(id: number): Promise<Client> {
  const { data } = await api.get(`/clients/${id}`)
  return data
}

export async function createClient(client: Partial<Client>): Promise<Client> {
  const { data } = await api.post('/clients', client)
  return data
}

export async function updateClient(id: number, client: Partial<Client>): Promise<Client> {
  const { data } = await api.put(`/clients/${id}`, client)
  return data
}
