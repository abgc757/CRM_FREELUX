'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  ShoppingCart,
  DollarSign,
  X,
} from 'lucide-react'
import { useQuote, useSendQuote, useConvertQuoteToSale } from '@/hooks/useQuotes'
import { useCreatePriceRequest } from '@/hooks/usePriceRequests'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { WhatsAppSendModal } from '@/components/modals/WhatsAppSendModal'
import { PriceRequestModal } from '@/components/modals/PriceRequestModal'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/formatters'

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: quote, isLoading } = useQuote(id)
  const { mutate: sendQuote, isPending: isSending } = useSendQuote()
  const { mutate: convert, isPending: isConverting } = useConvertQuoteToSale()
  const { mutate: requestPrice, isPending: isRequestingPrice } = useCreatePriceRequest()
  const { openConfirmModal } = useUIStore()
  const { user } = useAuthStore()

  const [whatsAppOpen, setWhatsAppOpen] = useState(false)
  const [priceModal, setPriceModal] = useState<{
    open: boolean
    productId: string
    productName: string
    currentPrice: number
  }>({ open: false, productId: '', productName: '', currentPrice: 0 })

  if (isLoading) return <PageLoader />
  if (!quote) return <p className="text-gray-500">Cotización no encontrada.</p>

  const canSend = quote.estado === 'borrador'
  const canConvert = quote.estado === 'aprobada' || quote.estado === 'enviada'
  const canRequestPrice = quote.estado === 'borrador' || quote.estado === 'enviada'
  const isGerente = user?.role === 'gerente' || user?.role === 'admin'

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href="/quotes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f]">
          <ArrowLeft className="h-4 w-4" />
          Volver a cotizaciones
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1e3a5f]">
              Cotización #{quote.folio}
            </h1>
            <StatusBadge status={quote.estado} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Cliente: <span className="font-medium">{quote.cliente?.nombre ?? quote.cliente_id}</span>
            {' · '}Válida hasta: {formatDate(quote.fecha_validez)}
            {' · '}Moneda: {quote.moneda}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4" />
            Ver PDF
          </button>

          <button
            onClick={() => setWhatsAppOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>

          {canSend && (
            <button
              onClick={() =>
                openConfirmModal(
                  'Enviar cotización',
                  '¿Deseas marcar esta cotización como enviada al cliente?',
                  () => sendQuote(id)
                )
              }
              disabled={isSending}
              className="flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-3 py-2 text-sm font-medium text-white hover:bg-[#162d4a] disabled:opacity-50"
            >
              Enviar cotización
            </button>
          )}

          {canConvert && (
            <button
              onClick={() =>
                openConfirmModal(
                  'Convertir a venta',
                  '¿Deseas convertir esta cotización a nota de venta?',
                  () =>
                    convert(
                      { id, tipo_documento: 'nota_venta' },
                      { onSuccess: () => router.push('/sales') }
                    )
                )
              }
              disabled={isConverting}
              className="flex items-center gap-1.5 rounded-lg bg-[#f97316] px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Convertir a venta
            </button>
          )}

          {canRequestPrice && !isGerente && (
            <button
              onClick={() => {
                const firstItem = quote.items[0]
                if (firstItem) {
                  setPriceModal({
                    open: true,
                    productId: firstItem.product_id,
                    productName: firstItem.descripcion,
                    currentPrice: firstItem.precio_unitario,
                  })
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
            >
              <DollarSign className="h-4 w-4" />
              Solicitar precio
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Partidas
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3 text-left">Clave / Descripción</th>
              <th className="px-4 py-3 text-right">Cant.</th>
              <th className="px-4 py-3 text-right">P. Unit.</th>
              <th className="px-4 py-3 text-right">Importe</th>
              {canRequestPrice && !isGerente && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{item.descripcion}</p>
                  <p className="text-xs text-gray-400">{item.product_id}</p>
                </td>
                <td className="px-4 py-3 text-right">{item.cantidad}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.precio_unitario)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCurrency(item.importe)}
                </td>
                {canRequestPrice && !isGerente && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        setPriceModal({
                          open: true,
                          productId: item.product_id,
                          productName: item.descripcion,
                          currentPrice: item.precio_unitario,
                        })
                      }
                      className="rounded p-1 text-gray-300 hover:bg-orange-50 hover:text-orange-500"
                      title="Solicitar mejor precio"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-100 px-4 py-4">
          <div className="ml-auto w-full max-w-xs space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA</span>
              <span>{formatCurrency(quote.iva)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-[#1e3a5f]">
              <span>Total</span>
              <span className="text-[#f97316] text-lg">{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <WhatsAppSendModal
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        quoteId={id}
        defaultPhone={quote.cliente?.telefono}
      />

      <PriceRequestModal
        open={priceModal.open}
        onClose={() => setPriceModal((s) => ({ ...s, open: false }))}
        quoteId={id}
        productId={priceModal.productId}
        productName={priceModal.productName}
        currentPrice={priceModal.currentPrice}
        onSubmit={(data) =>
          requestPrice(
            { quote_id: id, ...data, product_id: priceModal.productId },
            { onSuccess: () => setPriceModal((s) => ({ ...s, open: false })) }
          )
        }
        isSubmitting={isRequestingPrice}
      />
    </div>
  )
}
