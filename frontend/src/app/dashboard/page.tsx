'use client'

import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Users,
  ShoppingCart,
  ClipboardList,
  Package,
  ArrowRight,
  AlertTriangle,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '@/components/cards/StatCard'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import type { DashboardStats } from '@/types'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/api/v1/dashboard/stats')
      return data
    },
  })

  if (isLoading) return <PageLoader />

  const isVentas = user?.role === 'ventas'
  const isCompras = user?.role === 'compras'
  const isAlmacen = user?.role === 'almacen'
  const isGerente = user?.role === 'gerente' || user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">
          Hola, {user?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Resumen de actividad
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(isVentas || isGerente) && (
          <>
            <StatCard
              title="Cotizaciones pendientes"
              value={stats?.cotizaciones_pendientes ?? 0}
              icon={FileText}
            />
            <StatCard
              title="Mis clientes"
              value={stats?.clientes_total ?? 0}
              icon={Users}
            />
            <StatCard
              title="Ventas del mes"
              value={`$${(stats?.ventas_mes ?? 0).toLocaleString('es-MX')}`}
              icon={ShoppingCart}
              accent
            />
          </>
        )}

        {(isCompras || isGerente) && (
          <>
            <StatCard
              title="Órdenes pendientes"
              value={stats?.ordenes_pendientes ?? 0}
              icon={ClipboardList}
            />
          </>
        )}

        {(isAlmacen || isGerente) && (
          <>
            <StatCard
              title="Productos bajo mínimo"
              value={stats?.productos_bajo_minimo ?? 0}
              icon={Package}
              accent={Number(stats?.productos_bajo_minimo) > 0}
            />
            <StatCard
              title="Movimientos hoy"
              value={stats?.movimientos_hoy ?? 0}
              icon={ArrowRight}
            />
          </>
        )}

        {isGerente && (
          <StatCard
            title="Solicitudes precio"
            value={stats?.solicitudes_precio_pendientes ?? 0}
            icon={DollarSign}
            accent={Number(stats?.solicitudes_precio_pendientes) > 0}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(isVentas || isGerente) && (
          <QuickActionCard
            title="Nueva cotización"
            description="Crea una cotización para un cliente"
            href="/quotes/new"
            icon={FileText}
          />
        )}
        {(isVentas || isGerente) && (
          <QuickActionCard
            title="Nuevo cliente"
            description="Registra un nuevo cliente"
            href="/clients/new"
            icon={Users}
          />
        )}
        {(isCompras || isGerente) && (
          <QuickActionCard
            title="Nueva orden de compra"
            description="Genera una orden a un proveedor"
            href="/purchases/new"
            icon={ClipboardList}
          />
        )}
        {(isAlmacen || isGerente) && (
          <QuickActionCard
            title="Registrar movimiento"
            description="Entrada, salida o ajuste de inventario"
            href="/inventory/movements"
            icon={Package}
          />
        )}
        {isGerente && (
          <QuickActionCard
            title="Solicitudes de precio"
            description="Aprobar o rechazar solicitudes"
            href="/price-management"
            icon={DollarSign}
            badge={stats?.solicitudes_precio_pendientes}
          />
        )}
      </div>
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
}: {
  title: string
  description: string
  href: string
  icon: React.ElementType
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#f97316]/40 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f]/10 group-hover:bg-[#f97316]/10 transition-colors">
        <Icon className="h-5 w-5 text-[#1e3a5f] group-hover:text-[#f97316] transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1e3a5f] flex items-center gap-2">
          {title}
          {badge ? (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f97316] text-xs font-bold text-white">
              {badge}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-[#f97316] transition-colors" />
    </Link>
  )
}
