/**
 * VendorEvidenceTab — why the model reached its verdict.
 *
 * Risk waterfall, full SHAP breakdown, peer comparison, methodology link.
 * Single-purpose: no activity, no network, no external registries.
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type {
  VendorDetailResponse,
  VendorGroundTruthStatus,
  VendorSHAPResponse,
  VendorWaterfallContribution,
  VendorPeerComparisonResponse,
  AriaQueueItem,
} from '@/api/types'
import { WaterfallRiskChart } from '@/components/WaterfallRiskChart'
import { DotBarRow } from '@/components/ui/DotBar'
import { parseFactorLabel } from '@/lib/risk-factors'
import { Skeleton } from '@/components/ui/skeleton'
import { BenchmarkRow, type BenchmarkRowProps } from '@/components/editorial/BenchmarkRow'
import { AriaMemoPanel } from '@/components/widgets/AriaMemoPanel'
import { getVerdictForVendor } from '@/lib/entity/verdict'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { VendorDeviationLedger } from './VendorDeviationLedger'
import { formatVendorName } from '@/lib/vendor/formatName'
import { SubSectionTitle } from '@/components/dossier/SubSectionTitle'

interface VendorEvidenceTabProps {
  vendor: VendorDetailResponse
  waterfall?: VendorWaterfallContribution[] | null
  waterfallLoading?: boolean
  shap?: VendorSHAPResponse | null
  aria?: AriaQueueItem | null
  groundTruth?: VendorGroundTruthStatus | null
  peerComparison?: VendorPeerComparisonResponse | null
}

export function VendorEvidenceTab({
  vendor,
  waterfall,
  waterfallLoading,
  shap,
  aria,
  groundTruth,
  peerComparison,
}: VendorEvidenceTabProps) {
  const { t, i18n } = useTranslation(['vendors'])
  const isEs = i18n.language.startsWith('es')

  const protectFactors = shap?.top_protect_factors ?? []
  const maxProtect = protectFactors.reduce(
    (m, f) => Math.max(m, Math.abs(f.shap)),
    0.001
  )

  const hasDA   = vendor.direct_award_pct != null
  const hasSB   = vendor.single_bid_pct != null
  const hasHR   = vendor.high_risk_pct != null
  const hasYE   = vendor.year_end_pct != null
  const showBenchmarks = hasDA || hasSB || hasHR

  // 2026-05-11 (Audit F103-F107): vendor_stats.direct_award_pct is
  // corrupted on a meaningful slice of rows — some are stored as a
  // 0–1 fraction (0.4194) and some as a 0–100 percentage (41.94).
  // BenchmarkRow assumes fraction → renders the percentage flavor at
  // 4194%. Until the backend canonicalizes vendor_stats, we defend
  // here: anything >1 is treated as already a percentage and divided
  // by 100. Clamped to [0, 1] so corruption can never render >100%.
  // See MEMORY.md "vendor_stats.direct_award_pct corrupted".
  const normalizeRate = (v: number | null | undefined): number | null => {
    if (v == null) return null
    // 2026-05-11 self-review fix: NaN propagates through Math.min/max
    // (Math.max(0, Math.min(1, NaN)) === NaN), so the clamp alone
    // didn't guarantee [0,1]. Reject non-finite values up front.
    if (!Number.isFinite(v)) return null
    const fraction = v > 1 ? v / 100 : v
    return Math.max(0, Math.min(1, fraction))
  }

  return (
    <div className="space-y-8">

      {/* §0 Benchmark bars — how this vendor's key rates diverge from OECD limits */}
      {showBenchmarks && (
        <VendorBenchmarkBars
          directAwardPct={hasDA ? normalizeRate(vendor.direct_award_pct) : null}
          singleBidPct={hasSB ? normalizeRate(vendor.single_bid_pct) : null}
          highRiskPct={hasHR ? normalizeRate(vendor.high_risk_pct) : null}
          yearEndPct={hasYE ? normalizeRate(vendor.year_end_pct) : null}
          yearEndSectorAvg={normalizeRate(vendor.year_end_sector_avg)}
          isEs={isEs}
        />
      )}

      {/* § 1 Lede — ARIA investigative memo (5,800-char dossier surfaced here
          per docs/VENDOR_DOSSIER_SCHEME.md). Previously invisible: the memo
          existed in aria_queue.memo_text but no page imported AriaMemoPanel. */}
      <AriaMemoPanel
        vendorId={Number(vendor.id)}
        vendorName={vendor.name}
        tier={aria?.ips_tier ?? (vendor as { tier?: number; aria_tier?: number }).aria_tier ?? (vendor as { tier?: number }).tier}
        isFalsePositive={Boolean(aria?.fp_structural_monopoly ?? (vendor as { is_false_positive?: boolean | number }).is_false_positive)}
        fpReason={(vendor as { fp_reason?: string }).fp_reason}
      />

      {/* Risk waterfall */}
      <section aria-labelledby="waterfall-title">
        <SubSectionTitle id="waterfall-title">
          {isEs ? 'Descomposición del riesgo' : 'Risk decomposition'}
        </SubSectionTitle>
        <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-4">
          {t('vendors:waterfall.description')}
        </p>
        {waterfallLoading ? (
          <Skeleton className="h-[260px] w-full rounded-sm" />
        ) : waterfall && waterfall.length > 0 ? (
          <>
            <WaterfallRiskChart features={waterfall} />
            {/* ── V5: italic plate caption beneath the risk figure ───────────
                EB Garamond italic 13.5px / 1.45 / 64ch. Wording per CLAUDE.md
                hard rule: "indicador de riesgo" / "risk indicator" only —
                never "X% probability of corruption". */}
            {(() => {
              const first = vendor.first_contract_year
              const last = vendor.last_contract_year ?? new Date().getUTCFullYear()
              const yearsActive = first ? Math.max(1, last - first + 1) : new Date().getUTCFullYear() - 2002
              return (
                <figcaption
                  className="mt-4 pt-3"
                  style={{
                    borderTop: '1px solid rgba(160, 104, 32, 0.18)',
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: '13.5px',
                    lineHeight: 1.45,
                    color: 'var(--color-text-secondary, var(--color-text-muted))',
                    letterSpacing: '0.005em',
                    maxWidth: '64ch',
                  }}
                >
                  {isEs
                    ? `Indicador de riesgo · modelo v0.8.5 · derivado de ${yearsActive} año${yearsActive === 1 ? '' : 's'} de contratos. Una puntuación alta no constituye prueba de irregularidad.`
                    : `Risk indicator · v0.8.5 model · derived from ${yearsActive} year${yearsActive === 1 ? '' : 's'} of contracts. A high score does not constitute proof of wrongdoing.`}
                </figcaption>
              )
            })()}
          </>
        ) : (
          <div
            className="px-4 py-4 rounded-sm"
            style={{
              borderLeft: '2px solid var(--color-border)',
              background: 'var(--color-background-elevated)',
            }}
          >
            <p
              className="font-mono mb-2"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
              }}
            >
              {isEs ? 'Descomposición no disponible' : 'Decomposition unavailable'}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed max-w-prose">
              {isEs
                ? 'El modelo v0.8.5 no produjo una descomposición SHAP para este proveedor: sus contratos carecen de las variables normalizadas (z-scores) que requiere el análisis — típico de registros COMPRANET de 2002–2010 (Estructura A), donde la cobertura de RFC y precios es mínima. La ausencia de descomposición no implica ausencia de riesgo.'
                : 'The v0.8.5 model produced no SHAP decomposition for this vendor: its contracts lack the normalized features (z-scores) the analysis requires — typical of 2002–2010 COMPRANET records (Structure A), where RFC and price coverage is minimal. Missing decomposition does not mean absence of risk.'}
            </p>
          </div>
        )}
      </section>

      {/* Protective factors — the only on-page φᵢ list (the risk-increasing
          factors are the waterfall above; a second ranked bar-list of the same
          contributions was redundant — standards §3.5, removed 2026-06-03). */}
      {protectFactors.length > 0 && (
        <section
          aria-labelledby="shap-protect-title"
          className="pt-6 border-t border-border/40"
        >
          <SubSectionTitle id="shap-protect-title">
            {isEs ? 'Factores protectores' : 'Protective factors'}
          </SubSectionTitle>
          <div className="space-y-3">
            {protectFactors.map((f) => {
              const label = isEs ? f.label_es : parseFactorLabel(f.factor).label
              return (
                <DotBarRow
                  key={f.factor}
                  label={label || f.factor}
                  readout={f.shap.toFixed(2)}
                  value={Math.abs(f.shap)}
                  max={maxProtect}
                  // §3.10: protective (risk-decreasing) factors are neutral, not
                  // green — a protective factor isn't "good", just lower-risk.
                  color="var(--color-text-secondary)"
                />
              )
            })}
          </div>
        </section>
      )}

      {/* § 9 La Comparación — peer metrics vs sector median */}
      {peerComparison && peerComparison.metrics.length > 0 && (
        <section
          aria-labelledby="peer-title"
          className="pt-6 border-t border-border/40"
        >
          <SubSectionTitle id="peer-title">
            {isEs ? '§ 9 · El Desvío (vs sector)' : '§ 9 · The Deviation (vs sector)'}
          </SubSectionTitle>
          <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-4">
            {isEs
              ? `Qué tan lejos opera de la mediana de ${vendor.primary_sector_name ?? 'su sector'} — adjudicación directa, único postor, riesgo y precio por contrato. Sobre la población completa de contratos.`
              : `How far it operates from the ${vendor.primary_sector_name ?? 'sector'} median — direct award, single bid, risk, and price per contract. Over the full contract population.`}
          </p>
          <VendorDeviationLedger
            peerComparison={peerComparison}
            vendorName={formatVendorName(vendor.name) || (isEs ? 'Este proveedor' : 'This vendor')}
            lang={isEs ? 'es' : 'en'}
          />
        </section>
      )}

      {/* § 7 Los Signos — external validation signals (GT cases, EFOS, SFP) */}
      {(groundTruth?.is_known_bad || aria?.is_efos_definitivo || aria?.is_sfp_sanctioned) && (
        <section
          aria-labelledby="signos-title"
          className="pt-6 border-t border-border/40"
        >
          <SubSectionTitle id="signos-title">
            {isEs ? '§ 7 · Los Signos' : '§ 7 · External Signals'}
          </SubSectionTitle>
          <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-4">
            {isEs
              ? 'Registros documentados en fuentes externas: casos de corrupción confirmados, listas negras fiscales, sanciones administrativas.'
              : 'Records in external sources: documented corruption cases, tax blacklists, administrative sanctions.'}
          </p>

          <div className="space-y-2">
            {/* EFOS flag */}
            {aria?.is_efos_definitivo && (
              <div className="flex items-start gap-3 p-3 rounded-sm bg-risk-critical/5 border border-risk-critical/20">
                <span className="shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider text-risk-critical bg-risk-critical/10 border border-risk-critical/30 px-1.5 py-0.5 rounded-sm">
                  EFOS
                </span>
                <p className="text-sm text-text-secondary leading-snug">
                  {isEs
                    ? 'Registrado en la lista EFOS definitivos del SAT — empresa que factura operaciones simuladas.'
                    : 'Listed on the SAT EFOS (shell invoice) register — confirmed fictitious billing company.'}
                </p>
              </div>
            )}

            {/* SFP sanction */}
            {aria?.is_sfp_sanctioned && (
              <div className="flex items-start gap-3 p-3 rounded-sm bg-risk-high/5 border border-risk-high/20">
                <span className="shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider text-risk-high bg-risk-high/10 border border-risk-high/30 px-1.5 py-0.5 rounded-sm">
                  SFP
                </span>
                <p className="text-sm text-text-secondary leading-snug">
                  {isEs
                    ? 'Registrado en el Registro de Proveedores Sancionados de la SFP — inhabilitado para contratar con el gobierno federal.'
                    : 'Listed in the SFP Sanctioned Vendors Registry — banned from federal contracting.'}
                </p>
              </div>
            )}

            {/* GT cases */}
            {groundTruth?.cases?.map((c) => (
              <div
                key={c.case_id}
                className="flex items-start gap-3 p-3 rounded-sm bg-background-elevated border border-border hover:border-border-hover transition-colors"
              >
                <span className="shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider text-risk-critical bg-risk-critical/10 border border-risk-critical/30 px-1.5 py-0.5 rounded-sm mt-0.5">
                  GT
                </span>
                <div className="flex-1 min-w-0">
                  {c.scandal_slug ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <EntityIdentityChip
                        type="case"
                        id={c.case_id}
                        name={c.case_name}
                        size="sm"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-text-primary">{c.case_name}</span>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {c.role && (
                      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                        {isEs ? 'Rol' : 'Role'}: {c.role}
                      </span>
                    )}
                    {c.evidence_strength && (
                      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                        {isEs ? 'Evidencia' : 'Evidence'}: {c.evidence_strength}
                      </span>
                    )}
                  </div>
                  {c.scandal_slug && (
                    <Link
                      to={`/cases/${c.scandal_slug}`}
                      className="text-[10px] font-mono text-accent hover:underline mt-1 inline-block"
                    >
                      {isEs ? 'Ver expediente →' : 'View case dossier →'}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* § 8 El Veredicto — 4-bucket classification */}
      {(() => {
        const verdict = getVerdictForVendor({
          avg_risk_score: vendor.avg_risk_score ?? 0,
          total_value_mxn: vendor.total_value_mxn ?? 0,
          total_contracts: vendor.total_contracts ?? 0,
          direct_award_pct: vendor.direct_award_pct ?? 0,
          is_false_positive: aria?.fp_structural_monopoly ?? false,
          fp_reason: undefined,
          in_ground_truth: aria?.in_ground_truth ?? false,
          top_institution_pct: aria?.top_institution_ratio ?? 0,
          ghost_companion_score: 0,
        })

        const bucketColor =
          verdict.bucket === 'critical' ? '#f87171' :
          verdict.bucket === 'high' ? '#fb923c' :
          verdict.bucket === 'medium' ? '#fbbf24' :
          'var(--color-text-muted)'

        return (
          <section
            aria-labelledby="verdict-title"
            className="pt-6 border-t border-border/40"
          >
            <SubSectionTitle id="verdict-title">
              {isEs ? '§ 8 · El Veredicto' : '§ 8 · Verdict'}
            </SubSectionTitle>
            <div className="flex items-start gap-3">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em] shrink-0"
                style={{ color: bucketColor, backgroundColor: `${bucketColor}15`, border: `1px solid ${bucketColor}30` }}
              >
                {isEs ? verdict.label_es : verdict.label_en}
              </span>
              <p className="text-sm text-text-secondary leading-relaxed max-w-prose">
                {isEs ? verdict.rationale_es : verdict.rationale_en}
              </p>
            </div>
          </section>
        )
      })()}

      {/* Methodology disclosure */}
      <section
        aria-labelledby="method-title"
        className="pt-6 border-t border-border/40"
      >
        <SubSectionTitle id="method-title">
          {isEs ? 'Metodología' : 'Methodology'}
        </SubSectionTitle>
        <p className="text-sm text-text-secondary leading-relaxed max-w-prose">
          {t('vendors:flags.disclaimer')}
        </p>
        <a
          href="/methodology"
          className="text-sm text-accent hover:underline mt-2 inline-block"
        >
          {isEs ? 'Leer la metodología completa →' : 'Read full methodology →'}
        </a>
      </section>
    </div>
  )
}

// ─── Pattern #6: Diverging bars from OECD/sector benchmarks ───────────────────
// BenchmarkRow extracted to @/components/editorial/BenchmarkRow (sp-P3).
// VendorBenchmarkBars below uses the shared primitive — zero behavior change.

interface VendorBenchmarkBarsProps {
  directAwardPct: number | null
  singleBidPct: number | null
  highRiskPct: number | null
  yearEndPct: number | null
  yearEndSectorAvg: number | null
  isEs: boolean
}

function VendorBenchmarkBars({
  directAwardPct,
  singleBidPct,
  highRiskPct,
  yearEndPct,
  yearEndSectorAvg,
  isEs,
}: VendorBenchmarkBarsProps) {
  // Scale: worst-case delta drives the bar width. OECD direct-award limit is 30%,
  // and Mexico's national average is ~72%, so a delta up to 70pp is realistic.
  const MAX_DELTA = 0.70
  const rows: (BenchmarkRowProps & { key: string })[] = []

  if (directAwardPct != null) {
    rows.push({
      key: 'da',
      label: isEs ? 'Adjudicación directa' : 'Direct award rate',
      value: directAwardPct,
      benchmark: 0.30,
      benchmarkLabel: isEs ? 'límite OCDE' : 'OECD limit',
      maxDelta: MAX_DELTA,
    })
  }
  if (singleBidPct != null) {
    rows.push({
      key: 'sb',
      label: isEs ? 'Licitación sin competencia' : 'Single-bid rate',
      value: singleBidPct,
      benchmark: 0.10,
      benchmarkLabel: isEs ? 'límite OCDE' : 'OECD limit',
      maxDelta: MAX_DELTA,
    })
  }
  if (highRiskPct != null) {
    rows.push({
      key: 'hr',
      label: isEs ? 'Contratos de alto riesgo' : 'High-risk contracts',
      value: highRiskPct,
      benchmark: 0.11,   // model HR baseline
      benchmarkLabel: isEs ? 'prom. modelo' : 'model avg',
      maxDelta: MAX_DELTA,
    })
  }
  if (yearEndPct != null && yearEndSectorAvg != null) {
    rows.push({
      key: 'ye',
      label: isEs ? 'Concentración fin de año' : 'Year-end concentration',
      value: yearEndPct,
      benchmark: yearEndSectorAvg,
      benchmarkLabel: isEs ? 'prom. sector' : 'sector avg',
      maxDelta: MAX_DELTA,
    })
  }

  if (rows.length === 0) return null

  return (
    <section aria-labelledby="benchmark-title">
      <SubSectionTitle id="benchmark-title">
        {isEs ? 'Desviación de benchmarks · OCDE / sector' : 'Deviation from benchmarks · OECD / sector'}
      </SubSectionTitle>
      <p className="text-[10px] font-mono text-text-muted mb-3 leading-relaxed">
        {isEs
          ? 'Barras a la derecha del centro = por encima del límite (peor). Izquierda = por debajo (mejor).'
          : 'Bars right of center = above the limit (worse). Left = below (better).'}
      </p>
      <div className="space-y-0.5 overflow-x-auto">
        {rows.map(({ key, ...rowProps }) => (
          <BenchmarkRow key={key} {...rowProps} />
        ))}
      </div>
      <p className="text-[9px] font-mono text-text-muted mt-2 opacity-60">
        {isEs
          ? 'OCDE: adjudicación directa ≤30%, licitación sin competencia ≤10%'
          : 'OECD: direct award ≤30%, single-bid ≤10%'}
      </p>
    </section>
  )
}
