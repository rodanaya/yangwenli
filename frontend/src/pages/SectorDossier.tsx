/**
 * SectorDossier — canonical unified dossier at /sectors/:id.
 *
 * 2026-06-03 (DESIGNUS — operational rebuild, P0 propagation from
 * docs/WEBSITE_STANDARDS.md). Reclassified from a four-chapter narrative
 * (Subject / Timeline·TimelineHourglass / Institutions / Risk — ChapterShells
 * with Roman numerals) into a dense OPERATIONAL dossier, matching the vendor,
 * institution and category dossiers:
 *
 *   Hero          — identity + verdict seal (high-risk %)
 *   Command panel — SectorStatStrip + SectorDiagnosticGrid (decisive numbers ·
 *                   where the risk sits · OECD deviation · top institutions ·
 *                   risk over time)
 *   Institutions  — full-width institution reference table (EntityIdentityChip)
 *   Methodology   — provenance footer
 *
 * The thread chapter components (SectorChapter{Subject,Institutions,Risk},
 * TimelineHourglass) are no longer imported here. Legacy SectorProfile retains
 * its card-grid for /print.
 */
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { sectorApi, atlasApi } from '@/api/client'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { SectorHero } from '@/components/sector/SectorHero'
import {
  SectorStatStrip,
  SectorDiagnosticGrid,
  SectorInstitutionTable,
} from '@/components/sector/SectorCommandPanel'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTOR_COLORS } from '@/lib/constants'

// Reference-section header — tight, left-aligned (mirrors the other dossiers).
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
          ? 'Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5. Las señales agregadas a nivel sectorial son indicadores estadísticos del patrón procurador, no determinaciones legales.'
          : 'COMPRANET data 2002–2025. v0.8.5 risk model. Sector-level aggregate signals are statistical indicators of procurement pattern, not legal determinations.'}
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
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Sector inválido' : 'Invalid sector'}</h2>
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
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Sector no encontrado' : 'Sector not found'}</h2>
        <Button onClick={() => navigate('/sectors')}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          {lang === 'es' ? 'Volver a sectores' : 'Back to sectors'}
        </Button>
      </div>
    )
  }

  const sectorAccent = SECTOR_COLORS[sector.code] ?? '#64748b'
  const institutions = institutionsResp?.institutions ?? []

  // The institution list is always a top-by-spend capped subset (limit 60,
  // ≥50 contracts) and sector.statistics.total_institutions is 0 (backend gap),
  // so "top N" is the only honest framing — never "N institutions" (which would
  // imply that's the full roster).
  const instMeta = institutions.length === 0
    ? undefined
    : lang === 'es' ? `Las ${institutions.length} principales` : `Top ${institutions.length}`

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
      <SectorHero sector={sector} showTOC={false} />

      {/* COMMAND PANEL */}
      <div className="mt-6">
        <SectorStatStrip stats={sector.statistics} trends={sector.trends ?? []} lang={lang} />
      </div>
      <div className="mt-7">
        <SectorDiagnosticGrid
          stats={sector.statistics}
          institutions={institutions}
          trends={sector.trends ?? []}
          accent={sectorAccent}
          lang={lang}
        />
      </div>

      {/* REFERENCE — full institution table */}
      <div className="mt-14">
        <section id="institutions" className="scroll-mt-20">
          <DossierSectionHeader
            id="institutions"
            eyebrow={lang === 'es' ? 'Instituciones' : 'Institutions'}
            title={lang === 'es' ? 'Quién gasta en el sector' : 'Who spends in the sector'}
            meta={instMeta}
            accent={sectorAccent}
          />
          <SectorInstitutionTable institutions={institutions} totalSpend={sector.statistics.total_value_mxn ?? 0} lang={lang} />
        </section>
      </div>

      <ProvenanceFooter lang={lang} />
    </div>
  )
}
