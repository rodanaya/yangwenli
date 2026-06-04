/**
 * VendorDossier — canonical unified dossier at /vendors/:id.
 *
 * 2026-06-03 (DESIGNUS — operational rebuild). Reclassified from a long-form
 * narrative (six full-viewport story chapters, ~18,000px) into a dense
 * OPERATIONAL dossier an investigator can triage without scrolling:
 *
 *   Hero            — identity + verdict seal (name · score · tier · flags)
 *   Command panel   — VendorStatStrip + VendorDiagnosticGrid (the at-a-glance:
 *                     the decisive numbers, why flagged, OECD deviation, top
 *                     clients, risk-over-time). Replaces the six narrative
 *                     chapters, which merely duplicated the reference tabs.
 *   Evidence        — full SHAP / waterfall / peer / external signals
 *   Activity        — risk timeline + institutions + paginated contracts table
 *   Network         — ARIA / external registries / linked cases / co-bidders
 *   Methodology     — provenance footer
 *
 * The scroll-driven narrative version still lives at /thread/:vendorId; the
 * thread chapter components (TimelineHourglass, MoneyStaircase, …) are no
 * longer imported here. /print/vendors/:id retains the legacy VendorProfile.
 */

import { lazy, Suspense, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '@/api/client'
import { AlertTriangle, ArrowLeft, Download } from 'lucide-react'
import type { ContractListItem, VendorLinkedScandalsResponse } from '@/api/types'

import { useVendorData } from '@/hooks/useVendorData'
import { buildVendorFlags } from '@/components/vendor/buildFlags'
import { VendorHero } from '@/components/vendor/VendorHero'
import { VendorStatStrip, VendorDiagnosticGrid } from '@/components/vendor/VendorCommandPanel'
import { VendorEvidenceTab } from '@/components/vendor/VendorEvidenceTab'
import { VendorActivityTab } from '@/components/vendor/VendorActivityTab'
import { VendorNetworkTab } from '@/components/vendor/VendorNetworkTab'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTOR_COLORS } from '@/lib/constants'

const ContractDetailModal = lazy(() =>
  import('@/components/ContractDetailModal').then((m) => ({ default: m.ContractDetailModal })),
)
const NetworkGraphModal = lazy(() =>
  import('@/components/NetworkGraphModal').then((m) => ({ default: m.NetworkGraphModal })),
)

// ─── Reference-section header — tight, left-aligned (replaces the old centered
//     py-12 plate). Mono § eyebrow + italic title + sector-tinted rule. ───────

function DossierSectionHeader({
  id,
  eyebrow,
  title,
  meta,
  accent,
}: {
  id: string
  eyebrow: string
  title: string
  meta?: string
  accent: string
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 pb-2 mb-5"
      style={{ borderBottom: `1px solid ${accent}33` }}
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <span
          id={`${id}-eyebrow`}
          className="font-mono flex-shrink-0"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: accent,
            fontWeight: 700,
          }}
        >
          § {eyebrow}
        </span>
        <h2
          className="truncate"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 18,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.005em',
          }}
        >
          {title}
        </h2>
      </div>
      {meta && (
        <span
          className="font-mono tabular-nums flex-shrink-0"
          style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
        >
          {meta}
        </span>
      )}
    </div>
  )
}

