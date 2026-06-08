import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; label: string }
  className?: string
  accent?: boolean
}

export function StatCard({ title, value, icon: Icon, trend, className, accent }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
        accent && 'border-[#f97316]/30 bg-orange-50',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[#1e3a5f]">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                trend.value >= 0 ? 'text-green-600' : 'text-red-500'
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            'rounded-lg p-2',
            accent ? 'bg-[#f97316]/10' : 'bg-[#1e3a5f]/10'
          )}
        >
          <Icon
            className={cn('h-6 w-6', accent ? 'text-[#f97316]' : 'text-[#1e3a5f]')}
          />
        </div>
      </div>
    </div>
  )
}
