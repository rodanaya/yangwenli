/**
 * VendorProfile — v2.
 *
 * Compact composition of VendorHero + 3 tabs (Evidence / Activity / Network).
 * Replaces the 4,733-LOC monolith that this page was before. The IA spec is
 * in `.claude/MARATHON_PLAN.md` (vendor section); the long critique that
 * justified the rebuild lives in `.claude/marathon/critique-batch-B.md`.
 *
 * Feature checklist preserved:
 *   - copy-RFC, name variants, integrity grade link, sector pill, years span
 *   - all priority alerts (GT, EFOS, SFP, ARIA, co-bidding, model risk) via
 *     <PriorityAlert> driven by buildVendorFlags
 *   - top-3 SHAP drivers in hero
 *   - Evidence tab: waterfall + full SHAP + peer comparison + methodology
 *   - Activity tab: risk timeline + top institutions + paginated contracts table
 *   - Network tab: ARIA, linked scandals, co-bidders, external registries
 *   - Header actions: AddToWatchlistButton, GenerateReportButton, ShareButton, CSV export
 *   - Contract drawer (ContractDetailModal) on row click
 *   - Network drawer (NetworkGraphModal) from network tab
 *   - i18n ES/EN throughout
 *   - Tab state via ?tab=
 */
import { useCallback, useState } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Shield,
  Activity,
  Network as NetworkIcon,
} from 'lucide-react'

import { vendorApi } from '@/api/client'
import type { ContractListItem } from '@/api/types'

import { useVendorData, type VendorTabKey } from '@/hooks/useVendorData'
import { buildVendorFlags } from '@/components/vendor/buildFlags'
import { VendorHero } from '@/components/vendor/VendorHero'
import { VendorEvidenceTab } from '@/components/vendor/VendorEvidenceTab'
import { VendorActivityTab } from '@/components/vendor/VendorActivityTab'
import { VendorNetworkTab } from '@/components/vendor/VendorNetworkTab'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SimpleTabs, TabPanel } from '@/components/ui/SimpleTabs'

import { ContractDetailModal } from '@/components/ContractDetailModal'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import { AddToWatchlistButton } from '@/components/AddToWatchlistButton'
import { GenerateReportButton } from '@/components/GenerateReportButton'
import { ShareButton } from '@/components/ShareButton'

const VALID_TABS: VendorTabKey[] = ['evidence', 'activity', 'network']

