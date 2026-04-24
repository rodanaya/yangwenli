/**
 * DotBar — canonical dot-strip primitive for RUBLI.
 *
 * Replaces 11 reimplementations previously scattered across VendorProfile and
 * other pages. One fixed geometry (N=22, DR=2, DG=5, h=6) so a 40% fill means
 * the same thing on every panel of the same page.
 *
 * Matches ScorecardWidgets.PillarBar geometry so the two are visually
 * interchangeable.
 */
interface DotBarProps {
  /** Current value (0 ≤ value). */
  value: number
  /** Max value. value/max determines fill ratio. */
  max: number
  /** Fill color — hex or CSS var. Defaults to --color-risk-critical. */
  color?: string
  /** Empty-dot color. Defaults to a subtle border token. */
  emptyColor?: string
  /** Accessible description of what the bar represents. */
  ariaLabel?: string
  /** Optional className for the wrapper span. */
  className?: string
}

const N = 22
const DR = 2
const DG = 5
const H = 6

export function DotBar({
  value,
  max,
  color = 'var(--color-risk-critical)',
  emptyColor = 'var(--color-border)',
  ariaLabel,
  className,
}: DotBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const filled = value > 0 ? Math.max(1, Math.round((pct / 100) * N)) : 0

  return (
    <svg
      viewBox={`0 0 ${N * DG} ${H}`}
      className={`w-full ${className ?? ''}`}
      style={{ height: H }}
      preserveAspectRatio="none"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {Array.from({ length: N }).map((_, k) => (
        <circle
          key={k}
          cx={k * DG + DR}
          cy={H / 2}
          r={DR}
          fill={k < filled ? color : emptyColor}
          fillOpacity={k < filled ? 0.88 : 1}
        />
      ))}
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
      <div className="flex items-center justify-between text-[11px] text-text-secondary">
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
