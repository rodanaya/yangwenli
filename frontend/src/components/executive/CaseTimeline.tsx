/**
 * CaseTimeline — Seismograph-style spike chart with administration era bands.
 * Critical = tall spike (80px), high = medium spike (44px).
 * Trimmed to 2008+ since the GT corpus has no documented cases earlier.
 *
 * Extracted from Executive.tsx — do not inline again.
 */

import { SECTOR_COLORS } from '@/lib/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Data + types
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineCase {
  year: number
  label: { en: string; es: string }
  sector: 'salud' | 'agricultura' | 'infraestructura' | 'energia' | 'tecnologia' | 'gobernacion' | 'hacienda'
  severity: 'critical' | 'high'
}

const TIMELINE_CASES: TimelineCase[] = [
  { year: 2008, label: { en: 'IMSS ghost companies begin', es: 'Empresas fantasma IMSS' }, sector: 'salud', severity: 'critical' },
  { year: 2010, label: { en: 'La Estafa Maestra', es: 'La Estafa Maestra' }, sector: 'gobernacion', severity: 'high' },
  { year: 2012, label: { en: 'Oceanografia-PEMEX fraud', es: 'Fraude Oceanografía-PEMEX' }, sector: 'energia', severity: 'high' },
  { year: 2014, label: { en: 'Grupo Higa / Casa Blanca', es: 'Grupo Higa / Casa Blanca' }, sector: 'infraestructura', severity: 'high' },
  { year: 2016, label: { en: 'Odebrecht-PEMEX bribery', es: 'Sobornos Odebrecht-PEMEX' }, sector: 'energia', severity: 'critical' },
  { year: 2018, label: { en: 'IT procurement overpricing', es: 'Sobreprecio en TIC' }, sector: 'tecnologia', severity: 'high' },
  { year: 2019, label: { en: 'Segalmex food fraud', es: 'Fraude Segalmex' }, sector: 'agricultura', severity: 'critical' },
  { year: 2020, label: { en: 'COVID-19 emergency procurement', es: 'Compras emergencia COVID-19' }, sector: 'salud', severity: 'critical' },
  { year: 2022, label: { en: 'Voucher monopoly (Edenred)', es: 'Monopolio de vales (Edenred)' }, sector: 'hacienda', severity: 'critical' },
  { year: 2023, label: { en: 'Toka IT monopoly', es: 'Monopolio TIC Toka' }, sector: 'tecnologia', severity: 'critical' },
]

