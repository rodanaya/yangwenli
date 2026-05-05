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
 * OECD 25% reference dashed cyan + right-edge label. Admin wash bands
 * behind the line with mono labels at the top. 4 FT-style callout boxes
 * with leader lines (Casa Blanca · Estafa Maestra · COVID · Toka IT).
 *
 * Plan: docs/OMEGA_C_REGRESSIONS_2026_05_05.md fix #1 + #2
 */

import { useState } from 'react'
import { motion } from 'framer-motion'

// Per-year direct-award rates
const YEARLY_DA: Array<{ year: number; da: number; covid?: boolean }> = [
  { year: 2002, da: 58 }, { year: 2003, da: 60 }, { year: 2004, da: 62 },
  { year: 2005, da: 63 }, { year: 2006, da: 65 }, { year: 2007, da: 70 },
  { year: 2008, da: 72 }, { year: 2009, da: 73 }, { year: 2010, da: 71 },
  { year: 2011, da: 73 }, { year: 2012, da: 74 }, { year: 2013, da: 78 },
  { year: 2014, da: 79 }, { year: 2015, da: 78 }, { year: 2016, da: 79 },
  { year: 2017, da: 78 }, { year: 2018, da: 76 }, { year: 2019, da: 79 },
  { year: 2020, da: 87, covid: true }, { year: 2021, da: 81 }, { year: 2022, da: 75 },
  { year: 2023, da: 74 }, { year: 2024, da: 72 }, { year: 2025, da: 74 },
]

// Era bands behind the line (presidential terms)
const ERA_BANDS: Array<{ label: string; start: number; end: number; color: string }> = [
  { label: 'FOX',        start: 2002, end: 2006, color: '#1a5276' },
  { label: 'CALDERÓN',   start: 2007, end: 2012, color: '#1a5276' },
  { label: 'PEÑA NIETO', start: 2013, end: 2018, color: '#c41e3a' },
  { label: 'AMLO',       start: 2019, end: 2024, color: '#7b2d8b' },
  { label: 'SHEINBAUM',  start: 2025, end: 2025, color: '#7b2d8b' },
]

// FT-style annotation callouts BELOW the data line (above-line collided with
// admin band labels at the chart top — fixed 2026-05-05). Callouts staggered
// vertically so they don't overlap each other. Leader lines connect dot to box.
const CALLOUTS: Array<{ year: number; en: string; es: string; dy: number }> = [
  { year: 2014, en: 'Casa Blanca · Oceanografía', es: 'Casa Blanca · Oceanografía', dy: 56 },
  { year: 2017, en: 'Estafa Maestra surfaces',    es: 'Estafa Maestra',              dy: 78 },
  { year: 2020, en: 'COVID emergency procurement',es: 'Emergencia COVID',            dy: 100 },
  { year: 2023, en: 'Toka IT monopoly',           es: 'Monopolio TIC Toka',          dy: 56 },
]

interface Props {
  lang: 'en' | 'es'
}

