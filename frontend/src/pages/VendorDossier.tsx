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
 * The Red Thread narrative (/thread/:vendorId) was RETIRED 2026-06-07 and
 * folded into this single dossier — its six chapters duplicated the reference
 * sections below. /thread/:vendorId now redirects here; its one additive
 * element (civic-scale equivalences) is ported as <VendorEquivalences>.
 * /print/vendors/:id retains the legacy VendorProfile.
 */

import { lazy, Suspense, useState, type ReactNode } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '@/api/client'
import { AlertTriangle, ArrowLeft, ArrowRight, Download } from 'lucide-react'
import type {
  AriaQueueItem,
  ContractListItem,
  VendorDetailResponse,
  VendorGroundTruthStatus,
  VendorLinkedScandalsResponse,
  VendorTenureInstitution,
} from '@/api/types'

import { useVendorData } from '@/hooks/useVendorData'
import { buildVendorFlags } from '@/components/vendor/buildFlags'
import { VendorHero } from '@/components/vendor/VendorHero'
import { VendorStatStrip, VendorDiagnosticGrid } from '@/components/vendor/VendorCommandPanel'
import { VendorEvidenceTab } from '@/components/vendor/VendorEvidenceTab'
import { VendorActivityTab } from '@/components/vendor/VendorActivityTab'
import { VendorNetworkTab } from '@/components/vendor/VendorNetworkTab'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WayfindingSpine } from '@/components/nav/WayfindingSpine'
import { DossierOriginProvider, type WayfindingLinkState } from '@/lib/nav/wayfinding'
import { formatEntityName } from '@/lib/entity/format'
import { DossierSectionHeader } from '@/components/dossier/DossierSectionHeader'
import { SECTOR_COLORS } from '@/lib/constants'

const ContractDetailModal = lazy(() =>
  import('@/components/ContractDetailModal').then((m) => ({ default: m.ContractDetailModal })),
)
const NetworkGraphModal = lazy(() =>
  import('@/components/NetworkGraphModal').then((m) => ({ default: m.NetworkGraphModal })),
)

// ─── La Coda · § ADÓNDE IR ───────────────────────────────────────────────────
//
// Charter A∞−1 exit ramp (Archetype A): ≥1 investigate CTA + ≥2 EntityIdentity
// chips drawn from the already-loaded cross-link graph (no new API calls).
// Vendor cross-link graph: Institution (top buyer) · Pattern (primary ARIA) ·
// Case (GT/linked-scandal anchor) · Network (co-bidding community via the
// network-graph modal). Chips are computed defensively — only ones whose data
// actually fired render, and the section is suppressed entirely if fewer than
// two related entities exist (so we never ship an empty coda).

