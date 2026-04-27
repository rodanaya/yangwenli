import { ScrollReveal, useCountUp, AnimatedFill } from '@/hooks/useAnimations'
import { OutletBadge, type OutletType } from './OutletBadge'
import { cn } from '@/lib/utils'

interface DataPullquoteProps {
  quote: string
  attribution?: string
  stat: string
  statLabel: string
  statColor?: string
  barValue?: number
  barLabel?: string
  outlet?: OutletType
  className?: string
}

const OUTLET_BORDER_COLORS: Record<OutletType, string> = {
  longform: 'var(--color-text-muted)',
  investigative: 'var(--color-sector-educacion)',
  data_analysis: 'var(--color-sector-tecnologia)',
  rubli: 'var(--color-sector-salud)',
}

function parseStatNumber(stat: string): { num: number; suffix: string; decimals: number } | null {
  const match = stat.match(/^([0-9.,]+)\s*(%|B|M|K|T)?$/)
  if (!match) return null
  const cleaned = match[1].replace(/,/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  const decimals = cleaned.includes('.') ? cleaned.split('.')[1].length : 0
  return { num, suffix: match[2] || '', decimals }
}

export default function DataPullquote({
  quote,
  attribution,
  stat,
  statLabel,
  statColor = 'text-risk-critical',
  barValue,
  barLabel,
  outlet,
  className,
}: DataPullquoteProps) {
  const parsed = parseStatNumber(stat)
  const { ref: countRef, value: animatedValue } = useCountUp(
    parsed ? parsed.num : 0,
    1600,
    parsed ? parsed.decimals : 0
  )

  const borderColor = outlet
    ? OUTLET_BORDER_COLORS[outlet]
    : statColor.includes('red') ? 'var(--color-sector-salud)'
    : statColor.includes('amber') ? 'var(--color-sector-energia)'
    : statColor.includes('blue') ? 'var(--color-sector-educacion)'
    : 'var(--color-sector-salud)'

  const barColorHex = borderColor

  return (
    <ScrollReveal className={cn('my-10', className)}>
      <figure
        className="relative pl-6 py-6 pr-6 rounded-r-lg bg-background-card"
        style={{ borderLeft: `3px solid ${borderColor}` }}
        role="figure"
        aria-label="Cita con datos"
      >
        {/* Outlet badge */}
        {outlet && (
          <div className="mb-3">
            <OutletBadge outlet={outlet} />
          </div>
        )}

        {/* Quote */}
        <blockquote className="text-lg md:text-xl italic text-text-secondary leading-relaxed mb-5 font-light">
          &ldquo;{quote}&rdquo;
        </blockquote>

        {attribution && (
          <figcaption className="text-xs text-text-muted uppercase tracking-wider mb-5">
            &mdash; {attribution}
          </figcaption>
        )}

        {/* Stat block */}
        <div className="border-t border-border pt-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              ref={countRef}
              className={cn('text-4xl md:text-5xl font-black tabular-nums tracking-tight', statColor)}
              aria-label={`${stat} ${statLabel}`}
            >
              {parsed
                ? `${animatedValue.toLocaleString('es-MX', {
                    minimumFractionDigits: parsed.decimals,
                    maximumFractionDigits: parsed.decimals,
                  })}${parsed.suffix}`
                : stat}
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-3">{statLabel}</p>

          {/* Stat bar — note: the {stat} number is already huge above this,
              so we don't repeat it as a tail label here (was causing "6,034"
              to appear twice with confusing visual hierarchy). */}
          {barValue !== undefined && (
            <div role="img" aria-label={`${stat}${barLabel ? ` — ${barLabel}` : ''}`}>
              <AnimatedFill
                pct={barValue}
                color={barColorHex}
                height="h-1.5"
                delay={200}
              />
              {barLabel && (
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-2">{barLabel}</p>
              )}
            </div>
          )}
        </div>
      </figure>
    </ScrollReveal>
  )
}