export const ERA_BANDS = [
  { label: 'Calderón',    start: 2008, end: 2012, color: '#8b5cf6' },
  { label: 'Peña Nieto',  start: 2012, end: 2018, color: '#f97316' },
  { label: 'AMLO',        start: 2018, end: 2024, color: 'var(--color-risk-critical)' },
  { label: 'Sheinbaum',   start: 2024, end: 2025, color: '#10b981' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface CaseTimelineProps {
  lang: 'en' | 'es'
}

export function CaseTimeline({ lang }: CaseTimelineProps) {
  const SVG_W = 820
  const SVG_H = 190
  const AXIS_Y = 130
  const YEAR_MIN = 2008
  const YEAR_MAX = 2025
  const PAD_X = 24

  const yearToX = (year: number) =>
    PAD_X + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (SVG_W - PAD_X * 2)

  const SPIKE_CRIT = 82
  const SPIKE_HIGH = 46
  const BAR_W = 7

  const TICK_YEARS = [2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024]

  return (
    <div>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label="Timeline of documented corruption cases 2008–2025"
      >
        {/* Administration era bands */}
        {ERA_BANDS.map(era => {
          const x1 = yearToX(Math.max(era.start, YEAR_MIN))
          const x2 = yearToX(Math.min(era.end, YEAR_MAX))
          const midX = (x1 + x2) / 2
          return (
            <g key={era.label}>
              {/* Subtle background fill */}
              <rect x={x1} y={8} width={x2 - x1} height={AXIS_Y - 8} fill={era.color} opacity={0.04} />
              {/* Top accent line */}
              <rect x={x1} y={8} width={x2 - x1} height={2} fill={era.color} opacity={0.18} />
              {/* Era label */}
              <text
                x={midX} y={20}
                textAnchor="middle"
                fill={era.color}
                fontSize={7.5}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="600"
                opacity={0.65}
                letterSpacing="0.06em"
              >
                {era.label.toUpperCase()}
              </text>
              {/* Right-edge divider */}
              {era.end <= YEAR_MAX && (
                <line x1={x2} x2={x2} y1={8} y2={AXIS_Y} stroke={era.color} strokeWidth={0.5} opacity={0.2} />
              )}
            </g>
          )
        })}

        {/* Axis */}
        <line x1={PAD_X} x2={SVG_W - PAD_X} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--color-border-hover)" strokeWidth={1.5} />

        {/* Year ticks */}
        {TICK_YEARS.map(y => (
          <g key={y}>
            <line x1={yearToX(y)} x2={yearToX(y)} y1={AXIS_Y} y2={AXIS_Y + 4} stroke="var(--color-border)" strokeWidth={1} />
            <text
              x={yearToX(y)} y={AXIS_Y + 14}
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize={7.5}
              fontFamily="var(--font-family-mono, monospace)"
            >
              {y}
            </text>
          </g>
        ))}

        {/* Spikes */}
        {TIMELINE_CASES.map((c, idx) => {
          const x = yearToX(c.year)
          const isCrit = c.severity === 'critical'
          const h = isCrit ? SPIKE_CRIT : SPIKE_HIGH
          const color = SECTOR_COLORS[c.sector]
          const n = idx + 1

          return (
            <g key={idx}>
              {/* Spike bar — gradient-like effect via two overlapping rects */}
              <rect
                x={x - BAR_W / 2} y={AXIS_Y - h}
                width={BAR_W} height={h}
                fill={color}
                opacity={isCrit ? 0.15 : 0.08}
                rx={2}
              />
              <rect
                x={x - BAR_W / 2} y={AXIS_Y - h + h * 0.4}
                width={BAR_W} height={h * 0.6}
                fill={color}
                opacity={isCrit ? 0.55 : 0.35}
                rx={2}
              />
              {/* Bright top cap */}
              <rect
                x={x - BAR_W / 2} y={AXIS_Y - h}
                width={BAR_W} height={3}
                fill={color}
                opacity={isCrit ? 0.95 : 0.7}
                rx={1}
              />
              {/* Number badge at spike top — wider pill for two-digit numbers */}
              <rect
                x={x - (n >= 10 ? 9 : 7)} y={AXIS_Y - h - 17}
                width={n >= 10 ? 18 : 14} height={14}
                rx={7}
                fill={color} opacity={isCrit ? 0.88 : 0.6}
              />
              <text
                x={x} y={AXIS_Y - h - 6.5}
                textAnchor="middle"
                fill="white"
                fontSize={7}
                fontWeight="700"
                fontFamily="var(--font-family-mono, monospace)"
              >
                {n}
              </text>
              {/* Axis tick dot */}
              <circle cx={x} cy={AXIS_Y} r={2.5} fill={color} opacity={0.6} />
              <title>{c.label[lang]} ({c.year}) — {c.severity}</title>
            </g>
          )
        })}
      </svg>

      {/* Numbered legend — 2-column grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
        {TIMELINE_CASES.map((c, idx) => {
          const isCrit = c.severity === 'critical'
          const color = SECTOR_COLORS[c.sector]
          return (
            <div key={idx} className="flex items-start gap-2">
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%',
                  backgroundColor: color,
                  opacity: isCrit ? 0.85 : 0.55,
                  flexShrink: 0, marginTop: 1,
                }}
              >
                <span style={{ color: 'white', fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-family-mono, monospace)' }}>
                  {idx + 1}
                </span>
              </span>
              <span className="text-[12px] font-mono leading-tight" style={{ color: 'var(--color-text-secondary)' }}>
                <span style={{ color, fontWeight: 600 }}>{c.year}</span>
                {' '}·{' '}
                {c.label[lang]}
                {isCrit && (
                  <span style={{ color, marginLeft: 4, fontSize: 13, opacity: 0.8 }}>●</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
