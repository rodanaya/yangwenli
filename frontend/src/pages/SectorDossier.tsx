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
import { sectorApi, atlasApi, vendorApi, categoriesApi, caseLibraryApi, ariaApi } from '@/api/client'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { SectorHero } from '@/components/sector/SectorHero'
import {
  SectorStatStrip,
  SectorDiagnosticGrid,
  SectorInstitutionTable,
} from '@/components/sector/SectorCommandPanel'
import {
  SectorVendorTable,
  SectorCategoryComposition,
  SectorSexenioStrip,
  SectorConcentrationPanel,
  SectorModelLadder,
  SectorAnomalyStrip,
  SectorCaseRoll,
  SectorQueueRibbon,
  SectorLargestContracts,
  type SectorCategoryRow,
  type TierCount,
} from '@/components/sector/SectorReferenceSections'

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
      <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: '72ch', lineHeight: 1.55 }}>
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

  // Enrichment queries — every source is precomputed/instant (DESIGNUS sector
  // data-density pass, 2026-06-08). Failures degrade to empty sections, never
  // block the dossier.
  const { data: topVendorsResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'top-vendors'],
    queryFn: () => vendorApi.getTop('value', 20, { sector_id: sectorId }),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })
  const { data: categoriesResp } = useQuery({
    queryKey: ['sector-dossier', 'categories-summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })
  const { data: casesResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'cases'],
    queryFn: () => caseLibraryApi.getBySector(sectorId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const { data: concentrationResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'concentration'],
    queryFn: () => sectorApi.getConcentrationHistory(sectorId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
  })
  const { data: coefResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'coefficients'],
    queryFn: () => sectorApi.getModelCoefficients(sectorId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
  })
  const { data: anomalyResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'anomaly'],
    queryFn: () => sectorApi.getTemporalAnomaly(sectorId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  const { data: queueTiers } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'aria-tiers'],
    queryFn: async () => {
      const tiers = await Promise.all(
        ([1, 2, 3, 4] as const).map((tier) =>
          ariaApi
            .getQueue({ sector_id: sectorId, tier, per_page: 1 })
            .then((r) => ({ tier, count: r.pagination?.total ?? 0 }))
            .catch(() => ({ tier, count: 0 })),
        ),
      )
      return tiers as TierCount[]
    },
    enabled: validId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  const { data: topContractsResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'top-contracts'],
    queryFn: () => sectorApi.getTopContracts(sectorId, 10),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  const { data: gtLinkageResp } = useQuery({
    queryKey: ['sector-dossier', sectorId, 'gt-linkage'],
    queryFn: () => sectorApi.getGtLinkage(sectorId),
    enabled: validId,
    staleTime: 10 * 60 * 1000,
    retry: false,
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
  const totalSpend = sector.statistics.total_value_mxn ?? 0

  // ── Enrichment data (DESIGNUS 2026-06-08) ──
  const topVendors = topVendorsResp?.data ?? []
  const sectorCategories: SectorCategoryRow[] = (
    (categoriesResp?.data ?? []) as Array<{
      category_id: number; name_es: string; name_en: string; sector_id: number | null
      total_value: number; total_contracts: number; avg_risk: number; high_risk_pct?: number
    }>
  )
    .filter((c) => c.sector_id === sectorId)
    .map((c) => ({
      category_id: c.category_id,
      name_es: c.name_es,
      name_en: c.name_en,
      total_value: c.total_value ?? 0,
      total_contracts: c.total_contracts ?? 0,
      avg_risk: c.avg_risk ?? 0,
      high_risk_pct: c.high_risk_pct,
    }))
  const sectorCases = casesResp ?? []
  const concentrationHistory = concentrationResp?.history ?? []
  const coefficients = coefResp?.coefficients ?? []
  const usesGlobalModel = Boolean(
    (coefResp as { uses_global_model?: boolean } | undefined)?.uses_global_model ??
      (coefResp?.model_used === 'global'),
  )
  const anomalies = anomalyResp?.anomalies ?? []
  const tiers: TierCount[] = queueTiers ?? []
  const hasForensics = concentrationHistory.length > 1 || coefficients.length > 0 || anomalies.length > 0
  const largestContracts = topContractsResp?.contracts ?? []
  const gtCases = gtLinkageResp?.cases ?? 0
  const gtVendors = gtLinkageResp?.vendors ?? 0
  // The GT chip jumps to the most relevant section that actually rendered —
  // editorial cases when present (e.g. salud), else the investigation queue or
  // vendor roster. Sectors like "otros" have 0 editorial cases, so a bare
  // #cases target would be a dead scroll.
  const gtTarget = sectorCases.length > 0
    ? 'cases'
    : tiers.reduce((s, x) => s + x.count, 0) > 0
      ? 'queue'
      : topVendors.length > 0
        ? 'vendors'
        : null

  // The institution list is always a top-by-spend capped subset (limit 60,
  // ≥50 contracts) keyed on the institution's home sector — a smaller set than
  // statistics.total_institutions (the count of institutions that *buy* in the
  // sector). "Top N" is the honest framing for this capped table.
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

      {/* GT linkage credibility line — documented cases + GT vendors in the sector */}
      {gtCases > 0 && (
        <button
          type="button"
          onClick={() => gtTarget && document.getElementById(gtTarget)?.scrollIntoView({ behavior: 'smooth' })}
          disabled={!gtTarget}
          className="font-mono uppercase tracking-widest hover:opacity-70 transition-opacity -mt-3 mb-1"
          style={{ fontSize: 10.5, color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: 0, cursor: gtTarget ? 'pointer' : 'default' }}
        >
          <span style={{ color: 'var(--color-risk-critical)', fontWeight: 700 }}>{gtCases.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US')}</span>{' '}
          {lang === 'es' ? 'casos GT' : 'GT cases'}
          <span style={{ opacity: 0.5, margin: '0 6px' }}>·</span>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{gtVendors.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US')}</span>{' '}
          {lang === 'es' ? 'proveedores con vínculo documentado operan aquí' : 'GT-linked vendors operate here'}{gtTarget ? ' ↓' : ''}
        </button>
      )}

      {/* COMMAND PANEL */}
      <div className="mt-5">
        <SectorStatStrip stats={sector.statistics} trends={sector.trends ?? []} lang={lang} />
      </div>
      <div className="mt-6">
        <SectorDiagnosticGrid
          stats={sector.statistics}
          institutions={institutions}
          trends={sector.trends ?? []}
          accent={sectorAccent}
          lang={lang}
        />
      </div>

      {/* PROVEEDORES — top vendors by sector spend */}
      {topVendors.length > 0 && (
        <div className="mt-11">
          <section id="vendors" className="scroll-mt-20">
            <DossierSectionHeader
              id="vendors"
              eyebrow={lang === 'es' ? 'Proveedores' : 'Suppliers'}
              title={lang === 'es' ? 'Los proveedores que dominan' : 'The vendors who dominate'}
              meta={lang === 'es' ? `Los ${topVendors.length} mayores` : `Top ${topVendors.length}`}
              accent={sectorAccent}
            />
            <SectorVendorTable vendors={topVendors} totalSpend={totalSpend} lang={lang} />
          </section>
        </div>
      )}

      {/* CATEGORÍAS — composition of sector spend */}
      {sectorCategories.length > 0 && (
        <div className="mt-11">
          <section id="categories" className="scroll-mt-20">
            <DossierSectionHeader
              id="categories"
              eyebrow={lang === 'es' ? 'Categorías' : 'Categories'}
              title={lang === 'es' ? 'En qué se gasta' : 'What the money buys'}
              meta={lang === 'es' ? `${sectorCategories.length} canastas` : `${sectorCategories.length} baskets`}
              accent={sectorAccent}
            />
            <SectorCategoryComposition categories={sectorCategories} totalSpend={totalSpend} accent={sectorAccent} lang={lang} />
          </section>
        </div>
      )}

      {/* ADMINISTRACIONES — spend by sexenio */}
      {(sector.trends ?? []).length > 0 && (
        <div className="mt-11">
          <section id="administrations" className="scroll-mt-20">
            <DossierSectionHeader
              id="administrations"
              eyebrow={lang === 'es' ? 'Administraciones' : 'Administrations'}
              title={lang === 'es' ? 'El sexenio del gasto' : 'Spend by administration'}
              accent={sectorAccent}
            />
            <SectorSexenioStrip trends={sector.trends ?? []} accent={sectorAccent} lang={lang} />
          </section>
        </div>
      )}

      {/* SEÑALES DEL MODELO — concentration · coefficients · anomalies */}
      {hasForensics && (
        <div className="mt-11">
          <section id="signals" className="scroll-mt-20">
            <DossierSectionHeader
              id="signals"
              eyebrow={lang === 'es' ? 'Señales' : 'Signals'}
              title={lang === 'es' ? 'Qué ve el modelo' : 'What the model sees'}
              accent={sectorAccent}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {concentrationHistory.length > 1 && (
                <SectorConcentrationPanel history={concentrationHistory} lang={lang} />
              )}
              {coefficients.length > 0 && (
                <SectorModelLadder coefficients={coefficients} usesGlobal={usesGlobalModel} lang={lang} />
              )}
              {anomalies.length > 0 && (
                <SectorAnomalyStrip anomalies={anomalies} lang={lang} />
              )}
            </div>
          </section>
        </div>
      )}

      {/* CASOS — documented corruption cases linked to the sector */}
      {sectorCases.length > 0 && (
        <div className="mt-11">
          <section id="cases" className="scroll-mt-20">
            <DossierSectionHeader
              id="cases"
              eyebrow={lang === 'es' ? 'Casos' : 'Cases'}
              title={lang === 'es' ? 'Casos documentados' : 'Documented cases'}
              meta={lang === 'es' ? `${sectorCases.length} en archivo` : `${sectorCases.length} on file`}
              accent={sectorAccent}
            />
            <SectorCaseRoll cases={sectorCases} lang={lang} />
          </section>
        </div>
      )}

      {/* LA COLA — ARIA investigation queue */}
      {tiers.reduce((s, x) => s + x.count, 0) > 0 && (
        <div className="mt-11">
          <section id="queue" className="scroll-mt-20">
            <DossierSectionHeader
              id="queue"
              eyebrow={lang === 'es' ? 'ARIA · La cola' : 'ARIA · The queue'}
              title={lang === 'es' ? 'A quién investigar' : 'Who to investigate'}
              accent={sectorAccent}
            />
            <SectorQueueRibbon tiers={tiers} sectorId={sectorId} lang={lang} />
          </section>
        </div>
      )}

      {/* CONTRATOS — largest single contracts in the sector */}
      {largestContracts.length > 0 && (
        <div className="mt-11">
          <section id="contracts" className="scroll-mt-20">
            <DossierSectionHeader
              id="contracts"
              eyebrow={lang === 'es' ? 'Contratos' : 'Contracts'}
              title={lang === 'es' ? 'Los contratos más grandes' : 'The largest single contracts'}
              meta={lang === 'es' ? `Top ${largestContracts.length}` : `Top ${largestContracts.length}`}
              accent={sectorAccent}
            />
            <SectorLargestContracts contracts={largestContracts} lang={lang} />
          </section>
        </div>
      )}

      {/* REFERENCE — full institution table (demoted below the richer sections) */}
      <div className="mt-11">
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
