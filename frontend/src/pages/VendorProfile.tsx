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
import { lazy, Suspense, useCallback, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  Loader2,
  Map as MapIcon,
} from 'lucide-react'
import { vendorApi } from '@/api/client'
import type { ContractListItem, VendorLinkedScandalsResponse } from '@/api/types'

import { useVendorData } from '@/hooks/useVendorData'
import { buildVendorFlags } from '@/components/vendor/buildFlags'
import { VendorHero } from '@/components/vendor/VendorHero'
import { VendorEvidenceTab } from '@/components/vendor/VendorEvidenceTab'
import { VendorActivityTab } from '@/components/vendor/VendorActivityTab'
import { VendorNetworkTab } from '@/components/vendor/VendorNetworkTab'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const ContractDetailModal = lazy(() =>
  import('@/components/ContractDetailModal').then((m) => ({ default: m.ContractDetailModal }))
)
const NetworkGraphModal = lazy(() =>
  import('@/components/NetworkGraphModal').then((m) => ({ default: m.NetworkGraphModal }))
)
import { AddToWatchlistButton } from '@/components/AddToWatchlistButton'
import { GenerateReportButton } from '@/components/GenerateReportButton'
import { ShareButton } from '@/components/ShareButton'

export function VendorProfile() {
  const { t, i18n } = useTranslation('vendors')
  const { id } = useParams<{ id: string }>()
  const vendorId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [contractPage, setContractPage] = useState(1)
  const [selectedContract, setSelectedContract] =
    useState<ContractListItem | null>(null)
  const [networkOpen, setNetworkOpen] = useState(false)
  const [csvExporting, setCsvExporting] = useState(false)

  const data = useVendorData(vendorId, {
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
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{t('notFound')}</h2>
        <p className="text-sm text-text-muted mb-4">{t('notFoundDescription')}</p>
        <Button onClick={() => navigate('/explore?tab=vendors')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
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
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          {isEs ? 'Volver a ARIA' : 'Back to ARIA'}
        </button>
      )}

      <VendorHero
        vendor={vendor}
        scorecard={data.scorecard.data}
        flags={flags}
        shap={data.shap.data}
        ariaTier={data.aria.data?.ips_tier ?? null}
        actions={
          <>
            {/* Thread CTA — only for T1 ARIA vendors that have a full investigation narrative */}
            {data.aria.data?.ips_tier === 1 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate(`/thread/${vendorId}`)}
                className="h-8 text-xs"
                title={isEs ? 'Abrir narrativa de investigación' : 'Open investigation narrative'}
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="ml-1.5 hidden sm:inline">
                  {isEs ? 'Hilo' : 'Thread'}
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Push this vendor into the spatial-map recent-jumps list so
                // it appears at top of ⌘K Recent on /. Same key as the
                // overlay (rubli_explore_recent_v1).
                try {
                  const KEY = 'rubli_explore_recent_v1'
                  const cur = JSON.parse(localStorage.getItem(KEY) || '[]')
                  const filtered = (Array.isArray(cur) ? cur : []).filter(
                    (x: { kind?: string; id?: number }) => !(x.kind === 'vendor' && x.id === vendorId),
                  )
                  const next = [
                    { kind: 'vendor', id: vendorId, label: vendor.name },
                    ...filtered,
                  ].slice(0, 8)
                  localStorage.setItem(KEY, JSON.stringify(next))
                } catch {
                  /* private mode */
                }
                navigate('/')
              }}
              className="h-8 text-xs"
              title={isEs ? 'Abrir en el mapa espacial' : 'Open in spatial map'}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="ml-1.5 hidden sm:inline">
                {isEs ? 'Mapa' : 'Map'}
              </span>
            </Button>
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
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
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

      {/* ── Single-scroll dossier: three chapters, no tab chrome ─────────────
          Chapter structure mirrors RedThread: accent kicker + serif h2 header,
          dot-rule divider between chapters, content sections below.          */}
      <div id="evidence">
        <ChapterHeader
          folio="§ I"
          kicker={isEs ? 'Riesgo' : 'Risk'}
          title={isEs ? 'El Análisis de Riesgo' : 'The Risk Analysis'}
        />
        <VendorEvidenceTab
          vendor={vendor}
          waterfall={data.waterfall.data}
          waterfallLoading={data.waterfall.isLoading}
          shap={data.shap.data}
          aria={data.aria.data}
          groundTruth={data.groundTruthStatus.data}
          peerComparison={data.peerComparison.data}
        />
      </div>

      <ChapterDivider />

      <div id="activity">
        <ChapterHeader
          folio="§ II"
          kicker={isEs ? 'Actividad' : 'Activity'}
          title={isEs ? 'La Trayectoria Contractual' : 'The Contract Track Record'}
        />
        <VendorActivityTab
          vendor={vendor}
          contracts={data.contracts.data}
          contractsLoading={data.contracts.isLoading}
          contractsPage={contractPage}
          onContractsPageChange={setContractPage}
          onContractClick={(c) => setSelectedContract(c)}
          lifecycle={data.lifecycle.data}
          institutions={data.institutions.data}
          peerComparison={data.peerComparison.data}
        />
      </div>

      <ChapterDivider />

      <div id="network">
        <ChapterHeader
          folio="§ III"
          kicker={isEs ? 'Red' : 'Network'}
          title={isEs ? 'Las Conexiones' : 'The Connections'}
        />
        <VendorNetworkTab
          vendor={vendor}
          aria={data.aria.data}
          linkedScandals={data.linkedScandals.data as VendorLinkedScandalsResponse | null | undefined}
          coBidders={data.coBidders.data}
          externalFlags={data.externalFlags.data}
          shap={data.shap.data}
          onOpenNetworkGraph={() => setNetworkOpen(true)}
        />
      </div>

      {/* § 10 Acciones + Procedencia — provenance footer */}
      <ChapterDivider />
      <ProvenanceFooter isEs={isEs} />

      {/* Contract detail drawer — lazy */}
      {selectedContract && (
        <Suspense fallback={null}>
          <ContractDetailModal
            contractId={selectedContract?.id ?? null}
            open={!!selectedContract}
            onOpenChange={(open) => !open && setSelectedContract(null)}
          />
        </Suspense>
      )}

      {/* Network graph drawer — lazy loads echarts only when opened */}
      {networkOpen && (
        <Suspense fallback={null}>
          <NetworkGraphModal
            open={networkOpen}
            onOpenChange={setNetworkOpen}
            centerType="vendor"
            centerId={vendorId}
            centerName={vendor.name}
          />
        </Suspense>
      )}
    </div>
  )
}

