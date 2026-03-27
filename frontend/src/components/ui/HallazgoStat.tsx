import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

interface HallazgoStatProps {
  value: string
  label: string
  annotation?: string
  color?: string
  className?: string
  style?: CSSProperties
}

export function HallazgoStat({
  value,
  label,
  annotation,
  color = 'border-red-500',
  className,
  style,
}: HallazgoStatProps) {
  return (
    <div
      className={cn(
        'inline-block border-l-[3px] pl-4 py-1',
        color,
        className
      )}
      style={style}
    >
      <div
        className="text-5xl font-bold text-text-primary leading-none"
        style={{ fontFamily: "var(--font-family-serif)" }}
      >
        {value}
      </div>
      <div className="text-sm text-text-muted mt-1">
        {label}
      </div>
      {annotation && (
        <div className="text-xs text-text-muted/70 mt-1 italic">
          {annotation}
        </div>
      )}
    </div>
  )
}

export default HallazgoStat
