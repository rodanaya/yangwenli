/**
 * DotBar — canonical dot-strip primitive for RUBLI.
 *
 * One geometry by default (N=22, DR=2, DG=5, h=6) so a 40% fill means the
 * same thing on every panel of the same page. Matches ScorecardWidgets.PillarBar.
 *
 * Optional dots/dotR/dotGap overrides exist so callers that previously
 * inlined a bespoke DotBar (RedesKnownDossier, InvestigationCaseDetail,
 * CorruptionClusters) can use the canonical primitive without visual
 * regression. New code should accept the defaults — divergent geometry
 * across pages is exactly the inconsistency this primitive prevents.
 */
interface ThresholdMark {
  /** Value in the same scale as DotBar's value/max (e.g. 0.25 when max=1). */
  value: number
  color?: string
}

interface DotBarProps {
  /** Current value (0 ≤ value). */
  value: number
  /** Max value. value/max determines fill ratio. */
  max: number
  /** Fill color — hex or CSS var. Defaults to --color-risk-critical. */
  color?: string
  /** Empty-dot color. Defaults to a subtle border token. */
  emptyColor?: string
  /** Empty-dot stroke color (optional). When set, empty dots get a 0.5-wide outline. */
  emptyStroke?: string
  /** Number of dots. Default 22 (canonical). */
  dots?: number
  /** Dot radius in viewBox units. Default 2 (canonical). */
  dotR?: number
  /** Dot center spacing in viewBox units. Default 5 (canonical). */
  dotGap?: number
  /** Accessible description of what the bar represents. */
  ariaLabel?: string
  /** Optional className for the wrapper span. */
  className?: string
  /**
   * Optional threshold markers — thin vertical ticks drawn below the dot row.
   * Accepts either plain numbers (`[0.25, 0.40, 0.60]`) for the common case
   * where callers just want tier boundaries on the same scale as value/max,
   * or `ThresholdMark` objects when a per-tick color is needed.
   */
  thresholds?: Array<ThresholdMark | number>
}

const DEFAULT_N = 22
const DEFAULT_DR = 2
const DEFAULT_DG = 5

export function DotBar({
  value,
  max,
  color = 'var(--color-risk-critical)',
  emptyColor = 'var(--color-border)',
  emptyStroke,
  dots = DEFAULT_N,
  dotR = DEFAULT_DR,
  dotGap = DEFAULT_DG,
  ariaLabel,
  className,
  thresholds,
}: DotBarProps) {
  const N = dots
  const DR = dotR
  const DG = dotGap
  const tickH = thresholds?.length ? 3 : 0
  const H = Math.max(DR * 2, 4) + tickH
  const dotCY = DR + (tickH > 0 ? tickH / 2 : 0)
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const filled = value > 0 ? Math.max(1, Math.round((pct / 100) * N)) : 0
  const W = N * DG

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={className ?? ''}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {Array.from({ length: N }).map((_, k) => (
        <circle
          key={k}
          cx={k * DG + DR}
          cy={dotCY}
          r={DR}
          fill={k < filled ? color : emptyColor}
          stroke={k < filled ? undefined : emptyStroke}
          strokeWidth={k < filled || !emptyStroke ? 0 : 0.5}
          fillOpacity={k < filled ? 0.88 : 1}
        />
      ))}
      {thresholds?.map((raw) => {
        const t: ThresholdMark = typeof raw === 'number' ? { value: raw } : raw
        const tx = max > 0 ? (t.value / max) * W : 0
        const tc = t.color ?? 'var(--color-text-muted)'
        return (
          <line
            key={t.value}
            x1={tx}
            x2={tx}
            y1={dotCY - DR - 1}
            y2={H}
            stroke={tc}
            strokeWidth={1}
            strokeDasharray="1 1"
            opacity={0.7}
          />
        )
      })}
    </svg>
  )
}

/**
 * DotBarRow — labeled DotBar with label on the left, value on the right.
 * Matches the most common call-site shape in the page (label + numeric readout).
 */
interface DotBarRowProps extends DotBarProps {
  label: string
  readout?: string
  /** Small accent text next to the label, e.g. a percentile or unit. */
  hint?: string
}

export function DotBarRow({
  label,
  readout,
  hint,
  value,
  max,
  color,
  emptyColor,
  ariaLabel,
  className,
}: DotBarRowProps) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <div className="flex items-center justify-between text-[13px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          {hint && <span className="text-text-muted">{hint}</span>}
        </span>
        {readout !== undefined && (
          <span className="font-medium font-mono tabular-nums text-text-primary">
            {readout}
          </span>
        )}
      </div>
      <DotBar
        value={value}
        max={max}
        color={color}
        emptyColor={emptyColor}
        ariaLabel={ariaLabel ?? label}
      />
    </div>
  )
}
