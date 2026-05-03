/**
 * VendorNetworkTab — who the vendor is connected to.
 *
 * ARIA investigation summary, linked scandals (GT cases), co-bidding
 * partners, external registry flags (SFP/ASF/RUPC/EFOS).
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type {
  AriaQueueItem,
  CoBiddersResponse,
  VendorDetailResponse,
  VendorExternalFlags,
  VendorSHAPResponse,
} from '@/api/types'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { ExternalLink, Network } from 'lucide-react'

const FACTOR_LABELS_ES: Record<string, string> = {
  price_volatility: 'Volatilidad de precios',
  vendor_concentration: 'Concentración en dependencias',
  price_ratio: 'Ratio precio/referencia',
  institution_diversity: 'Diversidad institucional',
  cobid_herfindahl: 'Concentración co-licitantes',
  recency_z: 'Peso reciente',
  amount_residual_z: 'Monto fuera de rango',
  network_member_count: 'Tamaño de red',
  amendment_flag: 'Enmiendas en contratos',
  ad_period_days: 'Plazo de adjudicación',
  direct_award: 'Adjudicaciones directas',
  pub_delay_z: 'Retraso de publicación',
  win_rate: 'Tasa de victoria',
  same_day_count: 'Contratos mismo día',
}

const FACTOR_LABELS_EN: Record<string, string> = {
  price_volatility: 'Price volatility',
  vendor_concentration: 'Institutional concentration',
  price_ratio: 'Price/reference ratio',
  institution_diversity: 'Institutional diversity',
  cobid_herfindahl: 'Co-bidder concentration',
  recency_z: 'Recency weight',
  amount_residual_z: 'Amount out of range',
  network_member_count: 'Network size',
  amendment_flag: 'Contract amendments',
  ad_period_days: 'Award period length',
  direct_award: 'Direct awards',
  pub_delay_z: 'Publication delay',
  win_rate: 'Win rate',
  same_day_count: 'Same-day contracts',
}

interface LinkedScandalItem {
  scandal_slug: string
  scandal_title?: string
  case_id?: number
  case_name?: string
  fraud_type?: string
}

interface VendorNetworkTabProps {
  vendor: VendorDetailResponse
  aria?: AriaQueueItem | null
  linkedScandals?: { scandals?: LinkedScandalItem[]; cases?: LinkedScandalItem[] } | null
  coBidders?: CoBiddersResponse | null
  externalFlags?: VendorExternalFlags | null
  shap?: VendorSHAPResponse | null
  onOpenNetworkGraph?: () => void
}

export function VendorNetworkTab({
  vendor,
  aria,
  linkedScandals,
  coBidders,
  externalFlags,
  shap,
  onOpenNetworkGraph,
}: VendorNetworkTabProps) {
  const { i18n } = useTranslation(['vendors'])
  const isEs = i18n.language.startsWith('es')

  const scandalList =
    linkedScandals?.scandals ?? linkedScandals?.cases ?? []

  const coBidList = coBidders?.co_bidders ?? []
  const maxCoBid = coBidList.reduce(
    (m, cb) => Math.max(m, cb.co_bid_count ?? 0),
    1
  )

  return (
    <div className="space-y-8">
      {aria && (
        <section aria-labelledby="aria-title">
          <SectionTitle id="aria-title">
            {isEs ? 'Cola de Investigación ARIA' : 'ARIA Investigation Queue'}
          </SectionTitle>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCell label={isEs ? 'Nivel' : 'Tier'} value={`T${aria.ips_tier}`} />
            <StatCell label="IPS" value={aria.ips_final?.toFixed(2) ?? '—'} />
            <StatCell label={isEs ? 'Estado' : 'Status'} value={aria.review_status} />
          </div>
          {aria.primary_pattern && (
            <p className="mt-3 text-sm text-text-secondary">
              <span className="text-text-muted">
                {isEs ? 'Patrón principal:' : 'Primary pattern:'}
              </span>{' '}
              <span className="font-medium text-text-primary">
                {aria.primary_pattern}
              </span>
              {aria.pattern_confidence != null && (
                <span className="text-text-muted ml-2 font-mono tabular-nums">
                  ({(aria.pattern_confidence * 100).toFixed(0)}%)
                </span>
              )}
            </p>
          )}
          {/* § 3 · El Patrón — top SHAP risk drivers */}
          {shap && shap.top_risk_factors.length > 0 && (() => {
            const topFactors = shap.top_risk_factors.slice(0, 3)
            const maxShap = topFactors.reduce((m, f) => Math.max(m, Math.abs(f.shap)), 0.001)
            const factorLabels = isEs ? FACTOR_LABELS_ES : FACTOR_LABELS_EN
            return (
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">
                  {isEs ? '§ 3 · Señales del modelo' : '§ 3 · Model signals'}
                </div>
                <div className="space-y-2">
                  {topFactors.map((f) => (
                    <div key={f.factor} className="flex items-center gap-2">
                      <span className="text-[11px] text-text-secondary min-w-0 flex-1 truncate">
                        {factorLabels[f.factor] ?? f.factor}
                      </span>
                      <DotBar
                        value={Math.abs(f.shap)}
                        max={maxShap}
                        color="var(--color-risk-high)"
                      />
                      <span className="text-[11px] font-mono tabular-nums text-risk-high flex-shrink-0 w-12 text-right">
                        +{f.shap.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          <Link
            to={`/aria/${vendor.id}`}
            className="text-sm text-accent hover:underline mt-3 inline-flex items-center gap-1"
          >
            {isEs ? 'Abrir panel de investigación' : 'Open investigation panel'}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </section>
      )}

      {scandalList.length > 0 && (
        <section
          aria-labelledby="scandals-title"
          className="pt-6 border-t border-border/40"
        >
          <SectionTitle id="scandals-title">
            {isEs ? 'Casos documentados vinculados' : 'Linked documented cases'}
          </SectionTitle>
          <ul className="space-y-1.5">
            {scandalList.slice(0, 10).map((s) => (
              <li key={s.scandal_slug} className="flex items-center gap-2">
                <EntityIdentityChip
                  type="case"
                  id={s.scandal_slug}
                  name={s.scandal_title ?? s.case_name ?? s.scandal_slug}
                  size="sm"
                />
                {s.fraud_type && (
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                    {s.fraud_type}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {coBidList.length > 0 && (
        <section
          aria-labelledby="cobid-title"
          className="pt-6 border-t border-border/40"
        >
          <div className="flex items-center justify-between mb-3">
            <SectionTitle id="cobid-title" className="mb-0">
              {isEs ? 'Socios co-licitantes' : 'Co-bidding partners'}
            </SectionTitle>
            {onOpenNetworkGraph && (
              <button
                type="button"
                onClick={onOpenNetworkGraph}
                className="inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline"
              >
                <Network className="h-3 w-3" />
                {isEs ? 'Ver grafo completo' : 'View full graph'}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {coBidList.slice(0, 6).map((cb) => (
              <div key={cb.vendor_id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <EntityIdentityChip
                    type="vendor"
                    id={cb.vendor_id}
                    name={cb.vendor_name ?? `Vendor ${cb.vendor_id}`}
                    size="xs"
                  />
                </div>
                <DotBar
                  value={cb.co_bid_count ?? 0}
                  max={maxCoBid}
                  color="var(--color-risk-high)"
                />
                <span className="text-[11px] font-mono tabular-nums text-text-muted flex-shrink-0 w-14 text-right">
                  {cb.co_bid_count ?? 0} {isEs ? 'comp.' : 'shared'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {externalFlags &&
        (externalFlags.sat_efos ||
          externalFlags.sfp_sanctions?.length ||
          externalFlags.asf_cases?.length ||
          externalFlags.rupc) && (
          <section
            aria-labelledby="ext-title"
            className="pt-6 border-t border-border/40"
          >
            <SectionTitle id="ext-title">
              {isEs ? 'Registros externos' : 'External registries'}
            </SectionTitle>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {externalFlags.sat_efos && (
                <ExtCell label="SAT EFOS" value={externalFlags.sat_efos.stage} />
              )}
              {externalFlags.sfp_sanctions?.length ? (
                <ExtCell
                  label="SFP"
                  value={`${externalFlags.sfp_sanctions.length} ${isEs ? 'sanciones' : 'sanctions'}`}
                />
              ) : null}
              {externalFlags.asf_cases?.length ? (
                <ExtCell
                  label="ASF"
                  value={`${externalFlags.asf_cases.length} ${isEs ? 'casos' : 'cases'}`}
                />
              ) : null}
              {externalFlags.rupc && (
                <ExtCell label="RUPC" value={isEs ? 'Listado' : 'Listed'} />
              )}
            </div>
          </section>
        )}
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border p-3 bg-background-card">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
        {label}
      </div>
      <div className="text-lg font-bold font-mono tabular-nums text-text-primary mt-0.5">
        {value}
      </div>
    </div>
  )
}

function ExtCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-sm border border-border bg-background-card">
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
        {label}
      </span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  )
}
