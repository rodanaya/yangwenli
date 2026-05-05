/**
 * MacroArc++ — Hero #2: 23-year direct-award rate trend
 *
 * Upgrades over the original inline version:
 * 1. Persistent dashed cyan OECD ≤ 25% reference line (changed from 30%)
 * 2. 4 FT-style callout boxes with leader lines:
 *    - 2014 spike: Casa Blanca · Oceanografía
 *    - 2017 spike: Estafa Maestra surfaces
 *    - 2020 peak: COVID emergency procurement
 *    - 2023: Highest non-emergency rate ever recorded
 * 3. Direct labels at right edge for Mexico line and OECD ceiling
 * 4. Admin wash bands darkened 0.05 → 0.12 with mono 9px labels
 *
 * Inspiration: John Burn-Murdoch / FT post-COVID line charts.
 */

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

const ERA_BANDS: Array<{ label: string; start: number; end: number; color: string }> = [
  { label: 'Fox',         start: 2002, end: 2006, color: '#1a5276' },
  { label: 'Calderón',    start: 2007, end: 2012, color: '#1a5276' },
  { label: 'Peña Nieto',  start: 2013, end: 2018, color: '#c41e3a' },
  { label: 'AMLO',        start: 2019, end: 2024, color: '#7b2d8b' },
  { label: 'Sheinbaum',   start: 2025, end: 2025, color: '#7b2d8b' },
]

// FT-style callout annotations
interface Callout {
  year: number
  label: { en: string; es: string }
  offsetX: number   // horizontal nudge for the box
  boxAnchor: 'start' | 'end' | 'middle'
  leaderOffsetY: number  // vertical offset for leader endpoint from the data point
}

const CALLOUTS: Callout[] = [
  {
    year: 2014,
    label: { en: 'Casa Blanca · Oceanografía', es: 'Casa Blanca · Oceanografía' },
    offsetX: -4,
    boxAnchor: 'end',
    leaderOffsetY: -22,
  },
  {
    year: 2017,
    label: { en: 'Estafa Maestra surfaces', es: 'Estafa Maestra' },
    offsetX: 4,
    boxAnchor: 'start',
    leaderOffsetY: -28,
  },
  {
    year: 2020,
    label: { en: 'COVID emergency', es: 'Emergencia COVID' },
    offsetX: 0,
    boxAnchor: 'middle',
    leaderOffsetY: -36,
  },
  {
    year: 2023,
    label: { en: 'Toka IT monopoly', es: 'Monopolio TIC Toka' },
    offsetX: -10,
    boxAnchor: 'end',
    leaderOffsetY: -26,
  },
]

interface Props {
  lang: 'en' | 'es'
}

