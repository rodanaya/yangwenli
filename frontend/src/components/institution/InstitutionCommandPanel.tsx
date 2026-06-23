/**
 * InstitutionCommandPanel — the operational masthead body for the institution
 * dossier:
 *
 *   InstitutionStatStrip      — the decisive numbers in one aligned readout.
 *   InstitutionDiagnosticGrid — a 2×2 grid: where the risk sits (risk-band
 *                               distribution, with an avg-vs-baseline fallback
 *                               while the slow per-contract GROUP BY loads),
 *                               OECD deviation, top suppliers, risk over time.
 *   InstitutionSupplierTable  — the full-width supplier reference
 *                               (EntityIdentityChip rows — Hard Rule #1).
 *
 * 2026-06-04 (DESIGNUS — P2 convergence): the shared masthead grammar now lives
 * in components/dossier/command/primitives; this file keeps the institution
 * computation, the where-the-risk-sits fallback, and the supplier table.
 */
import { useMemo } from 'react'
import type {
  InstitutionDetailResponse,
  InstitutionRiskProfile,
  InstitutionVendorItem,
} from '@/api/types'
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
import {
  ratePct,
  StatStrip,
  Panel,
  EmptyNote,
  OecdDeviationPanel,
  RiskOverTimePanel,
  RiskBandDistribution,
  TopEntitiesList,
  type StatCell,
  type BenchRow,
} from '@/components/dossier/command/primitives'

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

  const cells: Array<StatCell | null> = [
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

  return <StatStrip cells={cells} />
}

// ─── Diagnostic grid ─────────────────────────────────────────────────────────

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

  // Risk-band distribution of contracts (where the risk sits)
  const dist = riskProfile?.contracts_by_risk_level
  const distTotal = dist ? (dist.critical ?? 0) + (dist.high ?? 0) + (dist.medium ?? 0) + (dist.low ?? 0) : 0

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
  const benchRows: BenchRow[] = []
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: daLim, over: da > daLim })
  if (sb != null) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: sbLim, over: sb > sbLim })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: hrLim, over: hr > hrLim })

  const topSuppliers = vendors.slice(0, 4)
  const totalSpend = institution.total_amount_mxn || 0

  const trend = useMemo(
    () => timeline.map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? 0) as number })).filter((p) => Number.isFinite(p.avg)).sort((a, b) => a.year - b.year),
    [timeline],
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ─ Where the risk sits — contract distribution by risk band ─ */}
      <Panel label={isEs ? 'Dónde está el riesgo' : 'Where the risk sits'} accent={RISK_COLORS.critical}>
        {dist && distTotal > 0 ? (
          <RiskBandDistribution dist={dist} isEs={isEs} />
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
      <OecdDeviationPanel rows={benchRows} isEs={isEs} />

      {/* ─ Top suppliers ─ */}
      <Panel label={isEs ? 'Mayores proveedores' : 'Top suppliers'} accent={sectorAccent}>
        {topSuppliers.length > 0 ? (
          <TopEntitiesList
            items={topSuppliers.map((v) => ({
              id: v.vendor_id,
              name: v.vendor_name,
              type: 'vendor' as const,
              share: totalSpend > 0 ? ((v.total_value_mxn ?? 0) / totalSpend) * 100 : 0,
              value: v.total_value_mxn ?? 0,
            }))}
          />
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por proveedor.' : 'No supplier breakdown.'} />
        )}
      </Panel>

      {/* ─ Risk over time ─ */}
      <RiskOverTimePanel trend={trend} isEs={isEs} />
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
      <div className="border border-border rounded-sm overflow-x-auto">
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
