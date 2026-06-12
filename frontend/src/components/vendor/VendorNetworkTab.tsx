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
  VendorLinkedScandalsResponse,
  VendorSHAPResponse,
} from '@/api/types'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { SubSectionTitle } from '@/components/dossier/SubSectionTitle'
import { RISK_COLORS } from '@/lib/constants'
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

interface VendorNetworkTabProps {
  vendor: VendorDetailResponse
  aria?: AriaQueueItem | null
  linkedScandals?: VendorLinkedScandalsResponse | null
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
  const { t, i18n } = useTranslation(['vendors', 'aria'])
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
      {aria && (() => {
        const tierColor =
          aria.ips_tier === 1 ? RISK_COLORS.critical :
          aria.ips_tier === 2 ? RISK_COLORS.high :
          aria.ips_tier === 3 ? RISK_COLORS.medium :
          'var(--color-text-muted)'
        return (
        <section aria-labelledby="aria-title">
          <SubSectionTitle id="aria-title">
            {isEs ? 'Cola de Investigación ARIA' : 'ARIA Investigation Queue'}
          </SubSectionTitle>
          {/* Editorial investigation plate — the headline finding for a T1
              vendor, read like one: tier badge + focal IPS numeral. */}
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderLeft: `2px solid ${tierColor}`,
              borderRadius: 2,
              padding: 14,
              background: 'var(--color-background-card)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className="font-mono font-bold tabular-nums"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: tierColor,
                  border: `1px solid ${tierColor}`,
                  borderRadius: 2,
                  padding: '2px 7px',
                }}
              >
                T{aria.ips_tier}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                {isEs ? 'Cola de investigación' : 'Investigation queue'}
              </span>
            </div>

            <div className="mt-3">
              <span
                className="tabular-nums"
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 800,
                  fontSize: 32,
                  lineHeight: 1,
                  color: tierColor,
                }}
              >
                {aria.ips_final?.toFixed(2) ?? '—'}
              </span>
              <div
                className="font-mono mt-1.5"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                {isEs ? 'IPS final · prioridad de investigación' : 'IPS final · investigation priority'}
              </div>
            </div>

            <div className="mt-3 space-y-1 text-[11px] font-mono tabular-nums">
              <div>
                <span className="text-text-muted">{isEs ? 'Estado: ' : 'Status: '}</span>
                <span className="text-text-secondary uppercase tracking-wider">
                  {aria.review_status
                    ? t(`aria:status.${aria.review_status}`, { defaultValue: aria.review_status })
                    : '—'}
                </span>
              </div>
              {aria.primary_pattern && (
                <div>
                  <span className="text-text-muted">{isEs ? 'Patrón: ' : 'Pattern: '}</span>
                  <span className="text-text-secondary">{aria.primary_pattern}</span>
                  {aria.pattern_confidence != null && (
                    <span className="text-text-muted ml-1.5">
                      ({(aria.pattern_confidence * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
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
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </section>
        )
      })()}

      {scandalList.length > 0 && (
        <section
          aria-labelledby="scandals-title"
          className="pt-2"
        >
          <SubSectionTitle id="scandals-title">
            {isEs ? 'Casos documentados vinculados' : 'Linked documented cases'}
          </SubSectionTitle>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1.5">
            {scandalList.slice(0, 10).map((s) => (
              <li key={s.scandal_slug} className="flex items-center gap-2 min-w-0">
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
          className="pt-2"
        >
          <div className="flex items-center justify-between mb-3">
            <SubSectionTitle id="cobid-title" className="mb-0">
              {isEs ? 'Socios co-licitantes' : 'Co-bidding partners'}
            </SubSectionTitle>
            {onOpenNetworkGraph && (
              <button
                type="button"
                onClick={onOpenNetworkGraph}
                className="inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline"
              >
                <Network className="h-3 w-3" aria-hidden="true" />
                {isEs ? 'Ver grafo completo' : 'View full graph'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-2">
            {coBidList.slice(0, 6).map((cb) => (
              <div key={cb.vendor_id} className="flex items-center gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <EntityIdentityChip
                    type="vendor"
                    id={cb.vendor_id}
                    name={cb.vendor_name ?? `Vendor ${cb.vendor_id}`}
                    size="sm"
                    fullName
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
            className="pt-2"
          >
            <SubSectionTitle id="ext-title">
              {isEs ? 'Registros externos' : 'External registries'}
            </SubSectionTitle>
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
