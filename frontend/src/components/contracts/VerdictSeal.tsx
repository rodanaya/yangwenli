/**
 * VerdictSeal — the collision-proof risk block for /contracts (El Archivo).
 *
 * Replaces the old risk cell where a 48px DotBar + a `0.181` readout were
 * crammed inline into a 64px column and overprinted each other. Here the tier
 * pill sits on its own line and the score + meter on the next, inside a fixed
 * lane — the number and the bar can never share a row. Shared by the table row
 * and the "Los Señalados" band.
 *
 * Color is strictly from getRiskLevelFromScore + RISK_COLORS (no inline ladder).
 * No green for low (RiskLevelPill renders low as text-muted / zinc).
 */
import { cn } from '@/lib/utils'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { DotBar } from '@/components/ui/DotBar'
import { getRiskLevelFromScore, RISK_COLORS, RISK_THRESHOLDS } from '@/lib/constants'

type Level = 'critical' | 'high' | 'medium' | 'low'

interface VerdictSealProps {
  score?: number | null
  /** Fallback level when no numeric score is present. */
  level?: Level | string | null
  align?: 'right' | 'left'
  /** Hide the score + meter line (pill only) — e.g. very tight cells. */
  showMeter?: boolean
  className?: string
}

export function VerdictSeal({
  score,
  level,
  align = 'right',
  showMeter = true,
  className,
}: VerdictSealProps) {
  const lvl: Level | null =
    score != null ? getRiskLevelFromScore(score) : ((level as Level) ?? null)
  if (!lvl) {
    return <span className="text-xs text-text-muted">—</span>
  }
  const color = RISK_COLORS[lvl]
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        align === 'right' ? 'items-end' : 'items-start',
        className,
      )}
    >
      <RiskLevelPill level={lvl} score={score ?? undefined} size="sm" />
      {showMeter && score != null && (
        <div
          className={cn(
            'flex items-center gap-1.5',
            align === 'right' && 'flex-row-reverse',
          )}
        >
          <span className="font-mono text-[11px] tabular-nums text-text-secondary leading-none">
            {score.toFixed(2)}
          </span>
          <DotBar
            value={score}
            max={1}
            color={color}
            dots={10}
            dotR={1.75}
            dotGap={4}
            thresholds={[RISK_THRESHOLDS.medium, RISK_THRESHOLDS.high, RISK_THRESHOLDS.critical]}
          />
        </div>
      )}
    </div>
  )
}
