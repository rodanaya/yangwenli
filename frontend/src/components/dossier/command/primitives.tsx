/**
 * dossier/command/primitives — the shared "command panel" grammar for the four
 * operational dossiers (vendor / institution / category / sector). Each dossier
 * computes its own entity-specific numbers, then renders them through these
 * identical primitives, so the masthead reads the same everywhere and there's
 * one place to change the look.
 *
 * Extracted 2026-06-04 (DESIGNUS — P2 convergence) from the four ~70%-identical
 * *CommandPanel.tsx files. Behaviour-preserving: the markup here is the exact
 * markup those panels carried. Folio register — mono labels (IBM Plex), tabular
 * numbers, RISK_COLORS fills / RISK_TEXT_COLORS numerals, transparent plates,
 * no green for low risk (Bible §3.10).
 *
 * The full-width reference tables stay per-dossier — their columns genuinely
 * differ (supplier vs vendor vs institution) — only the masthead converges here.
 */
import type { RiskLevel } from '@/api/types'
import { DotBarRow } from '@/components/ui/DotBar'
import { EditorialAreaChart } from '@/components/charts/editorial'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { RISK_COLORS, RISK_TEXT_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

// ─── Rate helpers ─────────────────────────────────────────────────────────────

/**
 * Canonicalize a rate to a 0–100 percentage, defending against the corrupted
 * vendor_stats / institution rows that store some values as a 0–1 fraction and
 * some as a 0–100 percentage. (See VendorEvidenceTab.normalizeRate / MEMORY.md.)
 * Use for vendor + institution rates.
 */
export function ratePct(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  const frac = v > 1 ? v / 100 : v
  return Math.max(0, Math.min(100, frac * 100))
}

/**
 * Clamp a rate already on the 0–100 scale (category + sector aggregates are
 * reliably percentages — clamp, never divide).
 */
export function clampPct(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  return Math.max(0, Math.min(100, v))
}

// ─── Stat strip ──────────────────────────────────────────────────────────────

export interface StatCell {
  label: string
  value: string
  sub?: string
  color?: string
}

/**
 * The decisive numbers in one aligned readout. `cells` may contain nulls (an
 * absent metric) — they're filtered out. auto-fit wraps on narrow viewports
 * instead of clipping labels; ~116px min keeps each mono label on one line.
 */
export function StatStrip({ cells }: { cells: Array<StatCell | null> }) {
  const shown = cells.filter(Boolean) as StatCell[]
  return (
    <div
      className="grid border-t border-b"
      style={{ borderColor: 'var(--color-border)', gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))' }}
    >
      {shown.map((c, i) => (
        <div key={c.label} className="px-3 py-3 sm:px-4 sm:py-4" style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {c.label}
          </div>
          <div
            className="tabular-nums"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: 'clamp(18px, 2vw, 24px)', lineHeight: 1, color: c.color ?? 'var(--color-text-primary)', letterSpacing: '-0.01em' }}
          >
            {c.value}
          </div>
          {c.sub && (
            <div className="font-mono tabular-nums" style={{ fontSize: 9, color: c.color ?? 'var(--color-text-muted)', marginTop: 4, opacity: c.color ? 0.85 : 1, whiteSpace: 'nowrap' }}>
              {c.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Panel chrome ─────────────────────────────────────────────────────────────

/**
 * A diagnostic plate: 1px border + faint ochre inset (reads as an inked plate on
 * the warm page, not a white SaaS card — standards A8), a mono label with an
 * accent dot. `background: transparent` is intentional.
 */
export function Panel({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid var(--color-border)', boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)', borderRadius: 3, padding: '14px 16px 16px', background: 'transparent' }}>
      <div className="font-mono flex items-center gap-2" style={{ fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 12 }}>
        <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 999, background: accent }} />
        {label}
      </div>
      {children}
    </section>
  )
}

export function EmptyNote({ text }: { text: string }) {
  return <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--color-text-muted)' }}>{text}</p>
}

// ─── OECD deviation panel ─────────────────────────────────────────────────────

export interface BenchRow {
  label: string
  pct: number
  limit: number
  over: boolean
}

/**
 * "Deviation · OECD" — bullet bars of actual-vs-limit with a reference tick.
 * Over-limit values colour the numeral + fill RISK_TEXT_COLORS.critical.
 */
export function OecdDeviationPanel({ rows, isEs }: { rows: BenchRow[]; isEs: boolean }) {
  return (
    <Panel label={isEs ? 'Desviación · OCDE' : 'Deviation · OECD'} accent={RISK_COLORS.high}>
      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((r) => {
            const color = r.over ? RISK_TEXT_COLORS.critical : 'var(--color-text-muted)'
            return (
              <div key={r.label}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>{r.label}</span>
                  <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color }}>
                    {Math.round(r.pct)}%<span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / {r.limit}%</span>
                  </span>
                </div>
                <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, r.pct)}%`, background: color, borderRadius: 999 }} />
                  <div aria-hidden="true" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, r.limit)}%`, width: 1, background: 'var(--color-text-muted)' }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyNote text={isEs ? 'Sin métricas de procedimiento.' : 'No procedure metrics.'} />
      )}
    </Panel>
  )
}

