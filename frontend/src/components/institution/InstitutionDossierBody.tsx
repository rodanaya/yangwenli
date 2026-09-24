/**
 * InstitutionDossierBody — the three depth sections of the institution dossier,
 * added in the 2026-06-08 DESIGNUS remake to bring institutions to parity with
 * the vendor dossier (Evidence / Activity / Network). Each section reads data
 * the page previously discarded:
 *
 *   §1 InstitutionReading      — WHY the two seals read as they do: per-feature
 *                                risk attribution (risk-waterfall) + OECD
 *                                deviation + where-the-risk-sits.
 *   §2 InstitutionConcentration — WHO gets the money & HOW concentrated: HHI
 *                                over time (Prozorro 4,000 line) + an enriched
 *                                supplier register with sort/floor + ARIA/GT.
 *   §3 InstitutionRecord       — THE RECORD: risk over time, incumbency
 *                                (longest-tenured), categories, the contracts.
 *
 * Folio register — reuses the shared command primitives, WaterfallRiskChart,
 * DotBar, EntityIdentityChip. No green for low risk (Bible §3.10).
 */
import { useMemo, useState } from 'react'
import type {
  InstitutionDetailResponse,
  InstitutionRiskProfile,
  InstitutionWaterfallResponse,
  VendorPoolResponse,
  VendorPoolItem,
  ContractListResponse,
} from '@/api/types'
import { WaterfallRiskChart } from '@/components/WaterfallRiskChart'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  FLAG_THRESHOLD,
  EU_DIRECT_AWARD_LIMIT,
  EU_SINGLE_BID_LIMIT,
  MODEL_HR_BASELINE,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber, shortenContractName } from '@/lib/utils'
import { procedureSeal } from '@/lib/institution-seal'
import {
  ratePct,
  Panel,
  EmptyNote,
  OecdDeviationPanel,
  RiskOverTimePanel,
  RiskBandDistribution,
  type BenchRow,
  type TrendPoint,
} from '@/components/dossier/command/primitives'

// ES labels for the 16 institution waterfall features (server sends label_en only).
const WF_LABEL_ES: Record<string, string> = {
  single_bid: 'Único postor',
  direct_award: 'Adjudicación directa',
  price_ratio: 'Razón de precio',
  vendor_concentration: 'Concentración de proveedor',
  ad_period_days: 'Periodo de convocatoria',
  year_end: 'Cierre de año',
  same_day_count: 'Contratos mismo día',
  network_member_count: 'Pertenencia a red',
  co_bid_rate: 'Tasa de co-licitación',
  price_hyp_confidence: 'Atípico de precio',
  industry_mismatch: 'Desajuste de industria',
  institution_risk: 'Riesgo institucional',
  price_volatility: 'Volatilidad de precio',
  sector_spread: 'Dispersión sectorial',
  win_rate: 'Tasa de adjudicación',
  institution_diversity: 'Diversidad institucional',
}

// ─── §1 · The reading ─────────────────────────────────────────────────────────

