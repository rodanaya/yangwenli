/**
 * InstitutionDossier — canonical unified dossier at /institutions/:id.
 *
 * 2026-06-03 (DESIGNUS — operational rebuild, P0 from docs/WEBSITE_STANDARDS.md).
 * Reclassified from a five-chapter narrative (the pre-rebuild story pattern the
 * vendor dossier shed: TimelineHourglass/MoneyStaircase + ChapterShells + Roman
 * numerals) into a dense OPERATIONAL dossier:
 *
 *   Hero            — identity + verdict seal (high-risk %)
 *   Command panel   — InstitutionStatStrip + InstitutionDiagnosticGrid
 *                     (decisive numbers · where the risk sits · OECD deviation ·
 *                     top suppliers · risk over time)
 *   Suppliers       — full-width supplier reference table (EntityIdentityChip)
 *   Methodology     — provenance footer
 *
 * The thread chapter components (TimelineHourglass, MoneyStaircase) and the
 * institution ChapterShell primitives are no longer imported here. Legacy
 * /print/institutions/:id retains InstitutionThread.
 */
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { institutionApi } from '@/api/client'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { InstitutionHero } from '@/components/institution/InstitutionHero'
import {
  InstitutionStatStrip,
  InstitutionDiagnosticGrid,
  InstitutionSupplierTable,
} from '@/components/institution/InstitutionCommandPanel'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'

// ─── Reference-section header — tight, left-aligned (mirrors VendorDossier) ──

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
    <div className="flex items-baseline justify-between gap-4 pb-2 mb-5" style={{ borderBottom: `1px solid ${accent}33` }}>
      <div className="flex items-baseline gap-3 min-w-0">
        <span id={`${id}-eyebrow`} className="font-mono flex-shrink-0" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}>
          § {eyebrow}
        </span>
        <h2 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 18, color: 'var(--color-text-primary)', letterSpacing: '-0.005em' }}>
          {title}
        </h2>
      </div>
      {meta && (
        <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {meta}
        </span>
      )}
    </div>
  )
}

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="mt-16 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p className="font-mono mb-2" style={{ fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
      </p>
      <p style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontStyle: 'italic', fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: '72ch', lineHeight: 1.55 }}>
        {lang === 'es'
          ? 'Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5. Las señales agregadas a nivel institucional son indicadores estadísticos del patrón procurador, no determinaciones legales.'
          : 'COMPRANET data 2002–2025. v0.8.5 risk model. Institution-level aggregate signals are statistical indicators of procurement pattern, not legal determinations.'}
      </p>
      <button
        type="button"
        onClick={() => navigate('/methodology')}
        className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
        style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
      >
        {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
      </button>
    </section>
  )
}

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

// ─── Main page ──────────────────────────────────────────────────────────────

export default function InstitutionDossier() {
  const { id } = useParams<{ id: string }>()
  const institutionId = Number(id)
  const validId = Number.isFinite(institutionId) && institutionId > 0
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const { data: institution, isLoading: instLoading, isError: instError } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'detail'],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: riskProfile } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'risk-profile'],
    queryFn: () => institutionApi.getRiskProfile(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendors } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'vendors', 50],
    queryFn: () => institutionApi.getVendors(institutionId, 50),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: timeline } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'risk-timeline'],
    queryFn: () => institutionApi.getRiskTimeline(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  if (!validId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'ID inválido' : 'Invalid ID'}</h2>
        <Button onClick={() => navigate('/institutions')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {lang === 'es' ? 'Volver al ranking' : 'Back to ranking'}
        </Button>
      </div>
    )
  }

  if (instLoading) return <DossierSkeleton />

  if (instError || !institution) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Institución no encontrada' : 'Institution not found'}</h2>
        <Button onClick={() => navigate('/institutions')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {lang === 'es' ? 'Volver al ranking' : 'Back to ranking'}
        </Button>
      </div>
    )
  }

  const sectorCode = SECTORS.find((s) => s.id === institution.sector_id)?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  const timelineForGrid = (timeline?.timeline ?? []).map((item) => ({
    year: item.year,
    avg_risk_score: item.avg_risk_score,
  }))
  const vendorRows = vendors?.data ?? []

  // Honest supplier-count meta: the vendors query is capped at 50, so when the
  // detail payload has no true vendor_count we label the table as "top N" rather
  // than implying the institution has only 50 suppliers.
  const supplierMeta = institution.vendor_count
    ? `${institution.vendor_count.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US')} ${lang === 'es' ? 'proveedores' : 'suppliers'}`
    : lang === 'es'
      ? `Los ${vendorRows.length} principales`
      : `Top ${vendorRows.length}`

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'

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
      <InstitutionHero institution={institution} showTOC={false} />

      {/* COMMAND PANEL */}
      <div className="mt-6">
        <InstitutionStatStrip institution={institution} timeline={timelineForGrid} lang={lang} />
      </div>
      <div className="mt-7">
        <InstitutionDiagnosticGrid
          institution={institution}
          riskProfile={riskProfile ?? null}
          vendors={vendorRows}
          timeline={timelineForGrid}
          sectorAccent={sectorAccent}
          lang={lang}
        />
      </div>

      {/* REFERENCE — full supplier table */}
      <div className="mt-14">
        <section id="suppliers" className="scroll-mt-20">
          <DossierSectionHeader
            id="suppliers"
            eyebrow={lang === 'es' ? 'Proveedores' : 'Suppliers'}
            title={lang === 'es' ? 'Quién recibe el dinero' : 'Who gets the money'}
            meta={supplierMeta}
            accent={sectorAccent}
          />
          <InstitutionSupplierTable vendors={vendorRows} totalSpend={institution.total_amount_mxn ?? 0} lang={lang} />
        </section>
      </div>

      <ProvenanceFooter lang={lang} />
    </div>
  )
}
