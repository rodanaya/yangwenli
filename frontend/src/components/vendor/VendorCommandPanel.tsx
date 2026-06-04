/**
 * VendorCommandPanel — the operational masthead body for the unified vendor
 * dossier:
 *
 *   VendorStatStrip      — the decisive numbers in one aligned readout row.
 *   VendorDiagnosticGrid — a 2×2 grid: why flagged (SHAP), benchmark deviation
 *                          (OECD), where the money goes (top clients), risk shape
 *                          over time.
 *
 * 2026-06-04 (DESIGNUS — P2 convergence): the shared masthead grammar (stat
 * strip, panel chrome, OECD bars, risk-over-time, top-entities list, rate
 * helpers) now lives in components/dossier/command/primitives; this file keeps
 * only the vendor-specific computation + the "why flagged" SHAP panel.
 */
import { useMemo } from 'react'
import type { VendorDetailResponse, VendorSHAPResponse } from '@/api/types'
import { DotBarRow } from '@/components/ui/DotBar'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  SECTOR_COLORS,
  OECD_DIRECT_AWARD_LIMIT,
  OECD_SINGLE_BID_LIMIT,
  MODEL_HR_BASELINE,
} from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'
import { parseFactorLabel } from '@/lib/risk-factors'
import {
  ratePct,
  StatStrip,
  Panel,
  EmptyNote,
  OecdDeviationPanel,
  RiskOverTimePanel,
  TopEntitiesList,
  type StatCell,
  type BenchRow,
} from '@/components/dossier/command/primitives'

interface InstitutionRow {
  institution_id: number
  institution_name: string
  total_value_mxn: number
}

interface TimelinePoint {
  year: number
  avg_risk_score?: number | null
  avg_risk?: number | null
}

// ─── Stat strip ──────────────────────────────────────────────────────────────

export function VendorStatStrip({
  vendor,
  lang,
}: {
  vendor: VendorDetailResponse
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const hr = ratePct(vendor.high_risk_pct)
  const da = ratePct(vendor.direct_award_pct)
  const sb = ratePct(vendor.single_bid_pct)
  const span =
    vendor.first_contract_year && vendor.last_contract_year
      ? vendor.last_contract_year - vendor.first_contract_year + 1
      : null

  const daLimit = OECD_DIRECT_AWARD_LIMIT * 100 // 30
  const sbLimit = OECD_SINGLE_BID_LIMIT * 100   // 10
  const daColor = da == null ? undefined : da > daLimit ? RISK_TEXT_COLORS.critical : da > daLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const sbColor = sb == null ? undefined : sb > sbLimit ? RISK_TEXT_COLORS.critical : sb > sbLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const hrColor = hr == null ? undefined : hr >= 60 ? RISK_TEXT_COLORS.critical : hr >= 30 ? RISK_TEXT_COLORS.high : undefined

  const cells: Array<StatCell | null> = [
    {
      label: isEs ? 'Valor total' : 'Total value',
      value: formatCompactMXN(vendor.total_value_mxn ?? 0),
      sub: !isEs ? formatCompactUSD(vendor.total_value_mxn ?? 0) : undefined,
    },
    {
      label: isEs ? 'Contratos' : 'Contracts',
      value: formatNumber(vendor.total_contracts ?? 0),
    },
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
    {
      label: isEs ? 'Instituciones' : 'Institutions',
      value: formatNumber(vendor.total_institutions ?? 0),
    },
    span == null ? null : {
      label: isEs ? 'Periodo' : 'Span',
      value: `${vendor.first_contract_year}–${vendor.last_contract_year}`,
      sub: isEs ? `${span} año${span === 1 ? '' : 's'}` : `${span} yr${span === 1 ? '' : 's'}`,
    },
  ]

  return <StatStrip cells={cells} />
}

// ─── Diagnostic grid ─────────────────────────────────────────────────────────

export function VendorDiagnosticGrid({
  vendor,
  shap,
  institutions,
  timeline,
  lang,
}: {
  vendor: VendorDetailResponse
  shap?: VendorSHAPResponse | null
  institutions: InstitutionRow[]
  timeline: TimelinePoint[]
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const sectorCode = vendor.primary_sector_name?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#a06820'

  const riskFactors = (shap?.top_risk_factors ?? []).slice(0, 4)
  const maxRisk = riskFactors.reduce((m, f) => Math.max(m, Math.abs(f.shap)), 0.001)

  const topInst = institutions.slice(0, 4)
  const totalValue = vendor.total_value_mxn || 0

  // OECD benchmark deltas
  const hr = ratePct(vendor.high_risk_pct)
  const da = ratePct(vendor.direct_award_pct)
  const sb = ratePct(vendor.single_bid_pct)
  const benchRows: BenchRow[] = []
  const daLim = OECD_DIRECT_AWARD_LIMIT * 100, sbLim = OECD_SINGLE_BID_LIMIT * 100, hrLim = MODEL_HR_BASELINE * 100
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: daLim, over: da > daLim })
  if (sb != null) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: sbLim, over: sb > sbLim })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: hrLim, over: hr > hrLim })

  const trend = useMemo(
    () =>
      timeline
        .map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? p.avg_risk ?? 0) as number }))
        .filter((p) => Number.isFinite(p.avg))
        .sort((a, b) => a.year - b.year),
    [timeline],
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ─ Why flagged — top SHAP risk drivers (vendor-specific) ─ */}
      <Panel label={isEs ? 'Por qué está marcado' : 'Why flagged'} accent={RISK_COLORS.critical}>
        {riskFactors.length > 0 ? (
          <div className="space-y-2.5">
            {riskFactors.map((f) => (
              <DotBarRow
                key={f.factor}
                label={(isEs ? f.label_es : parseFactorLabel(f.factor).label) || f.factor}
                readout={`+${f.shap.toFixed(2)}`}
                value={Math.abs(f.shap)}
                max={maxRisk}
                color="var(--color-risk-critical)"
              />
            ))}
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin factores de riesgo dominantes.' : 'No dominant risk drivers.'} />
        )}
      </Panel>

      {/* ─ Benchmark deviation vs OECD ─ */}
      <OecdDeviationPanel rows={benchRows} isEs={isEs} />

      {/* ─ Where the money goes — top clients ─ */}
      <Panel label={isEs ? 'A dónde va el dinero' : 'Where the money goes'} accent={sectorAccent}>
        {topInst.length > 0 ? (
          <TopEntitiesList
            items={topInst.map((inst) => ({
              id: inst.institution_id,
              name: inst.institution_name,
              type: 'institution' as const,
              share: totalValue > 0 ? (inst.total_value_mxn / totalValue) * 100 : 0,
              value: inst.total_value_mxn,
            }))}
            shareThreshold={40}
          />
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por institución.' : 'No institutional breakdown.'} />
        )}
      </Panel>

      {/* ─ Risk shape over time ─ */}
      <RiskOverTimePanel trend={trend} isEs={isEs} />
    </div>
  )
}
