/**
 * SectorCommandPanel — the operational masthead body for the sector dossier:
 *
 *   SectorStatStrip        — the decisive numbers in one aligned readout.
 *   SectorDiagnosticGrid   — a 2×2 grid: where the risk sits (the risk-band
 *                            distribution, already in statistics — no slow
 *                            query), OECD deviation, top institutions, risk over
 *                            time.
 *   SectorInstitutionTable — the full-width institution reference
 *                            (EntityIdentityChip rows — Hard Rule #1).
 *
 * 2026-06-04 (DESIGNUS — P2 convergence): the shared masthead grammar lives in
 * components/dossier/command/primitives; this file keeps the sector computation
 * + the institution table. Sector rate fields arrive 0–100; avg_risk_score and
 * per-institution risk arrive 0–1. OECD limits via constants.
 *
 * 2026-06-08 (DESIGNUS — density squadron / PEPPY): the page read HOLLOW —
 * undersized strip numbers, short dot-strips floating in voids, airy 2×2 panels.
 * The shared StatStrip caps every value at clamp(…,24px), so a wide page leaves
 * the anchor numbers small and the 9-char "Span" range reads as a huge isolated
 * blob. Fixes — all LOCAL (primitives.tsx is shared, do NOT fork):
 *   • a denser local readout that *anchors* the high-value cells (total spend,
 *     high+crit exposure, high-risk %) at a heavier serif size and demotes the
 *     period span to a compact, non-dominant treatment;
 *   • full-width bars everywhere in the grid (risk-band + top-institutions now
 *     mirror the OecdDeviationPanel's relative-track / %-width fill idiom — the
 *     ExposureLedger VaRBar ideal), so no row floats in a fixed-pixel strip;
 *   • a tighter local panel so the 2×2 reads dense, not airy.
 * Export names + prop signatures are IDENTICAL — the page imports them unchanged.
 */
import { useMemo } from 'react'
import type { SectorStatistics, SectorTrend, RiskLevel } from '@/api/types'
import type { SpatialInstitution } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { EditorialAreaChart } from '@/components/charts/editorial'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  OECD_DIRECT_AWARD_LIMIT,
  OECD_SINGLE_BID_LIMIT,
  MODEL_HR_BASELINE,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'
import {
  clampPct,
  EmptyNote,
  OecdDeviationPanel,
  type BenchRow,
} from '@/components/dossier/command/primitives'

// ─── Local dense primitives (composed, never fork the shared file) ───────────

/** A single readout cell. `weight` 1 = anchor (larger), 0 = standard. */
interface DenseCell {
  label: string
  value: string
  sub?: string
  color?: string
  /** Anchor cells render the value heavier/larger; period/range cells stay quiet. */
  anchor?: boolean
}

/**
 * Local readout — denser + bolder than the shared StatStrip. Same grid rhythm
 * (auto-fit columns, hairline dividers, top/bottom rules) but: anchor values are
 * pushed to a heavier serif size for page-width presence, and a `quiet` value
 * (the period span) is rendered in mono at body size so a 9-char range stops
 * reading as a giant isolated number.
 */
