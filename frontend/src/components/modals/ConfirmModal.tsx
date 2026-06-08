'use client'

import { useUIStore } from '@/store/uiStore'

export function ConfirmModal() {
  const { confirmModal, closeConfirmModal } = useUIStore()

  if (!confirmModal.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeConfirmModal}
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1e3a5f]">{confirmModal.title}</h3>
        <p className="mt-2 text-sm text-gray-600">{confirmModal.description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeConfirmModal}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              confirmModal.onConfirm()
              closeConfirmModal()
            }}
            className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d4a]"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
