'use client'

import { useState } from 'react'
import { usePriceRequests, useResolvePriceRequest } from '@/hooks/usePriceRequests'
import { useProducts } from '@/hooks/useProducts'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import { Check, X, TrendingUp, Weight, Package } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import api from '@/lib/api'

type UnidadFiltro = 'todos' | 'peso' | 'pieza'

export default function PriceManagementPage() {
  const { data, isLoading } = usePriceRequests()
  const { data: productsData } = useProducts()
  const { mutate: resolve, isPending } = useResolvePriceRequest()
  const { openConfirmModal } = useUIStore()

  // Estado para actualización masiva
  const [tab, setTab] = useState<'solicitudes' | 'actualizacion'>('solicitudes')
  const [porcentaje, setPorcentaje] = useState('')
  const [unidadFiltro, setUnidadFiltro] = useState<UnidadFiltro>('todos')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [aplicando, setAplicando] = useState(false)
  const [resultadoMsg, setResultadoMsg] = useState<string | null>(null)

  if (isLoading) return <PageLoader />

  const requests = data?.items ?? []
  const pending = requests.filter((r) => r.estado === 'pendiente')
  const resolved = requests.filter((r) => r.estado !== 'pendiente')
  const allProducts = productsData?.items ?? []

  // Categorías únicas para filtro
  const categorias = Array.from(new Set(allProducts.map((p) => p.categoria).filter(Boolean)))

  // Productos filtrados para previsualización
  const productosFiltrados = allProducts.filter((p) => {
    if (categoriaFiltro && p.categoria !== categoriaFiltro) return false
    if (unidadFiltro === 'peso') return p.peso_kg > 0
    if (unidadFiltro === 'pieza') return p.peso_kg === 0
    return true
  })

  const pct = parseFloat(porcentaje) / 100
  const preview = productosFiltrados.slice(0, 5).map((p) => ({
    sku: p.sku,
    nombre: p.nombre,
    precio_actual: p.precio_1,
    precio_nuevo: p.precio_1 * (1 + pct),
    unidad: p.peso_kg > 0 ? 'kg' : 'pza',
  }))

  const handleAplicar = () => {
    if (!porcentaje || isNaN(pct) || pct <= 0) {
      setResultadoMsg('Ingresa un porcentaje válido mayor a 0.')
      return
    }
    openConfirmModal(
      'Actualizar precios',
      `¿Aplicar +${porcentaje}% a ${productosFiltrados.length} producto(s)? Esta acción actualiza precio_1 de forma masiva.`,
      async () => {
        setAplicando(true)
        setResultadoMsg(null)
        try {
          let actualizados = 0
          // Actualizar en lotes de 20
          for (const p of productosFiltrados) {
            const nuevoPrecio = parseFloat((p.precio_1 * (1 + pct)).toFixed(2))
            await api.put(`/api/v1/products/${p.id}`, { precio_1: nuevoPrecio })
            actualizados++
          }
          setResultadoMsg(`✓ ${actualizados} producto(s) actualizados con +${porcentaje}%.`)
          setPorcentaje('')
        } catch {
          setResultadoMsg('Error al actualizar precios. Revisa la consola.')
        } finally {
          setAplicando(false)
        }
      }
    )
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Gestión de precios"
        description="Actualización masiva y aprobación de solicitudes de precio"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('solicitudes')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === 'solicitudes'
              ? 'border-[#f97316] text-[#f97316]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Solicitudes {pending.length > 0 && <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">{pending.length}</span>}
        </button>
        <button
          onClick={() => setTab('actualizacion')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === 'actualizacion'
              ? 'border-[#f97316] text-[#f97316]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Actualización masiva
        </button>
      </div>

      {/* Tab: Solicitudes */}
      {tab === 'solicitudes' && (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Pendientes ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((req) => (
                  <div key={req.id} className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1e3a5f]">{req.product_id}</p>
                        <p className="mt-0.5 text-sm text-gray-600">{req.motivo}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="text-gray-500">
                            Precio actual: <span className="font-medium">{formatCurrency(req.precio_actual)}</span>
                          </span>
                          <span className="text-[#f97316]">→</span>
                          <span className="text-gray-500">
                            Solicitado: <span className="font-bold text-[#1e3a5f]">{formatCurrency(req.precio_solicitado)}</span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{formatDateTime(req.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openConfirmModal('Rechazar solicitud', '¿Rechazar esta solicitud?', () => resolve({ id: req.id, estado: 'rechazada' }))}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" /> Rechazar
                        </button>
                        <button
                          onClick={() => openConfirmModal('Aprobar solicitud', `¿Aprobar precio de ${formatCurrency(req.precio_solicitado)}?`, () => resolve({ id: req.id, estado: 'aprobada' }))}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" /> Aprobar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {pending.length === 0 && (
            <EmptyState title="Sin solicitudes pendientes" description="No hay solicitudes de precio que requieran revisión." />
          )}
          {resolved.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Historial</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3 text-left">Producto</th>
                      <th className="px-4 py-3 text-right">Actual</th>
                      <th className="px-4 py-3 text-right">Solicitado</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map((req) => (
                      <tr key={req.id} className="border-b border-gray-50 last:border-b-0">
                        <td className="px-4 py-3 font-medium">{req.product_id}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(req.precio_actual)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1e3a5f]">{formatCurrency(req.precio_solicitado)}</td>
                        <td className="px-4 py-3"><StatusBadge status={req.estado} /></td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(req.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab: Actualización masiva */}
      {tab === 'actualizacion' && (
        <div className="space-y-6">
          {/* Panel de configuración */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-[#f97316]" />
              <h2 className="font-semibold text-[#1e3a5f]">Aumento porcentual de precios</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Porcentaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de aumento (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={porcentaje}
                    onChange={(e) => { setPorcentaje(e.target.value); setResultadoMsg(null) }}
                    placeholder="Ej: 5.5"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>

              {/* Tipo de unidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de producto</label>
                <div className="flex gap-2">
                  {[
                    { val: 'todos', label: 'Todos' },
                    { val: 'peso', label: 'Por kg', icon: Weight },
                    { val: 'pieza', label: 'Por pieza', icon: Package },
                  ].map(({ val, label, icon: Icon }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setUnidadFiltro(val as UnidadFiltro)}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                        unidadFiltro === val
                          ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                          : 'border-gray-200 text-gray-600 hover:border-[#1e3a5f]'
                      }`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría (opcional)</label>
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f]"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info de alcance */}
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              Se actualizarán <strong>{productosFiltrados.length}</strong> producto(s) —{' '}
              {unidadFiltro === 'peso' ? 'cotizados por kilogramo' : unidadFiltro === 'pieza' ? 'cotizados por pieza' : 'todos los tipos'}.
              {categoriaFiltro && ` Categoría: ${categoriaFiltro}.`}
            </div>

            {resultadoMsg && (
              <div className={`mt-3 rounded-lg px-4 py-2 text-sm ${resultadoMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {resultadoMsg}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAplicar}
                disabled={aplicando || !porcentaje || productosFiltrados.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[#f97316] px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                {aplicando ? 'Aplicando...' : `Aplicar +${porcentaje || '0'}% a ${productosFiltrados.length} productos`}
              </button>
            </div>
          </div>

          {/* Previsualización */}
          {porcentaje && !isNaN(pct) && pct > 0 && preview.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Previsualización (primeros 5)
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-center">Unidad</th>
                    <th className="px-4 py-3 text-right">Precio actual</th>
                    <th className="px-4 py-3 text-right">Precio nuevo</th>
                    <th className="px-4 py-3 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p) => (
                    <tr key={p.sku} className="border-b border-gray-50 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                      <td className="px-4 py-3 font-medium truncate max-w-[160px]">{p.nombre}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${p.unidad === 'kg' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {p.unidad === 'kg' ? <Weight className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                          {p.unidad}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(p.precio_actual)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1e3a5f]">{formatCurrency(p.precio_nuevo)}</td>
                      <td className="px-4 py-3 text-right text-green-600 text-xs">
                        +{formatCurrency(p.precio_nuevo - p.precio_actual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {productosFiltrados.length > 5 && (
                <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-50">
                  ...y {productosFiltrados.length - 5} producto(s) más
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
