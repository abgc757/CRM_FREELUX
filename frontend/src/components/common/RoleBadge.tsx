import { cn } from '@/lib/utils'
import type { Role } from '@/types'

const roleConfig: Record<Role, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
  gerente: { label: 'Gerente', className: 'bg-blue-100 text-blue-700' },
  ventas: { label: 'Ventas', className: 'bg-green-100 text-green-700' },
  compras: { label: 'Compras', className: 'bg-yellow-100 text-yellow-700' },
  almacen: { label: 'Almacén', className: 'bg-orange-100 text-orange-700' },
}

interface Props {
  role: Role
  className?: string
}

export function RoleBadge({ role, className }: Props) {
  const config = roleConfig[role]
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
