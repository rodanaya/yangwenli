import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/useAnimations'

interface ProseStatProps {
  value: number | string
  suffix?: string
  prefix?: string
  color?: string
  label?: string
  animate?: boolean
  decimals?: number
  className?: string
}

export default function ProseStat({
  value,
  suffix = '',
  prefix = '',
  color = 'text-red-400',
  label,
  animate = true,
  decimals = 0,
  className,
}: ProseStatProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const isNumeric = typeof value === 'number'
  const { ref: countRef, value: animatedValue } = useCountUp(
    isNumeric && animate ? value : 0,
    1400,
    decimals
  )
  const spanRef = useRef<HTMLSpanElement>(null)

  // Merge refs: countRef needs to observe, spanRef for tooltip positioning
  const mergedRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (mergedRef.current && countRef.current === null) {
      // useCountUp ref assignment
    }
  }, [countRef])

  const displayValue = isNumeric && animate
    ? `${prefix}${animatedValue.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
    : `${prefix}${typeof value === 'number' ? value.toLocaleString('es-MX') : value}${suffix}`

  return (
    <span
      ref={isNumeric && animate ? countRef : spanRef}
      className={cn(
        'relative inline font-bold text-[1.15em] leading-none',
        color,
        className
      )}
      style={{
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        textDecorationThickness: '2px',
        textUnderlineOffset: '3px',
        textDecorationColor: 'currentColor',
        opacity: 0.9,
      }}
      onMouseEnter={() => label && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => label && setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      role={label ? 'term' : undefined}
      aria-label={label || displayValue}
      tabIndex={label ? 0 : undefined}
    >
      {displayValue}
      {showTooltip && label && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded bg-zinc-900 text-zinc-200 text-xs font-normal whitespace-nowrap pointer-events-none z-50 shadow-lg"
          role="tooltip"
          style={{
            textDecoration: 'none',
            fontSize: '0.75rem',
          }}
        >
          {label}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
        </span>
      )}
    </span>
  )
}
