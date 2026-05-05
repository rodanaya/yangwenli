/**
 * MacroArc omega-C-P3 — Pudding "30 Years of American Anxieties" mechanic
 *
 * Layout: ONE huge typographic anchor (74% in Playfair Italic 800, ~200pt,
 * crimson) IS the chart. The 23-year time-series collapses to a 320×80
 * sparkline on the right. Number is the headline; line confirms it.
 *
 * Deleted: 820×280 SVG with 4 FT-style callout boxes + leader lines.
 * Kept: YEARLY_DA + ERA_BANDS_MACRO data; OECD 25% reference; Bible §3.10
 * neutral palette.
 *
 * Plan: docs/OMEGA_C_AMPLIFIED_REDESIGN.md omega-C-P3
 */

import { useState } from 'react'
import { motion } from 'framer-motion'

// Per-year direct-award rates — same data as original MacroArc
const YEARLY_DA: Array<{ year: number; da: number; covid?: boolean; transition?: boolean }> = [
  { year: 2002, da: 58 },
  { year: 2003, da: 60 },
  { year: 2004, da: 62 },
  { year: 2005, da: 63 },
  { year: 2006, da: 65 },
  { year: 2007, da: 70, transition: true },
  { year: 2008, da: 72 },
  { year: 2009, da: 73 },
  { year: 2010, da: 71 },
  { year: 2011, da: 73 },
  { year: 2012, da: 74 },
  { year: 2013, da: 78, transition: true },
  { year: 2014, da: 79 },
  { year: 2015, da: 78 },
  { year: 2016, da: 79 },
  { year: 2017, da: 78 },
  { year: 2018, da: 76 },
  { year: 2019, da: 79, transition: true },
  { year: 2020, da: 87, covid: true },
  { year: 2021, da: 81 },
  { year: 2022, da: 75 },
  { year: 2023, da: 74 },
  { year: 2024, da: 72 },
  { year: 2025, da: 74 },
]

// Era bands for sparkline x-axis ticks
const ERA_BANDS_MACRO: Array<{ label: string; start: number; end: number; color: string }> = [
  { label: 'Fox',        start: 2002, end: 2006, color: '#1a5276' },
  { label: 'Calderón',   start: 2007, end: 2012, color: '#1a5276' },
  { label: 'Peña',       start: 2013, end: 2018, color: '#c41e3a' },
  { label: 'AMLO',       start: 2019, end: 2024, color: '#7b2d8b' },
  { label: 'Sheinbaum',  start: 2025, end: 2025, color: '#7b2d8b' },
]

// Inflection markers — tiny ▼ ticks; tooltip text only on hover
const INFLECTIONS: Array<{ year: number; label: { en: string; es: string }; covid?: boolean }> = [
  { year: 2014, label: { en: 'Casa Blanca · Oceanografía', es: 'Casa Blanca · Oceanografía' } },
  { year: 2017, label: { en: 'Estafa Maestra surfaces', es: 'Estafa Maestra' } },
  { year: 2020, label: { en: 'COVID emergency procurement', es: 'Emergencia COVID' }, covid: true },
  { year: 2023, label: { en: 'Toka IT monopoly', es: 'Monopolio TIC Toka' } },
]

interface Props {
  lang: 'en' | 'es'
}

