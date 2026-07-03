/**
 * SeamStrip — §B «LA COSTURA» / THE SEAM, Act I of /administrations.
 *
 * One continuous 2002-2025 high-risk-rate line crossed by four dashed
 * "handover seams" — the moments federal power changed hands. Five
 * translucent party bands sit under the plot as context; the metric line
 * stays neutral ink on purpose (political color lives in the bands, the
 * argument lives at the seams). Each seam carries a computed exit-window
 * -> entry-window delta chip, so the reader can run the regression-
 * discontinuity test the page's thesis asserts: does the line reset when
 * a seam is crossed?
 *
 * Named precedents: Reuters "Carbon's Casualties" (annotations pinned to
 * moments on a continuous series, not decorative captions) + FT UK-politics
 * banded backgrounds (party context as background fill) + regression-
 * discontinuity design (2-year window either side of a cutoff — the
 * formula behind every chip and the computed headline).
 *
 * Pure presentational — series/admins/seams all arrive via props, no
 * fetch, no API import. See docs § .claude/designus/administrations-
 * 2026-07-02/proposals/geometry-first.md § 0 for the full geometry spec.
 */

import { useState } from 'react'
import { RISK_COLORS } from '@/lib/constants'

export interface SeamPoint {
  year: number
  highRiskPct: number
}

export interface SeamAdmin {
  name: string
  displayName: string
  abbr: string
  party: string
  color: string
  start: number
  end: number
}

export interface Seam {
  xYear: number
  fromAdmin: string
  toAdmin: string
  partial?: boolean
  structureA?: boolean
}

export interface SeamStripProps {
  series: SeamPoint[]
  nationalAvgPct: number
  admins: SeamAdmin[]
  seams: Seam[]
  isEs: boolean
  onSelectAdmin: (name: string) => void
}

// ── Geometry (fixed viewBox; the wrapper enforces a 640px min-width so the
// plot never squeezes past legibility on narrow viewports — see mobile note
// on the outer overflow-x-auto div). ──────────────────────────────────────
const VB_W = 960
const VB_H = 240
const PAD_L = 44
const PAD_R = 16
const PAD_T = 14
const PAD_B = 30
const PLOT_X0 = PAD_L
const PLOT_X1 = VB_W - PAD_R
const PLOT_Y0 = PAD_T
const PLOT_Y1 = VB_H - PAD_B
const YEAR_MIN = 2002
const YEAR_MAX = 2025
const X_TICKS = [2002, 2006, 2012, 2018, 2024, 2025]

const OCHRE = 'var(--color-accent)'
const MONO_ARCHIVAL = '"IBM Plex Mono", "JetBrains Mono", monospace'
const SERIF = '"EB Garamond", "Playfair Display", Georgia, serif'

// Person-initial band labels for the <640px width — party abbreviations
// (PAN/PAN/PRI/MOR/MOR) don't disambiguate two same-party neighbors at that
// width, so mobile switches to per-president initials.
const MOBILE_BAND_ABBR: Record<string, string> = {
  fox: 'F',
  calderon: 'C',
  epn: 'EPN',
  amlo: 'A',
  sheinbaum: 'S',
}

interface SeamCalc {
  seam: Seam
  fromAbbr: string
  toAbbr: string
  exit: number | null
  entry: number | null
  delta: number | null
  exitEdgeYear: number
  entryEdgeYear: number
}

/**
 * exit = plain average of the outgoing admin's last 2 years (ending at the
 * seam's floor year); entry = plain average of the incoming admin's first
 * 2 years (starting at the seam's ceil year) — a 2-year window on each side
 * of the cutoff (regression-discontinuity formula). No contract-weighting:
 * SeamPoint only carries {year, highRiskPct}, not contract counts.
 */
