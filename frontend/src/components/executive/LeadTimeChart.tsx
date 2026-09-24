/**
 * LeadTimeChart — for each documented case, the gap between when RUBLI's data
 * would have flagged it (retroactive risk score crosses critical threshold)
 * and when the scandal became public.
 *
 * "We see it before the press does." Sorted by lead-time descending.
 *
 * PARALLAX D10 § Change 2 — drawn at 1:1: the figure measures its width
 * (useMeasuredWidth); bars and dots stay in the svg, every glyph (names,
 * years, counts, header, median line) is HTML at ≥ 11px. Phones put the case
 * name on its own line above the track.
 *
 * Extracted from Executive.tsx — do not inline again.
 */

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { SECTOR_COLORS, RISK_TEXT_COLORS, getSectorTextColor } from '@/lib/constants'
import { useFontsReady, useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { measureLabel } from '@/lib/plateLabels'

// ─────────────────────────────────────────────────────────────────────────────
// Data + types
// ─────────────────────────────────────────────────────────────────────────────

interface LeadTimeCase {
  name: { en: string; es: string }
  flagYear: number       // year RUBLI's data first crossed critical
  publicYear: number     // year the scandal became public
  sector: string         // SECTOR_COLORS key
}

const LEAD_TIME_CASES: LeadTimeCase[] = [
  { name: { en: 'IMSS Ghost Network',  es: 'Red Fantasma IMSS' },     flagYear: 2008, publicYear: 2014, sector: 'salud' },
  { name: { en: 'Estafa Maestra',      es: 'La Estafa Maestra' },     flagYear: 2010, publicYear: 2017, sector: 'gobernacion' },
  { name: { en: 'Odebrecht-PEMEX',     es: 'Odebrecht-PEMEX' },       flagYear: 2014, publicYear: 2017, sector: 'energia' },
  { name: { en: 'Grupo Higa',          es: 'Grupo Higa' },            flagYear: 2013, publicYear: 2014, sector: 'infraestructura' },
  { name: { en: 'Toka IT Monopoly',    es: 'Monopolio TIC Toka' },    flagYear: 2019, publicYear: 2023, sector: 'tecnologia' },
  { name: { en: 'Edenred Vouchers',    es: 'Vales Edenred' },         flagYear: 2018, publicYear: 2022, sector: 'hacienda' },
  { name: { en: 'Segalmex',            es: 'Segalmex' },              flagYear: 2019, publicYear: 2022, sector: 'agricultura' },
  { name: { en: 'COVID-19 Hemoser',    es: 'COVID-19 Hemoser' },      flagYear: 2020, publicYear: 2021, sector: 'salud' },
]

const MONO = '"JetBrains Mono", monospace'
const YEAR_FONT = `700 11px ${MONO}`
const YEAR_H = 14
const ROW_H = 26
const HEAD_H = 18 // CASE · LEAD TIME
const AXIS_H = 22 // grid years
const GRID_YEARS = [2008, 2012, 2016, 2020, 2024]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface LeadTimeChartProps {
  lang: 'en' | 'es'
}

export function LeadTimeChart({ lang }: LeadTimeChartProps) {
  const box = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(box)
  const fontsReady = useFontsReady([YEAR_FONT])
  const narrow = W > 0 && W < 560

  const sorted = [...LEAD_TIME_CASES].sort(
    (a, b) => (b.publicYear - b.flagYear) - (a.publicYear - a.flagYear),
  )
  const yearMin = Math.min(...sorted.map((c) => c.flagYear))
  const yearMax = 2025
  const yearSpan = yearMax - yearMin
  // Desktop: name column left, count column right. Phones: the name sits on
  // its own line above the track and the count sits on that line's right.
  // (phones reserve the first year's label width left of the track)
  const LEFT = narrow ? Math.ceil(measureLabel(String(yearMin), YEAR_FONT, 999, YEAR_H).width) + 14 : 142
  const RIGHT = narrow ? 8 : 64
  const NAME_H = narrow ? 18 : 0
  const PER_ROW = ROW_H + NAME_H
  const H = HEAD_H + PER_ROW * sorted.length + AXIS_H
  const trackW = Math.max(1, W - LEFT - RIGHT)
  const yearToX = (y: number) => LEFT + ((y - yearMin) / yearSpan) * trackW
  const rowY = (idx: number) => HEAD_H + idx * PER_ROW + NAME_H + ROW_H / 2

  // Median lead-time, computed from the rows (never a typed constant).
  const leads = sorted.map((c) => c.publicYear - c.flagYear).sort((a, b) => a - b)
  const mid = Math.floor(leads.length / 2)
  const medianYears = leads.length % 2 ? leads[mid] : (leads[mid - 1] + leads[mid]) / 2
  const medianLabel = lang === 'en'
    ? `Median lead-time across these ${sorted.length} cases: ${medianYears} years`
    : `Ventaja mediana en estos ${sorted.length} casos: ${medianYears} años`

  const yearW = (y: number) => measureLabel(String(y), YEAR_FONT, 999, YEAR_H).width
  // Year label beside its dot, outward (flag year left of the flag dot, public
  // year right of the public dot); when that leaves the track it drops under
  // the dot instead.
  const yearPos = (y: number, x: number, side: 'left' | 'right') => {
    const w = yearW(y)
    const gap = side === 'left' ? 9 : 7
    const left = side === 'left' ? x - gap - w : x + gap
    const lo = narrow ? 0 : LEFT - 6 // desktop: never into the name column
    const hi = narrow ? W : W - RIGHT + 4
    if (left >= lo && left + w <= hi) return { left, dy: -YEAR_H / 2 }
    return { left: Math.min(W - w, Math.max(0, x - w / 2)), dy: 7 }
  }

  const ready = W > 0 && fontsReady

  return (
    <div>
      <div ref={box} style={{ minHeight: H + 26 }}>
        {ready && (
          <>
            {/* Median lead-time banner — above the track */}
            <div
              className="mb-2 rounded-sm text-center font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-text-secondary leading-[18px]"
              style={{ marginLeft: LEFT, marginRight: RIGHT, background: 'color-mix(in srgb, var(--color-border) 45%, transparent)' }}
            >
              {medianLabel}
            </div>
            <div className="relative" style={{ height: H }}>
              <svg
                data-figure="leadtime"
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                style={{ display: 'block' }}
                role="img"
                aria-label={lang === 'en'
                  ? 'Lead-time advantage: year RUBLI data first flagged each case versus year the scandal became public.'
                  : 'Ventaja temporal: año en que los datos de RUBLI señalaron cada caso frente al año en que el escándalo se hizo público.'}
              >
                {/* Year grid */}
                {GRID_YEARS.map((y) => (
                  <line key={y} x1={yearToX(y)} x2={yearToX(y)} y1={HEAD_H - 4} y2={H - AXIS_H + 2}
                    stroke="var(--color-border)" strokeWidth={0.5} strokeOpacity={0.45} />
                ))}
                {sorted.map((c, idx) => {
                  const y = rowY(idx)
                  const flagX = yearToX(c.flagYear)
                  const pubX = yearToX(c.publicYear)
                  const sectorColor = SECTOR_COLORS[c.sector] ?? '#64748b'
                  return (
                    <motion.g
                      key={c.name.en}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{ duration: 0.4, delay: 0.1 + idx * 0.08, ease: 'easeOut' }}
                    >
                      {/* Lead-time gap line (the "advantage" — bold colored band) */}
                      <motion.line
                        x1={flagX} x2={pubX} y1={y} y2={y}
                        stroke={sectorColor}
                        strokeWidth={6}
                        strokeOpacity={0.42}
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 + idx * 0.08, ease: 'easeOut' }}
                      />
                      {/* Flag dot (RUBLI first flagged) */}
                      <circle cx={flagX} cy={y} r={4} fill={sectorColor} fillOpacity={1} />
                      <circle cx={flagX} cy={y} r={6.5} fill="none" stroke={sectorColor} strokeOpacity={0.30} strokeWidth={1} />
                      {/* Public dot (scandal broke) */}
                      <circle cx={pubX} cy={y} r={3.5} fill="#dc2626" stroke="white" strokeWidth={1.2} />
                    </motion.g>
                  )
                })}
              </svg>

              {/* ── HTML label layer ── */}
              <div className="absolute font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted leading-[14px]" style={{ left: narrow ? LEFT : 6, top: 0 }}>
                {lang === 'en' ? 'Case' : 'Caso'}
              </div>
              <div className="absolute font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted leading-[14px] text-right" style={{ right: narrow ? RIGHT : 8, top: 0 }}>
                {lang === 'en' ? 'Lead time' : 'Ventaja'}
              </div>
              {sorted.map((c, idx) => {
                const y = rowY(idx)
                const lead = c.publicYear - c.flagYear
                const ink = getSectorTextColor(c.sector)
                const flag = yearPos(c.flagYear, yearToX(c.flagYear), 'left')
                const pub = yearPos(c.publicYear, yearToX(c.publicYear), 'right')
                const nameTop = narrow ? y - ROW_H / 2 - NAME_H : y - 9
                return (
                  <div key={c.name.en} data-lead-row={idx}>
                    <div
                      className="absolute whitespace-nowrap text-[12px] font-semibold text-text-primary leading-[18px]"
                      style={narrow ? { left: LEFT, top: nameTop } : { right: W - LEFT + 8, top: nameTop, textAlign: 'right' }}
                    >
                      {c.name[lang]}
                    </div>
                    <div
                      className="absolute whitespace-nowrap font-mono tabular-nums leading-[18px] text-right"
                      style={{ right: narrow ? RIGHT : 8, top: nameTop }}
                    >
                      <span className="text-[13px] font-extrabold" style={{ color: ink }}>{lead}</span>
                      <span className="text-[11px] font-semibold text-text-muted ml-0.5">
                        {lang === 'en' ? (lead === 1 ? 'yr' : 'yrs') : (lead === 1 ? 'año' : 'años')}
                      </span>
                    </div>
                    <div
                      className="absolute whitespace-nowrap font-mono text-[11px] font-bold tabular-nums"
                      style={{ left: flag.left, top: y + flag.dy, lineHeight: `${YEAR_H}px`, color: ink }}
                    >
                      {c.flagYear}
                    </div>
                    <div
                      className="absolute whitespace-nowrap font-mono text-[11px] font-bold tabular-nums"
                      style={{ left: pub.left, top: y + pub.dy, lineHeight: `${YEAR_H}px`, color: RISK_TEXT_COLORS.critical }}
                    >
                      {c.publicYear}
                    </div>
                  </div>
                )
              })}
              {GRID_YEARS.map((y) => {
                const w = yearW(y)
                return (
                  <div
                    key={y}
                    className="absolute font-mono text-[11px] text-text-muted tabular-nums"
                    style={{ left: Math.min(W - w, Math.max(0, yearToX(y) - w / 2)), top: H - AXIS_H + 6, lineHeight: `${YEAR_H}px` }}
                  >
                    {y}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 px-2 text-[13px] font-mono text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: '#64748b' }} aria-hidden="true" />
          {lang === 'en' ? 'RUBLI flag year (data crossed critical threshold)' : 'Año señalado por RUBLI (datos cruzaron umbral crítico)'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: '#dc2626', border: '1px solid white' }} aria-hidden="true" />
          {lang === 'en' ? 'scandal became public' : 'escándalo se hizo público'}
        </span>
      </div>
    </div>
  )
}
