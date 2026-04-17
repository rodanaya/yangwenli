import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ActProps {
  number: string         // "I", "II", "III", etc.
  label: string          // "THE FIELD" — uppercase, becomes the right label
  title?: ReactNode      // optional serif section title below the eyebrow
  className?: string
  children: ReactNode
}

export function Act({ number, label, title, className, children }: ActProps) {
  return (
    <section className={cn('space-y-6', className)}>
      {/* Eyebrow rule: "I ─────────────────── THE FIELD" */}
      <div className="act-eyebrow">
        <span className="act-num">{number}</span>
        <span className="act-rule" aria-hidden="true" />
        <span className="act-label">{label}</span>
      </div>

      {/* Optional serif section title */}
      {title && (
        <h2 className="act-title -mt-2">{title}</h2>
      )}

      {/* Section content */}
      {children}
    </section>
  )
}