export function MacroArc({ lang }: Props) {
  const SVG_W = 820
  const SVG_H = 280       // taller to accommodate callout boxes above
  const PAD_L = 42
  const PAD_R = 80        // extra right pad for direct labels
  const PAD_TOP = 72      // extra top room for callout boxes
  const PAD_BOT = 32
  const CHART_H = SVG_H - PAD_TOP - PAD_BOT
  const CHART_W = SVG_W - PAD_L - PAD_R
  const OECD_CEILING = 25   // primary: OECD ≤ 25% recommended ceiling
  const OECD_UPPER   = 30   // secondary: OECD 25–30% acceptable band upper bound
  const Y_MIN = 2002
  const Y_MAX = 2025

  const yearToX = (y: number) => PAD_L + ((y - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_W
  const daToY = (pct: number) => PAD_TOP + CHART_H * (1 - pct / 100)
  const OECD_Y = daToY(OECD_CEILING)
  const OECD_UPPER_Y = daToY(OECD_UPPER)
  const AXIS_Y = PAD_TOP + CHART_H

  // Most recent data point
  const lastPoint = YEARLY_DA[YEARLY_DA.length - 1]
  const lastX = yearToX(lastPoint.year)
  const lastY = daToY(lastPoint.da)

  // Build line path
  const linePath = YEARLY_DA
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${yearToX(d.year).toFixed(2)} ${daToY(d.da).toFixed(2)}`)
    .join(' ')

  // Build area path
  const areaPath = `${linePath} L ${yearToX(Y_MAX).toFixed(2)} ${AXIS_Y} L ${yearToX(Y_MIN).toFixed(2)} ${AXIS_Y} Z`

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label={lang === 'en'
          ? 'Yearly direct-award rate 2002–2025 versus OECD 25% ceiling. Annotations mark Casa Blanca 2014, Estafa Maestra 2017, COVID 2020, and Toka IT monopoly 2023.'
          : 'Tasa anual de adjudicación directa 2002–2025 vs techo OCDE 25%. Anotaciones: Casa Blanca 2014, Estafa Maestra 2017, COVID 2020, Monopolio TIC Toka 2023.'}
      >
        <defs>
          <linearGradient id="macroacpp-area" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Administration era wash bands — darkened to 0.12 opacity */}
        {ERA_BANDS.map((era) => {
          const x1 = yearToX(era.start)
          const x2 = era.end > era.start
            ? yearToX(era.end)
            : Math.min(yearToX(era.start) + 28, PAD_L + CHART_W)
          const midX = (x1 + x2) / 2
          return (
            <g key={era.label}>
              <rect
                x={x1}
                y={PAD_TOP}
                width={Math.max(1, x2 - x1)}
                height={CHART_H}
                fill={era.color}
                opacity={0.12}
              />
              {/* Top tick bar */}
              <rect
                x={x1}
                y={PAD_TOP}
                width={Math.max(1, x2 - x1)}
                height={2}
                fill={era.color}
                opacity={0.45}
              />
              {/* Admin name — mono 9px at top of band */}
              <text
                x={midX}
                y={PAD_TOP + 13}
                textAnchor="middle"
                fontSize={9}
                fill={era.color}
                opacity={0.85}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="700"
                letterSpacing="0.06em"
              >
                {era.label.toUpperCase()}
              </text>
            </g>
          )
        })}

        {/* OECD upper band — 30% thin secondary hairline (dysfunction floor) */}
        <line
          x1={PAD_L}
          x2={PAD_L + CHART_W}
          y1={OECD_UPPER_Y}
          y2={OECD_UPPER_Y}
          stroke="var(--color-text-muted)"
          strokeWidth={0.8}
          strokeDasharray="3 5"
          opacity={0.45}
        />
        <text
          x={PAD_L + CHART_W + 6}
          y={OECD_UPPER_Y + 3}
          fontSize={7.5}
          fill="var(--color-text-muted)"
          opacity={0.55}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight="600"
        >
          {lang === 'en' ? 'OECD 30% · dysfunction floor' : 'OCDE 30% · umbral disfunción'}
        </text>

        {/* OECD 25% ceiling — neutral dashed reference line (Bible §3.10: no green) */}
        <line
          x1={PAD_L}
          x2={PAD_L + CHART_W}
          y1={OECD_Y}
          y2={OECD_Y}
          stroke="var(--color-text-muted)"
          strokeWidth={1.4}
          strokeDasharray="6 4"
          opacity={0.70}
        />
        {/* OECD 25% direct label at right edge */}
        <text
          x={PAD_L + CHART_W + 6}
          y={OECD_Y + 3}
          fontSize={8.5}
          fill="var(--color-text-muted)"
          opacity={0.90}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight="700"
        >
          {lang === 'en' ? 'OECD 25% (recommended)' : 'OCDE 25% (recomendado)'}
        </text>

        {/* OECD safe-zone fill — neutral, not green (Bible §3.10) */}
        <rect
          x={PAD_L}
          y={OECD_Y}
          width={CHART_W}
          height={AXIS_Y - OECD_Y}
          fill="var(--color-text-muted)"
          opacity={0.04}
        />

        {/* Horizontal grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = daToY(pct)
          return (
            <g key={pct}>
              <line
                x1={PAD_L}
                x2={PAD_L + CHART_W}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={pct === 0 ? 1 : 0.5}
                strokeOpacity={pct === 0 ? 1 : 0.30}
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={7.5}
                fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)"
              >
                {pct}%
              </text>
            </g>
          )
        })}

        {/* X-axis year ticks */}
        {[2002, 2006, 2010, 2014, 2018, 2022, 2025].map((y) => (
          <g key={y}>
            <line
              x1={yearToX(y)}
              x2={yearToX(y)}
              y1={AXIS_Y}
              y2={AXIS_Y + 4}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={yearToX(y)}
              y={AXIS_Y + 14}
              textAnchor="middle"
              fontSize={7.5}
              fill="var(--color-text-muted)"
              fontFamily="var(--font-family-mono, monospace)"
            >
              {y}
            </text>
          </g>
        ))}

        {/* Area under line */}
        <motion.path
          d={areaPath}
          fill="url(#macroacpp-area)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.0 }}
        />

        {/* DA-rate line — draw-in animation */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#dc2626"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.2 }}
        />

        {/* Year marker dots */}
        {YEARLY_DA.map((d, i) => {
          const cx = yearToX(d.year)
          const cy = daToY(d.da)
          const isAnnotated = CALLOUTS.some((c) => c.year === d.year)
          const r = d.covid ? 4.5 : isAnnotated ? 3.5 : 2.2
          return (
            <motion.circle
              key={d.year}
              cx={cx}
              cy={cy}
              r={r}
              fill="#dc2626"
              fillOpacity={d.covid ? 1 : isAnnotated ? 0.95 : 0.75}
              stroke={d.covid || isAnnotated ? '#fff' : 'transparent'}
              strokeWidth={d.covid || isAnnotated ? 1.2 : 0}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 1.6 + i * 0.04 }}
            />
          )
        })}

        {/* FT-style callout boxes with leader lines */}
        {CALLOUTS.map((callout, idx) => {
          const pointX = yearToX(callout.year)
          const pointY = daToY(YEARLY_DA.find((d) => d.year === callout.year)?.da ?? 75)
          const boxY = pointY + callout.leaderOffsetY
          const lines = callout.label[lang].split('\n')
          const boxW = Math.max(...lines.map((l) => l.length)) * 5.6 + 14
          const boxH = lines.length * 12 + 10
          const boxX =
            callout.boxAnchor === 'end'
              ? pointX + callout.offsetX - boxW
              : callout.boxAnchor === 'start'
              ? pointX + callout.offsetX
              : pointX + callout.offsetX - boxW / 2

          return (
            <motion.g
              key={callout.year}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 2.2 + idx * 0.15 }}
            >
              {/* Leader line from box bottom to data point */}
              <line
                x1={pointX}
                y1={pointY - 5}
                x2={pointX}
                y2={boxY + boxH}
                stroke="#dc2626"
                strokeWidth={0.8}
                strokeOpacity={0.55}
                strokeDasharray="2 2"
              />
              {/* Callout box */}
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={2}
                fill="var(--color-background)"
                stroke="#dc2626"
                strokeWidth={0.8}
                strokeOpacity={0.55}
              />
              {/* Year label */}
              <text
                x={boxX + boxW / 2}
                y={boxY + 9}
                textAnchor="middle"
                fontSize={7}
                fill="#dc2626"
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="800"
                opacity={0.80}
              >
                {callout.year}
              </text>
              {/* Callout text lines */}
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={boxX + boxW / 2}
                  y={boxY + 20 + li * 12}
                  textAnchor="middle"
                  fontSize={7.5}
                  fill="var(--color-text-secondary)"
                  fontFamily="var(--font-family-mono, monospace)"
                  fontWeight="600"
                >
                  {line}
                </text>
              ))}
            </motion.g>
          )
        })}

        {/* Mexico direct label at right edge */}
        <motion.g
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 2.0 }}
        >
          <circle cx={lastX} cy={lastY} r={4} fill="#dc2626" stroke="#fff" strokeWidth={1.2} />
          <text
            x={lastX + 10}
            y={lastY - 4}
            fontSize={9}
            fill="#dc2626"
            fontFamily="var(--font-family-mono, monospace)"
            fontWeight="800"
          >
            {lang === 'en' ? 'Mexico' : 'México'}
          </text>
          <text
            x={lastX + 10}
            y={lastY + 8}
            fontSize={9}
            fill="#dc2626"
            fontFamily="var(--font-family-mono, monospace)"
            fontWeight="600"
            opacity={0.8}
          >
            {lastPoint.da}%
          </text>
        </motion.g>

        {/* Axis base */}
        <line
          x1={PAD_L}
          x2={PAD_L + CHART_W}
          y1={AXIS_Y}
          y2={AXIS_Y}
          stroke="var(--color-border-hover)"
          strokeWidth={1.5}
        />
      </svg>

      <p className="text-[10px] font-mono text-text-muted mt-2 leading-[1.5]">
        {lang === 'en'
          ? 'Yearly direct-award rate · OECD ceiling 25% (recommended) — Mexican federal procurement has held above the OECD limit for 23 consecutive years. Sources: COMPRANET 2002–2025; OECD Government at a Glance 2023.'
          : 'Tasa anual de adjudicación directa · techo OCDE 25% (recomendado) — la contratación federal mexicana ha permanecido por encima del límite OCDE durante 23 años consecutivos. Fuentes: COMPRANET 2002–2025; OCDE Government at a Glance 2023.'}
      </p>
    </div>
  )
}
