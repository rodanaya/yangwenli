import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface MetodologiaTooltipProps {
  title: string
  body: string
  link?: string
  className?: string
}

export function MetodologiaTooltip({ title, body, link, className }: MetodologiaTooltipProps) {
  const { t } = useTranslation('common')
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
        // 24px target around the 16px glyph (PARALLAX D8 § Change 5): same look, larger hit area.
        className={cn(
          'group inline-flex items-center justify-center min-w-6 min-h-6 rounded-full ml-0.5',
          'cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center w-4 h-4 rounded-full text-xs',
            'border border-border text-text-muted',
            'group-hover:border-border-hover group-hover:text-text-primary',
            'transition-colors duration-150'
          )}
        >
          ?
        </span>
      </button>
      {open && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 w-64 p-3 rounded-sm shadow-xl text-xs',
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
              {t('readMethodology')}
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
