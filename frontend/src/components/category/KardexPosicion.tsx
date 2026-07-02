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
import { useMemo } from 'react'
import { OECD_DIRECT_AWARD_LIMIT } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import type { CategorySummaryItem } from '@/components/categories/types'
import { CONTRACT_FLOOR } from '@/components/categories/types'

export interface KardexPosicionProps {
  category: CategorySummaryItem
  all: CategorySummaryItem[]
  accent: string
  lang: 'en' | 'es'
}

const DA_LIMIT_PCT = OECD_DIRECT_AWARD_LIMIT * 100
const TRACK_H = 22
const DOT_R = 3.5

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
  oecdTick?: number
  formatReadout: (v: number) => string
}

function GapRow({ label, note }: { label: string; note: string }) {
  return (
    <div className="py-2.5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between">
        <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
          {note}
        </span>
      </div>
    </div>
  )
}

function Row({ cfg, category, accent, isEs }: { cfg: RowConfig; category: CategorySummaryItem; accent: string; isEs: boolean }) {
  const values = cfg.pool.map(cfg.getValue)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const med = median(values)
  const rank = rankOf(cfg.pool, category.category_id, cfg.getValue)

  if (rank === null) {
    return <GapRow label={cfg.label} note={isEs ? 's/d — muestra insuficiente' : 'n/a — sample too small'} />
  }

  const subjectValue = cfg.getValue(category)
  const sqrt = !!cfg.sqrt
  const subjectPos = scalePos(subjectValue, min, max, sqrt) * 100
  const medPos = scalePos(med, min, max, sqrt) * 100
  const top5 = rank <= 5

  return (
    <div className="py-2.5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between mb-1.5 gap-3">
        <span className="font-mono uppercase flex-shrink-0" style={{ fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
          {cfg.label}
        </span>
        <span
          className="font-mono tabular-nums whitespace-nowrap"
          style={{ fontSize: 10.5, color: top5 ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontWeight: top5 ? 700 : 500 }}
        >
          {cfg.formatReadout(subjectValue)} · {isEs ? `№ ${rank} de ${cfg.pool.length}` : `no. ${rank} of ${cfg.pool.length}`}
        </span>
      </div>
      <div className="relative w-full" style={{ height: TRACK_H }}>
        {/* baseline */}
        <div className="absolute left-0 right-0" style={{ top: TRACK_H / 2, height: 1, background: 'var(--color-border)' }} aria-hidden="true" />
        {/* peer ticks */}
        {values.map((v, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${scalePos(v, min, max, sqrt) * 100}%`, top: TRACK_H / 2 - 4, width: 1, height: 8, background: 'var(--color-text-muted)', opacity: 0.25 }}
            aria-hidden="true"
          />
        ))}
        {/* OECD reference tick (direct-award row only) */}
        {cfg.oecdTick != null && (
          <div
            className="absolute"
            style={{ left: `${scalePos(cfg.oecdTick, min, max, sqrt) * 100}%`, top: 1, width: 1, height: TRACK_H - 2, borderLeft: '1px dashed var(--color-text-muted)', opacity: 0.6 }}
            aria-hidden="true"
          />
        )}
        {/* median rule + label */}
        <div className="absolute" style={{ left: `${medPos}%`, top: 2, width: 1, height: TRACK_H - 4, background: 'var(--color-text-secondary)' }} aria-hidden="true" />
        <span
          className="absolute font-mono whitespace-nowrap"
          style={{ left: `calc(${medPos}% + 3px)`, top: -2, fontSize: 8, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}
        >
          {isEs ? 'mediana' : 'median'}
        </span>
        {/* the subject */}
        <div
          className="absolute rounded-full"
          style={{ left: `calc(${subjectPos}% - ${DOT_R}px)`, top: TRACK_H / 2 - DOT_R, width: DOT_R * 2, height: DOT_R * 2, background: accent }}
          role="img"
          aria-label={`${cfg.label}: ${cfg.formatReadout(subjectValue)}`}
        />
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
      },
      {
        key: 'risk',
        label: isEs ? 'Indicador de riesgo' : 'Risk indicator',
        pool: qualified,
        getValue: (c) => c.avg_risk,
        formatReadout: (v) => v.toFixed(2),
      },
      {
        key: 'da',
        label: isEs ? 'Adjudicación directa' : 'Direct award',
        pool: all,
        getValue: (c) => c.direct_award_pct,
        oecdTick: DA_LIMIT_PCT,
        formatReadout: (v) => `${v.toFixed(0)}%`,
      },
      {
        key: 'sb',
        label: isEs ? 'Único postor' : 'Single bid',
        pool: all,
        getValue: (c) => c.single_bid_pct,
        formatReadout: (v) => `${v.toFixed(0)}%`,
      },
      {
        key: 'hr',
        label: isEs ? 'Alto riesgo' : 'High-risk',
        pool: hrPool,
        getValue: (c) => c.high_risk_pct ?? 0,
        formatReadout: (v) => `${v.toFixed(0)}%`,
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
