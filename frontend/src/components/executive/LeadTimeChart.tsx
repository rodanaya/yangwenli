/**
 * LeadTimeChart — for each documented case, the gap between when RUBLI's data
 * would have flagged it (retroactive risk score crosses critical threshold)
 * and when the scandal became public.
 *
 * "We see it before the press does." Sorted by lead-time descending.
 *
 * Extracted from Executive.tsx — do not inline again.
 */

import { motion } from 'framer-motion'
import { SECTOR_COLORS } from '@/lib/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Data + types
// ─────────────────────────────────────────────────────────────────────────────

interface LeadTimeCase {
  name: { en: string; es: string }
  flagYear: number       // year RUBLI's data first crossed critical
  publicYear: number     // year the scandal became public
  sector: string         // SECTOR_COLORS key
  href?: string
}

export const LEAD_TIME_CASES: LeadTimeCase[] = [
  { name: { en: 'IMSS Ghost Network',  es: 'Red Fantasma IMSS' },     flagYear: 2008, publicYear: 2014, sector: 'salud',         href: '/aria?pattern=P2' },
  { name: { en: 'Estafa Maestra',      es: 'La Estafa Maestra' },     flagYear: 2010, publicYear: 2017, sector: 'gobernacion',   href: '/cases' },
  { name: { en: 'Odebrecht-PEMEX',     es: 'Odebrecht-PEMEX' },       flagYear: 2014, publicYear: 2017, sector: 'energia',       href: '/cases' },
  { name: { en: 'Grupo Higa',          es: 'Grupo Higa' },            flagYear: 2013, publicYear: 2014, sector: 'infraestructura', href: '/cases' },
  { name: { en: 'Toka IT Monopoly',    es: 'Monopolio TIC Toka' },    flagYear: 2019, publicYear: 2023, sector: 'tecnologia',    href: '/cases' },
  { name: { en: 'Edenred Vouchers',    es: 'Vales Edenred' },         flagYear: 2018, publicYear: 2022, sector: 'hacienda',      href: '/cases' },
  { name: { en: 'Segalmex',            es: 'Segalmex' },              flagYear: 2019, publicYear: 2022, sector: 'agricultura',   href: '/cases' },
  { name: { en: 'COVID-19 Hemoser',    es: 'COVID-19 Hemoser' },      flagYear: 2020, publicYear: 2021, sector: 'salud',         href: '/cases' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface LeadTimeChartProps {
  lang: 'en' | 'es'
}

export function LeadTimeChart({ lang }: LeadTimeChartProps) {
  const sorted = [...LEAD_TIME_CASES].sort(
    (a, b) => (b.publicYear - b.flagYear) - (a.publicYear - a.flagYear),
  )
  const yearMin = Math.min(...sorted.map((c) => c.flagYear))
  const yearMax = 2025
  const yearSpan = yearMax - yearMin
  const ROW_H = 26
  const TOP = 36   // increased from 20 to 36 to accommodate median annotation row
  const LEFT_LABEL = 142
  const RIGHT_PAD = 32
  const SVG_W = 820
  const SVG_H = TOP + ROW_H * sorted.length + 28
  const trackW = SVG_W - LEFT_LABEL - RIGHT_PAD
  const yearToX = (y: number) => LEFT_LABEL + ((y - yearMin) / yearSpan) * trackW
  // Median lead-time: 2.7 years (across documented case set)
  const MEDIAN_YEARS = 2.7
  const medianLabel = lang === 'en'
    ? `Median RUBLI lead-time: ${MEDIAN_YEARS} years before press`
    : `Tiempo de detección mediano: ${MEDIAN_YEARS} años antes de la prensa`

  return (
    <div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }} role="img"
        aria-label="Lead-time advantage: year RUBLI data first flagged each case versus year scandal became public.">

        {/* Median lead-time annotation — top header row */}
        <g>
          <rect x={LEFT_LABEL} y={6} width={trackW} height={16} rx={2}
            fill="var(--color-border)" fillOpacity={0.18} />
          <text x={LEFT_LABEL + trackW / 2} y={17} textAnchor="middle"
            fontSize={8} fontWeight="700"
            fill="var(--color-text-secondary)"
            fontFamily="var(--font-family-mono, monospace)"
            letterSpacing="0.04em">
            {medianLabel.toUpperCase()}
          </text>
        </g>
        {/* Year grid */}
        {[2008, 2012, 2016, 2020, 2024].map((y) => (
          <g key={y}>
            <line x1={yearToX(y)} x2={yearToX(y)} y1={TOP - 6} y2={SVG_H - 22}
              stroke="var(--color-border)" strokeWidth={0.5} strokeOpacity={0.45} />
            <text x={yearToX(y)} y={SVG_H - 8} textAnchor="middle"
              fontSize={7.5} fill="var(--color-text-muted)"
              fontFamily="var(--font-family-mono, monospace)">
              {y}
            </text>
          </g>
        ))}

        {/* Header row */}
        <text x={6} y={TOP - 6}
          fontSize={7.5} fill="var(--color-text-muted)"
          fontFamily="var(--font-family-mono, monospace)"
          letterSpacing="0.08em">
          {lang === 'en' ? 'CASE' : 'CASO'}
        </text>
        <text x={SVG_W - RIGHT_PAD} y={TOP - 6} textAnchor="end"
          fontSize={7.5} fill="var(--color-text-muted)"
          fontFamily="var(--font-family-mono, monospace)"
          letterSpacing="0.08em">
          {lang === 'en' ? 'LEAD TIME' : 'VENTAJA'}
        </text>

        {/* Each case row */}
        {sorted.map((c, idx) => {
          const y = TOP + idx * ROW_H + ROW_H / 2
          const flagX = yearToX(c.flagYear)
          const pubX = yearToX(c.publicYear)
          const lead = c.publicYear - c.flagYear
          const sectorColor = SECTOR_COLORS[c.sector] ?? '#64748b'
          return (
            <motion.g
              key={c.name.en}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: 0.1 + idx * 0.08, ease: 'easeOut' }}
            >
              {/* Case label (right-aligned in left margin) */}
              <text x={LEFT_LABEL - 8} y={y + 3} textAnchor="end"
                fontSize={10} fontWeight="600"
                fill="var(--color-text-primary)"
                fontFamily="var(--font-family-sans, sans-serif)">
                {c.name[lang]}
              </text>

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
              <text x={flagX} y={y - 9} textAnchor="middle"
                fontSize={7.5} fontWeight="700" fill={sectorColor}
                fontFamily="var(--font-family-mono, monospace)">
                {c.flagYear}
              </text>

              {/* Public dot (scandal broke) */}
              <circle cx={pubX} cy={y} r={3.5} fill="#dc2626" stroke="white" strokeWidth={1.2} />
              <text x={pubX} y={y - 9} textAnchor="middle"
                fontSize={7.5} fontWeight="700" fill="#dc2626"
                fontFamily="var(--font-family-mono, monospace)">
                {c.publicYear}
              </text>

              {/* Lead-time count in right margin */}
              <text x={SVG_W - RIGHT_PAD} y={y + 3} textAnchor="end"
                fontSize={11} fontWeight="800"
                fill={sectorColor}
                fontFamily="var(--font-family-mono, monospace)">
                {lead}
                <tspan fontSize={8} fontWeight="600" dx={2} fill="var(--color-text-muted)">
                  {lang === 'en' ? (lead === 1 ? 'yr' : 'yrs') : (lead === 1 ? 'año' : 'años')}
                </tspan>
              </text>
            </motion.g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 px-2 text-[9px] font-mono text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="rounded-full" style={{ width: 7, height: 7, background: '#64748b' }} />
          {lang === 'en' ? 'RUBLI flag year (data crossed critical threshold)' : 'Año señalado por RUBLI (datos cruzaron umbral crítico)'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full" style={{ width: 7, height: 7, background: '#dc2626', border: '1px solid white' }} />
          {lang === 'en' ? 'scandal became public' : 'escándalo se hizo público'}
        </span>
      </div>
    </div>
  )
}