export function VendorProfile() {
  const { t, i18n } = useTranslation('vendors')
  const { id } = useParams<{ id: string }>()
  const vendorId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') as VendorTabKey | null
  const activeTab: VendorTabKey =
    rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'evidence'
  const setActiveTab = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('tab', key)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const [contractPage, setContractPage] = useState(1)
  const [selectedContract, setSelectedContract] =
    useState<ContractListItem | null>(null)
  const [networkOpen, setNetworkOpen] = useState(false)
  const [csvExporting, setCsvExporting] = useState(false)

  const data = useVendorData(vendorId, {
    activeTab,
    contractsPage: contractPage,
  })

  const isEs = i18n.language.startsWith('es')

  const vendor = data.vendor.data
  const flags = vendor
    ? buildVendorFlags({
        vendor,
        externalFlags: data.externalFlags.data,
        groundTruthStatus: data.groundTruthStatus.data,
        coBidders: data.coBidders.data,
        aria: data.aria.data,
        waterfall: data.waterfall.data,
        t: t as (key: string, vars?: Record<string, string | number>) => string,
      })
    : []

  // CSV export — pulls all contracts (paginated) for the vendor.
  const exportContractsCsv = useCallback(async () => {
    if (!vendorId) return
    setCsvExporting(true)
    try {
      const all = await queryClient.fetchQuery({
        queryKey: ['vendor', vendorId, 'contracts-export'],
        queryFn: () => vendorApi.getContracts(vendorId, { per_page: 100 }),
      })
      const headers = [
        'contract_id', 'title', 'amount_mxn', 'procedure_type',
        'institution_name', 'contract_date', 'risk_score', 'risk_level',
      ]
      const rows = all.data.map((c: ContractListItem) => [
        c.id,
        `"${(c.title ?? '').replace(/"/g, '""')}"`,
        c.amount_mxn ?? '',
        `"${(c.procedure_type ?? '').replace(/"/g, '""')}"`,
        `"${(c.institution_name ?? '').replace(/"/g, '""')}"`,
        c.contract_date ?? c.contract_year ?? '',
        c.risk_score ?? '',
        c.risk_level ?? '',
      ])
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vendor-${vendorId}-contracts.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } finally {
      setCsvExporting(false)
    }
  }, [queryClient, vendorId])

  // ─── Loading ────────────────────────────────────────────────────────────
  if (data.vendor.isLoading) {
    return <VendorProfileSkeleton />
  }

  // ─── Not found / error ─────────────────────────────────────────────────
  if (data.vendor.error || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{t('notFound')}</h2>
        <p className="text-sm text-text-muted mb-4">{t('notFoundDescription')}</p>
        <Button onClick={() => navigate('/explore?tab=vendors')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToVendors')}
        </Button>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {fromAria && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary mb-4 font-mono uppercase tracking-widest"
        >
          <ArrowLeft className="h-3 w-3" />
          {isEs ? 'Volver a ARIA' : 'Back to ARIA'}
        </button>
      )}

      <VendorHero
        vendor={vendor}
        scorecard={data.scorecard.data}
        flags={flags}
        shap={data.shap.data}
        actions={
          <>
            <AddToWatchlistButton
              itemType="vendor"
              itemId={vendorId}
              itemName={vendor.name}
            />
            <GenerateReportButton
              reportType="vendor"
              entityId={vendorId}
              entityName={vendor.name}
            />
            <ShareButton label={isEs ? 'Compartir' : 'Share'} />
            <Button
              variant="outline"
              size="sm"
              onClick={exportContractsCsv}
              disabled={csvExporting}
              className="h-8 text-xs"
              title={isEs ? 'Exportar CSV' : 'Export CSV'}
            >
              {csvExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5 hidden sm:inline">
                {csvExporting
                  ? isEs ? 'Exportando…' : 'Exporting…'
                  : 'CSV'}
              </span>
            </Button>
          </>
        }
      />

      <SimpleTabs
        active={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          {
            key: 'evidence',
            label: isEs ? 'Evidencia' : 'Evidence',
            icon: Shield,
          },
          {
            key: 'activity',
            label: isEs ? 'Actividad' : 'Activity',
            icon: Activity,
          },
          {
            key: 'network',
            label: isEs ? 'Red' : 'Network',
            icon: NetworkIcon,
          },
        ]}
      >
        <TabPanel tabKey="evidence">
          <VendorEvidenceTab
            vendor={vendor}
            waterfall={data.waterfall.data}
            waterfallLoading={data.waterfall.isLoading}
            shap={data.shap.data}
          />
        </TabPanel>
        <TabPanel tabKey="activity">
          <VendorActivityTab
            vendor={vendor}
            contracts={data.contracts.data}
            contractsLoading={data.contracts.isLoading}
            contractsPage={contractPage}
            onContractsPageChange={setContractPage}
            onContractClick={(c) => setSelectedContract(c)}
            lifecycle={data.lifecycle.data}
            institutions={data.institutions.data}
          />
        </TabPanel>
        <TabPanel tabKey="network">
          <VendorNetworkTab
            vendor={vendor}
            aria={data.aria.data}
            linkedScandals={data.linkedScandals.data as
              | { scandals?: Array<{ scandal_slug: string; scandal_title?: string; case_id?: number; case_name?: string; fraud_type?: string }>; cases?: Array<{ scandal_slug: string; scandal_title?: string; case_id?: number; case_name?: string; fraud_type?: string }> }
              | null
              | undefined}
            coBidders={data.coBidders.data}
            externalFlags={data.externalFlags.data}
            onOpenNetworkGraph={() => setNetworkOpen(true)}
          />
        </TabPanel>
      </SimpleTabs>

      {/* Contract detail drawer */}
      <ContractDetailModal
        contractId={selectedContract?.id ?? null}
        open={!!selectedContract}
        onOpenChange={(open) => !open && setSelectedContract(null)}
      />

      {/* Network graph drawer */}
      <NetworkGraphModal
        open={networkOpen}
        onOpenChange={setNetworkOpen}
        centerType="vendor"
        centerId={vendorId}
        centerName={vendor.name}
      />
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────
function VendorProfileSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-5 pb-7 border-b border-border/50 mb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-16 w-full rounded-sm" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-2 w-16 mb-1.5" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-x-6 gap-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-full mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

// Default export so the lazy-loaded route in App.tsx keeps working.
export default VendorProfile
