import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface MetodologiaTooltipProps {
  title: string
  body: string
  link?: string
  className?: string
}

export function MetodologiaTooltip({ title, body, link, className }: MetodologiaTooltipProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  return (
    <span ref={containerRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={title}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center justify-center w-4 h-4 rounded-full text-xs',
          'border border-border text-text-muted',
          'hover:border-border-hover hover:text-text-primary',
          'cursor-pointer ml-1 transition-colors duration-150'
        )}
      >
        ?
      </button>
      {open && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 w-64 p-3 rounded-lg shadow-xl text-xs',
            'bg-background-card border border-border text-text-secondary',
            'bottom-full left-1/2 -translate-x-1/2 mb-2'
          )}
        >
          <div className="font-semibold text-text-primary mb-1">{title}</div>
          <div className="leading-relaxed">{body}</div>
          {link && (
            <a
              href={link}
              className="block mt-2 text-accent-data hover:underline"
            >
              Leer metodologia &rarr;
            </a>
          )}
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45 bg-background-card border-r border-b border-border"
          />
        </div>
      )}
    </span>
  )
}

export default MetodologiaTooltip
