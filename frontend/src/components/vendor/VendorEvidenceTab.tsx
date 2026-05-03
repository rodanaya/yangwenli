/**
 * VendorEvidenceTab — why the model reached its verdict.
 *
 * Risk waterfall, full SHAP breakdown, peer comparison, methodology link.
 * Single-purpose: no activity, no network, no external registries.
 */
import { useTranslation } from 'react-i18next'
import type {
  VendorDetailResponse,
  VendorSHAPResponse,
  VendorWaterfallContribution,
  AriaQueueItem,
} from '@/api/types'
import { WaterfallRiskChart } from '@/components/WaterfallRiskChart'
import { DotBarRow } from '@/components/ui/DotBar'
import { parseFactorLabel } from '@/lib/risk-factors'
import { Skeleton } from '@/components/ui/skeleton'
import { AriaMemoPanel } from '@/components/widgets/AriaMemoPanel'
import { getVerdictForVendor } from '@/lib/entity/verdict'

interface VendorEvidenceTabProps {
  vendor: VendorDetailResponse
  waterfall?: VendorWaterfallContribution[] | null
  waterfallLoading?: boolean
  shap?: VendorSHAPResponse | null
  aria?: AriaQueueItem | null
}

export function VendorEvidenceTab({
  vendor,
  waterfall,
  waterfallLoading,
  shap,
  aria,
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

      {/* Peer comparison summary (percentile) */}
      {vendor.sector_risk_percentile != null && (
        <section
          aria-labelledby="peer-title"
          className="pt-6 border-t border-border/40"
        >
          <SectionTitle id="peer-title">
            {isEs ? 'Posición en el sector' : 'Position within sector'}
          </SectionTitle>
          <p className="text-sm text-text-secondary leading-relaxed max-w-prose">
            {isEs
              ? `Este proveedor está en el percentil ${(vendor.sector_risk_percentile * 100).toFixed(0)} de su sector (${vendor.primary_sector_name ?? 'desconocido'}).`
              : `This vendor is in the ${(vendor.sector_risk_percentile * 100).toFixed(0)}th percentile of its sector (${vendor.primary_sector_name ?? 'unknown'}).`}
          </p>
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
