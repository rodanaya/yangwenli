/**
 * DeltaBadge — small inline badge showing a positive/negative delta with
 * a trend arrow + colored value. Used heavily in the Administrations
 * comparison views.
 *
 * Extracted from pages/Administrations.tsx (2026-05-11) — was inline.
 *
 * `invertColor`: when true, positive deltas are GOOD (green-ish via
 * risk-low) and negative are BAD (red via risk-critical). Use when the
 * metric being delta'd is something like "competition rate" where higher
 * is better, vs the default ("direct award rate") where higher is worse.
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  val: number
  unit: string
  invertColor?: boolean
}

export function DeltaBadge({ val, unit, invertColor }: Props) {
  const abs = Math.abs(val)
  const isUp = val > 0.01
  const isDown = val < -0.01
  const color = invertColor
    ? isUp
      ? 'text-risk-low'
      : isDown
        ? 'text-risk-critical'
        : 'text-text-muted'
    : isUp
      ? 'text-risk-critical'
      : isDown
        ? 'text-risk-low'
        : 'text-text-muted'
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-mono', color)}>
      <Icon className="h-3 w-3" />
      {abs < 0.01 ? '--' : `${val > 0 ? '+' : ''}${abs.toFixed(1)}${unit}`}
    </span>
  )
}

export default DeltaBadge
