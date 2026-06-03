/**
 * SectorCommandPanel — the operational masthead body for the sector dossier,
 * by analogy to Institution/Category/Vendor command panels. Replaces the four
 * full-viewport narrative chapters (Subject / Timeline / Institutions / Risk)
 * with:
 *
 *   SectorStatStrip        — the decisive numbers in one aligned readout.
 *   SectorDiagnosticGrid   — a 2×2 grid: where the risk sits (the sector's
 *                            risk-band distribution, already in statistics —
 *                            no slow query), OECD deviation, top institutions,
 *                            risk over time.
 *   SectorInstitutionTable — the full-width institution reference (replaces the
 *                            centered ChapterShell list; routes every
 *                            institution through EntityIdentityChip, Hard
 *                            Rule #1).
 *
 * Built 2026-06-03 (DESIGNUS — sector dossier operational rebuild, P0
 * propagation from docs/WEBSITE_STANDARDS.md). Sector rate fields
 * (high_risk_pct / direct_award_pct / single_bid_pct) arrive 0–100;
 * avg_risk_score and per-institution risk arrive 0–1. OECD limits via
 * constants; RISK_TEXT_COLORS numerals; no green for low risk.
 */
import { useMemo } from 'react'
import type { SectorStatistics, SectorTrend, RiskLevel } from '@/api/types'
import type { SpatialInstitution } from '@/api/client'
import { DotBarRow } from '@/components/ui/DotBar'
import { EditorialAreaChart } from '@/components/charts/editorial'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  OECD_DIRECT_AWARD_LIMIT,
  OECD_SINGLE_BID_LIMIT,
  MODEL_HR_BASELINE,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'

