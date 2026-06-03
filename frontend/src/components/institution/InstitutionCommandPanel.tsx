/**
 * InstitutionCommandPanel — the operational masthead body for the institution
 * dossier, by analogy to VendorCommandPanel. Replaces the five full-viewport
 * narrative chapters (Subject/Timeline/Suppliers/Spending/Risk) with:
 *
 *   InstitutionStatStrip      — the decisive numbers in one aligned readout.
 *   InstitutionDiagnosticGrid — a 2×2 grid: where the risk sits (risk-level
 *                               distribution), OECD deviation, top suppliers,
 *                               risk over time.
 *   InstitutionSupplierTable  — the full-width supplier reference (replaces the
 *                               centered ChapterShell list; routes every supplier
 *                               through EntityIdentityChip — Hard Rule #1).
 *
 * Built 2026-06-03 (DESIGNUS — institution dossier operational rebuild, P0 from
 * docs/WEBSITE_STANDARDS.md). Folio register: mono labels, tabular numbers,
 * RISK_COLORS fills / RISK_TEXT_COLORS numerals, no green for low risk.
 */
import { useMemo } from 'react'
import type {
  InstitutionDetailResponse,
  InstitutionRiskProfile,
  InstitutionVendorItem,
  RiskLevel,
} from '@/api/types'
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

// vendor_stats / institution rate fields can be stored 0–1 OR 0–100; canonicalize
// to a 0–100 percentage (same defense as VendorCommandPanel.ratePct).
function ratePct(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  const frac = v > 1 ? v / 100 : v
  return Math.max(0, Math.min(100, frac * 100))
}

interface TimelinePoint {
  year: number
  avg_risk_score?: number | null
}

function hrOf(inst: InstitutionDetailResponse): number | null {
  return ratePct(inst.high_risk_pct ?? inst.high_risk_percentage)
}
function daOf(inst: InstitutionDetailResponse): number | null {
  return ratePct(inst.direct_award_pct ?? inst.direct_award_rate)
}

// ─── Stat strip ──────────────────────────────────────────────────────────────

