/**
 * InstitutionDossier — canonical unified dossier at /institutions/:id.
 *
 * Built 2026-05-26 (DESIGNUS round 7, Phase 2 final). Composes the
 * institution investigation in scroll order:
 *
 *   Hero          — cover slug (InstitutionHero)
 *   Chapter I     — Subject · scale of spending
 *   Chapter II    — Timeline · year-by-year shape (TimelineHourglass reused)
 *   Chapter III   — Suppliers · who gets the money
 *   Chapter IV    — Spending · cumulative journey (MoneyStaircase reused)
 *   Chapter V     — Risk · where the risk sits (also serves as verdict)
 *   Methodology   — provenance footer
 *
 * Replaces the previous /institutions/:id redirect-into-/explore behavior.
 * Legacy /print/institutions/:id retains InstitutionThread for printable use.
 */
import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { institutionApi } from '@/api/client'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { InstitutionHero } from '@/components/institution/InstitutionHero'
import { InstitutionChapterSubject } from '@/components/institution/InstitutionChapterSubject'
import { InstitutionChapterSuppliers } from '@/components/institution/InstitutionChapterSuppliers'
import { InstitutionChapterRisk } from '@/components/institution/InstitutionChapterRisk'

// Reused from vendor dossier — same shape (year/risk/count/value)
import { TimelineHourglass } from '@/components/thread/TimelineHourglass'
import { MoneyStaircase } from '@/components/thread/MoneyStaircase'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'

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

// ─── Methodology footer ─────────────────────────────────────────────────────

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto">
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 32, textAlign: 'center' }}>
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
          {lang === 'es'
            ? 'Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5. Las señales agregadas a nivel institucional son indicadores estadísticos del patrón procurador, no determinaciones legales.'
            : 'COMPRANET data 2002–2025. v0.8.5 risk model. Institution-level aggregate signals are statistical indicators of procurement pattern, not legal determinations.'}
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

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

  const [_csvExporting, _setCsvExporting] = useState(false)

  if (!validId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">
          {lang === 'es' ? 'ID inválido' : 'Invalid ID'}
        </h2>
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
        <h2 className="text-lg font-semibold mb-2">
          {lang === 'es' ? 'Institución no encontrada' : 'Institution not found'}
        </h2>
        <Button onClick={() => navigate('/institutions')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {lang === 'es' ? 'Volver al ranking' : 'Back to ranking'}
        </Button>
      </div>
    )
  }

  const sectorCode = SECTORS.find((s) => s.id === institution.sector_id)?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const sectorName = lang === 'es' ? SECTORS.find((s) => s.code === sectorCode)?.name : SECTORS.find((s) => s.code === sectorCode)?.nameEN

  // Timeline data shape for narrative chapters
  const timelineForChapters = (timeline?.timeline ?? []).map((item) => ({
    year: item.year,
    avg_risk_score: item.avg_risk_score,
    contract_count: item.contract_count,
    total_value: item.total_value,
  }))

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
      <InstitutionHero institution={institution} showTOC={true} />

      {/* Chapter I — Subject (scale) */}
      <InstitutionChapterSubject institution={institution} />

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* Chapter II — Timeline (reused from vendor dossier) */}
      <TimelineHourglass
        timeline={timelineForChapters}
        totalContracts={institution.total_contracts}
        vendorName={institution.name}
        primarySectorName={sectorName}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* Chapter III — Suppliers */}
      <InstitutionChapterSuppliers
        institutionName={institution.name}
        sectorId={institution.sector_id ?? null}
        vendors={vendors ?? null}
        totalSpend={institution.total_amount_mxn ?? 0}
        totalVendors={institution.vendor_count}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* Chapter IV — Spending (Money chapter reused) */}
      <MoneyStaircase
        timeline={timelineForChapters}
        vendorName={institution.name}
        primarySectorName={sectorName}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      {/* Chapter V — Risk (also serves as verdict) */}
      <InstitutionChapterRisk institution={institution} riskProfile={riskProfile ?? null} />

      <ProvenanceFooter lang={lang} />
    </div>
  )
}