// Sector rate fields are 0–100 already — clamp, never divide.
function clampPct(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  return Math.max(0, Math.min(100, v))
}

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']

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

  const cells: Array<{ label: string; value: string; sub?: string; color?: string } | null> = [
    {
      label: isEs ? 'Gasto total' : 'Total spend',
      value: formatCompactMXN(stats.total_value_mxn ?? 0),
      sub: !isEs ? formatCompactUSD(stats.total_value_mxn ?? 0) : undefined,
    },
    { label: isEs ? 'Contratos' : 'Contracts', value: formatNumber(stats.total_contracts ?? 0) },
    !stats.total_institutions ? null : { label: isEs ? 'Instituciones' : 'Institutions', value: formatNumber(stats.total_institutions) },
    !stats.total_vendors ? null : { label: isEs ? 'Proveedores' : 'Suppliers', value: formatNumber(stats.total_vendors) },
    hr == null ? null : {
      label: isEs ? 'Alto riesgo' : 'High-risk',
      value: `${Math.round(hr)}%`,
      sub: isEs ? 'de contratos' : 'of contracts',
      color: hrColor,
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
  const shown = cells.filter(Boolean) as Array<{ label: string; value: string; sub?: string; color?: string }>

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

// ─── Panel chrome (shared shape with the other command panels) ───────────────

function Panel({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
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

function EmptyNote({ text }: { text: string }) {
  return <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--color-text-muted)' }}>{text}</p>
}

// Sort institutions by spend (the spatial endpoint isn't guaranteed ordered).
function bySpend(a: SpatialInstitution, b: SpatialInstitution): number {
  return (b.total_amount_mxn ?? 0) - (a.total_amount_mxn ?? 0)
}

// ─── Diagnostic grid ─────────────────────────────────────────────────────────

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
  const distTotal = RISK_ORDER.reduce((s, k) => s + dist[k], 0)
  const distMax = Math.max(1, ...RISK_ORDER.map((k) => dist[k]))

  // OECD deviation
  const hr = clampPct(stats.high_risk_pct), da = clampPct(stats.direct_award_pct), sb = clampPct(stats.single_bid_pct)
  const daLim = OECD_DIRECT_AWARD_LIMIT * 100, sbLim = OECD_SINGLE_BID_LIMIT * 100, hrLim = MODEL_HR_BASELINE * 100
  const benchRows: Array<{ label: string; pct: number; limit: number; over: boolean }> = []
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: daLim, over: da > daLim })
  if (sb != null && sb > 0) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: sbLim, over: sb > sbLim })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: hrLim, over: hr > hrLim })

  const totalSpend = stats.total_value_mxn || 0
  const topInstitutions = [...institutions].sort(bySpend).slice(0, 4)

  const trend = useMemo(
    () => trends.map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? 0) as number })).filter((p) => Number.isFinite(p.avg) && p.avg > 0).sort((a, b) => a.year - b.year),
    [trends],
  )
  const peak = trend.reduce<{ year: number; avg: number } | null>((mx, p) => (!mx || p.avg > mx.avg ? p : mx), null)

  const labels: Record<RiskLevel, [string, string]> = {
    critical: ['Crítico', 'Critical'], high: ['Alto', 'High'], medium: ['Medio', 'Medium'], low: ['Bajo', 'Low'],
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ─ Where the risk sits ─ */}
      <Panel label={isEs ? 'Dónde está el riesgo' : 'Where the risk sits'} accent={RISK_COLORS.critical}>
        {distTotal > 0 ? (
          <div className="space-y-2.5">
            {RISK_ORDER.map((k) => {
              const n = dist[k]
              const pct = distTotal > 0 ? (n / distTotal) * 100 : 0
              return (
                <DotBarRow
                  key={k}
                  label={isEs ? labels[k][0] : labels[k][1]}
                  readout={`${formatNumber(n)} · ${Math.round(pct)}%`}
                  value={n}
                  max={distMax}
                  color={RISK_COLORS[k]}
                />
              )
            })}
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose de riesgo por contrato.' : 'No per-contract risk breakdown.'} />
        )}
      </Panel>

      {/* ─ Deviation vs OECD ─ */}
      <Panel label={isEs ? 'Desviación · OCDE' : 'Deviation · OECD'} accent={RISK_COLORS.high}>
        {benchRows.length > 0 ? (
          <div className="space-y-3">
            {benchRows.map((r) => {
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

      {/* ─ Top institutions ─ */}
      <Panel label={isEs ? 'Mayores instituciones' : 'Top institutions'} accent={accent}>
        {topInstitutions.length > 0 ? (
          <ul className="space-y-2">
            {topInstitutions.map((inst) => {
              const share = totalSpend > 0 ? ((inst.total_amount_mxn ?? 0) / totalSpend) * 100 : 0
              return (
                <li key={inst.institution_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <EntityIdentityChip type="institution" id={inst.institution_id} name={inst.name} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-2.5 flex-shrink-0 font-mono tabular-nums" style={{ fontSize: 11 }}>
                    <span style={{ color: share >= 10 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: 600 }}>{share.toFixed(0)}%</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{formatCompactMXN(inst.total_amount_mxn ?? 0)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por institución.' : 'No institution breakdown.'} />
        )}
      </Panel>

      {/* ─ Risk over time ─ */}
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

  return (
    <div>
      <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {isEs
          ? `Las 10 mayores concentran el ${Math.round(top10Share)}% del gasto sectorial.`
          : `The top 10 concentrate ${Math.round(top10Share)}% of sector spend.`}
      </p>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm" aria-label={isEs ? 'Instituciones del sector' : 'Sector institutions'}>
          <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
            <tr>
              <th scope="col" className="text-left px-3 py-2 font-semibold" style={{ width: 28 }}>#</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">{isEs ? 'Institución' : 'Institution'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Contratos' : 'Contracts'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Monto' : 'Amount'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Cuota' : 'Share'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Riesgo' : 'Risk'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inst, i) => {
              const share = totalSpend > 0 ? ((inst.total_amount_mxn ?? 0) / totalSpend) * 100 : 0
              const lvl = inst.risk != null && inst.risk > 0 ? getRiskLevelFromScore(inst.risk) : 'low'
              const riskPct = inst.risk != null && inst.risk > 0 ? Math.round(inst.risk * 100) : null
              const riskColor = riskPct == null ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[lvl]
              return (
                <tr key={inst.institution_id} className="border-t border-border/30">
                  <td className="px-3 py-2 font-mono tabular-nums text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2"><EntityIdentityChip type="institution" id={inst.institution_id} name={inst.name} size="sm" /></td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">{formatNumber(inst.total_contracts ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCompactMXN(inst.total_amount_mxn ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: share >= 10 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: share >= 10 ? 600 : 400 }}>{share.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: riskColor, fontWeight: 600 }}>{riskPct ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