function VendorCoda({
  vendor,
  aria,
  groundTruth,
  linkedScandals,
  accent,
  lang,
  onOpenNetworkGraph,
}: {
  vendor: VendorDetailResponse
  aria: AriaQueueItem | null | undefined
  groundTruth: VendorGroundTruthStatus | null | undefined
  linkedScandals: VendorLinkedScandalsResponse | null | undefined
  accent: string
  lang: 'en' | 'es'
  onOpenNetworkGraph: () => void
}) {
  const isEs = lang === 'es'

  // — Chip 1: top institution buyer (concentration anchor) ——————————————
  const topInst: VendorTenureInstitution | undefined = vendor.top_institutions?.[0]

  // — Chip 2: primary ARIA pattern (e.g. "P2") → /patterns/:code ——————————
  const patternCode = aria?.primary_pattern?.trim().toUpperCase() || null
  const isPatternCode = patternCode != null && /^P[1-7]$/.test(patternCode)

  // — Chip 3: case anchor — prefer a GT case, fall back to a linked scandal.
  //   /cases/:slug resolves BY SLUG (getBySlug), never by numeric case_id, so a
  //   chip is only routable when a scandal_slug exists. Cases without a slug are
  //   skipped rather than producing a dead /cases/<number> link. ——————————————
  const gtCase = (groundTruth?.cases ?? []).find((c) => !!c.scandal_slug)
  const linkedCase = (linkedScandals?.cases ?? linkedScandals?.scandals ?? []).find(
    (c) => !!c.scandal_slug && (c.case_name || c.scandal_title),
  )
  const caseAnchor = gtCase
    ? { slug: gtCase.scandal_slug as string, name: gtCase.case_name, isGt: true }
    : linkedCase
      ? { slug: linkedCase.scandal_slug as string, name: linkedCase.case_name ?? linkedCase.scandal_title ?? null, isGt: false }
      : null

  // Count concrete related entities. The network CTA is an action, not an
  // entity chip, so it doesn't count toward the ≥2-chip minimum.
  const chipCount = (topInst ? 1 : 0) + (isPatternCode ? 1 : 0) + (caseAnchor ? 1 : 0)
  if (chipCount < 2) return null

  return (
    <section
      aria-label={isEs ? 'Adónde ir' : 'Where to go next'}
      className="mt-10 pt-5"
      style={{ borderTop: `1px solid ${accent}33` }}
    >
      <p
        className="font-mono mb-3"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: accent,
          fontWeight: 700,
        }}
      >
        § {isEs ? 'ADÓNDE IR' : 'WHERE TO GO NEXT'}
      </p>

      {/* Investigate CTA — open the co-bidding network graph centered on this
          vendor. Amber, mono, uppercase per the charter coda contract. */}
      <button
        type="button"
        onClick={onOpenNetworkGraph}
        className="inline-flex items-center gap-1.5 mb-4 font-mono uppercase tracking-[0.08em] text-accent hover:opacity-80 transition-opacity cursor-pointer"
        style={{ fontSize: 11, background: 'none', border: 'none', padding: 0 }}
        title={isEs ? 'Abrir el grafo de la red de co-licitación' : 'Open the co-bidding network graph'}
      >
        {isEs ? 'Ver la red de co-licitación' : 'View the co-bidding network'}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>

      {/* Related-entity chips — the cross-link graph. */}
      <div className="space-y-3">
        {topInst && (
          <ChipRow label={isEs ? 'Su principal comprador' : 'Its top buyer'}>
            <EntityIdentityChip
              type="institution"
              id={topInst.institution_id}
              name={topInst.institution_name}
              size="sm"
            />
          </ChipRow>
        )}

        {isPatternCode && (
          <ChipRow label={isEs ? 'Patrón ARIA dominante' : 'Dominant ARIA pattern'}>
            <Link
              to={`/patterns/${patternCode}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-risk-high/30 bg-risk-high/10 text-risk-high font-mono uppercase tracking-[0.08em] hover:bg-risk-high/20 transition-colors"
              style={{ fontSize: 11 }}
              title={isEs ? `Patrón ${patternCode} de ARIA` : `ARIA pattern ${patternCode}`}
            >
              {patternCode}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </ChipRow>
        )}

        {caseAnchor && (
          <ChipRow
            label={
              caseAnchor.isGt
                ? isEs ? 'Caso confirmado (Ground Truth)' : 'Confirmed case (Ground Truth)'
                : isEs ? 'Escándalo vinculado' : 'Linked scandal'
            }
          >
            <EntityIdentityChip
              type="case"
              id={caseAnchor.slug}
              name={caseAnchor.name}
              size="sm"
              flags={caseAnchor.isGt ? ['gt'] : undefined}
            />
          </ChipRow>
        )}
      </div>
    </section>
  )
}

/** One labelled row inside the coda — mono caption + chip(s). */
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
      <span
        className="font-mono flex-shrink-0"
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          minWidth: 0,
        }}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

// ─── ProvenanceFooter ───────────────────────────────────────────────────────

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="mt-10 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
      {/* (a) Honesty movement — what this dossier can't tell you */}
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
        § {lang === 'es' ? 'Lo que este expediente no puede decir' : "What this dossier can't tell you"}
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
          ? 'Este expediente analiza cómo se adjudicaron los contratos, no cómo se ejecutaron. Un indicador de riesgo alto señala anomalías estadísticas en la contratación, no prueba de un delito, que solo los tribunales determinan.'
          : 'This dossier reads how contracts were awarded — not how they were performed. A high risk indicator marks statistical anomalies in procurement, not proof of wrongdoing, which only courts establish.'}
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
          ? 'El fraude en la ejecución, los acuerdos fuera de libros y las necesidades legítimas de fuente única son invisibles para estos datos; la cobertura disminuye antes de 2010 y se congela en septiembre de 2025.'
          : 'Execution-phase fraud, off-book arrangements, and legitimate sole-source needs are invisible to this data; coverage thins before 2010 and freezes at September 2025.'}
      </p>

      {/* (b) Provenance movement — demoted beneath the honesty note */}
      <div className="mt-4">
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
      </div>
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
  // Cross-entity arrival (El Hilo P2) — an EntityIdentityChip inside another
  // dossier stamped its host's identity here ("← Volver a Salud"). Vendors are
  // the prime cross-entity destination; no index publishes a vendor sibling
  // list, so the spine renders without a stepper and only when there is a
  // real place to go back to.
  const wfOrigin = (location.state as WayfindingLinkState | null)?.wfOrigin ?? null
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
    <DossierOriginProvider value={{ route: `/vendors/${vendorId}`, label: formatEntityName('vendor', vendor.name, 'sm') }}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {(wfOrigin || fromAria) && (
        <WayfindingSpine
          nav={{
            hasContext: false,
            index: 0,
            total: 0,
            prevTo: null,
            nextTo: null,
            backTo: '/aria',
            backLabel: 'ARIA',
          }}
          origin={wfOrigin}
          lang={lang}
          accent={sectorAccent}
          showStepper={false}
        />
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
      <div className="mt-5">
        <p
          className="font-mono mb-2"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: sectorAccent,
            fontWeight: 700,
          }}
        >
          § {lang === 'es' ? 'El diagnóstico' : 'The diagnosis'}
        </p>
        <VendorStatStrip vendor={vendor} lang={lang} />
      </div>
      <div className="mt-5">
        <VendorDiagnosticGrid
          vendor={vendor}
          shap={data.shap.data}
          institutions={institutionsForGrid}
          timeline={timelineForGrid}
          lang={lang}
        />
      </div>

      {/* REFERENCE — the full record, full-width, tight section headers */}
      <div className="mt-7 space-y-6">
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
            onOpenNetworkGraph={() => setNetworkOpen(true)}
          />
        </section>
      </div>

      {/* LA CODA — § ADÓNDE IR (exit ramps) */}
      <VendorCoda
        vendor={vendor}
        aria={data.aria.data}
        groundTruth={data.groundTruthStatus.data}
        linkedScandals={data.linkedScandals.data as VendorLinkedScandalsResponse | null | undefined}
        accent={sectorAccent}
        lang={lang}
        onOpenNetworkGraph={() => setNetworkOpen(true)}
      />

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
    </DossierOriginProvider>
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
