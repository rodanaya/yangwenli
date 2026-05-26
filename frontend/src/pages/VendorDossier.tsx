/**
 * VendorDossier — canonical unified dossier at /vendors/:id.
 *
 * Built 2026-05-25 (DESIGNUS round 6, Phase 1 final step). Composes the
 * full vendor investigation in scroll order:
 *
 *   Hero          — cover slug (Component 1/10)
 *   Chapter I     — Subject: scale (Component 2/10)
 *   Chapter II    — Timeline: shape (Component 3/10)
 *   Chapter III   — Network: web of relationships (Component 4/10)
 *   Chapter IV    — Money: cumulative journey (Component 5/10)
 *   Chapter V     — Pattern: model's reading (Component 6/10)
 *   Chapter VI    — Verdict: where this leaves us (Component 7/10)
 *   Evidence      — reference data: SHAP + waterfall + peer (Component 8/10)
 *   Activity      — reference data: timeline + contracts table (Component 9/10)
 *   Network ref   — reference data: ARIA + external + linked cases (10/10)
 *   Methodology   — provenance footer
 *
 * Replaces the previous /vendors/:id redirect-into-/explore behavior
 * (Gap 2 May 11 decision). The dossier is now the canonical destination;
 * /explore remains the entry instrument. /print/vendors/:id retains the
 * legacy VendorProfile for printable / fallback use.
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
import { VendorEvidenceTab } from '@/components/vendor/VendorEvidenceTab'
import { VendorActivityTab } from '@/components/vendor/VendorActivityTab'
import { VendorNetworkTab } from '@/components/vendor/VendorNetworkTab'

import { ChapterSubject } from '@/components/thread/ChapterSubject'
import { TimelineHourglass } from '@/components/thread/TimelineHourglass'
import { ConcentricConstellation } from '@/components/thread/ConcentricConstellation'
import { MoneyStaircase } from '@/components/thread/MoneyStaircase'
import { PatternDiagnostic } from '@/components/thread/PatternDiagnostic'
import { ChapterVerdict } from '@/components/thread/ChapterVerdict'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTOR_COLORS } from '@/lib/constants'

const ContractDetailModal = lazy(() =>
  import('@/components/ContractDetailModal').then((m) => ({ default: m.ContractDetailModal })),
)
const NetworkGraphModal = lazy(() =>
  import('@/components/NetworkGraphModal').then((m) => ({ default: m.NetworkGraphModal })),
)

// ─── Reference-section heading — smaller than ChapterHeading ────────────────

function ReferenceSectionHeading({
  label,
  title,
  subtitle,
  sectorAccent,
}: {
  label: string
  title: string
  subtitle: string
  sectorAccent: string
}) {
  return (
    <header className="text-center py-12">
      <div
        className="font-mono mb-3"
        style={{
          fontSize: 10,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: sectorAccent,
          fontWeight: 700,
        }}
      >
        § {label}
      </div>
      <h2
        style={{
          fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
          fontWeight: 600,
          fontSize: 20,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          marginBottom: 6,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 14,
          color: 'var(--color-text-muted)',
          maxWidth: '40ch',
          margin: '0 auto',
          lineHeight: 1.4,
        }}
      >
        {subtitle}
      </p>
    </header>
  )
}

// ─── Section divider ────────────────────────────────────────────────────────

function ChapterDivider({ sectorAccent }: { sectorAccent?: string }) {
  const color = sectorAccent ?? 'var(--color-border)'
  return (
    <div className="flex items-center justify-center gap-4 py-12">
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

// ─── ProvenanceFooter ───────────────────────────────────────────────────────

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto">
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 32,
          textAlign: 'center',
        }}
      >
        <p
          className="font-mono mb-3"
          style={{
            fontSize: 10,
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
            fontFamily: '"Source Serif Pro", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            maxWidth: '64ch',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          {lang === 'es' ? (
            <>
              Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5 entrenado con 1,427
              casos de corrupción documentados. Las señales del modelo son
              indicadores estadísticos, no determinaciones legales.
            </>
          ) : (
            <>
              COMPRANET data 2002–2025. v0.8.5 risk model trained on 1,427 documented
              corruption cases. Model signals are statistical indicators, not legal
              determinations.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => navigate('/methodology')}
          className="mt-4 font-mono cursor-pointer hover:opacity-70 transition-opacity"
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
  const isGroundTruth = !!data.groundTruthStatus.data?.is_known_bad

  // Timeline data shape for narrative chapters (Timeline + Money) — comes
  // from the risk-timeline endpoint via the `lifecycle` query in useVendorData
  const timelineForChapters = (data.lifecycle.data?.timeline ?? []).map((item) => ({
    year: item.year,
    avg_risk_score: item.avg_risk_score ?? null,
    contract_count: item.contract_count,
    total_value: item.total_value,
  }))

  // Co-bidders data shape for Network chapter
  const coBiddersForChapter = data.coBidders.data?.co_bidders ?? null

  // Institutions data shape for Network chapter institutional footprint
  const institutionsForChapter = (data.institutions.data?.data ?? []).map((inst) => ({
    institution_id: inst.institution_id,
    institution_name: inst.institution_name,
    institution_type: inst.institution_type,
    contract_count: inst.contract_count,
    total_value_mxn: inst.total_value_mxn,
    avg_risk_score: inst.avg_risk_score,
    first_year: inst.first_year,
    last_year: inst.last_year,
  }))

  // SHAP waterfall for Pattern chapter
  const waterfallForChapter = (data.waterfall.data ?? []).map((f) => ({
    feature: f.feature,
    contribution: f.contribution,
    z_score: f.z_score,
    label_en: f.label_en,
  }))

  // ARIA data shape for Verdict + Network chapters
  const ariaForChapters = data.aria.data ? {
    ips_final: data.aria.data.ips_final,
    ips_tier: data.aria.data.ips_tier,
    primary_pattern: data.aria.data.primary_pattern ?? null,
    review_status: data.aria.data.review_status ?? '',
    is_efos_definitivo: !!data.aria.data.is_efos_definitivo,
    is_sfp_sanctioned: !!data.aria.data.is_sfp_sanctioned,
    in_ground_truth: !!data.aria.data.in_ground_truth,
    memo_text: data.aria.data.memo_text ?? null,
    web_evidence_score: data.aria.data.web_evidence_score ?? null,
    web_evidence_verdict: data.aria.data.web_evidence_verdict ?? null,
    web_evidence_updated_at: data.aria.data.web_evidence_updated_at ?? null,
  } : null

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

      {/* HERO */}
      <VendorHero
        vendor={vendor}
        scorecard={data.scorecard.data}
        flags={flags}
        shap={data.shap.data}
        ariaTier={data.aria.data?.ips_tier ?? null}
        isGroundTruth={isGroundTruth}
        showTOC={true}
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

      {/* ─── Narrative chapters I–VI ─────────────────────────────── */}

      <ChapterSubject
        vendor={{
          name: vendor.name,
          total_value_mxn: vendor.total_value_mxn,
          total_contracts: vendor.total_contracts,
          primary_sector_name: vendor.primary_sector_name,
          avg_risk_score: vendor.avg_risk_score,
          first_contract_year: vendor.first_contract_year,
          last_contract_year: vendor.last_contract_year,
          high_risk_pct: vendor.high_risk_pct,
          direct_award_pct: vendor.direct_award_pct,
        }}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      <TimelineHourglass
        timeline={timelineForChapters}
        vendorFirstYear={vendor.first_contract_year}
        vendorLastYear={vendor.last_contract_year}
        totalContracts={vendor.total_contracts}
        vendorName={vendor.name}
        primarySectorName={vendor.primary_sector_name}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      <ConcentricConstellation
        vendorId={vendorId}
        subjectName={vendor.name}
        sectorName={vendor.primary_sector_name ?? null}
        totalInstitutions={vendor.total_institutions}
        sectorsCount={vendor.sectors_count}
        coBidders={coBiddersForChapter ?? []}
        institutions={institutionsForChapter}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      <MoneyStaircase
        timeline={timelineForChapters}
        vendorName={vendor.name}
        primarySectorName={vendor.primary_sector_name}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      <PatternDiagnostic
        features={waterfallForChapter}
        ariaPattern={ariaForChapters?.primary_pattern}
        primarySectorName={vendor.primary_sector_name}
        isLoading={data.waterfall.isLoading}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      <ChapterVerdict
        vendorId={vendorId}
        vendor={{
          name: vendor.name,
          avg_risk_score: vendor.avg_risk_score,
          in_ground_truth: isGroundTruth,
          total_institutions: vendor.total_institutions,
          sectors_count: vendor.sectors_count,
          total_contracts: vendor.total_contracts,
          primary_sector_name: vendor.primary_sector_name,
        }}
        coBidderCount={coBiddersForChapter?.length ?? 0}
        aria={ariaForChapters}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* ─── Reference sections (8/9/10) ──────────────────────────── */}

      <section id="evidence">
        <ReferenceSectionHeading
          label={lang === 'es' ? 'EVIDENCIA' : 'EVIDENCE'}
          title={lang === 'es' ? 'Material de respaldo' : 'Supporting material'}
          subtitle={lang === 'es' ? 'Descomposición SHAP completa, comparación con pares del sector y desglose de factores de riesgo.' : 'Full SHAP decomposition, sector-peer comparison, and risk-factor breakdown.'}
          sectorAccent={sectorAccent}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
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
      </section>

      <ChapterDivider sectorAccent={sectorAccent} />

      <section id="activity">
        <ReferenceSectionHeading
          label={lang === 'es' ? 'ACTIVIDAD' : 'ACTIVITY'}
          title={lang === 'es' ? 'Historial completo' : 'Full track record'}
          subtitle={lang === 'es' ? 'Cronología de riesgo, tabla paginada de contratos con filtros, instituciones cliente.' : 'Risk timeline, paginated contracts table with filters, client institutions.'}
          sectorAccent={sectorAccent}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
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
      </section>

      <ChapterDivider sectorAccent={sectorAccent} />

      <section id="network">
        <ReferenceSectionHeading
          label={lang === 'es' ? 'RED' : 'NETWORK'}
          title={lang === 'es' ? 'Vínculos y validación' : 'Ties and validation'}
          subtitle={lang === 'es' ? 'Cola ARIA, registros externos (EFOS, SFP, GT), casos vinculados, red completa de co-licitantes.' : 'ARIA queue, external registries (EFOS, SFP, GT), linked cases, full co-bidder network.'}
          sectorAccent={sectorAccent}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
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
      </section>

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
