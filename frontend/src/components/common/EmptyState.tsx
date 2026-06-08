import { Inbox } from 'lucide-react'

interface Props {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  title = 'Sin resultados',
  description = 'No hay datos para mostrar.',
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="mb-4 h-12 w-12 text-gray-300" />
      <p className="text-lg font-medium text-gray-600">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
