/**
 * MacroArc — 23-year direct-award rate trend
 *
 * Restored 2026-05-05 to a clean full-width FT-style time-series chart.
 * The omega-C-P3 "giant 74% + tiny sparkline" layout was reverted because
 * DashboardSledgehammer (rendered earlier on the page) ALREADY shows the
 * 74% headline number — having it twice on the same scroll was a clear
 * regression. MacroArc's job is to confirm the headline with the trend,
 * not duplicate it.
 *
 * Layout: full-width 820×260 SVG. Mexico DA-rate line in crimson.
 * EU scoreboard 10% reference dashed cyan + right-edge label. Admin wash bands
 * behind the line with mono labels at the top. 4 FT-style callout boxes
 * with leader lines (Casa Blanca · Estafa Maestra · COVID · Toka IT).
 *
 * Plan: docs/OMEGA_C_REGRESSIONS_2026_05_05.md fix #1 + #2
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useYearOverYear } from '@/components/stories/live/useEmergencyData'
import { RISK_TEXT_COLORS } from '@/lib/constants'

// Per-year direct-award rates come from /analysis/year-over-year. The hardcoded
// 2002-2025 series this component used to carry read 58-73% for 2002-2009 and
// 87% for 2020; the register codes procedure type only from 2010 (Structure A
// reads 0.0%) and 2020 closes at 78.09%. Years the register cannot score are
// dropped rather than drawn.

// Era bands behind the line (presidential terms)
const ERA_BANDS: Array<{ label: string; start: number; end: number; color: string }> = [
  { label: 'FOX',        start: 2002, end: 2006, color: '#1a5276' },
  { label: 'CALDERÓN',   start: 2007, end: 2012, color: '#1a5276' },
  { label: 'PEÑA NIETO', start: 2013, end: 2018, color: '#c41e3a' },
  { label: 'AMLO',       start: 2019, end: 2024, color: '#7b2d8b' },
  { label: 'SHEINBAUM',  start: 2025, end: 2025, color: '#7b2d8b' },
]

// FT-style annotation callouts BELOW the data line. Stagger pattern is
// HIGH/LOW/HIGH/LOW (zigzag) so adjacent callouts in years can't share Y space.
// Labels also tightened to short phrases — long names ('COVID emergency
// procurement') were 160px wide and crashed into Estafa Maestra's box.
const CALLOUTS: Array<{ year: number; en: string; es: string; dy: number }> = [
  { year: 2014, en: 'Casa Blanca',         es: 'Casa Blanca',         dy: 60 },
  { year: 2017, en: 'Estafa Maestra',      es: 'Estafa Maestra',      dy: 110 },
  { year: 2020, en: 'COVID emergency',     es: 'Emergencia COVID',    dy: 60 },
  { year: 2023, en: 'Peak year',           es: 'Año pico',            dy: 110 },
]

interface Props {
  lang: 'en' | 'es'
}

export function MacroArc({ lang }: Props) {
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const isEs = lang === 'es'
  const yoy = useYearOverYear()
  const series = (yoy.data ?? [])
    .filter((d) => d.direct_award_pct > 0)
    .map((d) => ({ year: d.year, da: d.direct_award_pct }))
    .sort((a, b) => a.year - b.year)

  // Layout
  const W = 820
  const H = 260
  const PAD_L = 50    // y-axis ticks
  const PAD_R = 90    // right-edge labels
  const PAD_T = 36    // admin band labels at top
  const PAD_B = 32    // x-axis labels
  const CW = W - PAD_L - PAD_R
  const CH = H - PAD_T - PAD_B

  const Y_MIN_YR = series.length ? series[0].year : 2010
  const Y_MAX_YR = series.length ? series[series.length - 1].year : 2025
  const Y_MAX_PCT = 100
  // European Commission, Single Market Scoreboard: a direct-award share at or
  // above 10% is rated unsatisfactory. External reference, not a RUBLI measure.
  const EU_LINE = 10

  const xOf = (year: number) =>
    PAD_L + ((year - Y_MIN_YR) / Math.max(1, Y_MAX_YR - Y_MIN_YR)) * CW
  const yOf = (pct: number) => PAD_T + CH * (1 - pct / Y_MAX_PCT)
  const EU_Y = yOf(EU_LINE)
  const AXIS_Y = PAD_T + CH

  const linePath = series
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(d.year).toFixed(2)} ${yOf(d.da).toFixed(2)}`)
    .join(' ')

  const areaPath = `${linePath} L ${xOf(Y_MAX_YR).toFixed(2)} ${AXIS_Y} L ${xOf(Y_MIN_YR).toFixed(2)} ${AXIS_Y} Z`

  const yTicks = [0, 25, 50, 75, 100]
  const xTicks = series
    .map((d) => d.year)
    .filter((y, i, a) => i === 0 || i === a.length - 1 || y % 4 === 0)

  if (yoy.isLoading || yoy.isError || !series.length) {
    return (
      <p className="font-mono text-[12.5px] text-text-muted py-8">
        {yoy.isLoading
          ? (isEs ? 'Cargando la serie anual…' : 'Loading the annual series…')
          : (isEs
            ? 'La serie anual de adjudicación directa no cargó. No se dibuja nada en su lugar.'
            : 'The annual direct-award series did not load. Nothing is drawn in its place.')}
      </p>
    )
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const rawYear = Y_MIN_YR + ((svgX - PAD_L) / CW) * (Y_MAX_YR - Y_MIN_YR)
    const year = Math.round(Math.max(Y_MIN_YR, Math.min(Y_MAX_YR, rawYear)))
    setHoverYear(year)
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ height: 'auto', maxHeight: H, overflow: 'visible' }}
        role="img"
        aria-label={isEs
          ? `Tasa de adjudicación directa ${Y_MIN_YR}–${Y_MAX_YR} frente a la línea UE de ${EU_LINE}%`
          : `Direct-award rate ${Y_MIN_YR}–${Y_MAX_YR} against the EU ${EU_LINE}% line`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverYear(null)}
      >
        <defs>
          <linearGradient id="macroarc-area" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Admin wash bands behind the chart */}
        {ERA_BANDS.map((era) => {
          const x1 = xOf(era.start)
          const x2 = era.end > era.start ? xOf(era.end) : Math.min(xOf(era.start) + 16, PAD_L + CW)
          return (
            <g key={era.label}>
              <rect x={x1} y={PAD_T} width={Math.max(1, x2 - x1)} height={CH} fill={era.color} opacity={0.05} />
              <text
                x={(x1 + x2) / 2}
                y={PAD_T - 18}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="700"
                fill={era.color}
                letterSpacing="0.08em"
              >
                {era.label}
              </text>
            </g>
          )
        })}

        {/* Y-axis grid + ticks */}
        {yTicks.map((t) => (
          <g key={`y-${t}`}>
            <line
              x1={PAD_L}
              x2={PAD_L + CW}
              y1={yOf(t)}
              y2={yOf(t)}
              stroke="var(--color-border)"
              strokeWidth={t === 0 ? 1 : 0.5}
              strokeDasharray={t === 0 ? '' : '2 4'}
              opacity={t === 0 ? 0.6 : 0.35}
            />
            <text
              x={PAD_L - 6}
              y={yOf(t) + 3}
              textAnchor="end"
              fontSize={13}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
            >
              {t}%
            </text>
          </g>
        ))}

        {/* X-axis ticks */}
        {xTicks.map((y) => (
          <text
            key={`x-${y}`}
            x={xOf(y)}
            y={AXIS_Y + 18}
            textAnchor="middle"
            fontSize={13}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
          >
            {y}
          </text>
        ))}

        {/* EU scoreboard reference line — dashed cyan */}
        <line
          x1={PAD_L}
          x2={PAD_L + CW}
          y1={EU_Y}
          y2={EU_Y}
          stroke="#22d3ee"
          strokeWidth={1.2}
          strokeDasharray="6 4"
          opacity={0.85}
        />
        <text
          x={PAD_L + CW + 6}
          y={EU_Y + 3}
          fontSize={13}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight="700"
          fill="var(--color-text-secondary)"
        >
          {isEs ? `UE ${EU_LINE}%` : `EU ${EU_LINE}%`}
        </text>

        {/* Area fill under Mexico line */}
        <motion.path
          d={areaPath}
          fill="url(#macroarc-area)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />

        {/* Mexico DA-rate line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#dc2626"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.4 }}
        />

        {/* Year dots */}
        {series.map((d) => (
          <circle
            key={d.year}
            cx={xOf(d.year)}
            cy={yOf(d.da)}
            r={hoverYear === d.year ? 4 : 2.2}
            fill="#dc2626"
            opacity={hoverYear === d.year ? 1 : 0.7}
            style={{ transition: 'r 120ms, opacity 120ms' }}
          />
        ))}

        {/* Right-edge "Mexico" direct label at the line endpoint */}
        {(() => {
          const last = series[series.length - 1]
          return (
            <text
              x={xOf(last.year) + 6}
              y={yOf(last.da) + 3}
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight="700"
              fill={RISK_TEXT_COLORS.critical}
            >
              {isEs ? `México · ${last.da.toFixed(1)}%` : `Mexico · ${last.da.toFixed(1)}%`}
            </text>
          )
        })()}

        {/* Annotation callouts BELOW the line at staggered depths.
            COVID 2020 gets a Playfair pull-out; the other three use the
            standard FT-style mono box. 2020 is not the peak — the register's
            highest direct-award year is 2023 — but it is the year readers
            come looking for. */}
        {CALLOUTS.map((c) => {
          const cx = xOf(c.year)
          const pt = series.find((d) => d.year === c.year)
          if (!pt) return null
          const cy = yOf(pt.da)
          const label = isEs ? c.es : c.en
          const minX = PAD_L + 2
          const maxX2 = PAD_L + CW - 2

          if (c.year === 2020) {
            // Playfair editorial pull-out — peak event deserves visual promotion
            const boxW = Math.min(label.length * 7.4 + 24, 120)
            const boxH = 24
            let boxX = cx - boxW / 2
            if (boxX < minX) boxX = minX
            if (boxX > maxX2 - boxW) boxX = maxX2 - boxW
            const boxY = cy + c.dy
            const leaderEndX = boxX + boxW / 2
            return (
              <g key={c.year}>
                <line x1={cx} y1={cy + 2} x2={leaderEndX} y2={boxY} stroke="#dc2626" strokeWidth={0.9} opacity={0.65} />
                <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={2} fill="var(--color-background-card)" stroke="#dc2626" strokeWidth={1} opacity={0.97} />
                <text
                  x={boxX + boxW / 2}
                  y={boxY + 16}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="'Playfair Display', Georgia, serif"
                  fontStyle="normal"
                  fontWeight="700"
                  fill={RISK_TEXT_COLORS.critical}
                >
                  {label}
                </text>
              </g>
            )
          }

          // Standard mono callout for the other three events
          const boxW = label.length * 5.4 + 14
          const boxH = 16
          let boxX = cx - boxW / 2
          if (boxX < minX) boxX = minX
          if (boxX > maxX2 - boxW) boxX = maxX2 - boxW
          const boxY = cy + c.dy
          const leaderEndX = boxX + boxW / 2
          return (
            <g key={c.year}>
              <line
                x1={cx}
                y1={cy + 2}
                x2={leaderEndX}
                y2={boxY}
                stroke="var(--color-text-muted)"
                strokeWidth={0.6}
                opacity={0.55}
              />
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={2}
                fill="var(--color-background-card)"
                stroke="var(--color-border-hover)"
                strokeWidth={0.7}
                opacity={0.96}
              />
              <text
                x={boxX + boxW / 2}
                y={boxY + 11}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="600"
                fill="var(--color-text-secondary)"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Hover tooltip dot + value */}
        {hoverYear !== null && (() => {
          const pt = series.find((d) => d.year === hoverYear)
          if (!pt) return null
          const tx = xOf(pt.year)
          const ty = yOf(pt.da)
          return (
            <g>
              <line
                x1={tx}
                x2={tx}
                y1={PAD_T}
                y2={AXIS_Y}
                stroke="var(--color-text-muted)"
                strokeWidth={0.5}
                strokeDasharray="2 3"
                opacity={0.5}
              />
              <text
                x={tx}
                y={ty - 10}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="800"
                fill={RISK_TEXT_COLORS.critical}
              >
                {pt.da.toFixed(1)}%
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Caption — minimal, methodology-only */}
      <p className="mt-2 text-[12px] font-mono text-text-muted leading-relaxed">
        {isEs
          ? `Tasa de adjudicación directa anual · bandas administrativas · el Tablero UE considera insatisfactorio ≥ ${EU_LINE}%. Fuente: COMPRANET ${Y_MIN_YR}–${Y_MAX_YR}.`
          : `Yearly direct-award rate · admin wash bands · the EU scoreboard rates ≥ ${EU_LINE}% unsatisfactory. Source: COMPRANET ${Y_MIN_YR}–${Y_MAX_YR}.`}
      </p>
    </div>
  )
}
