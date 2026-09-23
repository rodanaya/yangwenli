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
import { RISK_TEXT_COLORS } from '@/lib/constants'

interface Props {
  val: number
  unit: string
  invertColor?: boolean
}

export function DeltaBadge({ val, unit, invertColor }: Props) {
  const abs = Math.abs(val)
  const isUp = val > 0.01
  const isDown = val < -0.01
  // AA-safe type inks (PARALLAX D8 § Change 4): worse → RISK_TEXT_COLORS.critical,
  // better or flat → muted (never green, Bible §3.10).
  const worse = invertColor ? isDown : isUp
  const color = worse ? RISK_TEXT_COLORS.critical : 'var(--color-text-muted)'
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-mono" style={{ color }}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {abs < 0.01 ? '--' : `${val > 0 ? '+' : ''}${abs.toFixed(1)}${unit}`}
    </span>
  )
}

export default DeltaBadge
