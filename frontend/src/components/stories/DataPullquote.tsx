import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { OutletBadge, type OutletType } from './OutletBadge'
import { cn, localizeAmount } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// DataPullquote — editorial fact-tile redesigned to match the dashboard's
// Playfair-Italic-800 + micro-viz aesthetic ("the bar"). Backward-compatible
// with the existing 14 VizTemplate names: each maps to one of six disciplined
// renderers below (proportion / threshold / gauge / sliver / era / null).
//
//   ┌────────────────────────────────────────┐
//   ▎ DATELINE · OUTLET · MICRO MONO         │
//   │ "soft italic Playfair quote ..."       │
//   │ — attribution                          │
//   │ ────────────────                       │
//   │  6,034                  ← Playfair It. │
//   │  ghost-pattern vendors  · 0.7% confirmed│
//   │                                         │
//   │  RUBLI VS OFFICIAL · MICRO MONO         │
//   │  ▰▰▰▰▰▰▰▰▰▰░░░░░░░░  [micro-viz]      │
//   │  caption mono micro                     │
//   └────────────────────────────────────────┘
//        ↑ left 3px sector accent
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

interface DataPullquoteProps {
  quote: string
  attribution?: string
  stat: string
  statLabel: string
  statColor?: string
  barValue?: number
  barLabel?: string
  outlet?: OutletType
  className?: string
  vizTemplate?: VizTemplate
}

// Map outlet → sector accent color. The accent drives the left border, the
// stat color, and the viz fill — keeping every tile chromatically coherent.
const OUTLET_ACCENT: Record<OutletType, string> = {
  longform: 'var(--color-text-muted)',
  investigative: '#a06820',                      // dashboard amber
  data_analysis: 'var(--color-sector-tecnologia)',
  rubli: 'var(--color-sector-salud)',
}

// Map old 14-template names → 6 disciplined renderer families.
type VizFamily = 'proportion' | 'threshold' | 'gauge' | 'sliver' | 'era' | 'null'

const TEMPLATE_FAMILY: Record<VizTemplate, VizFamily> = {
  // proportion — "X out of N", waffle-style, dashboard tile-2 echo
  'count-grid': 'proportion',
  'mosaic-tile': 'proportion',
  'dot-ratio': 'proportion',
  // threshold — bar with OECD/limit marker
  'breach-ceiling': 'threshold',
  'threshold-band': 'threshold',
  'margin-rule': 'threshold',
  'pile-up': 'threshold',
  // gauge — linear scale with marker tick (dashboard tile-4 echo)
  'redline-gauge': 'gauge',
  'range-band': 'gauge',
  'wave-breaker': 'gauge',
  // sliver — tiny confirmed slice vs the rest in italic
  'mass-sliver': 'sliver',
  'compare-gap': 'sliver',
  'receipt-stamp': 'sliver',
  // era — multi-row time horizon
  'horizon': 'era',
  // null — empty / "no cases" editorial state
  'zero-bar': 'null',
}

