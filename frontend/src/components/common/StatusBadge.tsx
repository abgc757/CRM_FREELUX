import { cn } from '@/lib/utils'

type Status =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'rechazada'
  | 'convertida'
  | 'pendiente'
  | 'activo'
  | 'inactivo'
  | string

const statusConfig: Record<string, { label: string; className: string }> = {
  borrador: { label: 'Borrador', className: 'bg-gray-100 text-gray-600' },
  enviada: { label: 'Enviada', className: 'bg-blue-100 text-blue-700' },
  aprobada: { label: 'Aprobada', className: 'bg-green-100 text-green-700' },
  rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-700' },
  convertida: { label: 'Convertida', className: 'bg-purple-100 text-purple-700' },
  pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700' },
  activo: { label: 'Activo', className: 'bg-green-100 text-green-700' },
  inactivo: { label: 'Inactivo', className: 'bg-gray-100 text-gray-500' },
}

interface Props {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