export function InstitutionStatStrip({
  institution,
  timeline,
  lang,
}: {
  institution: InstitutionDetailResponse
  timeline: TimelinePoint[]
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const hr = hrOf(institution)
  const da = daOf(institution)
  const sb = ratePct(institution.single_bid_pct)
  const avgRisk = institution.avg_risk_score != null ? Math.round(institution.avg_risk_score * 100) : null
  const baseline = institution.risk_baseline ? Math.round(institution.risk_baseline * 100) : null
  const sectorDelta = baseline != null && avgRisk != null && baseline > 0 ? avgRisk - baseline : null

  const years = timeline.map((t) => t.year).filter((y) => Number.isFinite(y))
  const span = years.length ? Math.max(...years) - Math.min(...years) + 1 : null
  const minY = years.length ? Math.min(...years) : null
  const maxY = years.length ? Math.max(...years) : null

  const daLimit = OECD_DIRECT_AWARD_LIMIT * 100
  const sbLimit = OECD_SINGLE_BID_LIMIT * 100
  const daColor = da == null ? undefined : da > daLimit ? RISK_TEXT_COLORS.critical : da > daLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const sbColor = sb == null ? undefined : sb > sbLimit ? RISK_TEXT_COLORS.critical : sb > sbLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const hrColor = hr == null ? undefined : hr >= 25 ? RISK_TEXT_COLORS.critical : hr >= 15 ? RISK_TEXT_COLORS.high : undefined
  const riskLvl = institution.avg_risk_score != null ? getRiskLevelFromScore(institution.avg_risk_score) : 'low'
  const avgRiskColor = avgRisk == null ? undefined : riskLvl === 'critical' ? RISK_TEXT_COLORS.critical : riskLvl === 'high' ? RISK_TEXT_COLORS.high : undefined

  const cells: Array<{ label: string; value: string; sub?: string; color?: string } | null> = [
    {
      label: isEs ? 'Gasto total' : 'Total spend',
      value: formatCompactMXN(institution.total_amount_mxn ?? 0),
      sub: !isEs ? formatCompactUSD(institution.total_amount_mxn ?? 0) : undefined,
    },
    { label: isEs ? 'Contratos' : 'Contracts', value: formatNumber(institution.total_contracts ?? 0) },
    !institution.vendor_count ? null : { label: isEs ? 'Proveedores' : 'Suppliers', value: formatNumber(institution.vendor_count) },
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
    sb == null ? null : {
      label: isEs ? 'Único postor' : 'Single bid',
      value: `${Math.round(sb)}%`,
      sub: sb > sbLimit ? `${(sb / sbLimit).toFixed(1)}× ${isEs ? 'OCDE' : 'OECD'}` : (isEs ? `≤${sbLimit}% OCDE` : `≤${sbLimit}% OECD`),
      color: sbColor,
    },
    avgRisk == null ? null : {
      label: isEs ? 'Riesgo prom.' : 'Avg risk',
      value: `${avgRisk}`,
      sub: sectorDelta != null
        ? `${sectorDelta > 0 ? '+' : ''}${sectorDelta} ${isEs ? 'vs sector' : 'vs sector'}`
        : (isEs ? 'de 100' : 'of 100'),
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
      style={{
        borderColor: 'var(--color-border)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))',
      }}
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

// ─── Panel chrome (shared shape with VendorCommandPanel) ─────────────────────

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

// ─── Diagnostic grid ─────────────────────────────────────────────────────────

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']

export function InstitutionDiagnosticGrid({
  institution,
  riskProfile,
  vendors,
  timeline,
  sectorAccent,
  lang,
}: {
  institution: InstitutionDetailResponse
  riskProfile?: InstitutionRiskProfile | null
  vendors: InstitutionVendorItem[]
  timeline: TimelinePoint[]
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'

  // Risk-level distribution of contracts (where the risk sits)
  const dist = riskProfile?.contracts_by_risk_level
  const distTotal = dist ? RISK_ORDER.reduce((s, k) => s + (dist[k] ?? 0), 0) : 0
  const distMax = dist ? Math.max(1, ...RISK_ORDER.map((k) => dist[k] ?? 0)) : 1

  // Fallback for "where the risk sits" — the risk-profile GROUP BY over every
  // contract is slow on large institutions (673K rows for IMSS), so while it
  // loads (or returns empty) we show the institutional signal that's already in
  // the detail payload: average risk vs sector baseline + count of flagged
  // contracts. Real content, not an apology note.
  const avgRisk100 = institution.avg_risk_score != null ? Math.round(institution.avg_risk_score * 100) : null
  const baseline100 = institution.risk_baseline ? Math.round(institution.risk_baseline * 100) : null
  const instHrPct = ratePct(institution.high_risk_pct ?? institution.high_risk_percentage)
  const totalContracts = institution.total_contracts ?? 0
  const hrCount = institution.high_risk_contract_count
    ?? (instHrPct != null && totalContracts ? Math.round((instHrPct / 100) * totalContracts) : null)
  const avgRiskLvl = institution.avg_risk_score != null ? getRiskLevelFromScore(institution.avg_risk_score) : 'low'

  // OECD deviation
  const hr = hrOf(institution), da = daOf(institution), sb = ratePct(institution.single_bid_pct)
  const daLim = OECD_DIRECT_AWARD_LIMIT * 100, sbLim = OECD_SINGLE_BID_LIMIT * 100, hrLim = MODEL_HR_BASELINE * 100
  const benchRows: Array<{ label: string; pct: number; limit: number; over: boolean }> = []
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: daLim, over: da > daLim })
  if (sb != null) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: sbLim, over: sb > sbLim })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: hrLim, over: hr > hrLim })

  const topSuppliers = vendors.slice(0, 4)
  const totalSpend = institution.total_amount_mxn || 0

  const trend = useMemo(
    () => timeline.map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? 0) as number })).filter((p) => Number.isFinite(p.avg)).sort((a, b) => a.year - b.year),
    [timeline],
  )
  const peak = trend.reduce<{ year: number; avg: number } | null>((mx, p) => (!mx || p.avg > mx.avg ? p : mx), null)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ─ Where the risk sits — contract distribution by risk level ─ */}
      <Panel label={isEs ? 'Dónde está el riesgo' : 'Where the risk sits'} accent={RISK_COLORS.critical}>
        {dist && distTotal > 0 ? (
          <div className="space-y-2.5">
            {RISK_ORDER.map((k) => {
              const n = dist[k] ?? 0
              const pct = distTotal > 0 ? (n / distTotal) * 100 : 0
              const labels: Record<RiskLevel, [string, string]> = {
                critical: ['Crítico', 'Critical'], high: ['Alto', 'High'], medium: ['Medio', 'Medium'], low: ['Bajo', 'Low'],
              }
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
        ) : avgRisk100 != null || hrCount != null ? (
          <div className="space-y-3">
            {avgRisk100 != null && (
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
                    {isEs ? 'Riesgo promedio' : 'Avg risk'}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: RISK_TEXT_COLORS[avgRiskLvl] }}>
                    {avgRisk100}
                    {baseline100 != null && (
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / {baseline100} {isEs ? 'sector' : 'sector'}</span>
                    )}
                  </span>
                </div>
                <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, avgRisk100)}%`, background: RISK_COLORS[avgRiskLvl], borderRadius: 999 }} />
                  {baseline100 != null && (
                    <div aria-hidden="true" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, baseline100)}%`, width: 1, background: 'var(--color-text-muted)' }} />
                  )}
                </div>
              </div>
            )}
            {hrCount != null && totalContracts > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
                    {isEs ? 'Contratos de alto riesgo' : 'High-risk contracts'}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {formatNumber(hrCount)}<span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / {formatNumber(totalContracts)}</span>
                  </span>
                </div>
                <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (hrCount / totalContracts) * 100)}%`, background: RISK_COLORS.high, borderRadius: 999 }} />
                </div>
              </div>
            )}
            <p className="font-mono" style={{ fontSize: 9, letterSpacing: '0.04em', color: 'var(--color-text-muted)', opacity: 0.8 }}>
              {isEs ? 'Distribución por contrato en cálculo.' : 'Per-contract distribution computing.'}
            </p>
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

      {/* ─ Top suppliers ─ */}
      <Panel label={isEs ? 'Mayores proveedores' : 'Top suppliers'} accent={sectorAccent}>
        {topSuppliers.length > 0 ? (
          <ul className="space-y-2">
            {topSuppliers.map((v) => {
              const share = totalSpend > 0 ? ((v.total_value_mxn ?? 0) / totalSpend) * 100 : 0
              return (
                <li key={v.vendor_id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="sm" />
                  </div>
                  <div className="flex items-baseline gap-2.5 flex-shrink-0 font-mono tabular-nums" style={{ fontSize: 11 }}>
                    <span style={{ color: share >= 10 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: 600 }}>{share.toFixed(0)}%</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{formatCompactMXN(v.total_value_mxn ?? 0)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por proveedor.' : 'No supplier breakdown.'} />
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

// ─── Supplier reference table (full-width; EntityIdentityChip rows) ──────────

export function InstitutionSupplierTable({
  vendors,
  totalSpend,
  lang,
}: {
  vendors: InstitutionVendorItem[]
  totalSpend: number
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  if (vendors.length === 0) {
    return <EmptyNote text={isEs ? 'Sin proveedores registrados.' : 'No suppliers on record.'} />
  }
  const top10Share = totalSpend > 0 ? (vendors.slice(0, 10).reduce((s, v) => s + (v.total_value_mxn ?? 0), 0) / totalSpend) * 100 : 0

  return (
    <div>
      <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {isEs
          ? `Los 10 mayores concentran el ${top10Share.toFixed(0)}% del gasto institucional.`
          : `The top 10 concentrate ${top10Share.toFixed(0)}% of institutional spend.`}
      </p>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm" aria-label={isEs ? 'Proveedores de la institución' : 'Institution suppliers'}>
          <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
            <tr>
              <th scope="col" className="text-left px-3 py-2 font-semibold" style={{ width: 28 }}>#</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">{isEs ? 'Proveedor' : 'Supplier'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Contratos' : 'Contracts'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Monto' : 'Amount'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Cuota' : 'Share'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Riesgo' : 'Risk'}</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => {
              const share = totalSpend > 0 ? ((v.total_value_mxn ?? 0) / totalSpend) * 100 : 0
              const lvl = v.avg_risk_score != null ? getRiskLevelFromScore(v.avg_risk_score) : 'low'
              const riskPct = v.avg_risk_score != null ? Math.round(v.avg_risk_score * 100) : null
              const riskColor = riskPct == null ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[lvl]
              return (
                <tr key={v.vendor_id} className="border-t border-border/30">
                  <td className="px-3 py-2 font-mono tabular-nums text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2"><EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="sm" /></td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">{formatNumber(v.contract_count ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCompactMXN(v.total_value_mxn ?? 0)}</td>
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
