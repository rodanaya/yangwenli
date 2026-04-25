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
} from '@/api/types'
import { WaterfallRiskChart } from '@/components/WaterfallRiskChart'
import { DotBarRow } from '@/components/ui/DotBar'
import { parseFactorLabel } from '@/lib/risk-factors'
import { Skeleton } from '@/components/ui/skeleton'

interface VendorEvidenceTabProps {
  vendor: VendorDetailResponse
  waterfall?: VendorWaterfallContribution[] | null
  waterfallLoading?: boolean
  shap?: VendorSHAPResponse | null
}

export function VendorEvidenceTab({
  vendor,
  waterfall,
  waterfallLoading,
  shap,
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