// ─── Risk over time ───────────────────────────────────────────────────────────

export interface TrendPoint {
  year: number
  avg: number
}

/**
 * "Risk over time" — the avg-risk series as an editorial area chart + a peak
 * caption. `trend` must already be filtered to finite avg and sorted by year.
 */
export function RiskOverTimePanel({ trend, isEs }: { trend: TrendPoint[]; isEs: boolean }) {
  const peak = trend.reduce<TrendPoint | null>((mx, p) => (!mx || p.avg > mx.avg ? p : mx), null)
  return (
    <Panel label={isEs ? 'Riesgo en el tiempo' : 'Risk over time'} accent={RISK_COLORS.critical}>
      {trend.length > 1 ? (
        <>
          <EditorialAreaChart data={trend} xKey="year" yKey="avg" colorToken="risk-critical" yFormat="pct" yDomain={[0, 1]} height={96} />
          {peak && (
            <p className="font-mono mt-2" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              {isEs ? 'Pico' : 'Peak'} {Math.round(peak.avg * 100)}% · {peak.year} · {trend[0].year}–{trend[trend.length - 1].year}
            </p>
          )}
        </>
      ) : (
        <EmptyNote text={isEs ? 'Actividad insuficiente para una serie.' : 'Insufficient activity for a series.'} />
      )}
    </Panel>
  )
}

// ─── Risk-band distribution (institution + sector "where the risk sits") ─────

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']
const RISK_LABELS: Record<RiskLevel, [string, string]> = {
  critical: ['Crítico', 'Critical'], high: ['Alto', 'High'], medium: ['Medio', 'Medium'], low: ['Bajo', 'Low'],
}

/**
 * Contract counts across the four risk bands as colour-keyed dot rows. Low uses
 * RISK_COLORS.low (zinc), never green. Returns null content when the distribution
 * is empty (the caller decides the empty/fallback copy).
 */
export function RiskBandDistribution({ dist, isEs }: { dist: Record<RiskLevel, number>; isEs: boolean }) {
  const total = RISK_ORDER.reduce((s, k) => s + (dist[k] ?? 0), 0)
  const max = Math.max(1, ...RISK_ORDER.map((k) => dist[k] ?? 0))
  return (
    <div className="space-y-2.5">
      {RISK_ORDER.map((k) => {
        const n = dist[k] ?? 0
        const pct = total > 0 ? (n / total) * 100 : 0
        return (
          <DotBarRow
            key={k}
            label={isEs ? RISK_LABELS[k][0] : RISK_LABELS[k][1]}
            readout={`${formatNumber(n)} · ${Math.round(pct)}%`}
            value={n}
            max={max}
            color={RISK_COLORS[k]}
          />
        )
      })}
    </div>
  )
}

// ─── Top entities list (top clients / suppliers / vendors / institutions) ────

export interface TopEntityItem {
  id: number
  name: string
  type: 'vendor' | 'institution'
  share: number // 0–100
  value: number // MXN
}

/**
 * A ranked list of the top entities by spend — EntityIdentityChip (Hard Rule #1)
 * + share% + compact value. `shareThreshold` is the share at/above which the
 * percentage colours RISK_TEXT_COLORS.high (default 10; vendor "where the money
 * goes" uses 40 because a single dominant client is the signal there).
 */
export function TopEntitiesList({ items, shareThreshold = 10 }: { items: TopEntityItem[]; shareThreshold?: number }) {
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={`${it.type}-${it.id}`} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <EntityIdentityChip type={it.type} id={it.id} name={it.name} size="sm" />
          </div>
          <div className="flex items-baseline gap-2.5 flex-shrink-0 font-mono tabular-nums" style={{ fontSize: 11 }}>
            <span style={{ color: it.share >= shareThreshold ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: 600 }}>{Math.round(it.share)}%</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{formatCompactMXN(it.value)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
