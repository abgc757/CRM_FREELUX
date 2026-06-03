import { useState, useEffect, createContext, useContext } from 'react'
import type { User } from '../types'
import { getStoredUser, login as apiLogin, logout as apiLogout } from '../services/auth'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser)

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    setUser(res.user)
  }

  const logout = () => {
    apiLogout()
    setUser(null)
  }

  const hasRole = (...roles: string[]) => {
    if (!user?.role) return false
    return roles.includes(user.role.name)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