// ─── Chapter chrome — mirrors RedThread editorial register ───────────────
// ChapterDivider: dot-rule between chapters (matches RedThread.tsx:117-125)
function ChapterDivider() {
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="h-px flex-1 bg-background-elevated" />
      <div
        className="w-0.5 h-0.5 rounded-full opacity-50"
        style={{ background: 'var(--color-accent)' }}
      />
      <div className="h-px flex-1 bg-background-elevated" />
    </div>
  )
}

// ChapterHeader: IBM Plex Mono italic accent kicker + EB Garamond serif h2
// (matches ChapterLabel + RedThreadChapter pattern in RedThread.tsx:92-115)
function ChapterHeader({
  folio,
  kicker,
  title,
}: {
  folio: string
  kicker: string
  title: string
}) {
  return (
    <header className="pt-8 pb-4">
      <div
        style={{
          fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
          fontSize: '10px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#a06820',
          fontStyle: 'italic',
          fontWeight: 500,
          marginBottom: '0.6rem',
        }}
      >
        {folio} · {kicker}
      </div>
      <h2
        className="text-xl font-bold text-text-primary mb-3"
        style={{
          fontFamily: 'var(--font-family-serif)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
    </header>
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

// ─── § 10 Provenance footer ────────────────────────────────────────────────
function ProvenanceFooter({ isEs }: { isEs: boolean }) {
  const sources = [
    {
      label: isEs ? 'COMPRANET 2002–2025' : 'COMPRANET 2002–2025',
      note: isEs ? '~3.1M contratos federales' : '~3.1M federal contracts',
    },
    {
      label: isEs ? 'SAT EFOS' : 'SAT EFOS register',
      note: isEs ? 'Lista de contribuyentes con operaciones simuladas' : 'Fictitious invoice company register',
    },
    {
      label: isEs ? 'SFP Sanciones' : 'SFP Sanctions',
      note: isEs ? 'Registro de personas inhabilitadas' : 'Federal debarment register',
    },
    {
      label: isEs ? 'Casos de corrupción' : 'Corruption cases',
      note: isEs ? `${1427} casos verificados manualmente` : `${1427} manually verified cases`,
    },
  ]

  return (
    <section
      aria-labelledby="provenance-title"
      className="py-8 border-t border-border/30"
    >
      <p
        className="text-[9px] font-mono uppercase tracking-[0.18em] mb-4"
        style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 500 }}
      >
        § 10 · {isEs ? 'Procedencia' : 'Provenance'}
      </p>

      {/* Data sources */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {sources.map((src) => (
          <div
            key={src.label}
            className="px-3 py-2.5 rounded-sm border border-border/40 bg-background-card"
          >
            <p className="text-[10px] font-mono font-semibold text-text-primary uppercase tracking-[0.1em] mb-1">
              {src.label}
            </p>
            <p className="text-[10px] text-text-muted leading-snug">{src.note}</p>
          </div>
        ))}
      </div>

      {/* Methodology + limitations */}
      <div className="space-y-2.5 max-w-2xl">
        <p className="text-[11px] text-text-muted leading-relaxed">
          {isEs
            ? `Modelo v0.8.5 · AUC 0.785 · entrenado sobre ${(1427).toLocaleString('es-MX')} casos confirmados. El indicador de riesgo es una señal estadística de similitud de patrones — no es una probabilidad de corrupción ni una conclusión legal.`
            : `Model v0.8.5 · AUC 0.785 · trained on ${(1427).toLocaleString('en-US')} verified cases. The risk indicator is a statistical pattern-similarity signal — not a corruption probability or legal finding.`}
        </p>
        <a
          href="/methodology"
          className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-accent hover:text-accent/80 transition-colors"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          {isEs ? 'Metodología completa →' : 'Full methodology →'}
        </a>
      </div>
    </section>
  )
}

// Default export so the lazy-loaded route in App.tsx keeps working.
export default VendorProfile
