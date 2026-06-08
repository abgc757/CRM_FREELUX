'use client'

import { useState } from 'react'
import { X, MessageCircle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  quoteId: string
  defaultPhone?: string
}

export function WhatsAppSendModal({ open, onClose, quoteId, defaultPhone = '' }: Props) {
  const [phone, setPhone] = useState(defaultPhone)

  if (!open) return null

  const handleSend = () => {
    const msg = encodeURIComponent(
      `Hola, te comparto la cotización #${quoteId}. Por favor revísala y avísame si tienes alguna duda.`
    )
    const cleaned = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-[#1e3a5f]">Enviar por WhatsApp</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de teléfono
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="521XXXXXXXXXX"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
          />
          <p className="mt-1 text-xs text-gray-400">
            Incluye código de país. Ej: 521 para México celular
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!phone.trim()}
            className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
