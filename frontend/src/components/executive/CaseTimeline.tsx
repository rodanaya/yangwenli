/**
 * CaseTimeline — Seismograph-style spike chart with administration era bands.
 * Critical = tall spike (80px), high = medium spike (44px).
 * Trimmed to 2008+ since the GT corpus has no documented cases earlier.
 *
 * PARALLAX D10 § Change 2 — drawn at 1:1 (useMeasuredWidth): bands, spikes
 * and caps stay in the svg; era labels, tick years and the numbered badges
 * are HTML at ≥ 11px.
 *
 * Extracted from Executive.tsx — do not inline again.
 */

import { useRef } from 'react'
import { SECTOR_COLORS, getSectorTextColor } from '@/lib/constants'
import { ADMINISTRATIONS, ADMIN_COLORS, ADMIN_DISPLAY_ACCENTED } from '@/lib/administrations'
import { useFontsReady, useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { measureLabel, type LabelBox } from '@/lib/plateLabels'

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

const YEAR_MIN = 2008
const YEAR_MAX = 2025

// One calendar (lib/administrations): each band runs from its term's first
// year to the next term's first year; Calderón is clipped to the axis start
// (2008) and Sheinbaum's band starts at the 2025 axis end.
const ERA_BANDS = ADMINISTRATIONS
  .filter((a) => a.yearEnd >= YEAR_MIN && a.yearStart <= YEAR_MAX)
  .map((a) => ({
    key: a.key,
    label: ADMIN_DISPLAY_ACCENTED[a.key],
    start: Math.max(a.yearStart, YEAR_MIN),
    end: Math.min(a.yearEnd + 1, YEAR_MAX),
    color: ADMIN_COLORS[a.key],
  }))

/** `hex` at 18 % over the plate paper (#f3f1ec), as a plain rgb(). */
function tint18(hex: string): string {
  const h = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  const paper = [0xf3, 0xf1, 0xec]
  return `rgb(${c.map((v, i) => Math.round(v * 0.18 + paper[i] * 0.82)).join(', ')})`
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface CaseTimelineProps {
  lang: 'en' | 'es'
}

const MONO = '"JetBrains Mono", monospace'
const ERA_FONT = `600 11px ${MONO}`
const TICK_FONT = `11px ${MONO}`
const H_BASE = 160
const AXIS_BASE = 130
const ERA_ROW = 16 // one era-label row
const PAD_X = 24
const SPIKE_CRIT = 82
const SPIKE_HIGH = 46
const BAR_W = 7
const BADGE = 18
const TICK_YEARS = [2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024]

export function CaseTimeline({ lang }: CaseTimelineProps) {
  const box = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(box)
  const fontsReady = useFontsReady([ERA_FONT, TICK_FONT])
  const ready = W > 0 && fontsReady

  const yearToX = (year: number) =>
    PAD_X + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (W - PAD_X * 2)
  const bandX = (era: (typeof ERA_BANDS)[number]) => {
    const x1 = yearToX(era.start)
    // The last band (Sheinbaum, 2025–) runs from the axis end into the pad.
    const x2 = era.end > era.start ? yearToX(era.end) : W - 2
    return { x1, x2 }
  }

  // Era labels — full names at every width (Day 7/8 rule): centred on the
  // band, clamped to the plate edge (a narrow band's label overhangs its band
  // leftwards, the last one sits right-anchored to the plate); a label that
  // still meets its neighbour drops to a second row, and the drawing moves
  // down by that row.
  const eraLabels: Array<{ key: string; text: string; left: number; row: number }> = []
  // Tick years kept left-to-right while a label width apart (phones thin them).
  const ticks: number[] = []
  if (ready) {
    const taken: LabelBox[] = []
    const hits = (a: LabelBox) => taken.some((t) => !(a.x1 <= t.x0 - 6 || a.x0 >= t.x1 + 6 || a.y1 <= t.y0 || a.y0 >= t.y1))
    for (const era of ERA_BANDS) {
      const { x1, x2 } = bandX(era)
      const text = era.label.toUpperCase()
      const w = measureLabel(text, ERA_FONT, 999, 14).width + text.length * 11 * 0.06
      const left = Math.min(Math.max(0, (x1 + x2) / 2 - w / 2), W - w)
      for (const row of [0, 1]) {
        const box = { x0: left, y0: row * ERA_ROW, x1: left + w, y1: row * ERA_ROW + 14 }
        if (row === 1 || !hits(box)) {
          taken.push(box)
          eraLabels.push({ key: era.key, text, left, row })
          break
        }
      }
    }
    const tw = measureLabel('2008', TICK_FONT, 999, 14).width
    for (const y of TICK_YEARS) {
      const prev = ticks[ticks.length - 1]
      if (prev === undefined || yearToX(y) - yearToX(prev) >= tw + 8) ticks.push(y)
    }
  }

  const extra = (Math.max(1, ...eraLabels.map((e) => e.row + 1)) - 1) * ERA_ROW
  const H = H_BASE + extra
  const AXIS_Y = AXIS_BASE + extra

  // Badge centres: over their spike, spread apart (half the deficit each)
  // where two same-height neighbours one year apart would overlap on a phone.
  const badgeX = TIMELINE_CASES.map((c) => yearToX(c.year))
  for (let i = 1; i < badgeX.length; i++) {
    const sameH = TIMELINE_CASES[i].severity === TIMELINE_CASES[i - 1].severity
    const deficit = BADGE + 2 - (badgeX[i] - badgeX[i - 1])
    if (sameH && deficit > 0) {
      badgeX[i - 1] -= deficit / 2
      badgeX[i] += deficit / 2
    }
  }

  return (
    <div>
      <div ref={box} className="relative" style={{ height: H }}>
        {ready && (
          <>
            <svg
              data-figure="seismograph"
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{ display: 'block' }}
              role="img"
              aria-label={lang === 'en'
                ? `${TIMELINE_CASES.length === 10 ? 'Ten' : TIMELINE_CASES.length} documented cases, 2008–2025, by year, severity and sector`
                : `${TIMELINE_CASES.length === 10 ? 'Diez' : TIMELINE_CASES.length} casos documentados, 2008–2025, por año, gravedad y sector`}
            >
              {/* Administration era bands */}
              {ERA_BANDS.map((era) => {
                const { x1, x2 } = bandX(era)
                return (
                  <g key={era.key} data-era-band={era.start}>
                    <rect x={x1} y={8} width={x2 - x1} height={AXIS_Y - 8} fill={era.color} opacity={0.04} />
                    <rect x={x1} y={8} width={x2 - x1} height={2} fill={era.color} opacity={0.18} />
                    {era.end > era.start && era.end < YEAR_MAX && (
                      <line x1={x2} x2={x2} y1={8} y2={AXIS_Y} stroke={era.color} strokeWidth={0.5} opacity={0.2} />
                    )}
                  </g>
                )
              })}

              {/* Axis + tick marks */}
              <line x1={PAD_X} x2={W - PAD_X} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--color-border-hover)" strokeWidth={1.5} />
              {TICK_YEARS.map((y) => (
                <line key={y} x1={yearToX(y)} x2={yearToX(y)} y1={AXIS_Y} y2={AXIS_Y + 4} stroke="var(--color-border)" strokeWidth={1} />
              ))}

              {/* Spikes */}
              {TIMELINE_CASES.map((c, idx) => {
                const x = yearToX(c.year)
                const isCrit = c.severity === 'critical'
                const h = isCrit ? SPIKE_CRIT : SPIKE_HIGH
                const color = SECTOR_COLORS[c.sector]
                return (
                  <g key={idx}>
                    <rect x={x - BAR_W / 2} y={AXIS_Y - h} width={BAR_W} height={h} fill={color} opacity={isCrit ? 0.15 : 0.08} rx={2} />
                    <rect x={x - BAR_W / 2} y={AXIS_Y - h + h * 0.4} width={BAR_W} height={h * 0.6} fill={color} opacity={isCrit ? 0.55 : 0.35} rx={2} />
                    <rect x={x - BAR_W / 2} y={AXIS_Y - h} width={BAR_W} height={3} fill={color} opacity={isCrit ? 0.95 : 0.7} rx={1} />
                    <circle cx={x} cy={AXIS_Y} r={2.5} fill={color} opacity={0.6} />
                    <title>{c.label[lang]} ({c.year}) — {lang === 'en' ? c.severity : (isCrit ? 'crítico' : 'alto')}</title>
                  </g>
                )
              })}
            </svg>

            {/* ── HTML label layer ── */}
            {eraLabels.map((e) => (
              <div
                key={e.key}
                data-era-label=""
                className="absolute whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary leading-[14px]"
                style={{ left: e.left, top: 12 + e.row * ERA_ROW }}
              >
                {e.text}
              </div>
            ))}
            {ticks.map((y) => (
              <div
                key={y}
                className="absolute font-mono text-[11px] text-text-muted tabular-nums leading-[14px]"
                style={{ left: yearToX(y), top: AXIS_Y + 7, transform: 'translateX(-50%)' }}
              >
                {y}
              </div>
            ))}
            {TIMELINE_CASES.map((c, idx) => {
              const x = badgeX[idx]
              const h = c.severity === 'critical' ? SPIKE_CRIT : SPIKE_HIGH
              const color = SECTOR_COLORS[c.sector]
              return (
                <span
                  key={idx}
                  className="absolute inline-flex items-center justify-center rounded-full font-mono tabular-nums text-[11px] font-bold text-text-primary"
                  style={{
                    left: x - BADGE / 2, top: AXIS_Y - h - BADGE - 3, width: BADGE, height: BADGE,
                    backgroundColor: tint18(color),
                    boxShadow: `inset 0 0 0 1px ${color}`,
                  }}
                >
                  {idx + 1}
                </span>
              )
            })}
          </>
        )}
      </div>

      {/* Numbered legend — one column on phones, two from sm */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {TIMELINE_CASES.map((c, idx) => {
          const isCrit = c.severity === 'critical'
          const color = SECTOR_COLORS[c.sector]
          return (
            <div key={idx} className="flex items-start gap-2">
              {/* Numbered disc — the number in primary ink on an 18% sector
                  tint with a 1px sector ring (readable on every sector). */}
              <span
                className="font-mono tabular-nums text-[11px] font-bold text-text-primary"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: '50%',
                  backgroundColor: tint18(color),
                  boxShadow: `inset 0 0 0 1px ${color}`,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span className="text-[12px] font-mono leading-tight" style={{ color: 'var(--color-text-secondary)' }}>
                <span style={{ color: getSectorTextColor(c.sector), fontWeight: 600 }}>{c.year}</span>
                {' '}·{' '}
                {c.label[lang]}
                {isCrit && (
                  <span aria-hidden="true" style={{ color, marginLeft: 4, fontSize: 13 }}>●</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
