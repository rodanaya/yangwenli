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

import { useRef, useState } from 'react'
import { useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { RISK_TEXT_COLORS } from '@/lib/constants'

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

// ── Geometry — drawn at 1:1 (PARALLAX D8 § Change 3). The plate measures its
// own width (useMeasuredWidth) and every x is a function of it, so glyphs are
// never scaled by CSS: ticks stay 11px at 1440 and at 358. Year domain runs
// half a year past both ends so each yearly point sits inside its own term's
// band (bands own calendar years: start − 0.5 → end + 0.5). ─────────────────
const PAD_L = 40
const PAD_R = 12
const PAD_T = 14
const BAND_STRIP = 22 // party-label strip under the plot — labels never sit over the series
const AXIS_H = 18
const YEAR_MIN = 2001.5
const YEAR_MAX = 2025.5
const X_TICKS = [2002, 2006, 2012, 2018, 2024, 2025]
const TICK_FS = 11
const CHIP_W = 124

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
  'pena nieto': 'EPN',
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


/** Zero-anchored, rounded up to the nearest 5 — an honest, readable ceiling. */
function niceMax(raw: number): number {
  return Math.max(5, Math.ceil((raw * 1.12) / 5) * 5)
}

/** Chip body shared by the desktop float row and the mobile stacked list. */
function SeamChipBody({ sc, isEs }: { sc: SeamCalc; isEs: boolean }) {
  const caveat = sc.seam.structureA || sc.seam.partial
  const rose = sc.delta != null && sc.delta >= 0
  const deltaColor = sc.delta == null ? 'var(--color-text-muted)' : rose ? RISK_TEXT_COLORS.critical : 'var(--color-text-muted)'
  const deltaStr = sc.delta == null ? '—' : `${rose ? '▲+' : '▼−'}${Math.abs(sc.delta).toFixed(1)}pp`
  const exitStr = sc.exit == null ? '—' : `${sc.exit.toFixed(1)}%`
  const entryStr = sc.entry == null ? '—' : `${sc.entry.toFixed(1)}%`
  const windowLabel = `${sc.exitEdgeYear - 1}–${sc.exitEdgeYear} → ${sc.entryEdgeYear}–${sc.entryEdgeYear + 1}`
  const windowTitle = isEs ? `Ventana de relevo: ${windowLabel}` : `Handover window: ${windowLabel}`
  return (
    <div
      className="font-mono text-[13px] leading-tight text-center px-1 py-1 rounded-sm border"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-background-card)',
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
  const plate = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(plate)
  const narrow = W > 0 && W < 560
  const H = narrow ? 200 : 240
  const PLOT_X0 = PAD_L
  const PLOT_X1 = Math.max(PAD_L + 1, W - PAD_R)
  const PLOT_Y0 = PAD_T
  const PLOT_Y1 = H - BAND_STRIP - AXIS_H
  const xScale = (year: number) => PLOT_X0 + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (PLOT_X1 - PLOT_X0)

  const sortedSeries = [...series].sort((a, b) => a.year - b.year)
  const seamCalcs = computeSeamCalcs(sortedSeries, seams, admins)
  const n = seamCalcs.filter((sc) => sc.delta != null && sc.delta >= -0.25).length

  const rawMax = Math.max(nationalAvgPct, 1, ...sortedSeries.map((p) => p.highRiskPct))
  const yMax = niceMax(rawMax)
  const yScale = (v: number) => PLOT_Y1 - (v / yMax) * (PLOT_Y1 - PLOT_Y0)
  const yTicks = [0, yMax / 2, yMax]

  const edgeYears = new Set(seamCalcs.flatMap((sc) => [sc.exitEdgeYear, sc.entryEdgeYear]))
  const anchorPoints = sortedSeries.filter((p) => edgeYears.has(p.year))

  const pts = sortedSeries.map((p) => [xScale(p.year), yScale(p.highRiskPct)] as const)
  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // Year ticks, kept right-to-left while a label width apart: on a phone the
  // data horizon (2025) wins over its neighbour 2024.
  const tickGap = TICK_FS * 0.62 * 4 + 8
  const ticks: number[] = []
  for (const yr of [...X_TICKS].reverse()) {
    if (!ticks.length || xScale(ticks[ticks.length - 1]) - xScale(yr) >= tickGap) ticks.push(yr)
  }

  // National-average label: HTML on paper, seated above the dashed rule at its
  // left end; when the series would cross its box it slides along the rule —
  // never printed on the line or the series.
  // A narrow plate falls back to a short form ("Avg 10.9%") before giving up.
  const avgPct = `${nationalAvgPct.toFixed(1)}%`
  const avgForms = isEs ? [`Prom. nacional ${avgPct}`, `Prom. ${avgPct}`] : [`Natl. avg ${avgPct}`, `Avg ${avgPct}`]
  const avgH = TICK_FS + 5
  const yAvg = yScale(nationalAvgPct)
  const seriesYAt = (x: number): number | null => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      if (x >= x0 && x <= x1) return x1 === x0 ? y0 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    }
    return null
  }
  const placeAvg = (label: string): [number, number] | null => {
    const w = label.length * TICK_FS * 0.7 + 10 // generous: an overestimate only moves the label sooner
    const clear = (left: number, top: number) => {
      for (let x = left - 3; x <= left + w + 3; x += 2) {
        const sy = seriesYAt(x)
        if (sy != null && sy >= top - 3 && sy <= top + avgH + 3) return false
      }
      return true
    }
    // Left end first, then walk right along the rule (above it, then below).
    for (const top of [yAvg - avgH - 2, yAvg + 2]) {
      if (top < PLOT_Y0 || top + avgH > PLOT_Y1) continue
      for (let left = PLOT_X0 + 2; left <= PLOT_X1 - w - 2; left += 8) if (clear(left, top)) return [left, top]
    }
    return null
  }
  let avgLabel = avgForms[0]
  let avgPos = placeAvg(avgForms[0])
  if (!avgPos) {
    avgLabel = avgForms[1]
    avgPos = placeAvg(avgForms[1]) ?? [PLOT_X0 + 2, yAvg - avgH - 2]
  }

  const ariaLabel = isEs
    ? `Serie continua 2002-2025 de tasa de alto riesgo con cuatro relevos de poder; promedio nacional ${nationalAvgPct.toFixed(1)}%`
    : `Continuous 2002-2025 high-risk rate series with four power handovers; national average ${nationalAvgPct.toFixed(1)}%`

  return (
    <div>
      {/* Desktop chip row — each card centred on its seam, clamped inside the plate. */}
      <div className="hidden md:block relative mb-1" style={{ height: 62 }}>
        {W > 0 &&
          seamCalcs.map((sc) => {
            const left = Math.min(Math.max(xScale(sc.seam.xYear) - CHIP_W / 2, 0), W - CHIP_W)
            return (
              <div key={sc.seam.xYear} className="absolute top-0" style={{ left, width: CHIP_W }}>
                <SeamChipBody sc={sc} isEs={isEs} />
              </div>
            )
          })}
      </div>

      {/* Plate — height reserved; drawn once its width is known (1 unit = 1px). */}
      <div ref={plate} className="relative" style={{ height: H }}>
        {W > 0 && (
          <>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label={ariaLabel}>
              {/* Party bands — political context as background fill; each is a real button.
                  The label sits in the strip under the plot, never over the series. */}
              {admins.map((a) => {
                const x1 = xScale(Math.max(a.start - 0.5, YEAR_MIN))
                const x2 = xScale(Math.min(a.end + 0.5, YEAR_MAX))
                const w = Math.max(0, x2 - x1)
                const label = narrow ? (MOBILE_BAND_ABBR[a.name.toLowerCase()] ?? a.abbr.charAt(0)) : a.abbr
                return (
                  <g key={a.name}>
                    <rect
                      x={x1}
                      y={PLOT_Y0}
                      width={w}
                      height={PLOT_Y1 - PLOT_Y0}
                      style={{ fill: a.color, opacity: hoveredAdmin === a.name ? 0.16 : 0.08 }}
                    />
                    <rect x={x1} y={PLOT_Y1} width={w} height={3} style={{ fill: a.color, opacity: 0.45 }} />
                    <foreignObject x={x1} y={PLOT_Y0} width={w} height={PLOT_Y1 - PLOT_Y0 + BAND_STRIP}>
                      <button
                        type="button"
                        onClick={() => onSelectAdmin(a.name)}
                        onMouseEnter={() => setHoveredAdmin(a.name)}
                        onMouseLeave={() => setHoveredAdmin(null)}
                        aria-label={a.displayName}
                        className="w-full h-full flex items-end justify-center pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                        style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}
                      >
                        <span
                          style={{
                            fontFamily: MONO_ARCHIVAL,
                            fontSize: 12,
                            lineHeight: '16px',
                            letterSpacing: narrow ? 0 : '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {label}
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
                  <text x={PLOT_X0 - 5} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={TICK_FS} fontFamily={MONO_ARCHIVAL} fill="var(--color-text-muted)">
                    {t.toFixed(0)}%
                  </text>
                </g>
              ))}

              {/* X-axis year ticks, under the band strip. */}
              {ticks.map((yr) => (
                <text key={yr} x={xScale(yr)} y={PLOT_Y1 + BAND_STRIP + 12} textAnchor="middle" fontSize={TICK_FS} fontFamily={MONO_ARCHIVAL} fill="var(--color-text-muted)">
                  {yr}
                </text>
              ))}

              {/* National-average dashed rule (its label is HTML, below). */}
              <line x1={PLOT_X0} x2={PLOT_X1} y1={yAvg} y2={yAvg} stroke="var(--color-text-secondary)" strokeDasharray="3 3" strokeWidth={0.75} opacity={0.6} />

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
            <div
              data-seam-avg-label=""
              className="absolute pointer-events-none whitespace-nowrap"
              style={{
                left: avgPos[0],
                top: avgPos[1],
                height: avgH,
                lineHeight: `${avgH}px`,
                padding: '0 4px',
                fontFamily: MONO_ARCHIVAL,
                fontSize: TICK_FS,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-background-elevated)',
              }}
            >
              {avgLabel}
            </div>
          </>
        )}
      </div>

      {/* Mobile stacked chip list — same computed strings as the desktop float row. */}
      <div className="md:hidden mt-3 space-y-1.5">
        {seamCalcs.map((sc) => (
          <SeamChipBody key={sc.seam.xYear} sc={sc} isEs={isEs} />
        ))}
      </div>

      {/* Computed headline — one ochre normal-weight fragment inside an serif line. */}
      <p className="mt-4" style={{ fontFamily: SERIF, fontStyle: 'normal', fontWeight: 500, fontSize: 19, color: 'var(--color-text-primary)' }}>
        <span style={{ fontStyle: 'normal', fontWeight: 700, color: OCHRE }}>{n}</span>{' '}
        {isEs ? `de ${seams.length} relevos sin caída del riesgo` : `of ${seams.length} handovers with no risk drop`}
      </p>

      {/* Footnote — Structure-A caveat, handover-window definition, Sheinbaum partial term. */}
      <p className="mt-2 text-[13px] font-mono leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {isEs
          ? '† Estructura A (2002–2010): cobertura de RFC 0.1% — el indicador subestima el riesgo temprano. Ventanas de relevo: promedio simple de 2 años a cada lado del traspaso; tolerancia ±0.25 pp. Sheinbaum: mandato parcial (2025, datos al 28 sep) — ventana de entrada limitada a los años disponibles.'
          : '† Structure A (2002–2010): 0.1% RFC coverage — the indicator understates early risk. Handover windows: 2-year simple average on each side of the transfer; ±0.25 pp tolerance. Sheinbaum: partial term (2025, data to Sep 28) — entry window limited to the years available.'}
      </p>
    </div>
  )
}

export default SeamStrip
