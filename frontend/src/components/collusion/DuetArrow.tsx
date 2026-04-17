/**
 * DuetArrow — asymmetric two-stub arrow that visualises bid-overlap domination.
 *
 * The core visual: two triangular stubs meeting at a central number.
 * Left stub width ∝ shareA (what fraction of A's procs overlap with B).
 * Right stub width ∝ shareB (what fraction of B's procs overlap with A).
 *
 * When the pair is asymmetric (e.g. shareA=88%, shareB=12%), the left stub
 * is thick and the right stub is thin — you can SEE which vendor is the
 * dominated party in half a second.
 *
 * All SVG, no dependencies.
 */

interface DuetArrowProps {
  shareA: number // 0..100
  shareB: number // 0..100
  centerLabel: string // e.g. "87%" or "41 procs"
  accent: string // hex color
  height?: number
}

export function DuetArrow({
  shareA,
  shareB,
  centerLabel,
  accent,
  height = 28,
}: DuetArrowProps) {
  // Stub thickness ∝ share, bounded [2, height].
  const leftThickness = Math.max(2, Math.min(height, (shareA / 100) * height))
  const rightThickness = Math.max(2, Math.min(height, (shareB / 100) * height))

  const halfLeft = leftThickness / 2
  const halfRight = rightThickness / 2
  const midY = height / 2

  // SVG width is responsive via viewBox; draw in a normalised 200x28 box.
  const W = 200
  const H = height
  const tipLeft = 0
  const tipRight = W
  const baseLeft = W / 2 - 18 // leave room for center label
  const baseRight = W / 2 + 18

  // Left stub: wedge from (0, midY) narrowing to (baseLeft, midY ± halfLeft)
  const leftPath = `M ${tipLeft} ${midY} L ${baseLeft} ${midY - halfLeft} L ${baseLeft} ${midY + halfLeft} Z`
  const rightPath = `M ${tipRight} ${midY} L ${baseRight} ${midY - halfRight} L ${baseRight} ${midY + halfRight} Z`

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: H }}
      aria-label={`Asymmetry: A shares ${shareA.toFixed(0)}%, B shares ${shareB.toFixed(0)}%`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="block"
        aria-hidden="true"
      >
        <path d={leftPath} fill={accent} opacity={0.85} />
        <path d={rightPath} fill={accent} opacity={0.85} />
        {/* Baseline hairline connecting the two tips — makes the wedges read as one object */}
        <line
          x1={tipLeft}
          y1={midY}
          x2={tipRight}
          y2={midY}
          stroke={accent}
          strokeOpacity={0.25}
          strokeWidth={0.6}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span
          className="font-mono text-[10px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm"
          style={{
            background: 'rgb(9 9 11)', // zinc-950
            color: accent,
          }}
        >
          {centerLabel}
        </span>
      </div>
    </div>
  )
}