function DenseReadout({ cells }: { cells: Array<DenseCell | null> }) {
  const shown = cells.filter(Boolean) as DenseCell[]
  return (
    <div
      className="grid border-t border-b"
      style={{ borderColor: 'var(--color-border)', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))' }}
    >
      {shown.map((c, i) => {
        const isRange = c.value.includes('–')
        return (
          <div
            key={c.label}
            className="px-3 py-3 sm:px-4 sm:py-3.5"
            style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)' }}
          >
            <div
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {c.label}
            </div>
            {isRange ? (
              // Period span — demoted: mono, body size, never an anchor blob.
              <div
                className="font-mono tabular-nums"
                style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.05, color: c.color ?? 'var(--color-text-secondary)', letterSpacing: '0.01em' }}
              >
                {c.value}
              </div>
            ) : (
              <div
                className="tabular-nums"
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: c.anchor ? 700 : 600,
                  // Anchors run bigger and scale harder with viewport width so the
                  // decisive numbers fill the page instead of sitting small.
                  fontSize: c.anchor ? 'clamp(26px, 3vw, 38px)' : 'clamp(20px, 2.1vw, 27px)',
                  lineHeight: 0.95,
                  color: c.color ?? 'var(--color-text-primary)',
                  letterSpacing: '-0.015em',
                }}
              >
                {c.value}
              </div>
            )}
            {c.sub && (
              <div
                className="font-mono tabular-nums"
                style={{ fontSize: 9, color: c.color ?? 'var(--color-text-muted)', marginTop: 4, opacity: c.color ? 0.85 : 1, whiteSpace: 'nowrap' }}
              >
                {c.sub}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * DensePanel — same inked-plate chrome as the shared Panel, tighter padding
 * (12/13 vs 14/16) + smaller label gap so the 2×2 grid reads packed, not airy.
 */
function DensePanel({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid var(--color-border)', boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)', borderRadius: 3, padding: '12px 14px 13px', background: 'transparent' }}>
      <div className="font-mono flex items-center gap-2" style={{ fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 10 }}>
        <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 999, background: accent }} />
        {label}
      </div>
      {children}
    </section>
  )
}

/**
 * FullBarRow — a label + readout over a 100%-width track (the OecdDeviationPanel
 * / VaRBar idiom). Replaces the fixed-pixel DotBar strips so every bar fills the
 * panel edge-to-edge.
 */
