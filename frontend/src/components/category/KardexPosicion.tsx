/**
 * KardexPosicion — § 0 "LA POSICIÓN EN EL INVENTARIO" of the category
 * dossier. Named precedent: FT Visual Vocabulary dot-plot-on-shared-scale
 * (deviation family) — every peer renders as a quiet tick on a shared track,
 * the median gets a labeled rule, and THIS category is the single inked dot.
 * It's the dossier's missing peer context, fed entirely by the summary array
 * the page already fetches — zero new queries.
 *
 * Content-only: no self-rendered § kicker. The page wraps this in its own
 * DossierSectionHeader (matching CategoryDiagnosticGrid / ProcedureSplit /
 * SeasonalityTell, all of which take `accent` + `lang` and let the page own
 * the section chrome) — kicker text per spec: "§ La posición · este anaquel
 * entre los 72" / "§ The position · this shelf among the 72".
 *
 * Hex colours ONLY as direct SVG/style attributes — never via className
 * (stripped). No green for low risk (Bible §3.10); the peer dot uses the
 * caller's `accent` (the category's sector color), never intensityColor —
 * this is a position instrument, not a risk-severity one.
 */
import { useMemo, useRef } from 'react'
import { EU_DIRECT_AWARD_LIMIT } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import type { CategorySummaryItem } from '@/components/categories/types'
import { CONTRACT_FLOOR } from '@/components/categories/types'

export interface KardexPosicionProps {
  category: CategorySummaryItem
  all: CategorySummaryItem[]
  accent: string
  lang: 'en' | 'es'
}

const DA_LIMIT_PCT = EU_DIRECT_AWARD_LIMIT * 100
// Track geometry (px): rank flag on top, baseline, labels underneath.
const FLAG_H = 13
const BASE_Y = 23
const TRACK_H = 34 // flag + ticks + rules zone; labels sit under it
const LABEL_Y = TRACK_H + 1
const BOX_H = LABEL_Y + 11
const DOT_D = 11
const TICK_H = 10
// JetBrains Mono advances 0.6em; 0.64 leaves room for tabular digits + rounding.
const LABEL_FS = 11
const labelW = (text: string) => Math.ceil(text.length * LABEL_FS * 0.64)
const LABEL_GAP = 6

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** 1-based rank of `id` within `pool`, sorted desc by `getValue`. Null if absent. */
function rankOf(pool: CategorySummaryItem[], id: number, getValue: (c: CategorySummaryItem) => number): number | null {
  const sorted = [...pool].sort((a, b) => getValue(b) - getValue(a))
  const idx = sorted.findIndex((c) => c.category_id === id)
  return idx === -1 ? null : idx + 1
}

/** Linear or √-scaled position within [min,max], clamped to 0..1. */
function scalePos(value: number, min: number, max: number, sqrt: boolean): number {
  const v = sqrt ? Math.sqrt(Math.max(0, value)) : value
  const lo = sqrt ? Math.sqrt(Math.max(0, min)) : min
  const hi = sqrt ? Math.sqrt(Math.max(0, max)) : max
  if (hi === lo) return 0.5
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
}

interface RowConfig {
  key: string
  label: string
  pool: CategorySummaryItem[]
  getValue: (c: CategorySummaryItem) => number
  sqrt?: boolean
  euTick?: number
  formatReadout: (v: number) => string
  /** short form for the endpoints and the median label (row unit, no currency suffix) */
  formatTick: (v: number) => string
}

interface PlacedLabel { key: string; text: string; left: number; width: number }

/**
 * Seat the under-track labels without collisions, from the measured track width
 * (pure: no DOM reads, no state). Endpoints are fixed at the track ends; then the
 * EU line's label, then the median's. Each tries centred → start-at-x → end-at-x
 * (end-at-x first within 60px of the right end) and is dropped when nothing fits.
 */