// ─── ProvenanceFooter ───────────────────────────────────────────────────────

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="mt-16 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p
        className="font-mono mb-2"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
        }}
      >
        § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
      </p>
      <p
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13.5,
          color: 'var(--color-text-secondary)',
          maxWidth: '72ch',
          lineHeight: 1.55,
        }}
      >
        {lang === 'es'
          ? 'Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5 entrenado con 1,427 casos de corrupción documentados. Las señales del modelo son indicadores estadísticos, no determinaciones legales.'
          : 'COMPRANET data 2002–2025. v0.8.5 risk model trained on 1,427 documented corruption cases. Model signals are statistical indicators, not legal determinations.'}
      </p>
      <button
        type="button"
        onClick={() => navigate('/methodology')}
        className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-text-secondary)',
          background: 'none',
          border: 'none',
        }}
      >
        {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
      </button>
    </section>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function VendorDossier() {
  const { id } = useParams<{ id: string }>()
  const vendorId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation(['vendors', 'common'])
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [selectedContract, setSelectedContract] = useState<ContractListItem | null>(null)
  const [networkOpen, setNetworkOpen] = useState(false)
  const [contractPage, setContractPage] = useState(1)
  const [csvExporting, setCsvExporting] = useState(false)

  const data = useVendorData(vendorId, { contractsPage: contractPage })
  const vendor = data.vendor.data

  const sectorCode = vendor?.primary_sector_name?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#dc2626'

  if (data.vendor.isLoading) {
    return <DossierSkeleton />
  }
  if (data.vendor.error || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">
          {lang === 'es' ? 'Proveedor no encontrado' : 'Vendor not found'}
        </h2>
        <Button onClick={() => navigate('/explore?tab=vendors')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {lang === 'es' ? 'Volver a /explore' : 'Back to /explore'}
        </Button>
      </div>
    )
  }

  const flags = buildVendorFlags({
    vendor,
    aria: data.aria.data,
    groundTruthStatus: data.groundTruthStatus.data,
    externalFlags: data.externalFlags.data,
    coBidders: data.coBidders.data,
    waterfall: data.waterfall.data,
    t: t as (key: string, vars?: Record<string, string | number>) => string,
  })

  // CSV export — preserved from legacy VendorProfile
  async function exportContractsCsv() {
    if (csvExporting) return
    setCsvExporting(true)
    try {
      const all = await queryClient.fetchQuery({
        queryKey: ['vendor', vendorId, 'contracts', 'all'],
        queryFn: () => vendorApi.getContracts(vendorId, { per_page: 500 }),
      })
      const headers = ['contract_id', 'title', 'amount_mxn', 'procedure_type', 'institution_name', 'contract_date', 'risk_score', 'risk_level']
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
  }

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'
  const isGroundTruth = !!data.groundTruthStatus.data?.is_known_bad

  // Timeline (risk-over-years) for the diagnostic grid's "risk over time" panel.
  const timelineForGrid = (data.lifecycle.data?.timeline ?? []).map((item) => ({
    year: item.year,
    avg_risk_score: item.avg_risk_score ?? null,
  }))

  // Top institutions for the "where the money goes" panel.
  const institutionsForGrid = (data.institutions.data?.data ?? []).map((inst) => ({
    institution_id: inst.institution_id,
    institution_name: inst.institution_name,
    total_value_mxn: inst.total_value_mxn,
  }))

  const contractsTotal = data.contracts.data?.pagination?.total ?? vendor.total_contracts

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {fromAria && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary mb-4 font-mono uppercase tracking-widest"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          {lang === 'es' ? 'Volver a ARIA' : 'Back to ARIA'}
        </button>
      )}

      {/* HERO — identity + verdict seal */}
      <VendorHero
        vendor={vendor}
        scorecard={data.scorecard.data}
        flags={flags}
        shap={data.shap.data}
        ariaTier={data.aria.data?.ips_tier ?? null}
        isGroundTruth={isGroundTruth}
        showTOC={false}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportContractsCsv}
            disabled={csvExporting}
            className="h-8 text-xs"
            title={lang === 'es' ? 'Exportar CSV' : 'Export CSV'}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="ml-1.5 hidden sm:inline">CSV</span>
          </Button>
        }
      />

      {/* COMMAND PANEL — the operational at-a-glance (replaces 6 chapters) */}
      <div className="mt-6">
        <VendorStatStrip vendor={vendor} lang={lang} />
      </div>
      <div className="mt-7">
        <VendorDiagnosticGrid
          vendor={vendor}
          shap={data.shap.data}
          institutions={institutionsForGrid}
          timeline={timelineForGrid}
          lang={lang}
        />
      </div>

      {/* REFERENCE — the full record, full-width, tight section headers */}
      <div className="mt-14 space-y-14">
        <section id="evidence" className="scroll-mt-20">
          <DossierSectionHeader
            id="evidence"
            eyebrow={lang === 'es' ? 'Evidencia' : 'Evidence'}
            title={lang === 'es' ? 'La lectura del modelo' : "The model's reading"}
            meta={lang === 'es' ? 'SHAP · pares · señales' : 'SHAP · peers · signals'}
            accent={sectorAccent}
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
        </section>

        <section id="activity" className="scroll-mt-20">
          <DossierSectionHeader
            id="activity"
            eyebrow={lang === 'es' ? 'Actividad' : 'Activity'}
            title={lang === 'es' ? 'El historial' : 'The track record'}
            meta={`${contractsTotal.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US')} ${lang === 'es' ? 'contratos' : 'contracts'}`}
            accent={sectorAccent}
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
            contractAggregate={data.contractAggregate.data}
          />
        </section>

        <section id="network" className="scroll-mt-20">
          <DossierSectionHeader
            id="network"
            eyebrow={lang === 'es' ? 'Red' : 'Network'}
            title={lang === 'es' ? 'Vínculos y validación' : 'Ties and validation'}
            meta={lang === 'es' ? 'ARIA · registros · casos' : 'ARIA · registries · cases'}
            accent={sectorAccent}
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
        </section>
      </div>

      <ProvenanceFooter lang={lang} />

      {/* Modals */}
      {selectedContract && (
        <Suspense fallback={null}>
          <ContractDetailModal
            contractId={selectedContract?.id ?? null}
            open={!!selectedContract}
            onOpenChange={(open) => !open && setSelectedContract(null)}
          />
        </Suspense>
      )}
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


// ─── Skeleton ──────────────────────────────────────────────────────────────

function DossierSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-12 w-96" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
