'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Package,
  Truck,
  ClipboardList,
  Warehouse,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { RoleBadge } from '@/components/common/RoleBadge'
import type { Role } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'gerente', 'ventas', 'compras', 'almacen'] },
  { href: '/clients', label: 'Clientes', icon: Users, roles: ['admin', 'gerente', 'ventas'] },
  { href: '/quotes', label: 'Cotizaciones', icon: FileText, roles: ['admin', 'gerente', 'ventas'] },
  { href: '/sales', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'gerente', 'ventas'] },
  { href: '/products', label: 'Productos', icon: Package, roles: ['admin', 'gerente', 'ventas', 'compras', 'almacen'] },
  { href: '/suppliers', label: 'Proveedores', icon: Truck, roles: ['admin', 'gerente', 'compras'] },
  { href: '/purchases', label: 'Compras', icon: ClipboardList, roles: ['admin', 'gerente', 'compras', 'almacen'] },
  { href: '/inventory', label: 'Inventario', icon: Warehouse, roles: ['admin', 'gerente', 'compras', 'almacen'] },
  { href: '/price-management', label: 'Precios', icon: DollarSign, roles: ['admin', 'gerente'] },
  { href: '/admin/users', label: 'Usuarios', icon: Settings, roles: ['admin', 'gerente'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  if (!user) return null

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role))

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-[#1e3a5f] text-white transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="FreeLux" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">FreeLux</span>
          </div>
        )}
        {!sidebarOpen && <img src="/logo.svg" alt="FreeLux" className="mx-auto h-8 w-8" />}
        <button
          onClick={toggleSidebar}
          className={cn(
            'rounded p-1 hover:bg-white/10',
            !sidebarOpen && 'mx-auto'
          )}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#f97316] text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {sidebarOpen && (
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium text-white">{user.nombre}</p>
          <RoleBadge role={user.role} className="mt-1" />
        </div>
      )}
    </aside>
  )
}