export function InstitutionReading({
  institution,
  riskProfile,
  waterfall,
  scorecard,
  lang,
}: {
  institution: InstitutionDetailResponse
  riskProfile?: InstitutionRiskProfile | null
  waterfall?: InstitutionWaterfallResponse | null
  scorecard?: { total_score: number; grade: string } | null
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'

  // Waterfall features → WaterfallRiskChart shape; swap ES label into label_en.
  const wfItems = (waterfall?.items ?? []).map((it) => ({
    feature: it.feature,
    z_score: it.z_score,
    coefficient: it.coefficient,
    contribution: it.contribution,
    label_en: isEs ? WF_LABEL_ES[it.feature] ?? it.label_en : it.label_en,
  }))
  const hasWf = wfItems.length > 0
  const topProt = [...wfItems].filter((f) => f.contribution < 0).sort((a, b) => a.contribution - b.contribution)[0]
  const topAdd = [...wfItems].filter((f) => f.contribution > 0).sort((a, b) => b.contribution - a.contribution)[0]
  // The caption is generated from this institution's numbers only (PARALLAX
  // D9b § Change 4): the waterfall's top drivers, then the three verdicts —
  // model risk, the procedure seal's measure, the transparency score.
  const avgRisk = institution.avg_risk_score ?? 0
  const level = getRiskLevelFromScore(avgRisk)
  const risk100 = Math.round(avgRisk * 100)
  const seal = procedureSeal(institution)
  const ratio = `${seal.ratio.toFixed(1)}×`
  const sealValue = seal.value != null ? Math.round(seal.value) : null
  const LEVEL_ES = { critical: 'crítico', high: 'alto', medium: 'medio', low: 'bajo' } as const
  const driversEn = topProt && topAdd
    ? `The model weighs “${topProt.label_en.toLowerCase()}” downward and “${topAdd.label_en.toLowerCase()}” upward.`
    : topProt ? `The model weighs “${topProt.label_en.toLowerCase()}” downward.`
      : topAdd ? `The model weighs “${topAdd.label_en.toLowerCase()}” upward.` : ''
  const driversEs = topProt && topAdd
    ? `El modelo pondera a la baja «${topProt.label_en.toLowerCase()}» y al alza «${topAdd.label_en.toLowerCase()}».`
    : topProt ? `El modelo pondera a la baja «${topProt.label_en.toLowerCase()}».`
      : topAdd ? `El modelo pondera al alza «${topAdd.label_en.toLowerCase()}».` : ''
  const procEn = sealValue == null ? ''
    : seal.key === 'da' ? `it awards ${sealValue}% without an open bid, ${seal.flagged ? `${ratio} the EU line` : 'within the EU line'}`
      : seal.key === 'sb' ? `${sealValue}% of its competitive procedures drew a single bid, ${seal.flagged ? `${ratio} the EU line` : 'within the EU line'}`
        : `its five-year supplier HHI is ${formatNumber(sealValue)}, ${seal.flagged ? `${ratio} the 4,000 line` : 'below the 4,000 line'}`
  const procEs = sealValue == null ? ''
    : seal.key === 'da' ? `adjudica ${sealValue}% sin licitación abierta, ${seal.flagged ? `${ratio} la línea UE` : 'dentro de la línea UE'}`
      : seal.key === 'sb' ? `${sealValue}% de sus procedimientos competitivos tuvo un único postor, ${seal.flagged ? `${ratio} la línea UE` : 'dentro de la línea UE'}`
        : `su HHI de proveedores a cinco años es ${formatNumber(sealValue)}, ${seal.flagged ? `${ratio} el umbral de 4,000` : 'bajo el umbral de 4,000'}`
  const scoreEn = scorecard ? `the transparency score is ${Math.round(scorecard.total_score)} of 100, grade ${scorecard.grade}` : ''
  const scoreEs = scorecard ? `el puntaje de transparencia es ${Math.round(scorecard.total_score)} de 100, calificación ${scorecard.grade}` : ''
  const verdictsEn = [`Its contracts carry a ${level} model risk indicator (${risk100}/100)`, procEn, scoreEn].filter(Boolean).join('; ') + '.'
  const verdictsEs = [`Sus contratos tienen un indicador de riesgo del modelo ${LEVEL_ES[level]} (${risk100}/100)`, procEs, scoreEs].filter(Boolean).join('; ') + '.'
  const caption = isEs ? `${driversEs} ${verdictsEs}`.trim() : `${driversEn} ${verdictsEn}`.trim()

  // OECD deviation rows
  const da = ratePct(institution.direct_award_pct ?? institution.direct_award_rate)
  const sb = ratePct(institution.single_bid_pct)
  const hr = ratePct(institution.high_risk_pct ?? institution.high_risk_percentage)
  const daLim = EU_DIRECT_AWARD_LIMIT * 100
  const sbLim = EU_SINGLE_BID_LIMIT * 100
  const hrLim = MODEL_HR_BASELINE * 100
  const benchRows: BenchRow[] = []
  if (da != null) benchRows.push({ label: isEs ? 'Adjudicación directa' : 'Direct award', pct: da, limit: daLim, over: da > daLim })
  if (sb != null) benchRows.push({ label: isEs ? 'Único postor' : 'Single bid', pct: sb, limit: sbLim, over: sb > sbLim })
  if (hr != null) benchRows.push({ label: isEs ? 'Alto riesgo' : 'High-risk', pct: hr, limit: hrLim, over: hr > hrLim, note: isEs ? `media del modelo ${hrLim}%` : `model mean ${hrLim}%` })

  // Where the risk sits
  const dist = riskProfile?.contracts_by_risk_level
  const distTotal = dist ? (dist.critical ?? 0) + (dist.high ?? 0) + (dist.medium ?? 0) + (dist.low ?? 0) : 0

  return (
    <div className="space-y-4">
      <Panel label={isEs ? 'Por qué el riesgo se lee así' : 'Why the risk reads this way'} accent={RISK_COLORS.critical}>
        {hasWf ? (
          <>
            <WaterfallRiskChart features={wfItems} />
            <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-muted)', marginTop: 12, maxWidth: '72ch' }}>
              {caption}
            </p>
          </>
        ) : (
          <EmptyNote text={isEs ? 'Sin atribución de riesgo por característica.' : 'No per-feature risk attribution.'} />
        )}
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        <OecdDeviationPanel rows={benchRows} isEs={isEs} />
        <Panel label={isEs ? 'Dónde está el riesgo' : 'Where the risk sits'} accent={RISK_COLORS.high}>
          {dist && distTotal > 0 ? (
            <RiskBandDistribution dist={dist} isEs={isEs} />
          ) : (
            <WhereRiskFallback institution={institution} isEs={isEs} />
          )}
        </Panel>
      </div>
    </div>
  )
}

