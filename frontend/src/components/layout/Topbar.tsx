'use client'

import { Menu, LogOut, Bell } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'

export function Topbar() {
  const { toggleSidebar } = useUIStore()
  const { user, logout } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">
            {user ? getInitials(user.nombre) : '?'}
          </div>
          {user && (
            <span className="hidden text-sm font-medium text-gray-700 md:block">
              {user.nombre}
            </span>
          )}
        </div>

        <button
          onClick={logout}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