function computeSeamCalcs(series: SeamPoint[], seams: Seam[], admins: SeamAdmin[]): SeamCalc[] {
  const byYear = new Map(series.map((p) => [p.year, p.highRiskPct]))
  const abbrByName = new Map(admins.map((a) => [a.name, a.abbr]))
  const avg = (years: number[]): number | null => {
    const vals = years.map((y) => byYear.get(y)).filter((v): v is number => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  return seams.map((s) => {
    const floorY = Math.floor(s.xYear)
    const ceilY = Math.ceil(s.xYear)
    const exit = avg([floorY - 1, floorY])
    const entry = avg([ceilY, ceilY + 1])
    return {
      seam: s,
      fromAbbr: abbrByName.get(s.fromAdmin) ?? s.fromAdmin.slice(0, 3).toUpperCase(),
      toAbbr: abbrByName.get(s.toAdmin) ?? s.toAdmin.slice(0, 3).toUpperCase(),
      exit,
      entry,
      delta: exit != null && entry != null ? entry - exit : null,
      exitEdgeYear: floorY,
      entryEdgeYear: ceilY,
    }
  })
}

function xScale(year: number): number {
  return PLOT_X0 + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (PLOT_X1 - PLOT_X0)
}

/** Zero-anchored, rounded up to the nearest 5 — an honest, readable ceiling. */
function niceMax(raw: number): number {
  return Math.max(5, Math.ceil((raw * 1.12) / 5) * 5)
}

/** Chip body shared by the desktop float row and the mobile stacked list. */
function SeamChipBody({ sc, isEs }: { sc: SeamCalc; isEs: boolean }) {
  const caveat = sc.seam.structureA || sc.seam.partial
  const rose = sc.delta != null && sc.delta >= 0
  const deltaColor = sc.delta == null ? 'var(--color-text-muted)' : rose ? RISK_COLORS.critical : 'var(--color-text-muted)'
  const deltaStr = sc.delta == null ? '—' : `${rose ? '▲+' : '▼−'}${Math.abs(sc.delta).toFixed(1)}pp`
  const exitStr = sc.exit == null ? '—' : `${sc.exit.toFixed(1)}%`
  const entryStr = sc.entry == null ? '—' : `${sc.entry.toFixed(1)}%`
  const windowLabel = `${sc.exitEdgeYear - 1}–${sc.exitEdgeYear} → ${sc.entryEdgeYear}–${sc.entryEdgeYear + 1}`
  const windowTitle = isEs ? `Ventana de relevo: ${windowLabel}` : `Handover window: ${windowLabel}`
  return (
    <div
      className="font-mono text-[9px] leading-tight text-center px-1.5 py-1 rounded-sm border"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-background-card)',
        opacity: caveat ? 0.75 : 1,
      }}
      title={windowTitle}
    >
      <div style={{ color: 'var(--color-text-muted)' }}>
        {sc.fromAbbr}→{sc.toAbbr}
        {caveat ? '†' : ''}
      </div>
      <div className="tabular-nums" style={{ color: deltaColor }}>
        {exitStr}→{entryStr} {deltaStr}
      </div>
    </div>
  )
}

