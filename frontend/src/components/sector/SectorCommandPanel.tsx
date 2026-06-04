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
 * 2026-06-04 (DESIGNUS — P2 convergence): the shared masthead grammar now lives
 * in components/dossier/command/primitives; this file keeps the sector
 * computation + the institution table. Sector rate fields arrive 0–100;
 * avg_risk_score and per-institution risk arrive 0–1. OECD limits via constants.
 */
import { useMemo } from 'react'
import type { SectorStatistics, SectorTrend, RiskLevel } from '@/api/types'
import type { SpatialInstitution } from '@/api/client'
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
  clampPct,
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

  const cells: Array<StatCell | null> = [
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

  return <StatStrip cells={cells} />
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

  const trend = useMemo(
    () => trends.map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? 0) as number })).filter((p) => Number.isFinite(p.avg) && p.avg > 0).sort((a, b) => a.year - b.year),
    [trends],
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ─ Where the risk sits ─ */}
      <Panel label={isEs ? 'Dónde está el riesgo' : 'Where the risk sits'} accent={RISK_COLORS.critical}>
        {distTotal > 0 ? (
          <RiskBandDistribution dist={dist} isEs={isEs} />
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose de riesgo por contrato.' : 'No per-contract risk breakdown.'} />
        )}
      </Panel>

      {/* ─ Deviation vs OECD ─ */}
      <OecdDeviationPanel rows={benchRows} isEs={isEs} />

      {/* ─ Top institutions ─ */}
      <Panel label={isEs ? 'Mayores instituciones' : 'Top institutions'} accent={accent}>
        {topInstitutions.length > 0 ? (
          <TopEntitiesList
            items={topInstitutions.map((inst) => ({
              id: inst.institution_id,
              name: inst.name,
              type: 'institution' as const,
              share: totalSpend > 0 ? ((inst.total_amount_mxn ?? 0) / totalSpend) * 100 : 0,
              value: inst.total_amount_mxn ?? 0,
            }))}
          />
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por institución.' : 'No institution breakdown.'} />
        )}
      </Panel>

      {/* ─ Risk over time ─ */}
      <RiskOverTimePanel trend={trend} isEs={isEs} />
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
