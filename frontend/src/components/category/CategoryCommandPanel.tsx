/**
 * CategoryCommandPanel — the operational masthead body for the category dossier:
 *
 *   CategoryStatStrip      — the decisive numbers in one aligned readout.
 *   CategoryDiagnosticGrid — a 2×2 grid: market concentration (the category's
 *                            distinctive signal — HHI + top-3 capture), OECD
 *                            deviation, top vendors, risk over time.
 *   CategoryVendorTable    — the full-width vendor reference (EntityIdentityChip
 *                            rows — Hard Rule #1).
 *
 * 2026-06-04 (DESIGNUS — P2 convergence): the shared masthead grammar now lives
 * in components/dossier/command/primitives; this file keeps the category
 * computation, the market-concentration panel, and the vendor table. Category
 * rate fields arrive 0–100; avg_risk arrives 0–1. OECD limits via constants.
 */
import { useMemo } from 'react'
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
  TopEntitiesList,
  type StatCell,
  type BenchRow,
} from '@/components/dossier/command/primitives'

// ─── Shared shapes ───────────────────────────────────────────────────────────

export interface CategoryLike {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number | null
  sector_code: string | null
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct?: number
  single_bid_pct?: number
  high_risk_pct?: number
  vendor_count?: number
  institution_count?: number
}

export interface CategoryTopVendor {
  vendor_id: number
  vendor_name: string
  contract_count: number
  vendor_value: number
  market_share_pct: number
  avg_risk: number
}

export interface CategoryConcentration {
  hhi: number
  concentration_label: 'highly_concentrated' | 'moderately_concentrated' | 'competitive'
  top3_share_pct: number
}

interface TrendPoint {
  year: number
  avg_risk?: number | null
}

function concentrationLabel(label: CategoryConcentration['concentration_label'], isEs: boolean): string {
  if (label === 'highly_concentrated') return isEs ? 'altamente concentrado' : 'highly concentrated'
  if (label === 'moderately_concentrated') return isEs ? 'moderadamente concentrado' : 'moderately concentrated'
  return isEs ? 'competitivo' : 'competitive'
}

// ─── Stat strip ──────────────────────────────────────────────────────────────