export function MacroArc({ lang }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; year: number; da: number; era: string; event?: string
  } | null>(null)

  const latest = YEARLY_DA[YEARLY_DA.length - 1]
  const latestPct = `${latest.da}%`

  // Sparkline geometry
  const SW = 320
  const SH = 80
  const PAD_L = 4
  const PAD_R = 4
  const PAD_TOP = 12       // room for ▼ tick markers above line
  const PAD_BOT = 20       // room for era tick band under x-axis
  const CHART_W = SW - PAD_L - PAD_R
  const CHART_H = SH - PAD_TOP - PAD_BOT

  const Y_MIN = 2002
  const Y_MAX = 2025
  const OECD = 25

  const xOf = (year: number) => PAD_L + ((year - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_W
  const yOf = (pct: number) => PAD_TOP + CHART_H * (1 - pct / 100)
  const OECD_Y = yOf(OECD)
  const AXIS_Y = PAD_TOP + CHART_H

  const linePath = YEARLY_DA
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(d.year).toFixed(2)} ${yOf(d.da).toFixed(2)}`)
    .join(' ')

  const areaPath = `${linePath} L ${xOf(Y_MAX).toFixed(2)} ${AXIS_Y} L ${xOf(Y_MIN).toFixed(2)} ${AXIS_Y} Z`

  function getEraAt(year: number): string {
    return ERA_BANDS_MACRO.find((e) => year >= e.start && year <= e.end)?.label ?? ''
  }

  function getEventAt(year: number): string | undefined {
    return INFLECTIONS.find((e) => e.year === year)?.label[lang]
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * SW
    const rawYear = Y_MIN + ((svgX - PAD_L) / CHART_W) * (Y_MAX - Y_MIN)
    const year = Math.round(Math.max(Y_MIN, Math.min(Y_MAX, rawYear)))
    const pt = YEARLY_DA.find((d) => d.year === year)
    if (!pt) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      year: pt.year,
      da: pt.da,
      era: getEraAt(pt.year),
      event: getEventAt(pt.year),
    })
  }

  return (
    <div>
      {/* Main layout: giant number LEFT, sparkline RIGHT */}
      <div className="flex flex-row items-center gap-6 flex-wrap sm:flex-nowrap">

        {/* LEFT: Giant Playfair Italic 800 number */}
        <motion.div
          className="flex-none flex flex-col justify-center"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* The number IS the chart */}
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 800,
              fontSize: 'clamp(120px, 18vw, 220px)',
              lineHeight: 0.85,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              color: '#dc2626',
            }}
            aria-label={lang === 'en'
              ? `${latestPct} direct-award rate in 2025`
              : `${latestPct} tasa de adjudicación directa en 2025`}
          >
            {latestPct}
          </div>

          {/* Sub-line: what the number means */}
          <p
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              marginTop: '0.5rem',
              letterSpacing: '0.04em',
            }}
          >
            {lang === 'en'
              ? "Mexico's 2025 direct-award rate"
              : 'Tasa de adjudicación directa de México 2025'}
          </p>

          {/* Footer line: the streak */}
          <p
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem',
              fontStyle: 'italic',
              letterSpacing: '0.03em',
            }}
          >
            {lang === 'en'
              ? '23 consecutive years above OECD\'s 25% ceiling'
              : '23 años consecutivos sobre el techo OCDE de 25%'}
          </p>
        </motion.div>

        {/* RIGHT: Compact 320×80 sparkline */}
        <motion.div
          className="flex-1 min-w-[200px] relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <svg
            viewBox={`0 0 ${SW} ${SH}`}
            width="100%"
            style={{ height: SH, overflow: 'visible' }}
            role="img"
            aria-label={lang === 'en'
              ? 'Sparkline: direct-award rate 2002–2025 versus OECD 25% ceiling'
              : 'Minigráfico: tasa de adjudicación directa 2002–2025 vs techo OCDE 25%'}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          >
            <defs>
              <linearGradient id="spark-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* OECD 25% safe zone fill — neutral (Bible §3.10) */}
            <rect
              x={PAD_L}
              y={OECD_Y}
              width={CHART_W}
              height={AXIS_Y - OECD_Y}
              fill="var(--color-text-muted)"
              opacity={0.05}
            />

            {/* OECD 25% dashed reference */}
            <line
              x1={PAD_L}
              x2={PAD_L + CHART_W}
              y1={OECD_Y}
              y2={OECD_Y}
              stroke="#22d3ee"
              strokeWidth={0.8}
              strokeDasharray="3 3"
              opacity={0.70}
            />

            {/* Area under Mexico line */}
            <path d={areaPath} fill="url(#spark-area-grad)" />

            {/* Mexico DA-rate line */}
            <motion.path
              d={linePath}
              fill="none"
              stroke="#dc2626"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.6 }}
            />

            {/* Inflection markers: tiny ▼ triangles above the data point */}
            {INFLECTIONS.map((inf) => {
              const cx = xOf(inf.year)
              const cy = yOf(YEARLY_DA.find((d) => d.year === inf.year)?.da ?? 75)
              const tx = cx
              const ty = cy - 6  // just above the line
              return (
                <text
                  key={inf.year}
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  fontSize={6}
                  fill="var(--color-text-muted)"
                  style={{ userSelect: 'none' }}
                >
                  ▼
                </text>
              )
            })}

            {/* X-axis baseline */}
            <line
              x1={PAD_L}
              x2={PAD_L + CHART_W}
              y1={AXIS_Y}
              y2={AXIS_Y}
              stroke="var(--color-border-hover)"
              strokeWidth={1}
            />

            {/* Era tick rectangles under x-axis — 8×4 colored bands */}
            {ERA_BANDS_MACRO.map((era) => {
              const x1 = xOf(era.start)
              const x2 = era.end > era.start
                ? xOf(era.end)
                : Math.min(xOf(era.start) + 10, PAD_L + CHART_W)
              return (
                <rect
                  key={era.label}
                  x={x1}
                  y={AXIS_Y + 2}
                  width={Math.max(1, x2 - x1 - 1)}
                  height={4}
                  rx={0.5}
                  fill={era.color}
                  opacity={0.75}
                />
              )
            })}

            {/* Era labels under tick rectangles */}
            {ERA_BANDS_MACRO.map((era) => {
              const x1 = xOf(era.start)
              const x2 = era.end > era.start
                ? xOf(era.end)
                : Math.min(xOf(era.start) + 10, PAD_L + CHART_W)
              const midX = (x1 + x2) / 2
              return (
                <text
                  key={`lbl-${era.label}`}
                  x={midX}
                  y={AXIS_Y + 16}
                  textAnchor="middle"
                  fontSize={6}
                  fill={era.color}
                  opacity={0.80}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontWeight="700"
                  style={{ userSelect: 'none' }}
                >
                  {era.label.toUpperCase()}
                </text>
              )
            })}

            {/* OECD label at right end */}
            <text
              x={PAD_L + CHART_W - 1}
              y={OECD_Y - 2}
              textAnchor="end"
              fontSize={6}
              fill="#22d3ee"
              opacity={0.80}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight="700"
            >
              {lang === 'en' ? 'OECD 25%' : 'OCDE 25%'}
            </text>

            {/* Hover crosshair dot */}
            {tooltip && (() => {
              const pt = YEARLY_DA.find((d) => d.year === tooltip.year)
              if (!pt) return null
              return (
                <circle
                  cx={xOf(pt.year)}
                  cy={yOf(pt.da)}
                  r={3}
                  fill="#dc2626"
                  stroke="#fff"
                  strokeWidth={1}
                />
              )
            })()}
          </svg>

          {/* Hover tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(tooltip.x + 8, 260),
                top: Math.max(tooltip.y - 48, 0),
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-hover)',
                borderRadius: 4,
                padding: '4px 8px',
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: 120,
              }}
            >
              <div style={{
                fontFamily: 'var(--font-family-mono, monospace)',
                fontSize: 11,
                fontWeight: 700,
                color: '#dc2626',
              }}>
                {tooltip.year} · {tooltip.da}%
              </div>
              <div style={{
                fontFamily: 'var(--font-family-mono, monospace)',
                fontSize: 10,
                color: 'var(--color-text-muted)',
              }}>
                {tooltip.era}
              </div>
              {tooltip.event && (
                <div style={{
                  fontFamily: 'var(--font-family-mono, monospace)',
                  fontSize: 10,
                  color: 'var(--color-text-secondary)',
                  marginTop: 2,
                }}>
                  {tooltip.event}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Caption */}
      <p className="text-[10px] font-mono text-text-muted mt-3 leading-[1.5]">
        {lang === 'en'
          ? 'Yearly direct-award rate · OECD ceiling 25% (recommended) — Mexican federal procurement has held above the OECD limit for 23 consecutive years. Sources: COMPRANET 2002–2025; OECD Government at a Glance 2023.'
          : 'Tasa anual de adjudicación directa · techo OCDE 25% (recomendado) — la contratación federal mexicana ha permanecido por encima del límite OCDE durante 23 años consecutivos. Fuentes: COMPRANET 2002–2025; OCDE Government at a Glance 2023.'}
      </p>
    </div>
  )
}
