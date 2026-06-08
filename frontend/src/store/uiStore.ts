import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  confirmModal: {
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  openConfirmModal: (title: string, description: string, onConfirm: () => void) => void
  closeConfirmModal: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      confirmModal: {
        open: false,
        title: '',
        description: '',
        onConfirm: () => {},
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      openConfirmModal: (title, description, onConfirm) =>
        set({ confirmModal: { open: true, title, description, onConfirm } }),
      closeConfirmModal: () =>
        set((state) => ({ confirmModal: { ...state.confirmModal, open: false } })),
    }),
    {
      name: 'freelux-ui',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
)
