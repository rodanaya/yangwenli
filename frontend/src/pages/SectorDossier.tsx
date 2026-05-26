/**
 * SectorDossier — canonical unified dossier at /sectors/:id.
 *
 * Built 2026-05-26 (DESIGNUS round 8, Phase 3). Composes the sector
 * investigation in scroll order:
 *
 *   Hero        — cover slug
 *   Chapter I   — Subject · scale of sector spending
 *   Chapter II  — Timeline · year-by-year trend (TimelineHourglass reused)
 *   Chapter III — Institutions · who spends in this sector
 *   Chapter IV  — Risk · sector profile + verdict
 *   Methodology — provenance footer
 *
 * Replaces SectorProfile's 4-tab card-grid layout. Legacy SectorProfile
 * file kept on disk for reference (no other importer).
 */
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { sectorApi, atlasApi } from '@/api/client'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { SectorHero } from '@/components/sector/SectorHero'
import { SectorChapterSubject } from '@/components/sector/SectorChapterSubject'
import { SectorChapterInstitutions } from '@/components/sector/SectorChapterInstitutions'
import { SectorChapterRisk } from '@/components/sector/SectorChapterRisk'

// Reused from vendor/institution dossier
import { TimelineHourglass } from '@/components/thread/TimelineHourglass'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTOR_COLORS } from '@/lib/constants'

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
            ? 'Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5. Las señales agregadas a nivel sectorial son indicadores estadísticos del patrón procurador, no determinaciones legales.'
            : 'COMPRANET data 2002–2025. v0.8.5 risk model. Sector-level aggregate signals are statistical indicators of procurement pattern, not legal determinations.'}
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
    </div>
  )
}

export default function SectorDossier() {
  const { id } = useParams<{ id: string }>()
  const sectorId = Number(id)
  const validId = Number.isFinite(sectorId) && sectorId > 0
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const { data: sector, isLoading: sectorLoading, isError: sectorError } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'detail'],
    queryFn: () => sectorApi.getById(sectorId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: institutionsResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'institutions'],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId, limit: 60 }),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  if (!validId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">
          {lang === 'es' ? 'Sector inválido' : 'Invalid sector'}
        </h2>
        <Button onClick={() => navigate('/sectors')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {lang === 'es' ? 'Volver a sectores' : 'Back to sectors'}
        </Button>
      </div>
    )
  }
  if (sectorLoading) return <DossierSkeleton />
  if (sectorError || !sector) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">
          {lang === 'es' ? 'Sector no encontrado' : 'Sector not found'}
        </h2>
        <Button onClick={() => navigate('/sectors')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {lang === 'es' ? 'Volver a sectores' : 'Back to sectors'}
        </Button>
      </div>
    )
  }

  const sectorAccent = SECTOR_COLORS[sector.code] ?? '#64748b'

  // Timeline reshape — sector trends → TimelineHourglass shape
  const timelineForChapters = (sector.trends ?? []).map((t) => ({
    year: t.year,
    avg_risk_score: t.avg_risk_score,
    contract_count: t.total_contracts,
    total_value: t.total_value_mxn,
  }))

  const sectorName = sector.name.charAt(0).toUpperCase() + sector.name.slice(1).toLowerCase()
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

      <SectorHero sector={sector} showTOC={true} />

      <SectorChapterSubject sector={sector} />

      <ChapterDivider sectorAccent={sectorAccent} />

      <TimelineHourglass
        timeline={timelineForChapters}
        totalContracts={sector.statistics.total_contracts}
        vendorName={sectorName}
        primarySectorName={sector.code}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      <SectorChapterInstitutions
        sectorCode={sector.code}
        sectorName={sectorName}
        institutions={institutionsResp?.institutions ?? []}
        totalSpend={sector.statistics.total_value_mxn}
        totalInstitutions={sector.statistics.total_institutions}
      />

      <ChapterDivider sectorAccent={sectorAccent} />

      <SectorChapterRisk sector={sector} />

      <ProvenanceFooter lang={lang} />
    </div>
  )
}
