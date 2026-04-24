import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type OutletType } from './OutletBadge'
import { AnimatedNumber, AnimatedFill } from '@/hooks/useAnimations'
import { staggerItem } from '@/lib/animations'

export type StoryType = 'era' | 'case' | 'thematic' | 'year'

const TYPE_LABELS: Record<StoryType, string> = {
  era: 'ERA',
  case: 'CASO',
  thematic: 'TEMATICO',
  year: 'ANO',
}

const OUTLET_ACCENT: Record<OutletType, string> = {
  longform: '#1a1714',
  investigative: '#d4922a',
  data_analysis: '#2563eb',
  rubli: '#dc2626',
}

export interface StoryCardProps {
  slug: string
  outlet: OutletType
  type: StoryType
  headline: string
  subheadline: string
  leadStatValue: string
  leadStatLabel: string
  leadStatColor?: string
  estimatedMinutes: number
  era?: string
  onClick?: () => void
}

/**
 * Parse a stat value string for the animated counter.
 * Returns { numeric, prefix, suffix, decimals } if parseable,
 * or null if the value should be rendered as plain text.
 */
function parseStatValue(value: string): { numeric: number; prefix: string; suffix: string; decimals: number } | null {
  // Match patterns like "81.9%", "$15B", "505,219", "63% -> 82%"
  const match = value.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/)
  if (!match) return null
  const prefix = match[1]
  const numStr = match[2].replace(/,/g, '')
  const suffix = match[3]
  const numeric = parseFloat(numStr)
  if (isNaN(numeric)) return null
  const dotIdx = numStr.indexOf('.')
  const decimals = dotIdx >= 0 ? numStr.length - dotIdx - 1 : 0
  return { numeric, prefix, suffix, decimals }
}

export function StoryCard(props: StoryCardProps) {
  const {
    outlet,
    type,
    headline,
    subheadline,
    leadStatValue,
    leadStatLabel,
    leadStatColor,
    estimatedMinutes,
    era,
    onClick,
  } = props
  const accent = leadStatColor || OUTLET_ACCENT[outlet]
  const parsed = parseStatValue(leadStatValue)

  // Estimate a fill percentage from the stat for the bar animation
  const fillPct = parsed ? Math.min(parsed.numeric, 100) : 50

  return (
    <motion.button
      variants={staggerItem}
      whileHover={{ y: -3, borderColor: 'rgba(113,113,122,0.5)', transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative bg-background-card border border-border rounded-sm p-5 text-left w-full',
        'flex flex-col gap-3 transition-colors cursor-pointer group overflow-hidden'
      )}
      aria-label={headline}
    >
      {/* Top badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-text-muted">
          {TYPE_LABELS[type]}
        </span>
      </div>

      {/* Headline */}
      <h3
        className="text-lg font-bold text-text-primary leading-tight line-clamp-2"
        style={{ fontFamily: 'var(--font-family-serif)' }}
      >
        {headline}
      </h3>

      {/* Subheadline */}
      <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
        {subheadline}
      </p>

      {/* Lead stat */}
      <div className="mt-auto pt-2">
        <div className="text-2xl font-black tracking-tight" style={{ color: accent }}>
          {parsed ? (
            <AnimatedNumber
              value={parsed.numeric}
              decimals={parsed.decimals}
              prefix={parsed.prefix}
              suffix={parsed.suffix}
              duration={1400}
            />
          ) : (
            <span>{leadStatValue}</span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-0.5 leading-snug">{leadStatLabel}</p>
      </div>

      {/* Animated fill bar */}
      <div className="mt-1">
        <AnimatedFill pct={fillPct} color={accent} delay={200} height="h-1" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-1 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {estimatedMinutes} min
        </span>
        {era && (
          <span className="px-1.5 py-0.5 rounded bg-background-elevated text-text-secondary font-medium">
            {era}
          </span>
        )}
      </div>
    </motion.button>
  )
}
