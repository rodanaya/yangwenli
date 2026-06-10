/**
 * DABullet — single FT-bullet process-integrity cell: direct-award % fill vs the
 * OECD ceiling tick. The within-ceiling portion is muted; the overshoot beyond
 * the ceiling is tinted RISK_COLORS.high (the overshoot silhouette IS the
 * geometry of the finding). Linear 0–100%, honest.
 *
 * Promoted 2026-06-09 from the inline copy in sectors/ExposureLedger.tsx so both
 * the sector register (§D) and the category register (/categories) share one
 * behavior-identical bullet. The /sectors swap must render pixel-identical.
 *
 * Hex colours ONLY via style={{}} (className hex is silently stripped); colour
 * comes from RISK_COLORS / the var(--…) token set, never an inline hex literal.
 */
import { RISK_COLORS, OECD_DIRECT_AWARD_LIMIT } from '@/lib/constants'

// OECD direct-award ceiling as a percentage (0–100). Single source: constants.
const OECD_DA_CEILING = OECD_DIRECT_AWARD_LIMIT * 100

export function DABullet({ daPct }: { daPct: number }) {
  const fill = Math.max(0, Math.min(100, daPct))
  const within = Math.min(fill, OECD_DA_CEILING)
  const over = Math.max(0, fill - OECD_DA_CEILING)
  return (
    <span
      className="relative block h-[7px] flex-1 rounded-[1px] overflow-hidden"
      style={{ background: 'var(--color-background-elevated)', minWidth: 40 }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: `${within}%`, background: 'var(--color-text-muted)', opacity: 0.5 }}
      />
      {over > 0 && (
        <span
          className="absolute inset-y-0"
          style={{ left: `${OECD_DA_CEILING}%`, width: `${over}%`, background: RISK_COLORS.high, opacity: 0.9 }}
        />
      )}
      <span
        className="absolute inset-y-0"
        style={{ left: `${OECD_DA_CEILING}%`, width: 1.5, background: 'var(--color-text-primary)', opacity: 0.75 }}
      />
    </span>
  )
}