function WhereRiskFallback({ institution, isEs }: { institution: InstitutionDetailResponse; isEs: boolean }) {
  const avgRisk100 = institution.avg_risk_score != null ? Math.round(institution.avg_risk_score * 100) : null
  const baseline100 = institution.risk_baseline ? Math.round(institution.risk_baseline * 100) : null
  const lvl = institution.avg_risk_score != null ? getRiskLevelFromScore(institution.avg_risk_score) : 'low'
  const hrPct = ratePct(institution.high_risk_pct ?? institution.high_risk_percentage)
  const total = institution.total_contracts ?? 0
  const hrCount = institution.high_risk_contract_count ?? (hrPct != null && total ? Math.round((hrPct / 100) * total) : null)
  if (avgRisk100 == null && hrCount == null) {
    return <EmptyNote text={isEs ? 'Sin desglose de riesgo por contrato.' : 'No per-contract risk breakdown.'} />
  }
  return (
    <div className="space-y-3">
      {avgRisk100 != null && (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>{isEs ? 'Riesgo promedio' : 'Avg risk'}</span>
            <span className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 600, color: RISK_TEXT_COLORS[lvl] }}>
              {avgRisk100}
              {baseline100 != null && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / {baseline100} {isEs ? 'sector' : 'sector'}</span>}
            </span>
          </div>
          <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, avgRisk100)}%`, background: RISK_COLORS[lvl], borderRadius: 999 }} />
            {baseline100 != null && <div aria-hidden="true" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, baseline100)}%`, width: 1, background: 'var(--color-text-muted)' }} />}
          </div>
        </div>
      )}
      {hrCount != null && total > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>{isEs ? 'Contratos de alto riesgo' : 'High-risk contracts'}</span>
            <span className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {formatNumber(hrCount)}<span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / {formatNumber(total)}</span>
            </span>
          </div>
          <div style={{ position: 'relative', height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (hrCount / total) * 100)}%`, background: RISK_COLORS.high, borderRadius: 999 }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── §2 · Concentration ────────────────────────────────────────────────────────

function hhiColor(h: number): string {
  if (h >= 4000) return RISK_COLORS.critical
  if (h >= 2500) return RISK_COLORS.high
  if (h >= 1000) return RISK_COLORS.medium
  return 'var(--color-text-muted)'
}

/** hhiColor's text twin (PARALLAX D9 § Change 5) — marks keep hhiColor. */
function hhiInk(h: number): string {
  if (h >= 4000) return RISK_TEXT_COLORS.critical
  if (h >= 2500) return RISK_TEXT_COLORS.high
  if (h >= 1000) return RISK_TEXT_COLORS.medium
  return 'var(--color-text-muted)'
}

export function InstitutionConcentration({
  institution,
  vendorPool,
  sectorAccent,
  span,
  lang,
}: {
  institution: InstitutionDetailResponse
  vendorPool?: VendorPoolResponse | null
  sectorAccent: string
  /** First–last contract year; the register counts every year. */
  span?: [number, number] | null
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const sd = institution.supplier_diversity
  const history = useMemo(() => [...(sd?.history ?? [])].sort((a, b) => a.year - b.year).slice(-6), [sd])
  const pool = vendorPool?.data ?? []
  const top1 = vendorPool?.top1_share_pct ?? null
  const top10 = vendorPool?.top10_share_pct ?? null
  // The strip names its years (PARALLAX D9b § Change 5): "current" is the last
  // active year, the average spans the five most recent years in the history.
  const recent = useMemo(() => [...(sd?.history ?? [])].sort((a, b) => b.year - a.year), [sd])
  const curYear = recent[0]?.year
  const avgFrom = recent[Math.min(4, recent.length - 1)]?.year
  const avgSpan = curYear != null && avgFrom != null && avgFrom !== curYear ? `${avgFrom}–${String(curYear).slice(2)}` : `${curYear ?? ''}`

  return (
    <div className="space-y-5">
      {sd && history.length > 0 && (
        <Panel label={isEs ? 'Concentración de proveedores · HHI' : 'Supplier concentration · HHI'} accent={sectorAccent}>
          {/* Readout strip */}
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-3">
            <HhiStat label={`HHI ${curYear ?? ''}`} value={formatNumber(Math.round(sd.hhi_current_year))} color={hhiInk(sd.hhi_current_year)} />
            <HhiStat label={isEs ? `Prom. 5 años ${avgSpan}` : `5-yr avg ${avgSpan}`} value={formatNumber(Math.round(sd.hhi_5yr_avg))} color={hhiInk(sd.hhi_5yr_avg)} />
            <HhiStat label={isEs ? `Proveedores ${curYear ?? ''}` : `Suppliers ${curYear ?? ''}`} value={formatNumber(sd.unique_vendors_current_year)} color="var(--color-text-primary)" />
            <HhiStat
              label={isEs ? 'Tendencia' : 'Trend'}
              value={sd.trend === 'increasing' ? (isEs ? 'en aumento' : 'rising') : sd.trend === 'decreasing' ? (isEs ? 'a la baja' : 'falling') : (isEs ? 'estable' : 'stable')}
              color={sd.trend === 'increasing' ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)'}
            />
          </div>
          {/* Year ladder with the Prozorro 4,000 reference tick */}
          <div className="space-y-1.5">
            {history.map((h) => (
              <div key={h.year} className="flex items-center gap-3">
                <span className="font-mono tabular-nums flex-shrink-0" style={{ width: 32, fontSize: 13, color: 'var(--color-text-muted)' }}>{h.year}</span>
                <DotBar value={h.hhi} max={10000} color={hhiColor(h.hhi)} thresholds={[{ value: 4000 }]} dots={32} ariaLabel={`HHI ${h.year}: ${Math.round(h.hhi)}`} className="flex-shrink-0" />
                <span className="font-mono tabular-nums flex-shrink-0 text-right ml-auto" style={{ width: 52, fontSize: 13, fontWeight: 600, color: hhiInk(h.hhi) }}>{formatNumber(Math.round(h.hhi))}</span>
              </div>
            ))}
          </div>
          <p className="font-mono" style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginTop: 10 }}>
            {isEs
              ? `Prozorro marca como concentrada toda compra con HHI > 4,000 (línea punteada). ${sd.hhi_5yr_avg >= 4000 ? 'El promedio a 5 años de esta institución la supera.' : ''}`
              : `Prozorro flags any purchasing with HHI > 4,000 (dotted line). ${sd.hhi_5yr_avg >= 4000 ? "This institution's 5-year average is above it." : ''}`}
          </p>
        </Panel>
      )}
      <ConcentrationRegister pool={pool} top1={top1} top10={top10} span={span} isEs={isEs} />
    </div>
  )
}

function HhiStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <span className="font-mono tabular-nums" style={{ fontSize: 15, fontWeight: 600, color }}>{value}</span>
      {/* a real separator so assistive tech reads "86, 5-yr avg", not "865-yr avg" */}
      <span className="sr-only">, </span>
      <span className="font-mono" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginLeft: 6 }}>{label}</span>
    </div>
  )
}

type SortKey = 'spend' | 'risk'
type FloorKey = 'all' | 'med' | 'high' | 'crit'
const FLOOR_MIN: Record<FloorKey, number> = { all: 0, med: 0.25, high: 0.4, crit: 0.6 }

function ConcentrationRegister({
  pool,
  top1,
  top10,
  span,
  isEs,
}: {
  pool: VendorPoolItem[]
  top1: number | null
  top10: number | null
  span?: [number, number] | null
  isEs: boolean
}) {
  const [sortBy, setSortBy] = useState<SortKey>('spend')
  const [floor, setFloor] = useState<FloorKey>('all')

  const rows = useMemo(() => {
    const min = FLOOR_MIN[floor]
    const filtered = pool.filter((v) => (v.avg_risk_score ?? 0) >= min)
    const sorted = [...filtered].sort((a, b) =>
      sortBy === 'risk' ? (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0) : (b.total_value_mxn ?? 0) - (a.total_value_mxn ?? 0),
    )
    return sorted.slice(0, 25)
  }, [pool, sortBy, floor])

  if (pool.length === 0) {
    return <EmptyNote text={isEs ? 'Sin proveedores registrados.' : 'No suppliers on record.'} />
  }
  const shareMax = Math.max(20, top1 ?? 0, ...pool.map((v) => v.share_of_institution_pct ?? 0))

  const FLOORS: Array<{ k: FloorKey; en: string; es: string }> = [
    { k: 'all', en: 'ALL', es: 'TODOS' },
    { k: 'med', en: 'MED+', es: 'MED+' },
    { k: 'high', en: 'HIGH+', es: 'ALTO+' },
    { k: 'crit', en: 'CRIT', es: 'CRÍT' },
  ]

  return (
    <div>
      {/* Header: concentration readout + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="font-mono" style={{ fontSize: 13, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>
          {top1 != null && top10 != null
            ? isEs
              ? `El mayor proveedor concentra ${Math.round(top1)}%; los 10 mayores, ${Math.round(top10)}% del gasto${span ? ` · todos los años ${span[0]}–${span[1]}` : ''}.`
              : `Top supplier holds ${Math.round(top1)}%; top 10 hold ${Math.round(top10)}% of spend${span ? ` · all years ${span[0]}–${span[1]}` : ''}.`
            : isEs
              ? 'Proveedores por monto contratado.'
              : 'Suppliers by contracted amount.'}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <ControlGroup
            label={isEs ? 'Orden' : 'Sort'}
            options={[{ k: 'spend', t: isEs ? 'MONTO' : 'SPEND' }, { k: 'risk', t: isEs ? 'RIESGO' : 'RISK' }]}
            active={sortBy}
            onPick={(k) => setSortBy(k as SortKey)}
          />
          <ControlGroup
            label={isEs ? 'Riesgo' : 'Floor'}
            options={FLOORS.map((f) => ({ k: f.k, t: isEs ? f.es : f.en }))}
            active={floor}
            onPick={(k) => setFloor(k as FloorKey)}
          />
        </div>
      </div>

      {/* Announces the FLOOR / SORT result to assistive tech. */}
      <p role="status" aria-live="polite" className="sr-only">
        {isEs ? `${rows.length} proveedores mostrados` : `${rows.length} suppliers shown`}
      </p>
      <div className="border border-border rounded-sm overflow-hidden">
        <ul>
          {rows.map((v) => {
            // Rows share the header's base (the pool's institution total) and
            // one bar scale: max(20 %, the largest share) for every row.
            const share = v.share_of_institution_pct ?? 0
            const lvl = v.avg_risk_score != null ? getRiskLevelFromScore(v.avg_risk_score) : 'low'
            const riskPct = v.avg_risk_score != null ? Math.round(v.avg_risk_score * 100) : null
            const fmtPct = (n: number | null) => (n == null ? '—' : `${Math.round(n)}%`)
            return (
              // inline maxWidth: the Day 2c `main :where(li)` 68ch measure is
              // unlayered — a max-w-none utility loses to it (Day 5 escape).
              <li key={v.vendor_id} className="flex items-center gap-3 px-3 py-2 border-t border-border/30 first:border-t-0" style={{ maxWidth: 'none' }}>
                <span className="font-mono tabular-nums flex-shrink-0 text-text-muted" style={{ width: 22, fontSize: 13 }}>{v.rank}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="sm" fullName />
                    {v.in_ground_truth ? <Badge text="GT" color={RISK_TEXT_COLORS.critical} /> : null}
                    {v.ips_tier != null && v.ips_tier <= 2 ? <Badge text={`T${v.ips_tier}`} color={RISK_TEXT_COLORS.high} /> : null}
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {formatNumber(v.contract_count ?? 0)} {isEs ? 'contratos' : 'contracts'}
                    {' · '}{isEs ? 'AD' : 'DA'} {fmtPct(v.direct_award_pct)}
                    {' · '}{isEs ? 'ÚP' : 'SB'} {fmtPct(v.single_bid_pct)}
                  </div>
                </div>
                {/* A share that rounds to 0 % draws no dot (DotBar rounds up to 1). */}
                <DotBar value={share >= 0.5 ? share : 0} max={shareMax} color={share >= 10 ? RISK_COLORS.high : 'var(--color-text-muted)'} dots={18} ariaLabel={isEs ? `${Math.round(share)}% del gasto` : `${Math.round(share)}% of spend`} className="hidden sm:block flex-shrink-0" />
                <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ width: 78, fontSize: 13, color: 'var(--color-text-secondary)' }}>{formatCompactMXN(v.total_value_mxn ?? 0)}</span>
                <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ width: 30, fontSize: 13, fontWeight: 600, color: riskPct == null ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[lvl] }}>
                  <span className="sr-only">{isEs ? 'indicador de riesgo ' : 'risk indicator '}</span>{riskPct ?? '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function ControlGroup({
  label,
  options,
  active,
  onPick,
}: {
  label: string
  options: Array<{ k: string; t: string }>
  active: string
  onPick: (k: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <span aria-hidden="true" className="font-mono" style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{label}</span>
      <div className="flex items-center">
        {options.map((o) => (
          <button
            key={o.k}
            type="button"
            onClick={() => onPick(o.k)}
            aria-pressed={active === o.k}
            className="min-h-6 px-2 rounded-sm font-mono cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            style={{
              fontSize: 12,
              letterSpacing: '0.08em',
              color: active === o.k ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontWeight: active === o.k ? 700 : 400,
              borderBottom: active === o.k ? '1.5px solid var(--color-accent)' : '1.5px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: '1.5px',
              borderBottomStyle: 'solid',
              borderBottomColor: active === o.k ? 'var(--color-accent)' : 'transparent',
            }}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="font-mono"
      style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color, border: `1px solid ${color}`, borderRadius: 2, padding: '0px 4px', lineHeight: 1.5 }}
    >
      {text}
    </span>
  )
}

// ─── §3 · The record ───────────────────────────────────────────────────────────

interface CategoryCoverage {
  data?: CategoryItem[]
  total_categories?: number
  total_contracts_categorised?: number
  total_value_categorised?: number
}

interface CategoryItem {
  category_id: number | null
  name_es: string | null
  name_en: string | null
  contract_count: number
  total_value_mxn: number
  avg_risk_score: number | null
  direct_award_pct: number | null
  sector_id?: number | null
  high_risk_count?: number | null
}

export function InstitutionRecord({
  institution,
  timeline,
  categories,
  contracts,
  sectorAccent,
  lang,
}: {
  institution: InstitutionDetailResponse
  timeline: TrendPoint[]
  categories?: CategoryCoverage | null
  contracts?: ContractListResponse | null
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const tenured = institution.longest_tenured_vendors ?? []
  const cats = (categories?.data ?? []).slice(0, 6)
  const catMax = Math.max(1, ...cats.map((c) => c.total_value_mxn || 0))
  // Coverage line: how much of the institution the rows below account for.
  const catN = categories?.total_categories ?? 0
  const catContracts = categories?.total_contracts_categorised ?? 0
  const catValue = categories?.total_value_categorised ?? 0
  const coverContracts = catContracts > 0 ? Math.round((cats.reduce((s, c) => s + (c.contract_count || 0), 0) / catContracts) * 100) : null
  const coverValue = catValue > 0 ? Math.round((cats.reduce((s, c) => s + (c.total_value_mxn || 0), 0) / catValue) * 100) : null
  const contractRows = (contracts?.data ?? []).slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <RiskOverTimePanel trend={timeline} isEs={isEs} />

        {/* Incumbency */}
        <Panel label={isEs ? 'Permanencia · proveedores más antiguos' : 'Incumbency · longest-tenured'} accent={sectorAccent}>
          {tenured.length > 0 ? (
            <ul className="space-y-2">
              {tenured.slice(0, 6).map((v) => {
                const lvl = v.avg_risk_score != null ? getRiskLevelFromScore(v.avg_risk_score) : 'low'
                return (
                  <li key={v.vendor_id} className="flex items-center justify-between gap-3" style={{ maxWidth: 'none' }}>
                    <div className="min-w-0">
                      <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="sm" fullName />
                      <div className="font-mono tabular-nums" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
                        {v.first_contract_year}–{v.last_contract_year} · {v.tenure_years}{isEs ? ' años' : 'y'} · {formatNumber(v.total_contracts)} {isEs ? 'contratos' : 'contracts'}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 13, fontWeight: 600, color: v.avg_risk_score != null ? RISK_TEXT_COLORS[lvl] : 'var(--color-text-muted)' }}>
                      {v.avg_risk_score != null ? Math.round(v.avg_risk_score * 100) : '—'}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyNote text={isEs ? 'Sin historial de permanencia.' : 'No tenure history.'} />
          )}
        </Panel>
      </div>

      {/* What they buy */}
      <Panel label={isEs ? 'Qué compra' : 'What they buy'} accent={sectorAccent}>
        {cats.length > 0 && catN > 0 && (
          <p className="font-mono tabular-nums mb-3" style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
            {isEs
              ? `${cats.length} de ${formatNumber(catN)} categorías${coverContracts != null ? ` · ${coverContracts}% de los contratos` : ''}${coverValue != null ? ` · ${coverValue}% del gasto` : ''}`
              : `${cats.length} of ${formatNumber(catN)} categories${coverContracts != null ? ` · ${coverContracts}% of contracts` : ''}${coverValue != null ? ` · ${coverValue}% of spend` : ''}`}
          </p>
        )}
        {cats.length > 0 ? (
          <div className="space-y-2.5">
            {cats.map((c, i) => {
              const name = (isEs ? c.name_es : c.name_en) || c.name_es || c.name_en || (isEs ? 'Sin categoría' : 'Uncategorized')
              const riskPct = c.avg_risk_score != null ? Math.round(c.avg_risk_score * 100) : null
              const lvl = c.avg_risk_score != null ? getRiskLevelFromScore(c.avg_risk_score) : 'low'
              return (
                <div key={c.category_id ?? `cat-${i}`} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    {c.category_id != null ? (
                      <EntityIdentityChip type="category" id={c.category_id} name={name} size="sm" fullName className="text-[13px]" />
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{name}</span>
                    )}
                    <div className="font-mono tabular-nums" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {formatNumber(c.contract_count ?? 0)} {isEs ? 'contratos' : 'contracts'}
                      {c.direct_award_pct != null && <>{' · '}{isEs ? 'AD' : 'DA'} {Math.round(c.direct_award_pct)}%</>}
                      {riskPct != null && (
                        <>
                          {' · '}{isEs ? 'indicador de riesgo' : 'risk indicator'}{' '}
                          <span style={{ color: RISK_TEXT_COLORS[lvl], fontWeight: 600 }}>{riskPct}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <DotBar value={c.total_value_mxn || 0} max={catMax} color={sectorAccent} dots={24} ariaLabel={name} className="hidden sm:block flex-shrink-0" />
                  <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ minWidth: 90, fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{formatCompactMXN(c.total_value_mxn || 0)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin contratos categorizados para esta institución.' : 'No categorised contracts for this institution.'} />
        )}
      </Panel>

      {/* The contracts */}
      <Panel label={isEs ? 'Los contratos más grandes' : 'The largest contracts'} accent={RISK_COLORS.high}>
        {contractRows.length > 0 ? (
          <div>
          <div
            className="overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            tabIndex={0}
            role="region"
            aria-label={isEs ? 'Contratos más grandes — desliza para ver todas las columnas' : 'Largest contracts — scroll for every column'}
          >
            <table className="w-full" style={{ fontSize: 12 }} aria-label={isEs ? 'Los contratos más grandes' : 'The largest contracts'}>
              <thead>
                <tr className="text-left font-mono" style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  <th className="font-medium py-1.5 pr-3">{isEs ? 'Contrato' : 'Contract'}</th>
                  <th className="font-medium py-1.5 pr-3">{isEs ? 'Proveedor' : 'Supplier'}</th>
                  <th className="font-medium py-1.5 pr-3 text-right">{isEs ? 'Año' : 'Year'}</th>
                  <th className="font-medium py-1.5 pr-3 text-right">{isEs ? 'Monto' : 'Amount'}</th>
                  <th className="font-medium py-1.5 text-right">{isEs ? 'Riesgo' : 'Risk'}</th>
                </tr>
              </thead>
              <tbody>
                {contractRows.map((c) => {
                  const lvl = c.risk_score != null ? getRiskLevelFromScore(c.risk_score) : 'low'
                  return (
                    <tr key={c.id} className="border-t border-border/30">
                      <td className="py-2 pr-3" style={{ color: 'var(--color-text-secondary)', maxWidth: 280 }}>
                        <span className="block whitespace-normal break-words leading-tight">{c.title ? shortenContractName(c.title, Infinity) : `#${c.contract_number ?? c.id}`}</span>
                      </td>
                      <td className="py-2 pr-3">
                        {c.vendor_id && c.vendor_name ? <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="sm" fullName /> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{c.contract_year ?? '—'}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatCompactMXN(c.amount_mxn ?? 0)}
                        {(c.amount_mxn ?? 0) > FLAG_THRESHOLD && <ReviewFlag isEs={isEs} />}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums" style={{ fontWeight: 600, color: c.risk_score != null ? RISK_TEXT_COLORS[lvl] : 'var(--color-text-muted)' }}>{c.risk_score != null ? Math.round(c.risk_score * 100) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
            <p className="md:hidden font-mono mt-1.5" aria-hidden="true" style={{ fontSize: 12, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              {isEs ? '← desliza →' : '← scroll →'}
            </p>
          </div>
        ) : (
          <EmptyNote text={isEs ? 'Sin contratos registrados.' : 'No contracts on record.'} />
        )}
      </Panel>
    </div>
  )
}

/** Data rule: a contract above 10B MXN is included but flagged for review. */
function ReviewFlag({ isEs }: { isEs: boolean }) {
  const title = isEs ? 'Por encima de la línea de revisión de 10 mil millones MXN — se incluye, pero hay que verificarlo' : 'Above the 10B MXN review line — include but verify'
  return (
    <span className="block whitespace-nowrap" style={{ fontSize: 12, color: RISK_TEXT_COLORS.high }} title={title}>
      <span aria-hidden="true">⚑ </span>{isEs ? 'revisar' : 'review'}
      <span className="sr-only"> — {title}</span>
    </span>
  )
}
