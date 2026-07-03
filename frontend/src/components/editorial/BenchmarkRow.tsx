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
  // Responsive diverging bar — the track is a flex-1 element that fills the row's
  // available width instead of a fixed 280px SVG that stranded ~half the column
  // blank. (Same lesson the SHAP waterfall learned when its fixed-348px SVG was
  // rewritten to fill width.) Bar extends right of center (crimson) when the
  // value exceeds the benchmark, left (zinc) when below; magnitude = |delta|/maxDelta.
  const delta = value - benchmark
  const isAbove = delta > 0
  const fill = isAbove ? '#c41e3a' : '#52525b'
  // Fraction of a half-track the bar fills (each side of center is 50% of the track).
  const barFrac = Math.min(Math.abs(delta) / maxDelta, 1)
  const barWidthPct = barFrac * 50
  const absPp = Math.abs(Math.round(delta * 100))
  const arrow = isAbove ? '↑' : '↓'
  const valuePct = Math.round(value * 100)
  const benchmarkPct = Math.round(benchmark * 100)

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[13px] font-mono text-text-secondary w-40 shrink-0 leading-tight">{label}</span>
      {/* Diverging track — fills remaining width */}
      <div className="flex-1 relative min-w-0" style={{ height: 22 }} aria-hidden="true">
        {/* Track */}
        <div className="absolute left-0 right-0" style={{ top: '50%', height: 4, transform: 'translateY(-50%)', background: '#27272a', borderRadius: 2 }} />
        {/* Center baseline tick */}
        <div className="absolute" style={{ left: '50%', top: 3, bottom: 3, width: 1.5, background: '#3f3f46' }} />
        {/* Bar */}
        {barWidthPct > 0 && (
          <div
            className="absolute"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: 6,
              borderRadius: 1,
              background: fill,
              opacity: 0.9,
              ...(isAbove
                ? { left: '50%', width: `${barWidthPct}%` }
                : { left: `${50 - barWidthPct}%`, width: `${barWidthPct}%` }),
            }}
          />
        )}
      </div>
      <span className="text-[12px] font-mono shrink-0 text-right tabular-nums leading-tight" style={{ width: 52, color: fill }}>
        {arrow} {absPp}pp
      </span>
      <span className="text-[13px] font-mono text-text-muted shrink-0 leading-tight w-32 text-right">
        {valuePct}% · {benchmarkLabel} {benchmarkPct}%
      </span>
    </div>
  )
}
