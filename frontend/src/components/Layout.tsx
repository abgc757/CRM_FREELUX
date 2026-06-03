import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart,
  Truck, Warehouse, LogOut, Menu, X, ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'gerencia', 'ventas', 'compras', 'almacen'] },
  { label: 'Clientes', path: '/clientes', icon: Users, roles: ['ventas', 'gerencia', 'admin'] },
  { label: 'Productos', path: '/productos', icon: Package, roles: ['admin', 'gerencia', 'ventas', 'almacen'] },
  { label: 'Cotizaciones', path: '/cotizaciones', icon: FileText, roles: ['ventas', 'gerencia', 'admin'] },
  { label: 'Ventas', path: '/ventas', icon: ShoppingCart, roles: ['ventas', 'gerencia', 'admin'] },
  { label: 'Proveedores', path: '/proveedores', icon: Truck, roles: ['compras', 'gerencia', 'admin'] },
  { label: 'Compras', path: '/compras', icon: Package, roles: ['compras', 'gerencia', 'admin'] },
  { label: 'Inventario', path: '/inventario', icon: Warehouse, roles: ['almacen', 'gerencia', 'admin'] },
]

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleItems = navItems.filter(item => item.roles.some(r => hasRole(r)))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link to="/" className="text-xl font-bold text-primary-600">FerreCRM</Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold">
              {user?.nombre?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role?.name}</p>
            </div>
            <button onClick={logout} className="p-1 text-gray-400 hover:text-red-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm text-gray-500">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