export function MacroArc({ lang }: Props) {
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const isEs = lang === 'es'

  // Layout
  const W = 820
  const H = 260
  const PAD_L = 50    // y-axis ticks
  const PAD_R = 90    // right-edge labels
  const PAD_T = 36    // admin band labels at top
  const PAD_B = 32    // x-axis labels
  const CW = W - PAD_L - PAD_R
  const CH = H - PAD_T - PAD_B

  const Y_MIN_YR = 2002
  const Y_MAX_YR = 2025
  const Y_MAX_PCT = 100
  const OECD = 25

  const xOf = (year: number) => PAD_L + ((year - Y_MIN_YR) / (Y_MAX_YR - Y_MIN_YR)) * CW
  const yOf = (pct: number) => PAD_T + CH * (1 - pct / Y_MAX_PCT)
  const OECD_Y = yOf(OECD)
  const AXIS_Y = PAD_T + CH

  const linePath = YEARLY_DA
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(d.year).toFixed(2)} ${yOf(d.da).toFixed(2)}`)
    .join(' ')

  const areaPath = `${linePath} L ${xOf(Y_MAX_YR).toFixed(2)} ${AXIS_Y} L ${xOf(Y_MIN_YR).toFixed(2)} ${AXIS_Y} Z`

  const yTicks = [0, 25, 50, 75, 100]
  const xTicks = [2002, 2006, 2010, 2014, 2018, 2022, 2025]

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
          ? 'Tasa de adjudicación directa 2002–2025 vs techo OCDE 25%'
          : 'Direct-award rate 2002–2025 vs OECD 25% ceiling'}
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
                fontSize={9}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="700"
                fill={era.color}
                opacity={0.7}
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
              fontSize={9}
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
            fontSize={9}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
          >
            {y}
          </text>
        ))}

        {/* OECD 25% reference line — dashed cyan */}
        <line
          x1={PAD_L}
          x2={PAD_L + CW}
          y1={OECD_Y}
          y2={OECD_Y}
          stroke="#22d3ee"
          strokeWidth={1.2}
          strokeDasharray="6 4"
          opacity={0.85}
        />
        <text
          x={PAD_L + CW + 6}
          y={OECD_Y + 3}
          fontSize={9.5}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight="700"
          fill="#22d3ee"
        >
          {isEs ? 'OCDE 25%' : 'OECD 25%'}
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
        {YEARLY_DA.map((d) => (
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
          const last = YEARLY_DA[YEARLY_DA.length - 1]
          return (
            <text
              x={xOf(last.year) + 6}
              y={yOf(last.da) + 3}
              fontSize={10.5}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight="700"
              fill="#dc2626"
            >
              {isEs ? `México · ${last.da}%` : `Mexico · ${last.da}%`}
            </text>
          )
        })()}

        {/* FT-style annotation callouts BELOW the line at staggered depths
            so they don't collide with the admin band labels at the top.
            Boxes anchor to the dot via a vertical leader. */}
        {CALLOUTS.map((c) => {
          const cx = xOf(c.year)
          const pt = YEARLY_DA.find((d) => d.year === c.year)
          if (!pt) return null
          const cy = yOf(pt.da)
          const label = isEs ? c.es : c.en
          // Estimate text width for box (rough: 5.4px per char + padding)
          const boxW = label.length * 5.4 + 14
          const boxH = 16
          // Anchor: the box top aligns at cy + dy (always BELOW the dot)
          let boxX = cx - boxW / 2
          // Clamp inside chart so labels don't fall off either edge
          const minX = PAD_L + 2
          const maxX = PAD_L + CW - boxW - 2
          if (boxX < minX) boxX = minX
          if (boxX > maxX) boxX = maxX
          const boxY = cy + c.dy
          const leaderEndX = boxX + boxW / 2
          return (
            <g key={c.year}>
              {/* Leader line from dot down to box top */}
              <line
                x1={cx}
                y1={cy + 2}
                x2={leaderEndX}
                y2={boxY}
                stroke="var(--color-text-muted)"
                strokeWidth={0.6}
                opacity={0.55}
              />
              {/* Callout box */}
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
                fontSize={9}
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
          const pt = YEARLY_DA.find((d) => d.year === hoverYear)
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
                fontSize={11}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="800"
                fill="#dc2626"
              >
                {pt.da}%
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Caption — minimal, methodology-only */}
      <p className="mt-2 text-[10px] font-mono text-text-muted leading-relaxed">
        {isEs
          ? `Tasa de adjudicación directa anual · bandas administrativas · OCDE recomienda ≤ 25%. Fuente: COMPRANET 2002–2025.`
          : `Yearly direct-award rate · admin wash bands · OECD recommends ≤ 25%. Source: COMPRANET 2002–2025.`}
      </p>
    </div>
  )
}