function placeLabels(W: number, ends: [string, string], movable: { key: string; text: string; x: number }[]): PlacedLabel[] {
  const placed: PlacedLabel[] = [
    { key: 'min', text: ends[0], left: 0, width: labelW(ends[0]) },
    { key: 'max', text: ends[1], left: W - labelW(ends[1]), width: labelW(ends[1]) },
  ]
  const free = (l: number, w: number) =>
    l >= 0 && l + w <= W && placed.every((q) => l + w + LABEL_GAP <= q.left || l >= q.left + q.width + LABEL_GAP)
  for (const m of movable) {
    const w = labelW(m.text)
    const centred = m.x - w / 2
    const start = m.x + 3
    const end = m.x - 3 - w
    const tries = W - m.x < 60 ? [end, centred, start] : [centred, start, end]
    const left = tries.find((l) => free(l, w))
    if (left != null) placed.push({ key: m.key, text: m.text, left, width: w })
  }
  return placed
}

function GapRow({ label, note }: { label: string; note: string }) {
  return (
    <div className="py-3.5 border-b border-border last:border-b-0" style={{ borderLeft: '2px solid transparent', paddingLeft: 10 }}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {note}
        </span>
      </div>
    </div>
  )
}

function Row({ cfg, category, accent, isEs }: { cfg: RowConfig; category: CategorySummaryItem; accent: string; isEs: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(trackRef)
  const values = cfg.pool.map(cfg.getValue)
  // The direct-award row starts its scale at 0 so the EU 10 % line has a place
  // on it (every shelf is above 10 %, so a min-anchored scale pinned it to the edge).
  const min = cfg.euTick != null ? 0 : values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const med = median(values)
  const rank = rankOf(cfg.pool, category.category_id, cfg.getValue)

  if (rank === null) {
    return <GapRow label={cfg.label} note={isEs ? 's/d — muestra insuficiente' : 'n/a — sample too small'} />
  }

  const n = cfg.pool.length
  const subjectValue = cfg.getValue(category)
  const sqrt = !!cfg.sqrt
  const pos = (v: number) => scalePos(v, min, max, sqrt) * W
  // Remarkable = this shelf sits in the top or bottom five of its pool.
  const emphasis = rank <= 5 || rank > n - 5
  const rankText = isEs ? `№ ${rank} de ${n}` : `no. ${rank} of ${n}`
  const medText = `${isEs ? 'mediana' : 'median'} ${cfg.formatTick(med)}`

  const movable: { key: string; text: string; x: number }[] = []
  if (cfg.euTick != null) movable.push({ key: 'eu', text: `${isEs ? 'UE' : 'EU'} ${cfg.euTick}%`, x: pos(cfg.euTick) })
  movable.push({ key: 'median', text: medText, x: pos(med) })
  const labels = W > 0 ? placeLabels(W, [cfg.formatTick(min), cfg.formatTick(max)], movable) : []

  const flagText = `#${rank}`
  const flagW = labelW(flagText) + 2
  const dotX = pos(subjectValue)
  const flagLeft = Math.max(0, Math.min(W - flagW, dotX - flagW / 2))

  return (
    <div
      role="group"
      aria-label={`${cfg.label}: ${cfg.formatReadout(subjectValue)}, ${rankText}, ${medText}`}
      className="py-3.5 border-b border-border last:border-b-0 md:grid md:items-center"
      style={{ gridTemplateColumns: '200px 1fr', columnGap: 24, borderLeft: `2px solid ${emphasis ? accent : 'transparent'}`, paddingLeft: 10 }}
    >
      {/* label + readout: stacked at md+, one line on a phone */}
      <div className="flex items-baseline justify-between gap-3 md:block mb-2 md:mb-0">
        <div className="font-mono uppercase" style={{ fontSize: 12, lineHeight: 1.1, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
          {cfg.label}
        </div>
        <div className="flex items-baseline gap-2 md:block whitespace-nowrap">
          <div
            className="tabular-nums"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 22, lineHeight: 1, fontWeight: 600, color: emphasis ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            {cfg.formatReadout(subjectValue)}
          </div>
          <div className="font-mono tabular-nums" style={{ fontSize: 12, lineHeight: 1.1, color: 'var(--color-text-muted)' }}>
            {rankText}
          </div>
        </div>
      </div>

      {/* the track */}
      <div ref={trackRef} className="relative w-full" style={{ height: BOX_H }} aria-hidden="true">
        {W > 0 && (
          <>
            <div className="absolute left-0 right-0" style={{ top: BASE_Y, height: 1, background: 'var(--color-border)' }} />
            {values.map((v, i) => (
              <div key={i} className="absolute" style={{ left: pos(v), top: BASE_Y - TICK_H / 2, width: 1, height: TICK_H, background: 'var(--color-text-muted)', opacity: 0.35 }} />
            ))}
            {cfg.euTick != null && (
              <div className="absolute" style={{ left: pos(cfg.euTick), top: FLAG_H, width: 0, height: TRACK_H - FLAG_H, borderLeft: '1px dashed var(--color-text-muted)' }} />
            )}
            <div className="absolute" style={{ left: pos(med), top: BASE_Y - 8, width: 1, height: 16, background: 'var(--color-text-secondary)' }} />
            {/* the subject: 11px disc, background ring, accent outer ring */}
            <div
              data-subject-dot
              className="absolute rounded-full"
              style={{ left: dotX - DOT_D / 2, top: BASE_Y - DOT_D / 2, width: DOT_D, height: DOT_D, background: accent, boxShadow: `0 0 0 3px var(--color-background), 0 0 0 4px ${accent}` }}
            />
            <span
              data-rank-flag
              className="absolute font-mono tabular-nums text-center"
              style={{ left: flagLeft, top: 0, width: flagW, fontSize: LABEL_FS, lineHeight: `${FLAG_H - 2}px`, fontWeight: 700, color: 'var(--color-text-primary)' }}
            >
              {flagText}
            </span>
            {labels.map((l) => (
              <span
                key={l.key}
                data-track-label={l.key}
                className="absolute font-mono whitespace-nowrap tabular-nums"
                style={{ left: l.left, top: LABEL_Y, fontSize: LABEL_FS, lineHeight: 1, color: 'var(--color-text-muted)' }}
              >
                {l.text}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export function KardexPosicion({ category, all, accent, lang }: KardexPosicionProps) {
  const isEs = lang === 'es'

  const rows = useMemo<RowConfig[]>(() => {
    const qualified = all.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
    const hrPool = all.filter((c) => c.high_risk_pct != null)
    return [
      {
        key: 'value',
        label: isEs ? 'Valor en libros' : 'Book value',
        pool: all,
        getValue: (c) => c.total_value,
        sqrt: true,
        formatReadout: (v) => formatCompactMXN(v),
        formatTick: (v) => formatCompactMXN(v).replace(/ MXN$/, ''),
      },
      {
        key: 'risk',
        label: isEs ? 'Indicador de riesgo' : 'Risk indicator',
        pool: qualified,
        getValue: (c) => c.avg_risk,
        formatReadout: (v) => `${Math.round(v * 100)}`,
        formatTick: (v) => `${Math.round(v * 100)}`,
      },
      {
        key: 'da',
        label: isEs ? 'Adjudicación directa' : 'Direct award',
        pool: all,
        getValue: (c) => c.direct_award_pct,
        euTick: Math.round(DA_LIMIT_PCT),
        formatReadout: (v) => `${v.toFixed(0)}%`,
        formatTick: (v) => `${v.toFixed(0)}%`,
      },
      {
        key: 'sb',
        label: isEs ? 'Único postor' : 'Single bid',
        pool: all,
        getValue: (c) => c.single_bid_pct,
        formatReadout: (v) => `${v.toFixed(0)}%`,
        formatTick: (v) => `${v.toFixed(0)}%`,
      },
      {
        key: 'hr',
        label: isEs ? 'Alto riesgo' : 'High-risk',
        pool: hrPool,
        getValue: (c) => c.high_risk_pct ?? 0,
        formatReadout: (v) => `${v.toFixed(0)}%`,
        formatTick: (v) => `${v.toFixed(0)}%`,
      },
    ]
  }, [all, isEs])

  // THIS category's own high_risk_pct is null (Structure-A, pre-2010) — the
  // spec-mandated exact wording, distinct from the generic "sample too small"
  // gap other rows fall back to.
  const hrIsGap = category.high_risk_pct == null

  return (
    <div>
      {rows.map((cfg) => {
        if (cfg.key === 'hr' && hrIsGap) {
          return <GapRow key="hr" label={cfg.label} note={isEs ? 's/d — Estructura A' : 'n/a — Structure A'} />
        }
        return <Row key={cfg.key} cfg={cfg} category={category} accent={accent} isEs={isEs} />
      })}
    </div>
  )
}
