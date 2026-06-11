/**
 * captureAxis — shared 0–100% share-axis furniture for the /captura plates.
 *
 * Both exhibits (§ LA PELÍCULA register, § LA FOTOGRAFÍA field) draw the same
 * coordinate system: a linear 0→100% top-1-share axis with the monotonic
 * definition's two thresholds (floor 25% / ceiling 50%) as vertical rules.
 * Threshold positions come from the API response — never hardcoded.
 */

export type ShareBand = 'low' | 'mid' | 'captured'

/** Band classification against the live thresholds. No green anywhere. */
export function shareBand(share: number, floor: number, ceil: number): ShareBand {
  if (share >= ceil) return 'captured'
  if (share >= floor) return 'mid'
  return 'low'
}

export const BAND_COLOR: Record<ShareBand, string> = {
  low: '#71717a', // zinc — low is muted, never green (Bible §3.10)
  mid: '#a16207', // amber-800 — the 25–50% anteroom
  captured: 'var(--color-risk-critical)',
}

/** Mono tick-label row: 0 / 25 / 50 / 75 / 100%. */
export function AxisTicks({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative h-4 font-mono text-[9px] text-text-muted tabular-nums ${className}`}
      aria-hidden="true"
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <span
          key={v}
          className="absolute -translate-x-1/2"
          style={{ left: `${v}%` }}
        >
          {v}%
        </span>
      ))}
    </div>
  )
}

/**
 * Threshold verticals, absolutely positioned inside a `relative` container.
 * Render once per plate; rows beneath align because both use % coordinates.
 */
export function ThresholdRules({
  floor,
  ceil,
  lang,
  labeled = false,
  labelAt = 'top',
}: {
  floor: number
  ceil: number
  lang: 'en' | 'es'
  labeled?: boolean
  labelAt?: 'top' | 'bottom'
}) {
  const labelPos = labelAt === 'top' ? { top: -2 } : { bottom: -2 }
  return (
    <>
      <div
        className="absolute inset-y-0 w-px pointer-events-none"
        style={{
          left: `${floor}%`,
          backgroundImage:
            'repeating-linear-gradient(to bottom, #71717a 0 3px, transparent 3px 7px)',
          opacity: 0.4,
        }}
        aria-hidden="true"
      >
        {labeled && (
          <span
            className="absolute left-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-muted whitespace-nowrap"
            style={labelPos}
          >
            {lang === 'es' ? `piso ${floor}%` : `floor ${floor}%`}
          </span>
        )}
      </div>
      <div
        className="absolute inset-y-0 w-px pointer-events-none"
        style={{
          left: `${ceil}%`,
          backgroundImage:
            'repeating-linear-gradient(to bottom, var(--color-risk-critical) 0 3px, transparent 3px 7px)',
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        {labeled && (
          <span
            className="absolute left-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] whitespace-nowrap"
            style={{ color: 'var(--color-risk-critical)', ...labelPos }}
          >
            {lang === 'es' ? `techo ${ceil}%` : `ceiling ${ceil}%`}
          </span>
        )}
      </div>
    </>
  )
}