function FullBarRow({ label, readout, pct, color, readoutColor }: { label: string; readout: string; pct: number; color: string; readoutColor?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4, gap: 8 }}>
        <span className="font-mono" style={{ fontSize: 10.5, letterSpacing: '0.04em', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 11, fontWeight: 600, color: readoutColor ?? 'var(--color-text-primary)' }}>{readout}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'var(--color-background-elevated)', borderRadius: 2, overflow: 'hidden' }} aria-hidden="true">
        <div style={{ position: 'absolute', inset: 0, width: `max(3px, ${Math.max(0, Math.min(100, pct)).toFixed(2)}%)`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

// ─── Stat strip ──────────────────────────────────────────────────────────────

export function SectorStatStrip({
  stats,
  trends,
  lang,
}: {
  stats: SectorStatistics
  trends: SectorTrend[]
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const hr = clampPct(stats.high_risk_pct)
  const da = clampPct(stats.direct_award_pct)
  const sb = clampPct(stats.single_bid_pct)
  const avgRisk = stats.avg_risk_score != null ? Math.round(stats.avg_risk_score * 100) : null

  const years = trends.map((t) => t.year).filter((y) => Number.isFinite(y))
  const minY = years.length ? Math.min(...years) : null
  const maxY = years.length ? Math.max(...years) : null
  const span = minY != null && maxY != null ? maxY - minY + 1 : null

  const daLimit = OECD_DIRECT_AWARD_LIMIT * 100
  const sbLimit = OECD_SINGLE_BID_LIMIT * 100
  const daColor = da == null ? undefined : da > daLimit ? RISK_TEXT_COLORS.critical : da > daLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const sbColor = sb == null ? undefined : sb > sbLimit ? RISK_TEXT_COLORS.critical : sb > sbLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const hrColor = hr == null ? undefined : hr >= 20 ? RISK_TEXT_COLORS.critical : hr >= 12 ? RISK_TEXT_COLORS.high : undefined
  const riskLvl = stats.avg_risk_score != null ? getRiskLevelFromScore(stats.avg_risk_score) : 'low'
  const avgRiskColor = avgRisk == null ? undefined : riskLvl === 'critical' ? RISK_TEXT_COLORS.critical : riskLvl === 'high' ? RISK_TEXT_COLORS.high : undefined

  const totalVal = stats.total_value_mxn ?? 0
  const exposure = stats.high_critical_value_mxn
  // Anchors = the decisive numbers (total spend, high+crit exposure, high-risk %).
  const cells: Array<DenseCell | null> = [
    {
      label: isEs ? 'Gasto total' : 'Total spend',
      value: formatCompactMXN(totalVal),
      sub: !isEs ? formatCompactUSD(totalVal) : undefined,
      anchor: true,
    },
    exposure == null || exposure <= 0 ? null : {
      label: isEs ? 'Exposición a+c' : 'High+crit. exposure',
      value: formatCompactMXN(exposure),
      sub: totalVal > 0 ? `${Math.round((exposure / totalVal) * 100)}% ${isEs ? 'del gasto' : 'of spend'}` : undefined,
      color: RISK_TEXT_COLORS.high,
      anchor: true,
    },
    { label: isEs ? 'Contratos' : 'Contracts', value: formatNumber(stats.total_contracts ?? 0) },
    !stats.total_institutions ? null : { label: isEs ? 'Instituciones' : 'Institutions', value: formatNumber(stats.total_institutions) },
    !stats.total_vendors ? null : { label: isEs ? 'Proveedores' : 'Suppliers', value: formatNumber(stats.total_vendors) },
    hr == null ? null : {
      label: isEs ? 'Alto riesgo' : 'High-risk',
      value: `${Math.round(hr)}%`,
      sub: isEs ? 'de contratos' : 'of contracts',
      color: hrColor,
      anchor: true,
    },
    da == null ? null : {
      label: isEs ? 'Adj. directa' : 'Direct award',
      value: `${Math.round(da)}%`,
      sub: da > daLimit ? `${(da / daLimit).toFixed(1)}× ${isEs ? 'OCDE' : 'OECD'}` : (isEs ? `≤${daLimit}% OCDE` : `≤${daLimit}% OECD`),
      color: daColor,
    },
    sb == null || sb === 0 ? null : {
      label: isEs ? 'Único postor' : 'Single bid',
      value: `${Math.round(sb)}%`,
      sub: sb > sbLimit ? `${(sb / sbLimit).toFixed(1)}× ${isEs ? 'OCDE' : 'OECD'}` : (isEs ? `≤${sbLimit}% OCDE` : `≤${sbLimit}% OECD`),
      color: sbColor,
    },
    avgRisk == null ? null : {
      label: isEs ? 'Riesgo prom.' : 'Avg risk',
      value: `${avgRisk}`,
      sub: isEs ? 'de 100' : 'of 100',
      color: avgRiskColor,
    },
    span == null ? null : {
      label: isEs ? 'Periodo' : 'Span',
      value: `${minY}–${maxY}`,
      sub: isEs ? `${span} año${span === 1 ? '' : 's'}` : `${span} yr${span === 1 ? '' : 's'}`,
    },
  ]

  return <DenseReadout cells={cells} />
}

// Sort institutions by spend (the spatial endpoint isn't guaranteed ordered).
function bySpend(a: SpatialInstitution, b: SpatialInstitution): number {
  return (b.total_amount_mxn ?? 0) - (a.total_amount_mxn ?? 0)
}

// ─── Diagnostic grid ─────────────────────────────────────────────────────────

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']
const RISK_BAND_LABELS: Record<RiskLevel, [string, string]> = {
  critical: ['Crítico', 'Critical'], high: ['Alto', 'High'], medium: ['Medio', 'Medium'], low: ['Bajo', 'Low'],
}

export function SectorDiagnosticGrid({
  stats,
  institutions,
  trends,
  accent,
  lang,
}: {
  stats: SectorStatistics
  institutions: SpatialInstitution[]
  trends: SectorTrend[]
  accent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'

  // Risk-band distribution — already in statistics, no extra query.
  const dist: Record<RiskLevel, number> = {
    critical: stats.critical_risk_count ?? 0,
    high: stats.high_risk_count ?? 0,
    medium: stats.medium_risk_count ?? 0,
    low: stats.low_risk_count ?? 0,
  }
  const distTotal = dist.critical + dist.high + dist.medium + dist.low

  // OECD deviation
  const hr = clampPct(stats.high_risk_pct), da = clampPct(stats.direct_award_pct), sb = clampPct(stats.single_bid_pct)
  const daLim = OECD_DIRECT_AWARD_LIMIT * 100, sbLim = OECD_SINGLE_BID_LIMIT * 100, hrLim = MODEL_HR_BASELINE * 100
  const benchRows: BenchRow[] = []
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: daLim, over: da > daLim })
  if (sb != null && sb > 0) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: sbLim, over: sb > sbLim })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: hrLim, over: hr > hrLim })

  const totalSpend = stats.total_value_mxn || 0
  const topInstitutions = [...institutions].sort(bySpend).slice(0, 4)
  const maxInstSpend = topInstitutions.reduce((m, inst) => Math.max(m, inst.total_amount_mxn ?? 0), 0)

  const trend = useMemo(
    () => trends.map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? 0) as number })).filter((p) => Number.isFinite(p.avg) && p.avg > 0).sort((a, b) => a.year - b.year),
    [trends],
  )
  const peak = trend.reduce<{ year: number; avg: number } | null>((mx, p) => (!mx || p.avg > mx.avg ? p : mx), null)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* ─ Where the risk sits — full-width %-of-total bars ─ */}
      <DensePanel label={isEs ? 'Dónde está el riesgo' : 'Where the risk sits'} accent={RISK_COLORS.critical}>
        {distTotal > 0 ? (
          <div className="space-y-2.5">
            {RISK_ORDER.map((k) => {
              const n = dist[k] ?? 0
              const pct = distTotal > 0 ? (n / distTotal) * 100 : 0
              return (
                <FullBarRow
                  key={k}
                  label={isEs ? RISK_BAND_LABELS[k][0] : RISK_BAND_LABELS[k][1]}
                  readout={`${formatNumber(n)} · ${Math.round(pct)}%`}
                  pct={pct}
                  color={RISK_COLORS[k]}
                  readoutColor={k === 'low' ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[k]}
                />
              )
            })}
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose de riesgo por contrato.' : 'No per-contract risk breakdown.'} />
        )}
      </DensePanel>

      {/* ─ Deviation vs OECD (shared panel — bar already full-width) ─ */}
      <OecdDeviationPanel rows={benchRows} isEs={isEs} />

      {/* ─ Top institutions — chip + full-width share bar ─ */}
      <DensePanel label={isEs ? 'Mayores instituciones' : 'Top institutions'} accent={accent}>
        {topInstitutions.length > 0 ? (
          <div className="space-y-2.5">
            {topInstitutions.map((inst) => {
              const value = inst.total_amount_mxn ?? 0
              const share = totalSpend > 0 ? (value / totalSpend) * 100 : 0
              const barPct = maxInstSpend > 0 ? (value / maxInstSpend) * 100 : 0
              return (
                <div key={inst.institution_id}>
                  <div className="flex items-baseline justify-between" style={{ marginBottom: 4, gap: 10 }}>
                    <div className="min-w-0">
                      <EntityIdentityChip type="institution" id={inst.institution_id} name={inst.name} size="sm" fullName />
                    </div>
                    <div className="flex items-baseline gap-2 flex-shrink-0 font-mono tabular-nums" style={{ fontSize: 11 }}>
                      <span style={{ color: share >= 10 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: 600 }}>{Math.round(share)}%</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{formatCompactMXN(value)}</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', height: 5, background: 'var(--color-background-elevated)', borderRadius: 2, overflow: 'hidden' }} aria-hidden="true">
                    <div style={{ position: 'absolute', inset: 0, width: `max(3px, ${Math.max(0, Math.min(100, barPct)).toFixed(2)}%)`, background: accent, opacity: 0.85, borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por institución.' : 'No institution breakdown.'} />
        )}
      </DensePanel>

      {/* ─ Risk over time — chart spans 100% of the panel ─ */}
      <DensePanel label={isEs ? 'Riesgo en el tiempo' : 'Risk over time'} accent={RISK_COLORS.critical}>
        {trend.length > 1 ? (
          <>
            <EditorialAreaChart data={trend} xKey="year" yKey="avg" colorToken="risk-critical" yFormat="pct" yDomain={[0, 1]} height={108} />
            {peak && (
              <p className="font-mono mt-2" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                {isEs ? 'Pico' : 'Peak'} {Math.round(peak.avg * 100)}% · {peak.year} · {trend[0].year}–{trend[trend.length - 1].year}
              </p>
            )}
          </>
        ) : (
          <EmptyNote text={isEs ? 'Actividad insuficiente para una serie.' : 'Insufficient activity for a series.'} />
        )}
      </DensePanel>
    </div>
  )
}

// ─── Institution reference table (full-width; EntityIdentityChip rows) ───────

export function SectorInstitutionTable({
  institutions,
  totalSpend,
  lang,
}: {
  institutions: SpatialInstitution[]
  totalSpend: number
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const rows = [...institutions].sort(bySpend)
  if (rows.length === 0) {
    return <EmptyNote text={isEs ? 'Sin instituciones registradas.' : 'No institutions on record.'} />
  }
  const top10Share = totalSpend > 0 ? (rows.slice(0, 10).reduce((s, v) => s + (v.total_amount_mxn ?? 0), 0) / totalSpend) * 100 : 0
  const maxSpend = rows.reduce((m, v) => Math.max(m, v.total_amount_mxn ?? 0), 0)

  return (
    <div>
      <p className="font-mono mb-2.5" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {isEs
          ? `Las 10 mayores concentran el ${Math.round(top10Share)}% del gasto sectorial.`
          : `The top 10 concentrate ${Math.round(top10Share)}% of sector spend.`}
      </p>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm" aria-label={isEs ? 'Instituciones del sector' : 'Sector institutions'}>
          <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
            <tr>
              <th scope="col" className="text-left px-3 py-1.5 font-semibold" style={{ width: 28 }}>#</th>
              <th scope="col" className="text-left px-3 py-1.5 font-semibold">{isEs ? 'Institución' : 'Institution'}</th>
              <th scope="col" className="text-right px-3 py-1.5 font-semibold">{isEs ? 'Contratos' : 'Contracts'}</th>
              <th scope="col" className="text-right px-3 py-1.5 font-semibold">{isEs ? 'Monto' : 'Amount'}</th>
              <th scope="col" className="text-left px-3 py-1.5 font-semibold" style={{ width: '22%' }}>{isEs ? 'Cuota' : 'Share'}</th>
              <th scope="col" className="text-right px-3 py-1.5 font-semibold">{isEs ? 'Riesgo' : 'Risk'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inst, i) => {
              const value = inst.total_amount_mxn ?? 0
              const share = totalSpend > 0 ? (value / totalSpend) * 100 : 0
              const barPct = maxSpend > 0 ? (value / maxSpend) * 100 : 0
              const lvl = inst.risk != null && inst.risk > 0 ? getRiskLevelFromScore(inst.risk) : 'low'
              const riskPct = inst.risk != null && inst.risk > 0 ? Math.round(inst.risk * 100) : null
              const riskColor = riskPct == null ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[lvl]
              const shareColor = share >= 10 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)'
              return (
                <tr key={inst.institution_id} className="border-t border-border/30">
                  <td className="px-3 py-1.5 font-mono tabular-nums text-text-muted">{i + 1}</td>
                  <td className="px-3 py-1.5"><EntityIdentityChip type="institution" id={inst.institution_id} name={inst.name} size="sm" fullName /></td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-muted">{formatNumber(inst.total_contracts ?? 0)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCompactMXN(value)}</td>
                  {/* Share column carries a full-width track so the column fills, not floats. */}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0" style={{ height: 5, background: 'var(--color-background-elevated)', borderRadius: 2, overflow: 'hidden' }} aria-hidden="true">
                        <div style={{ position: 'absolute', inset: 0, width: `max(2px, ${Math.max(0, Math.min(100, barPct)).toFixed(2)}%)`, background: shareColor, opacity: 0.8, borderRadius: 2 }} />
                      </div>
                      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 11, color: shareColor, fontWeight: share >= 10 ? 600 : 400, minWidth: 38, textAlign: 'right' }}>{share.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: riskColor, fontWeight: 600 }}>{riskPct ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
