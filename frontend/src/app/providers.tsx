'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ConfirmModal } from '@/components/modals/ConfirmModal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ConfirmModal />
    </QueryClientProvider>
  )
}