function parseStatNumber(stat: string): { num: number; suffix: string; decimals: number } | null {
  const match = stat.match(/^([0-9.,]+)\s*(%|B|M|K|T)?$/)
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
// 1. Proportion — 100-dot waffle with confirmed/total split
//    Mirrors the dashboard's "DIRECT AWARDS" tile. Reads at a glance: this
//    block of solid dots vs the field of muted ones IS the ratio.
// ─────────────────────────────────────────────────────────────────────────────
function ProportionViz({ value, color, revealed }: VizProps) {
  const total = 100
  const filled = Math.max(1, Math.round(Math.max(0, Math.min(1, value)) * total))
  const cols = 25
  return (
    <svg viewBox="0 0 200 22" className="w-full" style={{ height: 22 }} aria-hidden>
      {Array.from({ length: total }).map((_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const cx = 4 + col * 7.5
        const cy = 4 + row * 5
        const isOn = i < filled
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={1.6}
            fill={isOn ? color : 'var(--color-border-hover)'}
            opacity={revealed ? (isOn ? 0.9 : 0.45) : 0}
            style={{ transition: `opacity 240ms ease-out ${i * 5}ms` }}
          />
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Threshold — solid bar with dotted OECD/limit tick. No hatching, no
//    construction-zone stripes. The cleanness IS the editorial.
// ─────────────────────────────────────────────────────────────────────────────
function ThresholdViz({ value, color, revealed, label, lang }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const valuePct = v * 100
  const thresholdPct = parseThreshold(label) * 100
  const limitLabel = lang === 'es' ? 'LÍMITE' : 'CEILING'
  return (
    <div className="relative" style={{ height: 28 }}>
      {/* Track */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-sm"
        style={{ height: 12, background: 'var(--color-border)', opacity: 0.55 }}
      />
      {/* Filled bar */}
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
      {/* Dotted threshold tick — same idiom as dashboard tile-2 OECD line */}
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
// 3. Gauge — linear scale (low→high) with a marker tick. Echoes dashboard
//    tile-4 ("MODEL ACCURACY"). Replaces the speedometer.
// ─────────────────────────────────────────────────────────────────────────────
function GaugeViz({ value, color, revealed, lang }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const pct = v * 100
  return (
    <div>
      <div className="relative h-3.5 w-full rounded-sm overflow-hidden" style={{ background: 'var(--color-border)' }}>
        {/* Filled portion 0 → value */}
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
        {/* Marker tick */}
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
// 4. Sliver — tiny confirmed slice and the unconfirmed remainder in italic.
//    The contrast IS the story (Economist dumbbell idiom).
// ─────────────────────────────────────────────────────────────────────────────
function SliverViz({ value, color, revealed, lang }: VizProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  // Visual minimum so a 0.7% sliver is still legible
  const visualPct = Math.max(2.5, pct)
  const detectedStr = pct < 1 ? pct.toFixed(1) : Math.round(pct).toString()
  const undetectedStr = (100 - pct).toFixed(pct < 1 ? 1 : 0)
  const undetectedLabel = lang === 'es' ? 'sin detectar' : 'unconfirmed'
  return (
    <div>
      <div className="relative" style={{ height: 28 }}>
        {/* Track */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-sm"
          style={{ height: 12, background: 'var(--color-border)', opacity: 0.55 }}
        />
        {/* Sliver */}
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
        {/* Pct label after the sliver edge */}
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
        className="mt-2 italic"
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
// 5. Era — five Mexican administrations as a stacked horizon. Threshold
//    line shared across rows. Replaces 'horizon' with proper labels.
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
              style={{
                width: 64,
                fontSize: 9,
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
              }}
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
                style={{
                  left: `${threshold * 100}%`,
                  width: 1,
                  background: 'var(--color-text-primary)',
                  opacity: 0.45,
                }}
              />
            </div>
            <span
              className="text-right font-mono tabular-nums"
              style={{
                width: 36,
                fontSize: 9,
                color: 'var(--color-text-muted)',
              }}
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
// 6. Null — editorial empty state. The "0" is the story. Italic prose
//    sets the tone.
// ─────────────────────────────────────────────────────────────────────────────
function NullViz({ revealed, lang }: VizProps) {
  const msg = lang === 'es' ? 'ningún caso registrado.' : 'no cases on record.'
  return (
    <div
      className="relative flex items-center"
      style={{
        height: 36,
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 6, height: 6, background: 'var(--color-text-muted)', opacity: revealed ? 1 : 0, transition: 'opacity 500ms' }}
      />
      <div
        className="w-full text-center italic"
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

// ─────────────────────────────────────────────────────────────────────────────
// Renderer dispatch — old templates → six families
// ─────────────────────────────────────────────────────────────────────────────
function renderViz(template: VizTemplate, props: VizProps) {
  const family = TEMPLATE_FAMILY[template]
  switch (family) {
    case 'proportion': return <ProportionViz {...props} />
    case 'threshold':  return <ThresholdViz {...props} />
    case 'gauge':      return <GaugeViz {...props} />
    case 'sliver':     return <SliverViz {...props} />
    case 'era':        return <EraViz {...props} />
    case 'null':       return <NullViz {...props} />
  }
}

// Section eyebrow text for each viz family — bilingual, dashboard-style
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
  outlet,
  className,
  vizTemplate,
}: DataPullquoteProps) {
  const { i18n, t: tc } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const stat = localizeAmount(rawStat, lang)
  const parsed = parseStatNumber(stat)
  const { ref: countRef, value: animatedValue } = useCountUp(
    parsed ? parsed.num : 0,
    1600,
    parsed ? parsed.decimals : 0
  )

  // Accent precedence (April 2026 fix):
  //   1. statColor as a literal hex (e.g. "#dc2626") — this is the
  //      editorial color set per-story in story-content.ts via
  //      leadStat.color, and it must MATCH the hero stat for the same
  //      story to have a coherent chromatic identity. Wins over outlet.
  //   2. statColor as a Tailwind utility ("text-red-400" etc.) — legacy
  //      callers used to pass these; map by substring.
  //   3. Outlet category default — last-resort, only when no statColor.
  const accent = /^#[0-9a-f]{3,8}$/i.test(statColor)
    ? statColor
    : statColor.includes('red')   ? 'var(--color-sector-salud)'
    : statColor.includes('amber') ? '#a06820'
    : statColor.includes('blue')  ? 'var(--color-sector-tecnologia)'
    : outlet ? OUTLET_ACCENT[outlet]
    : 'var(--color-sector-salud)'

  const [vizRef, revealed] = useReveal()
  const template = vizTemplate ?? autoSelectTemplate(barValue ?? 0, stat, barLabel)
  const family = TEMPLATE_FAMILY[template]
  const vizProps: VizProps = {
    value: barValue ?? 0,
    color: accent,
    label: barLabel,
    stat,
    revealed,
    lang,
  }

  // Editorial dateline mimics the masthead. Locale-aware short date.
  const dateline = new Date().toLocaleDateString(
    lang === 'es' ? 'es-MX' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  ).toUpperCase().replace(/,/g, ' ·').replace(/\./g, '')
  const sectionLabel = lang === 'es' ? 'CIFRA · COMPRANET' : 'FIGURE · COMPRANET'

  // Use the eyebrow text in mark-up; ignore the translation hook's t() since
  // these editorial strings live in this component.
  void tc

  return (
    <ScrollReveal className={cn('my-12', className)}>
      {/* Container queries scope adaptations to the figure's *own* width
          (not the viewport). FeatureChapter places this in a 5-of-12
          sidebar grid where rendered width drops to ~380px on desktop;
          DataSpotlight gives it 656px; closing chapters give 848px. The
          rules below let one component look right at all three.

          Browser support: 95%+ Baseline 2023 — safe for prod. */}
      <style>{`
        .dpq-fig { container-type: inline-size; container-name: dpq; }
        @container dpq (max-width: 480px) {
          .dpq-pad     { padding-left: 16px; padding-right: 16px; }
          .dpq-pad-top { padding-top: 12px; padding-bottom: 8px; }
          .dpq-pad-bot { padding-bottom: 16px; }
          .dpq-chrome  { flex-direction: column; align-items: flex-start; gap: 4px; }
          .dpq-stat    { font-size: 2rem !important; }
          .dpq-quote   { font-size: 0.92rem !important; line-height: 1.5; }
        }
      `}</style>
      <figure
        className="dpq-fig relative bg-background-card overflow-hidden"
        style={{
          borderLeft: `3px solid ${accent}`,
          borderTop: '1px solid var(--color-border)',
          borderRight: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: 2,
        }}
        role="figure"
        aria-label="Cita con datos"
      >
        {/* ─── Top chrome: dateline + section label ─── */}
        <div
          className="dpq-chrome dpq-pad dpq-pad-top flex items-center justify-between px-5 pt-4 pb-3 font-mono uppercase"
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>{sectionLabel}</span>
          <span aria-hidden>{dateline}</span>
        </div>

        <div className="dpq-pad dpq-pad-bot px-5 pb-5">
          {/* ─── Outlet badge ─── */}
          {outlet && (
            <div className="mb-3">
              <OutletBadge outlet={outlet} />
            </div>
          )}

          {/* ─── Quote (demoted: smaller, secondary) ─── */}
          <blockquote
            className="dpq-quote text-text-secondary mb-2"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(0.95rem, 1.6vw, 1.05rem)',
              lineHeight: 1.55,
              letterSpacing: '0.005em',
            }}
          >
            &ldquo;{quote}&rdquo;
          </blockquote>

          {attribution && (
            <figcaption
              className="font-mono uppercase text-text-muted mb-5"
              style={{ fontSize: 9.5, letterSpacing: '0.16em' }}
            >
              — {attribution}
            </figcaption>
          )}

          {/* ─── Hairline rule between quote and number ─── */}
          <div className="h-px w-full mb-4" style={{ background: 'var(--color-border)' }} />

          {/* ─── Headline number — Playfair Italic 800, dashboard idiom ─── */}
          <div className="flex items-baseline gap-3 mb-1">
            <span
              ref={countRef}
              className="dpq-stat tabular-nums"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 'clamp(2.4rem, 5.6vw, 3.6rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                color: accent,
              }}
              aria-label={`${stat} ${statLabel}`}
            >
              {parsed
                ? `${animatedValue.toLocaleString('es-MX', {
                    minimumFractionDigits: parsed.decimals,
                    maximumFractionDigits: parsed.decimals,
                  })}${parsed.suffix}`
                : stat}
            </span>
          </div>

          <p className="text-text-secondary text-sm leading-snug mb-5">{statLabel}</p>

          {/* ─── Micro-viz block ─── */}
          {barValue !== undefined && (
            <div ref={vizRef} className="mt-3">
              <div
                className="font-mono uppercase mb-2.5"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.18em',
                  color: 'var(--color-text-muted)',
                }}
              >
                {familyEyebrow(family, lang)}
              </div>
              <div role="img" aria-label={`${stat}${barLabel ? ` — ${barLabel}` : ''}`}>
                {renderViz(template, vizProps)}
              </div>
              {barLabel && (
                <p
                  className="font-mono leading-[1.45]"
                  style={{
                    fontSize: 9.5,
                    color: 'var(--color-text-muted)',
                    marginTop: family === 'threshold' ? 18 : 10,
                  }}
                >
                  {barLabel}
                </p>
              )}
            </div>
          )}
        </div>
      </figure>
    </ScrollReveal>
  )
}