export function CategoryStatStrip({
  category,
  trends,
  lang,
}: {
  category: CategoryLike
  trends: TrendPoint[]
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const hr = clampPct(category.high_risk_pct)
  const da = clampPct(category.direct_award_pct)
  const sb = clampPct(category.single_bid_pct)
  const avgRisk = category.avg_risk != null ? Math.round(category.avg_risk * 100) : null

  const years = trends.map((t) => t.year).filter((y) => Number.isFinite(y))
  const minY = years.length ? Math.min(...years) : null
  const maxY = years.length ? Math.max(...years) : null
  const span = minY != null && maxY != null ? maxY - minY + 1 : null

  const daLimit = OECD_DIRECT_AWARD_LIMIT * 100
  const sbLimit = OECD_SINGLE_BID_LIMIT * 100
  const daColor = da == null ? undefined : da > daLimit ? RISK_TEXT_COLORS.critical : da > daLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const sbColor = sb == null ? undefined : sb > sbLimit ? RISK_TEXT_COLORS.critical : sb > sbLimit / 2 ? RISK_TEXT_COLORS.high : undefined
  const hrColor = hr == null ? undefined : hr >= 25 ? RISK_TEXT_COLORS.critical : hr >= 15 ? RISK_TEXT_COLORS.high : undefined
  const riskLvl = category.avg_risk != null ? getRiskLevelFromScore(category.avg_risk) : 'low'
  const avgRiskColor = avgRisk == null ? undefined : riskLvl === 'critical' ? RISK_TEXT_COLORS.critical : riskLvl === 'high' ? RISK_TEXT_COLORS.high : undefined

  const cells: Array<StatCell | null> = [
    {
      label: isEs ? 'Gasto total' : 'Total spend',
      value: formatCompactMXN(category.total_value ?? 0),
      sub: !isEs ? formatCompactUSD(category.total_value ?? 0) : undefined,
    },
    { label: isEs ? 'Contratos' : 'Contracts', value: formatNumber(category.total_contracts ?? 0) },
    !category.vendor_count ? null : { label: isEs ? 'Proveedores' : 'Vendors', value: formatNumber(category.vendor_count) },
    !category.institution_count ? null : { label: isEs ? 'Instituciones' : 'Institutions', value: formatNumber(category.institution_count) },
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

// ─── Diagnostic grid ─────────────────────────────────────────────────────────

export function CategoryDiagnosticGrid({
  category,
  concentration,
  vendors,
  trends,
  accent,
  lang,
}: {
  category: CategoryLike
  concentration: CategoryConcentration | null
  vendors: CategoryTopVendor[]
  trends: TrendPoint[]
  accent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'

  // Market concentration — the category's distinctive signal. The fast endpoint
  // returns HHI normalized to 0–1 (Σ share²); convert to the conventional 0–10000
  // points scale so the DOJ/FTC bands (1500 / 2500) read correctly.
  const hhiRaw = concentration?.hhi ?? 0
  const hhi = hhiRaw <= 1 ? Math.round(hhiRaw * 10000) : Math.round(hhiRaw)
  const top3 = concentration?.top3_share_pct ?? 0
  // HHI bands (US DOJ/FTC): <1500 competitive · 1500–2500 moderate · >2500 high.
  const hhiScaleMax = Math.max(2500, hhi)
  const hhiColor = hhi >= 2500 ? RISK_COLORS.critical : hhi >= 1500 ? RISK_COLORS.high : RISK_COLORS.medium

  // OECD deviation
  const da = clampPct(category.direct_award_pct), sb = clampPct(category.single_bid_pct), hr = clampPct(category.high_risk_pct)
  const daLim = OECD_DIRECT_AWARD_LIMIT * 100, sbLim = OECD_SINGLE_BID_LIMIT * 100, hrLim = MODEL_HR_BASELINE * 100
  const benchRows: BenchRow[] = []
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: daLim, over: da > daLim })
  if (sb != null && sb > 0) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: sbLim, over: sb > sbLim })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: hrLim, over: hr > hrLim })

  const topVendors = vendors.slice(0, 4)

  const trend = useMemo(
    () => trends.map((p) => ({ year: p.year, avg: (p.avg_risk ?? 0) as number })).filter((p) => Number.isFinite(p.avg) && p.avg > 0).sort((a, b) => a.year - b.year),
    [trends],
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ─ Market concentration (category-specific) ─ */}
      <Panel label={isEs ? 'Concentración del mercado' : 'Market concentration'} accent={accent}>
        {concentration && (hhi > 0 || top3 > 0) ? (
          <div className="space-y-3">
            {hhi > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>HHI</span>
                <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: hhiColor }}>
                  {formatNumber(hhi)}
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> · {concentrationLabel(concentration.concentration_label, isEs)}</span>
                </span>
              </div>
              <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
                <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (hhi / hhiScaleMax) * 100)}%`, background: hhiColor, borderRadius: 999 }} />
                {/* DOJ band ticks at 1500 / 2500 */}
                <div aria-hidden="true" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, (1500 / hhiScaleMax) * 100)}%`, width: 1, background: 'var(--color-text-muted)', opacity: 0.5 }} />
                <div aria-hidden="true" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, (2500 / hhiScaleMax) * 100)}%`, width: 1, background: 'var(--color-text-muted)' }} />
              </div>
            </div>
            )}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
                  {isEs ? 'Los 3 mayores capturan' : 'Top 3 capture'}
                </span>
                <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: top3 >= 50 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)' }}>{Math.round(top3)}%</span>
              </div>
              <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
                <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, top3)}%`, background: top3 >= 50 ? RISK_COLORS.high : accent, borderRadius: 999 }} />
              </div>
            </div>
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin datos de concentración.' : 'No concentration data.'} />
        )}
      </Panel>

      {/* ─ Deviation vs OECD ─ */}
      <OecdDeviationPanel rows={benchRows} isEs={isEs} />

      {/* ─ Top vendors ─ */}
      <Panel label={isEs ? 'Mayores proveedores' : 'Top vendors'} accent={accent}>
        {topVendors.length > 0 ? (
          <TopEntitiesList
            items={topVendors.map((v) => ({
              id: v.vendor_id,
              name: v.vendor_name,
              type: 'vendor' as const,
              share: v.market_share_pct,
              value: v.vendor_value ?? 0,
            }))}
          />
        ) : (
          <EmptyNote text={isEs ? 'Sin desglose por proveedor.' : 'No vendor breakdown.'} />
        )}
      </Panel>

      {/* ─ Risk over time ─ */}
      <RiskOverTimePanel trend={trend} isEs={isEs} />
    </div>
  )
}

// ─── Vendor reference table (full-width; EntityIdentityChip rows) ────────────

export function CategoryVendorTable({
  vendors,
  lang,
}: {
  vendors: CategoryTopVendor[]
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  if (vendors.length === 0) {
    return <EmptyNote text={isEs ? 'Sin proveedores registrados.' : 'No vendors on record.'} />
  }
  const top10Share = vendors.slice(0, 10).reduce((s, v) => s + (v.market_share_pct ?? 0), 0)

  return (
    <div>
      <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {isEs
          ? `Los 10 mayores capturan el ${Math.round(top10Share)}% del mercado de la categoría.`
          : `The top 10 capture ${Math.round(top10Share)}% of the category market.`}
      </p>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm" aria-label={isEs ? 'Proveedores de la categoría' : 'Category vendors'}>
          <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
            <tr>
              <th scope="col" className="text-left px-3 py-2 font-semibold" style={{ width: 28 }}>#</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">{isEs ? 'Proveedor' : 'Vendor'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Contratos' : 'Contracts'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Monto' : 'Amount'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Cuota' : 'Share'}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{isEs ? 'Riesgo' : 'Risk'}</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => {
              const share = v.market_share_pct ?? 0
              const lvl = v.avg_risk != null && v.avg_risk > 0 ? getRiskLevelFromScore(v.avg_risk) : 'low'
              const riskPct = v.avg_risk != null && v.avg_risk > 0 ? Math.round(v.avg_risk * 100) : null
              const riskColor = riskPct == null ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[lvl]
              return (
                <tr key={v.vendor_id} className="border-t border-border/30">
                  <td className="px-3 py-2 font-mono tabular-nums text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2"><EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="sm" /></td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">{formatNumber(v.contract_count ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCompactMXN(v.vendor_value ?? 0)}</td>
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
