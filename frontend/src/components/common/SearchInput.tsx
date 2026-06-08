'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  placeholder?: string
  value?: string
  onChange: (value: string) => void
  debounceMs?: number
  className?: string
}

export function SearchInput({
  placeholder = 'Buscar...',
  value: externalValue,
  onChange,
  debounceMs = 300,
  className,
}: Props) {
  const [internal, setInternal] = useState(externalValue ?? '')

  useEffect(() => {
    const timer = setTimeout(() => onChange(internal), debounceMs)
    return () => clearTimeout(timer)
  }, [internal, debounceMs, onChange])

  useEffect(() => {
    if (externalValue !== undefined) setInternal(externalValue)
  }, [externalValue])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
      />
      {internal && (
        <button
          onClick={() => {
            setInternal('')
            onChange('')
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
