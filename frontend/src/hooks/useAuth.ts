import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { LoginCredentials, LoginResponse } from '@/types'

export function useAuth() {
  const { user, token, setAuth, logout, isAuthenticated } = useAuthStore()
  const router = useRouter()

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const form = new URLSearchParams()
      form.append('username', credentials.email)
      form.append('password', credentials.password)
      const { data } = await api.post<LoginResponse>('/api/v1/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      return data
    },
    onSuccess: (data) => {
      setAuth(data.user, data.access_token)
      router.push('/dashboard')
    },
  })

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return {
    user,
    token,
    isAuthenticated: isAuthenticated(),
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: handleLogout,
  }
}
