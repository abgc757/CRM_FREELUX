import api from './api'
import type { AuthResponse, User } from '../types'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', { email, password })
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function register(userData: any): Promise<User> {
  const { data } = await api.post('/auth/register', userData)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me')
  return data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}