export function SeamStrip({ series, nationalAvgPct, admins, seams, isEs, onSelectAdmin }: SeamStripProps) {
  const [hoveredAdmin, setHoveredAdmin] = useState<string | null>(null)

  const sortedSeries = [...series].sort((a, b) => a.year - b.year)
  const seamCalcs = computeSeamCalcs(sortedSeries, seams, admins)
  const n = seamCalcs.filter((sc) => sc.delta != null && sc.delta >= -0.25).length

  const rawMax = Math.max(nationalAvgPct, 1, ...sortedSeries.map((p) => p.highRiskPct))
  const yMax = niceMax(rawMax)
  const yScale = (v: number) => PLOT_Y1 - (v / yMax) * (PLOT_Y1 - PLOT_Y0)
  const yTicks = [0, yMax / 2, yMax]

  const edgeYears = new Set(seamCalcs.flatMap((sc) => [sc.exitEdgeYear, sc.entryEdgeYear]))
  const anchorPoints = sortedSeries.filter((p) => edgeYears.has(p.year))

  const pathD = sortedSeries
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.year).toFixed(1)},${yScale(p.highRiskPct).toFixed(1)}`)
    .join(' ')

  const ariaLabel = isEs
    ? 'Serie continua 2002-2025 de tasa de alto riesgo con cuatro relevos de poder'
    : 'Continuous 2002-2025 high-risk rate series with four power handovers'

  return (
    <div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          {/* Desktop chip row — pinned above the plot at each seam's x-position. */}
          <div className="hidden md:block relative h-11 mb-1">
            {seamCalcs.map((sc) => (
              <div
                key={sc.seam.xYear}
                className="absolute"
                style={{ left: `${(xScale(sc.seam.xYear) / VB_W) * 100}%`, transform: 'translateX(-50%)', width: 108 }}
              >
                <SeamChipBody sc={sc} isEs={isEs} />
              </div>
            ))}
          </div>

          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={ariaLabel}>
            {/* Party bands — political context as background fill; each is a real button. */}
            {admins.map((a) => {
              const x1 = xScale(Math.max(a.start, YEAR_MIN))
              const x2 = xScale(Math.min(a.end, YEAR_MAX))
              const w = Math.max(0, x2 - x1)
              const mobileAbbr = MOBILE_BAND_ABBR[a.name.toLowerCase()] ?? a.abbr.charAt(0)
              return (
                <g key={a.name}>
                  <rect
                    x={x1}
                    y={PLOT_Y0}
                    width={w}
                    height={PLOT_Y1 - PLOT_Y0}
                    style={{ fill: a.color, opacity: hoveredAdmin === a.name ? 0.16 : 0.08 }}
                  />
                  <foreignObject x={x1} y={PLOT_Y0} width={w} height={PLOT_Y1 - PLOT_Y0}>
                    <button
                      type="button"
                      onClick={() => onSelectAdmin(a.name)}
                      onMouseEnter={() => setHoveredAdmin(a.name)}
                      onMouseLeave={() => setHoveredAdmin(null)}
                      aria-label={a.displayName}
                      className="w-full h-full flex items-end justify-center pb-2"
                      style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}
                    >
                      <span
                        className="hidden md:inline"
                        style={{ fontFamily: MONO_ARCHIVAL, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
                      >
                        {a.abbr}
                      </span>
                      <span className="md:hidden" style={{ fontFamily: MONO_ARCHIVAL, fontSize: 9, color: 'var(--color-text-muted)' }}>
                        {mobileAbbr}
                      </span>
                    </button>
                  </foreignObject>
                </g>
              )
            })}

            {/* Gridlines + y ticks. */}
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PLOT_X0} x2={PLOT_X1} y1={yScale(t)} y2={yScale(t)} stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="2 3" />
                <text x={PLOT_X0 - 4} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={8} fontFamily="monospace" fill="var(--color-text-muted)">
                  {t.toFixed(0)}%
                </text>
              </g>
            ))}

            {/* X-axis year ticks. */}
            {X_TICKS.map((yr) => (
              <text key={yr} x={xScale(yr)} y={PLOT_Y1 + 12} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="var(--color-text-muted)">
                {yr}
              </text>
            ))}

            {/* National-average dashed rule. */}
            <line x1={PLOT_X0} x2={PLOT_X1} y1={yScale(nationalAvgPct)} y2={yScale(nationalAvgPct)} stroke="var(--color-text-secondary)" strokeDasharray="3 3" strokeWidth={0.75} opacity={0.6} />
            <text x={PLOT_X0 + 2} y={yScale(nationalAvgPct) - 3} fontSize={7.5} fontFamily="monospace" fill="var(--color-text-secondary)">
              {isEs ? `Prom. nacional ${nationalAvgPct.toFixed(1)}%` : `Natl. avg ${nationalAvgPct.toFixed(1)}%`}
            </text>

            {/* Seams — dashed verticals, full plot height. */}
            {seams.map((s) => (
              <line key={s.xYear} x1={xScale(s.xYear)} x2={xScale(s.xYear)} y1={PLOT_Y0} y2={PLOT_Y1} stroke="var(--color-text-secondary)" strokeWidth={1} strokeDasharray="4 3" opacity={0.75} />
            ))}

            {/* The metric line — neutral ink; political color lives in the bands. */}
            <path d={pathD} fill="none" stroke="var(--color-text-primary)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />

            {/* Anchor dots — only the 8 window-edge years feeding the seam math. */}
            {anchorPoints.map((p) => (
              <circle key={p.year} cx={xScale(p.year)} cy={yScale(p.highRiskPct)} r={2.5} fill="var(--color-text-primary)" />
            ))}
          </svg>
        </div>
      </div>

      {/* Mobile stacked chip list — same computed strings as the desktop float row. */}
      <div className="md:hidden mt-3 space-y-1.5">
        {seamCalcs.map((sc) => (
          <SeamChipBody key={sc.seam.xYear} sc={sc} isEs={isEs} />
        ))}
      </div>

      {/* Computed headline — one ochre normal-weight fragment inside an italic serif line. */}
      <p className="mt-4" style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: 19, color: 'var(--color-text-primary)' }}>
        <span style={{ fontStyle: 'normal', fontWeight: 700, color: OCHRE }}>{n}</span>{' '}
        {isEs ? `de ${seams.length} relevos sin caída del riesgo` : `of ${seams.length} handovers with no risk drop`}
      </p>

      {/* Footnote — Structure-A caveat, handover-window definition, Sheinbaum partial term. */}
      <p className="mt-2 text-[9px] font-mono leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {isEs
          ? '† Estructura A (2002–2010): cobertura de RFC 0.1% — el indicador subestima el riesgo temprano. Ventanas de relevo: promedio simple de 2 años a cada lado del traspaso; tolerancia ±0.25 pp. Sheinbaum: mandato parcial (2024–2025) — ventana de entrada limitada a los años disponibles.'
          : '† Structure A (2002–2010): 0.1% RFC coverage — the indicator understates early risk. Handover windows: 2-year simple average on each side of the transfer; ±0.25 pp tolerance. Sheinbaum: partial term (2024–2025) — entry window limited to the years available.'}
      </p>
    </div>
  )
}

export default SeamStrip
