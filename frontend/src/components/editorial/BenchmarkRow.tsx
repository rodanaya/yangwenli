/**
 * BenchmarkRow — FT "deviation from benchmark" diverging bullet row.
 *
 * FT Visual Vocabulary "Deviation" pattern: a horizontal bar extends right
 * (crimson) when the value exceeds the benchmark, left (zinc) when below.
 * Answers "compared to what?" instantly.
 *
 * Extracted from VendorEvidenceTab (was inline there) so both VendorEvidenceTab
 * and SectorProfile Risk tab can share the primitive.
 *
 * sp-P3 · docs/SECTOR_PROFILE_REDESIGN_PLAN.md
 */

export interface BenchmarkRowProps {
  label: string
  value: number        // 0–1 fraction
  benchmark: number    // 0–1 fraction (OECD limit or sector/platform avg)
  benchmarkLabel: string
  maxDelta: number     // scale factor — usually 0.5 or 1.0
}

export function BenchmarkRow({ label, value, benchmark, benchmarkLabel, maxDelta }: BenchmarkRowProps) {
  const TRACK = 140       // half-track px each side
  const CENTER = TRACK    // SVG center x
  const TOTAL = TRACK * 2 // total SVG width
  const delta = value - benchmark
  const barLen = Math.min(Math.abs(delta) / maxDelta * TRACK, TRACK)
  const isAbove = delta > 0
  const fill = isAbove ? '#c41e3a' : '#52525b'
  const barX = isAbove ? CENTER : CENTER - barLen
  const absPp = Math.abs(Math.round(delta * 100))
  const arrow = isAbove ? '↑' : '↓'
  const valuePct = Math.round(value * 100)
  const benchmarkPct = Math.round(benchmark * 100)

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[11px] font-mono text-text-secondary w-40 shrink-0 leading-tight">{label}</span>
      <svg
        width={TOTAL + 60}
        height={22}
        className="overflow-visible shrink-0"
        aria-hidden="true"
      >
        {/* Track */}
        <rect x={0} y={9} width={TOTAL} height={4} fill="#27272a" rx={2} />
        {/* Center baseline tick */}
        <line x1={CENTER} y1={3} x2={CENTER} y2={19} stroke="#3f3f46" strokeWidth={1.5} />
        {/* Bar */}
        {barLen > 0 && (
          <rect x={barX} y={8} width={barLen} height={6} fill={fill} rx={1} opacity={0.9} />
        )}
        {/* Delta label right of track */}
        <text
          x={TOTAL + 6}
          y={15}
          fontSize={10}
          fontFamily="var(--font-family-mono)"
          fill={fill}
        >
          {arrow} {absPp}pp
        </text>
      </svg>
      <span className="text-[9px] font-mono text-text-muted shrink-0 leading-tight">
        {valuePct}% · {benchmarkLabel} {benchmarkPct}%
      </span>
    </div>
  )
}
