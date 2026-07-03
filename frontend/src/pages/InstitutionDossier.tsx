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
import { institutionApi, scorecardApi } from '@/api/client'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { InstitutionHero } from '@/components/institution/InstitutionHero'
import { InstitutionStatStrip } from '@/components/institution/InstitutionCommandPanel'
import { PillarBoleta } from '@/components/institution/PillarBoleta'
import { TIER_STYLES, gradeToTierKey } from '@/lib/tiers'
import {
  InstitutionReading,
  InstitutionConcentration,
  InstitutionRecord,
} from '@/components/institution/InstitutionDossierBody'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WayfindingSpine } from '@/components/nav/WayfindingSpine'
import {
  DossierOriginProvider,
  useSiblingNav,
  type WayfindingLinkState,
} from '@/lib/nav/wayfinding'
import { formatEntityName } from '@/lib/entity/format'
import { SECTOR_COLORS, SECTORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { toTitleCase } from '@/lib/utils'

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
        <span id={`${id}-eyebrow`} className="font-mono flex-shrink-0" style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}>
          § {eyebrow}
        </span>
        <h2 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontWeight: 500, fontSize: 18, color: 'var(--color-text-primary)', letterSpacing: '-0.005em' }}>
          {title}
        </h2>
      </div>
      {meta && (
        <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 12, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
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
      <p className="font-mono mb-2" style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
      </p>
      <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: '72ch', lineHeight: 1.55 }}>
        {lang === 'es'
          ? 'Datos COMPRANET 2002–2025. Modelo de riesgo v0.8.5. Las señales agregadas a nivel institucional son indicadores estadísticos del patrón procurador, no determinaciones legales.'
          : 'COMPRANET data 2002–2025. v0.8.5 risk model. Institution-level aggregate signals are statistical indicators of procurement pattern, not legal determinations.'}
      </p>
      <button
        type="button"
        onClick={() => navigate('/methodology')}
        className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
        style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
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

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'
  // Cross-entity arrival (El Hilo P2) — an EntityIdentityChip inside another
  // dossier stamped its host's identity here ("← Volver a Salud").
  const wfOrigin = (location.state as WayfindingLinkState | null)?.wfOrigin ?? null
  const wf = useSiblingNav(
    'institution',
    id,
    fromAria ? '/aria' : '/institutions',
    fromAria ? 'ARIA' : lang === 'es' ? 'el ranking' : 'the ranking',
  )

  const { data: institution, isLoading: instLoading, isError: instError } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'detail'],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: scorecard } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'scorecard'],
    queryFn: () => scorecardApi.getInstitution(institutionId).catch(() => null),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: riskProfile } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'risk-profile'],
    queryFn: () => institutionApi.getRiskProfile(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendorPool } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'vendor-pool', 50],
    queryFn: () => institutionApi.getVendorPool(institutionId, 50),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: waterfall } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'risk-waterfall'],
    queryFn: () => institutionApi.getRiskWaterfall(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: timeline } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'risk-timeline'],
    queryFn: () => institutionApi.getRiskTimeline(institutionId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: categories } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'top-categories'],
    // 404s for institutions with thin partida coverage — swallow to null so the
    // section renders a graceful empty note instead of erroring.
    queryFn: () => institutionApi.getTopCategories(institutionId, { limit: 8 }).catch(() => null),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: contracts } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'contracts', 'largest'],
    queryFn: () => institutionApi.getContracts(institutionId, { per_page: 8, sort_by: 'amount_mxn', sort_order: 'desc' }),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  // Responsables de la Unidad Compradora (2018+). >=50-contract floor suppresses
  // thin-n homonym noise; sorted by volume (neutral), never lead with risk.
  const { data: officialsData } = useQuery({
    queryKey: ['institution-dossier', institutionId, 'officials', 50],
    queryFn: () => institutionApi.getOfficials(institutionId, 50),
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
  // Risk-over-time trend ({year, avg}) for the §3 RiskOverTimePanel — finite + sorted.
  const trendForRecord = timelineForGrid
    .map((p) => ({ year: p.year, avg: (p.avg_risk_score ?? 0) as number }))
    .filter((p) => Number.isFinite(p.avg))
    .sort((a, b) => a.year - b.year)

  const supplierMeta = institution.vendor_count
    ? `${institution.vendor_count.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US')} ${lang === 'es' ? 'proveedores' : 'suppliers'}`
    : undefined

  // Volume sort (neutral) — never lead with a risk ranking of named individuals
  // (defamation guardrail); the risk column is a labeled indicator, not a verdict.
  const topOfficials = [...(officialsData?.officials ?? [])]
    .sort((a, b) => b.total_contracts - a.total_contracts)
    .slice(0, 12)
  const hasOfficials = (officialsData?.data_available ?? false) && topOfficials.length > 0

  return (
    <DossierOriginProvider value={{ route: `/institutions/${institutionId}`, label: formatEntityName('institution', institution.name, 'sm') }}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <WayfindingSpine nav={wf} lang={lang} accent={sectorAccent} origin={wfOrigin} />

      {/* HERO */}
      <InstitutionHero institution={institution} showTOC={false} />

      {/* COMMAND PANEL — decisive numbers */}
      <div className="mt-6">
        <InstitutionStatStrip institution={institution} timeline={timelineForGrid} lang={lang} />
      </div>

      {/* §0 — La Boleta: the transparency scorecard verdict (closes the league→dossier continuity break) */}
      {scorecard && (
        <div className="mt-12">
          <section id="boleta" className="scroll-mt-20">
            <DossierSectionHeader
              id="boleta"
              eyebrow={lang === 'es' ? 'La boleta' : 'The scorecard'}
              title={lang === 'es' ? 'La calificación de transparencia' : 'The transparency scorecard'}
              accent={sectorAccent}
            />
            {(() => {
              const tierKey = gradeToTierKey(scorecard.grade)
              const boletaColor = TIER_STYLES[tierKey].color
              const TIER_LABEL_EN: Record<string, string> = {
                Excelente: 'Excellent', Satisfactorio: 'Satisfactory', Regular: 'Adequate', Deficiente: 'Deficient', 'Crítico': 'Critical',
              }
              const tierLabel = lang === 'es' ? tierKey : (TIER_LABEL_EN[tierKey] ?? tierKey)
              return (
                <div className="grid gap-8 sm:grid-cols-[auto_1fr] items-start">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="tabular-nums leading-none"
                        style={{ fontFamily: '"Playfair Display", "EB Garamond", Georgia, serif', fontStyle: 'normal', fontWeight: 800, fontSize: '56px', color: boletaColor }}
                      >
                        {scorecard.total_score.toFixed(1)}
                      </span>
                      <span className="font-mono text-text-muted text-sm">/100</span>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-mono font-bold uppercase tracking-[0.12em] self-start"
                      style={{ backgroundColor: `color-mix(in srgb, ${boletaColor} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${boletaColor} 35%, transparent)`, color: boletaColor }}
                    >
                      {tierLabel}
                    </span>
                    {scorecard.national_percentile != null && (
                      <p className="text-[13px] font-mono text-text-muted tabular-nums">
                        {lang === 'es'
                          ? `Percentil nacional ${Math.round(scorecard.national_percentile * 100)}`
                          : `National percentile ${Math.round(scorecard.national_percentile * 100)}`}
                      </p>
                    )}
                    {scorecard.peer_percentile_sector != null && (
                      <p className="text-[13px] font-mono text-text-muted tabular-nums">
                        {lang === 'es'
                          ? `Peor que el ${Math.round((1 - scorecard.peer_percentile_sector) * 100)}% de su sector`
                          : `Worse than ${Math.round((1 - scorecard.peer_percentile_sector) * 100)}% of its sector`}
                      </p>
                    )}
                  </div>
                  <PillarBoleta item={scorecard} />
                </div>
              )
            })()}
          </section>
        </div>
      )}

      {/* §1 — The reading: why the two seals read as they do */}
      <div className="mt-12">
        <section id="reading" className="scroll-mt-20">
          <DossierSectionHeader
            id="reading"
            eyebrow={lang === 'es' ? 'La lectura' : 'The reading'}
            title={lang === 'es' ? 'Cómo se leen las dos señales' : 'How the two signals read'}
            accent={sectorAccent}
          />
          <InstitutionReading
            institution={institution}
            riskProfile={riskProfile ?? null}
            waterfall={waterfall ?? null}
            lang={lang}
          />
        </section>
      </div>

      {/* §2 — Concentration: who gets the money, how concentrated */}
      <div className="mt-12">
        <section id="concentration" className="scroll-mt-20">
          <DossierSectionHeader
            id="concentration"
            eyebrow={lang === 'es' ? 'La concentración' : 'Concentration'}
            title={lang === 'es' ? 'Quién recibe el dinero' : 'Who gets the money'}
            meta={supplierMeta}
            accent={sectorAccent}
          />
          <InstitutionConcentration
            institution={institution}
            vendorPool={vendorPool ?? null}
            sectorAccent={sectorAccent}
            lang={lang}
          />
        </section>
      </div>

      {/* §3 — The record: activity, incumbency, categories, contracts */}
      <div className="mt-12">
        <section id="record" className="scroll-mt-20">
          <DossierSectionHeader
            id="record"
            eyebrow={lang === 'es' ? 'El expediente' : 'The record'}
            title={lang === 'es' ? 'Actividad, permanencia y contratos' : 'Activity, incumbency & contracts'}
            accent={sectorAccent}
          />
          <InstitutionRecord
            institution={institution}
            timeline={trendForRecord}
            categories={categories ?? null}
            contracts={contracts ?? null}
            sectorAccent={sectorAccent}
            lang={lang}
          />
        </section>
      </div>

      {/* §4 — Responsables de la Unidad Compradora (signing officers of record).
          Populated 2026-06-14 from contracts.responsible_uc; >=50 contract floor
          + volume sort + labeled risk indicator (guardrails against thin-n
          homonym defamation). */}
      {hasOfficials && (
        <div className="mt-12">
          <section id="officials" className="scroll-mt-20">
            <DossierSectionHeader
              id="officials"
              eyebrow={lang === 'es' ? 'Responsables de la UC' : 'Procurement officers'}
              title={lang === 'es' ? 'Quién firmó las compras' : 'Who ran the buying units'}
              meta={lang === 'es' ? `Los ${topOfficials.length} más activos · 2018+` : `Top ${topOfficials.length} by volume · 2018+`}
              accent={sectorAccent}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-[12px] font-mono uppercase tracking-[0.12em] text-text-muted border-b border-border">
                    <th className="text-left font-medium py-2 pr-3">{lang === 'es' ? 'Funcionario' : 'Officer'}</th>
                    <th className="text-right font-medium py-2 px-3">{lang === 'es' ? 'Contratos' : 'Contracts'}</th>
                    <th className="text-right font-medium py-2 px-3">{lang === 'es' ? 'Adj. directa' : 'Direct award'}</th>
                    <th className="text-right font-medium py-2 px-3">{lang === 'es' ? 'Postor único' : 'Single bid'}</th>
                    <th className="text-right font-medium py-2 px-3">{lang === 'es' ? 'Proveedores' : 'Vendors'}</th>
                    <th className="text-right font-medium py-2 pl-3">{lang === 'es' ? 'Indicador' : 'Risk ind.'}</th>
                  </tr>
                </thead>
                <tbody>
                  {topOfficials.map((o) => {
                    const level = getRiskLevelFromScore(o.avg_risk_score)
                    const locale = lang === 'es' ? 'es-MX' : 'en-US'
                    return (
                      <tr key={o.official_name} className="border-b border-border/40 hover:bg-background-card/50">
                        <td className="py-2 pr-3 text-text-primary font-medium max-w-[22rem] whitespace-normal break-words leading-tight" title={toTitleCase(o.official_name)}>
                          {toTitleCase(o.official_name)}
                          {(o.first_contract_year || o.last_contract_year) && (
                            <span className="ml-2 text-[12px] font-mono text-text-muted">{o.first_contract_year}–{o.last_contract_year}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{o.total_contracts.toLocaleString(locale)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{o.direct_award_pct.toFixed(0)}%</td>
                        <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{o.single_bid_pct.toFixed(0)}%</td>
                        <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{o.vendor_diversity.toLocaleString(locale)}</td>
                        <td className="py-2 pl-3 text-right tabular-nums">
                          <span className="inline-flex items-center gap-1.5 justify-end">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} aria-hidden="true" />
                            <span style={{ color: RISK_COLORS[level] }}>{o.avg_risk_score.toFixed(2)}</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {officialsData?.note && (
              <p className="mt-3 text-[13px] leading-relaxed text-text-muted">{officialsData.note}</p>
            )}
          </section>
        </div>
      )}

      <ProvenanceFooter lang={lang} />
    </div>
    </DossierOriginProvider>
  )
}
