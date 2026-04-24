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
  color = 'border-risk-critical',
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
      <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-text-primary leading-[1.05] tracking-[-0.02em]">
        {value}
      </div>
      <div className="text-xs text-text-muted mt-2 leading-[1.4]">
        {label}
      </div>
      {annotation && (
        <div className="text-[11px] text-text-muted/70 mt-1 leading-[1.35]">
          {annotation}
        </div>
      )}
    </div>
  )
}

export default HallazgoStat
