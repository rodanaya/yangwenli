import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { type OutletType } from './OutletBadge'
import { cn, localizeAmount } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// DataPullquote — editorial fact-tile. ONE shared component, FOUR roles, so a
// story that shows several figures never stamps the same box twice in a row:
//
//   ledger  — number-led boxed tile (the hero cifra)
//   plate   — boxed tile + micro-viz (threshold / proportion / …)
//   margin  — UNBOXED print pull-quote between hairlines (EB Garamond italic)
//   verdict — centered closing figure between full-width rules
//
// The 14 legacy VizTemplate names still map to six disciplined renderers
// (proportion / threshold / gauge / sliver / era / null). Role is chosen in
// StoryNarrative (pickPullquoteRole) and passed in; `sledgehammer` stays as a
// back-compat alias for `ledger`.
// ─────────────────────────────────────────────────────────────────────────────

export type VizTemplate =
  | 'breach-ceiling'
  | 'mass-sliver'
  | 'redline-gauge'
  | 'count-grid'
  | 'receipt-stamp'
  | 'margin-rule'
  | 'range-band'
  | 'zero-bar'
  | 'horizon'
  | 'mosaic-tile'
  | 'threshold-band'
  | 'dot-ratio'
  | 'wave-breaker'
  | 'pile-up'
  | 'compare-gap'

export type PullquoteRole = 'ledger' | 'plate' | 'margin' | 'verdict'

interface DataPullquoteProps {
  quote: string
  attribution?: string
  stat: string
  statLabel: string
  statColor?: string
  barValue?: number
  barLabel?: string
  /** Optional Spanish translation of `barLabel`. */
  barLabel_es?: string
  outlet?: OutletType
  className?: string
  vizTemplate?: VizTemplate
  /** Editorial role — picks the typographic treatment. When omitted, derived
   *  from `sledgehammer`/`barValue` (belt-and-braces; StoryNarrative always
   *  passes an explicit role). */
  role?: PullquoteRole
  /** Legacy alias for role='ledger'. */
  sledgehammer?: boolean
}

// Map outlet → sector accent color (drives left border, stat color, viz fill).
const OUTLET_ACCENT: Record<OutletType, string> = {
  longform: 'var(--color-text-muted)',
  investigative: '#a06820',                      // dashboard amber
  data_analysis: 'var(--color-sector-tecnologia)',
  rubli: 'var(--color-sector-salud)',
}

// Map old 14-template names → 6 disciplined renderer families.
type VizFamily = 'proportion' | 'threshold' | 'gauge' | 'sliver' | 'era' | 'null'

const TEMPLATE_FAMILY: Record<VizTemplate, VizFamily> = {
  'count-grid': 'proportion',
  'mosaic-tile': 'proportion',
  'dot-ratio': 'proportion',
  'breach-ceiling': 'threshold',
  'threshold-band': 'threshold',
  'margin-rule': 'threshold',
  'pile-up': 'threshold',
  'redline-gauge': 'gauge',
  'range-band': 'gauge',
  'wave-breaker': 'gauge',
  'mass-sliver': 'sliver',
  'compare-gap': 'sliver',
  'receipt-stamp': 'sliver',
  'horizon': 'era',
  'zero-bar': 'null',
}

function parseStatNumber(stat: string): { num: number; suffix: string; decimals: number } | null {
  const match = stat.match(/^[~≈]?([0-9.,]+)\s*(%|B|M|K|T)?$/)
  if (!match) return null
  const cleaned = match[1].replace(/,/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  const decimals = cleaned.includes('.') ? cleaned.split('.')[1].length : 0
  return { num, suffix: match[2] || '', decimals }
}

function autoSelectTemplate(value: number, stat: string, label?: string): VizTemplate {
  if (value === 0) return 'zero-bar'
  if (value < 0.06) return 'mass-sliver'
  if (/^\d[\d,]+$/.test(stat.trim())) return 'count-grid'
  if ((label?.toLowerCase().includes('oecd') || label?.toLowerCase().includes('lím') ||
       label?.toLowerCase().includes('threshold')) && value > 0.40) return 'breach-ceiling'
  return 'threshold-band'
}

function parseThreshold(label?: string): number {
  if (!label) return 0.30
  const range = label.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%/)
  if (range) return parseFloat(range[1]) / 100
  const pct = label.match(/(\d+(?:\.\d+)?)\s*%/)
  if (pct) return parseFloat(pct[1]) / 100
  const dec = label.match(/:\s*(0\.\d+)/)
  if (dec) return parseFloat(dec[1])
  return 0.30
}

