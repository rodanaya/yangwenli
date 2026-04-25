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
} from '@/api/types'
import { DotBarRow } from '@/components/ui/DotBar'
import { ExternalLink, Network } from 'lucide-react'

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
  onOpenNetworkGraph?: () => void
}

export function VendorNetworkTab({
  vendor,
  aria,
  linkedScandals,
  coBidders,
  externalFlags,
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
              <li key={s.scandal_slug}>
                <Link
                  to={`/cases/${s.scandal_slug}`}
                  className="inline-flex items-center gap-2 text-sm text-text-primary hover:text-accent"
                >
                  <span className="font-medium">
                    {s.scandal_title ?? s.case_name ?? s.scandal_slug}
                  </span>
                  {s.fraud_type && (
                    <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                      {s.fraud_type}
                    </span>
                  )}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
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
          <div className="space-y-3">
            {coBidList.slice(0, 6).map((cb) => (
              <DotBarRow
                key={cb.vendor_id}
                label={cb.vendor_name ?? `Vendor ${cb.vendor_id}`}
                readout={`${cb.co_bid_count ?? 0} ${isEs ? 'comp.' : 'shared'}`}
                hint={cb.relationship_strength}
                value={cb.co_bid_count ?? 0}
                max={maxCoBid}
                color="var(--color-risk-high)"
              />
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
