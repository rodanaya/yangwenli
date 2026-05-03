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
import { AriaMemoPanel } from '@/components/widgets/AriaMemoPanel'
import { getVerdictForVendor } from '@/lib/entity/verdict'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

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

  const riskFactors = shap?.top_risk_factors ?? []
  const protectFactors = shap?.top_protect_factors ?? []
  const maxRisk = riskFactors.reduce(
    (m, f) => Math.max(m, Math.abs(f.shap)),
    0.001
  )
  const maxProtect = protectFactors.reduce(
    (m, f) => Math.max(m, Math.abs(f.shap)),
    0.001
  )

  return (
    <div className="space-y-8">
      {/* § 1 Lede — ARIA investigative memo (5,800-char dossier surfaced here
          per docs/VENDOR_DOSSIER_SCHEME.md). Previously invisible: the memo
          existed in aria_queue.memo_text but no page imported AriaMemoPanel. */}
      <AriaMemoPanel
        vendorId={Number(vendor.id)}
        vendorName={vendor.name}
        tier={(vendor as { tier?: number; aria_tier?: number }).aria_tier ?? (vendor as { tier?: number }).tier}
        isFalsePositive={Boolean((vendor as { is_false_positive?: boolean | number }).is_false_positive)}
        fpReason={(vendor as { fp_reason?: string }).fp_reason}
      />

      {/* Risk waterfall */}
      <section aria-labelledby="waterfall-title">
        <SectionTitle id="waterfall-title">
          {isEs ? 'Descomposición del riesgo' : 'Risk decomposition'}
        </SectionTitle>
        <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-4">
          {t('vendors:waterfall.description')}
        </p>
        {waterfallLoading ? (
          <Skeleton className="h-[260px] w-full rounded-sm" />
        ) : waterfall && waterfall.length > 0 ? (
          <WaterfallRiskChart features={waterfall} />
        ) : (
          <p className="text-sm text-text-muted italic">
            {isEs
              ? 'No hay datos de descomposición disponibles.'
              : 'No decomposition data available.'}
          </p>
        )}
      </section>

      {/* Full SHAP — risk-increasing factors */}
      <section
        aria-labelledby="shap-risk-title"
        className="pt-6 border-t border-border/40"
      >
        <SectionTitle id="shap-risk-title">
          {isEs ? 'Factores que elevan el riesgo' : 'Risk-increasing factors'}
        </SectionTitle>
        {riskFactors.length > 0 ? (
          <div className="space-y-3">
            {riskFactors.map((f) => {
              const label = isEs ? f.label_es : parseFactorLabel(f.factor).label
              return (
                <DotBarRow
                  key={f.factor}
                  label={label || f.factor}
                  readout={`+${f.shap.toFixed(2)}`}
                  value={Math.abs(f.shap)}
                  max={maxRisk}
                  color="var(--color-risk-critical)"
                />
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            {t('vendors:noContributingFactors')}
          </p>
        )}
      </section>

      {/* Protective factors */}
      {protectFactors.length > 0 && (
        <section
          aria-labelledby="shap-protect-title"
          className="pt-6 border-t border-border/40"
        >
          <SectionTitle id="shap-protect-title">
            {isEs ? 'Factores protectores' : 'Protective factors'}
          </SectionTitle>
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
                  color="var(--color-signal-live)"
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
          <SectionTitle id="peer-title">
            {isEs ? '§ 9 · La Comparación (sector)' : '§ 9 · Sector Comparison'}
          </SectionTitle>
          <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-4">
            {isEs
              ? `Métricas clave del proveedor frente a la mediana de ${vendor.primary_sector_name ?? 'su sector'}.`
              : `Key metrics versus the sector median for ${vendor.primary_sector_name ?? 'this sector'}.`}
          </p>
          <div className="space-y-3">
            {peerComparison.metrics
              .filter((m) => m.value != null && m.peer_median != null)
              .map((m) => {
                // For risk score and rate metrics, higher = worse (red).
                // For total_contracts / total_value, higher is neutral.
                const isRiskMetric = m.metric === 'avg_risk_score' || m.metric === 'direct_award_pct' || m.metric === 'single_bid_pct'
                const pct = m.percentile ?? 0
                const dotColor = isRiskMetric
                  ? pct >= 75 ? 'var(--color-risk-critical)' : pct >= 50 ? 'var(--color-risk-high)' : 'var(--color-text-muted)'
                  : 'var(--color-accent)'
                const label = (() => {
                  switch (m.metric) {
                    case 'avg_risk_score': return isEs ? 'Puntuación de riesgo' : 'Risk score'
                    case 'total_contracts': return isEs ? 'Contratos totales' : 'Total contracts'
                    case 'total_value_mxn': return isEs ? 'Valor total (MXN)' : 'Total value (MXN)'
                    case 'direct_award_pct': return isEs ? 'Adjudicación directa' : 'Direct award rate'
                    case 'single_bid_pct': return isEs ? 'Licitación sin competencia' : 'Single-bid rate'
                    default: return m.label_en
                  }
                })()
                const readout = (() => {
                  const v = m.value ?? 0
                  const med = m.peer_median ?? 0
                  if (m.metric === 'total_value_mxn') {
                    const fmtV = v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v.toFixed(0)}`
                    const fmtM = med >= 1e9 ? `$${(med / 1e9).toFixed(1)}B` : med >= 1e6 ? `$${(med / 1e6).toFixed(0)}M` : `$${med.toFixed(0)}`
                    return `${fmtV} vs ${fmtM} median`
                  }
                  if (m.metric === 'total_contracts') {
                    return `${v.toFixed(0)} vs ${med.toFixed(0)} median`
                  }
                  return `${(v * 100).toFixed(0)}% vs ${(med * 100).toFixed(0)}% median`
                })()
                return (
                  <DotBarRow
                    key={m.metric}
                    label={label}
                    readout={readout}
                    value={pct}
                    max={100}
                    color={dotColor}
                  />
                )
              })}
          </div>
          {vendor.sector_risk_percentile != null && (
            <p className="text-[11px] text-text-muted font-mono mt-3">
              {isEs
                ? `Percentil ${vendor.sector_risk_percentile} · riesgo vs. ${vendor.primary_sector_name ?? 'sector'}`
                : `${vendor.sector_risk_percentile}th percentile · risk vs. ${vendor.primary_sector_name ?? 'sector'}`}
            </p>
          )}
        </section>
      )}

      {/* § 7 Los Signos — external validation signals (GT cases, EFOS, SFP) */}
      {(groundTruth?.is_known_bad || aria?.is_efos_definitivo || aria?.is_sfp_sanctioned) && (
        <section
          aria-labelledby="signos-title"
          className="pt-6 border-t border-border/40"
        >
          <SectionTitle id="signos-title">
            {isEs ? '§ 7 · Los Signos' : '§ 7 · External Signals'}
          </SectionTitle>
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
            <SectionTitle id="verdict-title">
              {isEs ? '§ 8 · El Veredicto' : '§ 8 · Verdict'}
            </SectionTitle>
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
        <SectionTitle id="method-title">
          {isEs ? 'Metodología' : 'Methodology'}
        </SectionTitle>
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

function SectionTitle({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      id={id}
      className={`text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3 ${className ?? ''}`}
    >
      {children}
    </h2>
  )
}