function useReveal(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, revealed]
}

interface VizProps {
  value: number
  color: string
  label?: string
  stat?: string
  revealed: boolean
  lang: 'en' | 'es'
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Proportion — a ticked "out of ten" band (replaces the banned 100-dot
//    waffle). Filled fraction + nine cut-lines reads as counting, no dots.
// ─────────────────────────────────────────────────────────────────────────────
function ProportionBandViz({ value, color, revealed }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const pct = v * 100
  const readout = pct < 10 ? pct.toFixed(1) : Math.round(pct).toString()
  const readoutRight = pct > 78
  return (
    <div className="relative" style={{ height: 24 }}>
      {/* Track */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-sm"
        style={{ height: 12, background: 'var(--color-border)', opacity: 0.55 }}
      />
      {/* Fill */}
      <div
        className="absolute top-1/2 left-0 -translate-y-1/2 origin-left rounded-sm"
        style={{
          height: 12,
          width: `${pct}%`,
          background: color,
          opacity: revealed ? 0.9 : 0,
          transform: `translateY(-50%) scaleX(${revealed ? 1 : 0})`,
          transition: 'transform 1000ms cubic-bezier(0.16,1,0.3,1) 200ms, opacity 400ms',
        }}
      />
      {/* Nine tick cuts at 10% steps */}
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: `${(i + 1) * 10}%`,
            width: 1,
            height: 12,
            background: 'var(--color-background-card)',
            opacity: revealed ? 0.9 : 0,
            transition: `opacity 300ms ease-out ${400 + i * 30}ms`,
          }}
        />
      ))}
      {/* Percent readout at the fill edge */}
      <div
        className="absolute top-1/2 -translate-y-1/2 font-mono font-bold tabular-nums"
        style={{
          left: `${pct}%`,
          transform: readoutRight ? 'translate(calc(-100% - 6px), -50%)' : 'translate(6px, -50%)',
          color: readoutRight ? 'var(--color-background)' : color,
          fontSize: 11,
          opacity: revealed ? 1 : 0,
          transition: 'opacity 500ms ease-out 700ms',
          whiteSpace: 'nowrap',
        }}
      >
        {readout}%
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Threshold — solid bar with dotted limit tick.
// ─────────────────────────────────────────────────────────────────────────────
function ThresholdViz({ value, color, revealed, label, lang }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const valuePct = v * 100
  const thresholdPct = parseThreshold(label) * 100
  const limitLabel = lang === 'es' ? 'LÍMITE' : 'CEILING'
  return (
    <div className="relative" style={{ height: 28 }}>
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-sm"
        style={{ height: 12, background: 'var(--color-border)', opacity: 0.55 }}
      />
      <div
        className="absolute top-1/2 left-0 -translate-y-1/2 origin-left rounded-sm"
        style={{
          height: 12,
          width: `${valuePct}%`,
          background: color,
          opacity: revealed ? 0.9 : 0,
          transform: `translateY(-50%) scaleX(${revealed ? 1 : 0})`,
          transition: 'transform 1100ms cubic-bezier(0.16, 1, 0.3, 1) 200ms, opacity 400ms',
        }}
      />
      <div
        className="absolute inset-y-0"
        style={{
          left: `${thresholdPct}%`,
          width: 1.5,
          background: 'var(--color-text-primary)',
          opacity: revealed ? 0.7 : 0,
          transition: 'opacity 500ms ease-out 600ms',
        }}
      />
      <div
        className="absolute font-mono uppercase"
        style={{
          left: `${thresholdPct}%`,
          bottom: -14,
          transform: 'translateX(-50%)',
          fontSize: 8,
          letterSpacing: '0.18em',
          color: 'var(--color-text-muted)',
          opacity: revealed ? 1 : 0,
          transition: 'opacity 400ms ease-out 800ms',
          whiteSpace: 'nowrap',
        }}
      >
        {limitLabel} · {Math.round(thresholdPct)}%
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Gauge — linear scale (low→high) with a marker tick.
// ─────────────────────────────────────────────────────────────────────────────
function GaugeViz({ value, color, revealed, lang }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const pct = v * 100
  return (
    <div>
      <div className="relative h-3.5 w-full rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
        <div
          className="absolute inset-y-0 left-0 origin-left rounded-sm"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, var(--color-text-muted) 0%, ${color} 100%)`,
            opacity: revealed ? 0.7 : 0,
            transform: `scaleX(${revealed ? 1 : 0})`,
            transition: 'transform 1100ms cubic-bezier(0.16, 1, 0.3, 1) 200ms, opacity 500ms',
          }}
        />
        <div
          className="absolute"
          style={{
            left: `calc(${pct}% - 1px)`,
            top: -2,
            bottom: -2,
            width: 2,
            background: color,
            opacity: revealed ? 1 : 0,
            transition: 'opacity 300ms ease-out 1000ms',
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 font-mono uppercase"
        style={{ fontSize: 8, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}>
        <span>{lang === 'es' ? 'BAJO' : 'LOW'}</span>
        <span style={{ color }}>{pct.toFixed(0)}%</span>
        <span>{lang === 'es' ? 'CRÍTICO' : 'CRITICAL'}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sliver — tiny confirmed slice vs the remainder in italic.
// ─────────────────────────────────────────────────────────────────────────────
function SliverViz({ value, color, revealed, lang }: VizProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const visualPct = Math.max(2.5, pct)
  const detectedStr = pct < 1 ? pct.toFixed(1) : Math.round(pct).toString()
  const undetectedStr = (100 - pct).toFixed(pct < 1 ? 1 : 0)
  const undetectedLabel = lang === 'es' ? 'sin detectar' : 'unconfirmed'
  return (
    <div>
      <div className="relative" style={{ height: 28 }}>
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-sm"
          style={{ height: 12, background: 'var(--color-border)', opacity: 0.55 }}
        />
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 rounded-sm origin-left"
          style={{
            height: 12,
            width: `${visualPct}%`,
            background: color,
            opacity: revealed ? 1 : 0,
            transform: `translateY(-50%) scaleX(${revealed ? 1 : 0})`,
            transition: 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1) 200ms, opacity 400ms',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 font-mono font-bold tabular-nums"
          style={{
            left: `calc(${visualPct}% + 6px)`,
            color,
            fontSize: 11,
            opacity: revealed ? 1 : 0,
            transition: 'opacity 500ms ease-out 700ms',
            whiteSpace: 'nowrap',
          }}
        >
          {detectedStr}%
        </div>
      </div>
      <p
        className="mt-2"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 12,
          color: 'var(--color-text-muted)',
          opacity: revealed ? 0.75 : 0,
          transition: 'opacity 700ms ease-out 900ms',
          textAlign: 'right',
        }}
      >
        {undetectedStr}% {undetectedLabel}.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Era — five administrations as a stacked horizon.
// ─────────────────────────────────────────────────────────────────────────────
const ERAS = [
  { name: 'Fox', mult: 0.40 },
  { name: 'Calderón', mult: 0.55 },
  { name: 'Peña Nieto', mult: 0.80 },
  { name: 'AMLO', mult: 1.0 },
  { name: 'Sheinbaum', mult: 0.85 },
] as const

function EraViz({ value, color, revealed, label }: VizProps) {
  const threshold = parseThreshold(label)
  return (
    <div className="space-y-1">
      {ERAS.map((e, i) => {
        const v = Math.max(0, Math.min(1, value * e.mult)) * 100
        return (
          <div key={e.name} className="flex items-center gap-2">
            <span
              className="font-mono uppercase tabular-nums"
              style={{ width: 64, fontSize: 9, letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
            >
              {e.name}
            </span>
            <div className="relative flex-1 h-2 rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div
                className="absolute inset-y-0 left-0 origin-left"
                style={{
                  width: `${v}%`,
                  background: color,
                  opacity: 0.85,
                  transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
                  transition: `transform 800ms cubic-bezier(0.16, 1, 0.3, 1) ${100 + i * 110}ms`,
                }}
              />
              <div
                className="absolute inset-y-0"
                style={{ left: `${threshold * 100}%`, width: 1, background: 'var(--color-text-primary)', opacity: 0.45 }}
              />
            </div>
            <span
              className="text-right font-mono tabular-nums"
              style={{ width: 36, fontSize: 9, color: 'var(--color-text-muted)' }}
            >
              {v.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Null — editorial empty state.
// ─────────────────────────────────────────────────────────────────────────────
function NullViz({ revealed, lang }: VizProps) {
  const msg = lang === 'es' ? 'ningún caso registrado.' : 'no cases on record.'
  return (
    <div
      className="relative flex items-center"
      style={{ height: 36, borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 6, height: 6, background: 'var(--color-text-muted)', opacity: revealed ? 1 : 0, transition: 'opacity 500ms' }}
      />
      <div
        className="w-full text-center"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 16,
          color: 'var(--color-text-muted)',
          opacity: revealed ? 0.65 : 0,
          transition: 'opacity 800ms ease-out 500ms',
          letterSpacing: '0.02em',
        }}
      >
        {msg}
      </div>
    </div>
  )
}

function renderViz(template: VizTemplate, props: VizProps) {
  const family = TEMPLATE_FAMILY[template]
  switch (family) {
    case 'proportion': return <ProportionBandViz {...props} />
    case 'threshold':  return <ThresholdViz {...props} />
    case 'gauge':      return <GaugeViz {...props} />
    case 'sliver':     return <SliverViz {...props} />
    case 'era':        return <EraViz {...props} />
    case 'null':       return <NullViz {...props} />
  }
}

function familyEyebrow(family: VizFamily, lang: 'en' | 'es'): string {
  const map: Record<VizFamily, [string, string]> = {
    proportion: ['SHARE OF TOTAL',     'PROPORCIÓN'],
    threshold:  ['VS. RECOMMENDED',    'VS. RECOMENDADO'],
    gauge:      ['POSITION ON SCALE',  'POSICIÓN'],
    sliver:     ['CONFIRMED VS REST',  'CONFIRMADO VS RESTO'],
    era:        ['BY ADMINISTRATION',  'POR ADMINISTRACIÓN'],
    null:       ['EDITORIAL NOTE',     'NOTA EDITORIAL'],
  }
  return map[family][lang === 'es' ? 1 : 0]
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function DataPullquote({
  quote,
  attribution,
  stat: rawStat,
  statLabel,
  statColor = 'text-risk-critical',
  barValue,
  barLabel,
  barLabel_es,
  outlet,
  className,
  vizTemplate,
  role,
  sledgehammer = false,
}: DataPullquoteProps) {
  const { i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const localizedBarLabel = lang === 'es' ? (barLabel_es ?? barLabel) : barLabel
  const stat = localizeAmount(rawStat, lang)
  const parsed = parseStatNumber(stat)
  const { ref: countRef, value: animatedValue } = useCountUp(
    parsed ? parsed.num : 0,
    1600,
    parsed ? parsed.decimals : 0
  )

  // Accent precedence (April 2026 fix): hex statColor > tailwind substring > outlet.
  const accent = /^#[0-9a-f]{3,8}$/i.test(statColor)
    ? statColor
    : statColor.includes('red')   ? 'var(--color-sector-salud)'
    : statColor.includes('amber') ? '#a06820'
    : statColor.includes('blue')  ? 'var(--color-sector-tecnologia)'
    : outlet ? OUTLET_ACCENT[outlet]
    : 'var(--color-sector-salud)'

  const [vizRef, revealed] = useReveal()
  const template = vizTemplate ?? autoSelectTemplate(barValue ?? 0, stat, localizedBarLabel)
  const family = TEMPLATE_FAMILY[template]
  const vizProps: VizProps = { value: barValue ?? 0, color: accent, label: localizedBarLabel, stat, revealed, lang }

  // Role resolution: explicit role wins; else legacy alias / content shape.
  const resolvedRole: PullquoteRole =
    role ?? (sledgehammer ? 'ledger' : barValue !== undefined ? 'plate' : 'margin')

  const dateline = lang === 'es' ? 'ANÁLISIS · MAYO 2026' : 'ANALYSIS · MAY 2026'
  const sectionLabel = lang === 'es' ? 'CIFRA · COMPRANET' : 'FIGURE · COMPRANET'
  const ariaLabel = lang === 'en' ? 'Data pull quote' : 'Cita con datos'

  const numStr = parsed
    ? `${animatedValue.toLocaleString('es-MX', {
        minimumFractionDigits: parsed.decimals,
        maximumFractionDigits: parsed.decimals,
      })}${parsed.suffix}`
    : stat

  // Shared Playfair-Italic-800 stat number (only one renders per pullquote).
  const statNumber = (fontSize: string, extra?: React.CSSProperties) => (
    <span
      ref={countRef}
      className="dpq-stat tabular-nums"
      style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontWeight: 800,
        fontSize,
        lineHeight: 0.95,
        letterSpacing: '-0.025em',
        color: accent,
        overflowWrap: 'anywhere',
        maxWidth: '100%',
        ...extra,
      }}
      aria-label={`${stat} ${statLabel}`}
    >
      {numStr}
    </span>
  )

  // Shared viz block (plate + verdict). `withEyebrow` false when the tile's top
  // chrome already carries the family eyebrow.
  const vizBlock = (withEyebrow: boolean) =>
    barValue !== undefined ? (
      <div ref={vizRef} className="mt-3">
        {withEyebrow && (
          <div
            className="font-mono uppercase mb-2.5"
            style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
          >
            {familyEyebrow(family, lang)}
          </div>
        )}
        <div role="img" aria-label={`${stat}${localizedBarLabel ? ` — ${localizedBarLabel}` : ''}`}>
          {renderViz(template, vizProps)}
        </div>
        {localizedBarLabel && (
          <p
            className="font-mono leading-[1.45]"
            style={{ fontSize: 9.5, color: 'var(--color-text-muted)', marginTop: family === 'threshold' ? 18 : 10 }}
          >
            {localizedBarLabel}
          </p>
        )}
      </div>
    ) : null

  const containerStyle = (
    <style>{`
      .dpq-fig { container-type: inline-size; container-name: dpq; }
      @container dpq (max-width: 480px) {
        .dpq-pad     { padding-left: 16px; padding-right: 16px; }
        .dpq-pad-top { padding-top: 12px; padding-bottom: 8px; }
        .dpq-pad-bot { padding-bottom: 16px; }
        .dpq-chrome  { flex-direction: column; align-items: flex-start; gap: 4px; }
        .dpq-stat    { font-size: 2rem !important; }
        .dpq-quote   { font-size: 0.92rem !important; line-height: 1.5; }
        .dpq-mstat   { flex-direction: column; align-items: flex-start; gap: 6px; }
      }
    `}</style>
  )

  // ─── Role: MARGIN — unboxed print pull-quote ───
  if (resolvedRole === 'margin') {
    return (
      <ScrollReveal className={cn('my-12', className)}>
        {containerStyle}
        <figure className="dpq-fig relative" role="figure" aria-label={ariaLabel}>
          {/* Top rule with a short accent segment at the left */}
          <div className="relative" style={{ height: 2 }}>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: 1, background: 'var(--color-border)' }} />
            <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{ width: 28, height: 2, background: accent }} />
          </div>
          <div className="py-5">
            <blockquote
              className="dpq-quote"
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                        fontWeight: 500,
                fontSize: 'clamp(1.1rem, 2.6cqw, 1.3rem)',
                lineHeight: 1.45,
                color: 'var(--color-text-primary)',
              }}
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
            <div className="dpq-mstat flex items-baseline gap-3 mt-4 flex-wrap">
              {statNumber('clamp(1.5rem, 3.4cqw, 1.9rem)')}
              <span
                className="font-mono uppercase"
                style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--color-text-muted)' }}
              >
                {statLabel}
              </span>
            </div>
            {attribution && (
              <figcaption className="font-mono uppercase text-text-muted mt-2" style={{ fontSize: 9, letterSpacing: '0.16em' }}>
                — {attribution}
              </figcaption>
            )}
          </div>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
        </figure>
      </ScrollReveal>
    )
  }

  // ─── Role: VERDICT — centered closing figure ───
  if (resolvedRole === 'verdict') {
    return (
      <ScrollReveal className={cn('my-12', className)}>
        {containerStyle}
        <figure className="dpq-fig relative text-center" role="figure" aria-label={ariaLabel}>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <div className="py-8 px-4">
            <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}>
              {lang === 'es' ? 'EL SALDO · CIFRA FINAL' : 'THE BALANCE · CLOSING FIGURE'}
            </div>
            <div className="flex justify-center mt-3">
              {statNumber('clamp(3rem, 8cqw, 4.5rem)', { letterSpacing: '-0.03em' })}
            </div>
            <p
              className="font-mono uppercase mx-auto mt-3"
              style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-secondary)', maxWidth: '52ch' }}
            >
              {statLabel}
            </p>
            <p
              className="mx-auto mt-4"
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontWeight: 500,
                fontSize: '1.05rem',
                color: 'var(--color-text-muted)',
                maxWidth: '46ch',
                lineHeight: 1.5,
              }}
            >
              &ldquo;{quote}&rdquo;
            </p>
            {barValue !== undefined && (
              <div className="mx-auto mt-6 text-left" style={{ maxWidth: 320 }}>
                {vizBlock(false)}
              </div>
            )}
          </div>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
        </figure>
      </ScrollReveal>
    )
  }

  // ─── Roles: LEDGER + PLATE — boxed tiles ───
  const isPlate = resolvedRole === 'plate'
  return (
    <ScrollReveal className={cn('my-12', className)}>
      {containerStyle}
      <figure
        className="dpq-fig relative bg-background-card overflow-hidden"
        style={{
          borderLeft: `3px solid ${accent}`,
          borderTop: '1px solid var(--color-border)',
          borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        }}
        role="figure"
        aria-label={ariaLabel}
      >
        {/* Top chrome — ledger shows CIFRA · COMPRANET; plate shows the family eyebrow */}
        <div
          className="dpq-chrome dpq-pad dpq-pad-top flex items-center justify-between px-5 pt-4 pb-3 font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
        >
          <span>{isPlate ? familyEyebrow(family, lang) : sectionLabel}</span>
          <span aria-hidden>{dateline}</span>
        </div>

        <div className="dpq-pad dpq-pad-bot px-5 pb-5">
          {/* Number */}
          <div className="flex items-baseline gap-3 mb-3 pt-2">
            {statNumber(isPlate ? 'clamp(1.85rem, 4cqw, 2.6rem)' : 'clamp(2.4rem, 5.5cqw, 3.5rem)', {
              letterSpacing: isPlate ? '-0.02em' : '-0.025em',
            })}
          </div>

          {/* Label */}
          {isPlate ? (
            <p className="text-text-secondary text-sm leading-snug mb-4">{statLabel}</p>
          ) : (
            <p className="font-mono uppercase mb-4" style={{ fontSize: 11, letterSpacing: '0.12em', color: accent, opacity: 0.85 }}>
              {statLabel}
            </p>
          )}

          {/* Plate: viz between label and the demoted quote */}
          {isPlate && vizBlock(false)}

          {/* Hairline */}
          <div className="h-px w-full my-4" style={{ background: 'var(--color-border)' }} />

          {/* Quote — demoted below the number (both boxed roles) */}
          <blockquote
            className="text-text-muted mb-2"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 400,
              fontSize: 'clamp(0.85rem, 1.4vw, 0.95rem)',
              lineHeight: 1.5,
              letterSpacing: '0.005em',
            }}
          >
            &ldquo;{quote}&rdquo;
          </blockquote>
          {attribution && (
            <figcaption className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.16em' }}>
              — {attribution}
            </figcaption>
          )}
        </div>
      </figure>
    </ScrollReveal>
  )
}
