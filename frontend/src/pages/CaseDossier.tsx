/**
 * CaseDossier — "El Expediente", the canonical case dossier at /cases/:slug.
 *
 * DESIGNUS synthesis 2026-06-10 (_designus_cases/SYNTHESIS.md). Replaces the
 * 2026-05-27 centered-chapter composition whose 120px Roman numerals +
 * py-20 shells produced the "80% empty air" failure on prod.
 *
 *   WayfindingSpine    — back to the exact filtered docket + prev/next
 *                        stepper honoring the index's active sort (El Hilo,
 *                        kind 'case'); keyboard [ / ].
 *   CaseDocketRail     — sticky identity rail (folio, disposition seal,
 *                        BRECHA gap, COMPRANET reach, § index).
 *   § I   El caso      — lede + body, drop cap, tight FeatureSection.
 *   § II  La cronología— the impunity arc (Reuters Time of Evidence).
 *   § III El daño      — ScaleBlock + sector red-flag bullet + severity-in-
 *                        archive strip + legal callout + margin notes.
 *   § IV  Los actores  — numbered actor list (kept, densified).
 *   § V   Los proveedores — COMPRANET visibility honesty banner +
 *                        EntityIdentityChip vendor rows (hard rule #1).
 *   § VI  Las fuentes  — cited journalism / audits / reports.
 *   KeepReadingFooter  — same-sector onward routing.
 *
 * Raw-enum bug class (INFRASTRUCTURE_OVERRUN / MULTIPLE on prod) is dead:
 * every label renders through casesVocab with a humanized fallback.
 */
import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import type { ScandalDetail, ScandalSource, KeyActor } from '@/api/types'

import { LedeParagraph, ScaleBlock } from '@/components/dossier/primitives'
import { WayfindingSpine } from '@/components/nav/WayfindingSpine'
import { DossierOriginProvider, useSiblingNav } from '@/lib/nav/wayfinding'

import {
  dispositionFor,
  dispositionLabel,
  folio,
  fraudLabel,
  sexenioLabel,
  type Lang,
} from '@/components/cases/casesVocab'
import {
  DispositionSeal,
  FeatureSection,
  MarginNote,
  PaperGrain,
  SeverityDots,
  SeverityScale,
} from '@/components/cases/CasesShared'
import { CaseTimeline } from '@/components/cases/CaseTimeline'
import {
  CaseDocketRail,
  CompranetVisibilityBanner,
  KeepReadingFooter,
  LinkedVendorList,
  MoneyBenchmark,
} from '@/components/cases/DossierBlocks'

// ─── Legal-status callout body copy ─────────────────────────────────────────

function legalStatusBody(status: string, lang: Lang): string {
  const es = lang === 'es'
  switch (status) {
    case 'convicted':
      return es
        ? 'Un tribunal emitió sentencia condenatoria contra al menos un actor vinculado a este caso.'
        : 'A court of law returned a guilty verdict against at least one actor tied to this case.'
    case 'prosecuted':
      return es
        ? 'Se han presentado cargos formales; el proceso judicial está en marcha.'
        : 'Formal charges have been filed; trial proceedings are under way.'
    case 'investigation':
      return es
        ? 'Autoridades están investigando, sin cargos formales hasta la fecha.'
        : 'Authorities are investigating; no formal charges yet on record.'
    case 'ongoing':
      return es
        ? 'El proceso sigue abierto; sin sentencia firme hasta la fecha.'
        : 'Proceedings remain open; no final ruling to date.'
    case 'impunity':
      return es
        ? 'Caso documentado por auditoría o investigación periodística; ningún actor enfrentó consecuencias penales pese a la evidencia disponible.'
        : 'Case documented by audit or investigative journalism; no actor faced criminal consequences despite available evidence.'
    case 'settled':
      return es
        ? 'El caso se cerró mediante acuerdo, sin sentencia penal.'
        : 'The case closed by settlement, without a criminal verdict.'
    case 'acquitted':
      return es
        ? 'Los actores señalados fueron absueltos en el proceso judicial.'
        : 'Implicated actors were acquitted in court.'
    case 'dismissed':
      return es
        ? 'El caso fue desestimado por autoridad judicial.'
        : 'The case was dismissed by judicial authority.'
    default:
      return es
        ? 'Estado judicial no determinado en fuentes disponibles.'
        : 'Judicial status not determined in available sources.'
  }
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function CaseHero({
  scandal,
  lang,
  sectorAccent,
  sectorName,
}: {
  scandal: ScandalDetail
  lang: Lang
  sectorAccent: string
  sectorName: string | null
}) {
  const name = lang === 'es' && scandal.name_es ? scandal.name_es : scandal.name_en
  const yearStart = scandal.contract_year_start ?? scandal.discovery_year ?? null
  const yearEnd = scandal.contract_year_end ?? scandal.discovery_year ?? null
  const periodText =
    yearStart && yearEnd
      ? yearStart === yearEnd ? String(yearStart) : `${yearStart}–${yearEnd}`
      : null

  return (
    <header className="relative">
      <div aria-hidden="true" className="absolute left-0 right-0" style={{ top: 0, height: 6, background: sectorAccent }} />
      <div className="pt-12 pb-8">
        {/* Index strip */}
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <div
            className="font-mono tabular-nums uppercase"
            style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 500 }}
          >
            {folio(scandal.id)}
            {scandal.is_verified ? (
              <>
                <span className="mx-2 opacity-40">·</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                  {lang === 'es' ? 'VERIFICADO' : 'VERIFIED'}
                </span>
              </>
            ) : null}
          </div>
          {sectorName && (
            <div
              className="font-mono uppercase"
              style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--color-text-muted)' }}
            >
              {sectorName}
            </div>
          )}
        </div>

        {/* § kicker */}
        <p
          className="font-mono uppercase mb-3"
          style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--color-text-muted)', fontWeight: 500 }}
        >
          § {lang === 'es' ? 'El Expediente · Caso Documentado' : 'The Case File · Documented Case'}
        </p>

        {/* Title */}
        <h1
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(32px, 4.6vw, 56px)',
            color: 'var(--color-text-primary)',
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            maxWidth: '24ch',
          }}
        >
          {name}
        </h1>

        {/* Meta strip */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <DispositionSeal status={scandal.legal_status} lang={lang} size="md" />
          <span
            className="font-mono uppercase"
            style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--color-text-secondary)' }}
          >
            {fraudLabel(scandal.fraud_type, lang)}
          </span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--color-text-secondary)' }}
          >
            {sexenioLabel(scandal, lang)}
          </span>
          {periodText && (
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--color-text-secondary)' }}
            >
              {periodText}
            </span>
          )}
          <span className="inline-flex items-baseline gap-2">
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
            >
              {lang === 'es' ? 'Gravedad' : 'Severity'}
            </span>
            <SeverityDots severity={scandal.severity} lang={lang} />
          </span>
        </div>
      </div>
    </header>
  )
}

// ─── Provenance footer ──────────────────────────────────────────────────────

function ProvenanceFooter({ lang }: { lang: Lang }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="py-12">
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 28, textAlign: 'center' }}>
        <p
          className="font-mono mb-3 uppercase"
          style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--color-text-muted)', fontWeight: 500 }}
        >
          § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
        </p>
        <p
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: '64ch', margin: '0 auto', lineHeight: 1.6 }}
        >
          {lang === 'es'
            ? 'Casos compilados de periodismo investigativo, auditorías de la ASF y procesos judiciales públicos. Los vínculos a proveedores se construyen con coincidencia exacta de RFC o nombre. La presencia en esta biblioteca no constituye una determinación de culpabilidad.'
            : 'Cases compiled from investigative journalism, ASF audits, and public judicial proceedings. Vendor links are constructed from exact RFC or name match. Inclusion in this library is not a determination of guilt.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/methodology')}
          className="mt-4 font-mono cursor-pointer hover:opacity-70 transition-opacity uppercase"
          style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
        >
          {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
        </button>
      </div>
    </section>
  )
}

// ─── Actors ─────────────────────────────────────────────────────────────────

function ActorList({ actors, lang }: { actors: KeyActor[]; lang: Lang }) {
  const ROLE_LABEL: Record<string, { en: string; es: string }> = {
    vendor: { en: 'Vendor', es: 'Proveedor' },
    official: { en: 'Official', es: 'Funcionario' },
    institution: { en: 'Institution', es: 'Institución' },
    journalist: { en: 'Journalist', es: 'Periodista' },
  }
  return (
    <ul className="space-y-3.5 list-none p-0 m-0 max-w-2xl">
      {actors.map((actor, i) => (
        <li
          key={`${actor.name}-${i}`}
          className="flex items-baseline gap-3"
          style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: 14 }}
        >
          <span
            className="font-mono tabular-nums flex-shrink-0"
            style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)', width: 24 }}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="flex-1 min-w-0">
            <p
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 16,
                color: 'var(--color-text-primary)',
                lineHeight: 1.3,
              }}
            >
              {actor.name}
            </p>
            {actor.title && (
              <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                {actor.title}
              </p>
            )}
            {actor.note && (
              <p className="mt-1" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                {actor.note}
              </p>
            )}
          </div>
          <span
            className="font-mono flex-shrink-0 uppercase"
            style={{ fontSize: 8.5, letterSpacing: '0.14em', color: 'var(--color-accent)', fontWeight: 700 }}
          >
            {ROLE_LABEL[actor.role]?.[lang] ?? actor.role}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Sources ────────────────────────────────────────────────────────────────

function SourceList({ sources, lang }: { sources: ScandalSource[]; lang: Lang }) {
  const TYPE_LABEL: Record<string, { en: string; es: string }> = {
    journalism: { en: 'Journalism', es: 'Periodismo' },
    audit: { en: 'Audit', es: 'Auditoría' },
    legal: { en: 'Legal', es: 'Documento legal' },
    academic: { en: 'Academic', es: 'Académico' },
    official: { en: 'Official', es: 'Oficial' },
    report: { en: 'Report', es: 'Informe' },
  }
  return (
    <ul className="space-y-2 list-none p-0 m-0 max-w-2xl">
      {sources.map((s, i) => {
        const inner = (
          <div className="flex items-baseline gap-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span
              className="font-mono tabular-nums flex-shrink-0"
              style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 22, letterSpacing: '0.1em' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 14.5, lineHeight: 1.35, color: 'var(--color-text-primary)' }}>
                {s.title}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--color-accent)', fontWeight: 700 }}
                >
                  {TYPE_LABEL[s.type]?.[lang] ?? s.type}
                </span>
                <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                  {s.outlet}
                </span>
                {s.date && (
                  <span className="font-mono tabular-nums" style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                    {s.date}
                  </span>
                )}
              </div>
            </div>
            {s.url && <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />}
          </div>
        )
        return (
          <li key={`${s.title}-${i}`}>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:bg-background-card/60 transition-colors"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {inner}
              </a>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DossierSkeleton() {
  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-10 space-y-8">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-16 w-3/4" />
      <div className="grid grid-cols-[200px_1fr] gap-8">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function CaseDossier() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  const validSlug = typeof slug === 'string' && slug.length > 0

  const { data: scandal, isLoading, isError } = useQuery({
    queryKey: ['case-dossier', slug],
    queryFn: () => caseLibraryApi.getBySlug(slug!),
    enabled: validSlug,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  // Full docket — severity-in-archive context + keep-reading routing.
  // Same key as the index's unfiltered list, so it is usually cache-warm.
  const { data: allCases } = useQuery({
    queryKey: ['cases', 'list', {}],
    queryFn: () => caseLibraryApi.getAll({}),
    staleTime: 5 * 60 * 1000,
  })

  // El Hilo — stepper follows the order the index published.
  const nav = useSiblingNav(
    'case',
    slug,
    '/cases',
    lang === 'es' ? 'El Padrón' : 'the docket',
  )

  // Keyboard [ / ] prev-next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.key === '[' && nav.prevTo) navigate(nav.prevTo)
      if (e.key === ']' && nav.nextTo) navigate(nav.nextTo)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav.prevTo, nav.nextTo, navigate])

  const primarySector = useMemo(() => {
    if (!scandal) return null
    const id = scandal.sector_id ?? scandal.sector_ids?.[0]
    if (!id) return null
    return SECTORS.find((s) => s.id === id) ?? null
  }, [scandal])

  const severityDistribution = useMemo(() => {
    const dist: Record<number, number> = {}
    for (const c of allCases ?? []) {
      dist[c.severity] = (dist[c.severity] ?? 0) + 1
    }
    return dist
  }, [allCases])

  if (!validSlug) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Caso inválido' : 'Invalid case'}</h2>
        <Button onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver al padrón' : 'Back to the docket'}
        </Button>
      </div>
    )
  }

  if (isLoading) return <DossierSkeleton />

  if (isError || !scandal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Caso no encontrado' : 'Case not found'}</h2>
        <Button onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver al padrón' : 'Back to the docket'}
        </Button>
      </div>
    )
  }

  const sectorAccent = primarySector?.color ?? RISK_COLORS.critical
  const sectorName = primarySector ? (lang === 'es' ? primarySector.name : primarySector.nameEN) : null
  const disposition = dispositionFor(scandal.legal_status)
  const name = lang === 'es' && scandal.name_es ? scandal.name_es : scandal.name_en

  const summary = (lang === 'es' && scandal.summary_es ? scandal.summary_es : scandal.summary_en) ?? ''
  const sentences = summary.split(/(?<=[.!?])\s+/)
  const ledeText = sentences[0] ?? summary
  const bodyText = sentences.slice(1).join(' ').trim()

  const headlineAmount = scandal.amount_mxn_high ?? scandal.amount_mxn_low ?? null
  const low = scandal.amount_mxn_low ?? null
  const high = scandal.amount_mxn_high ?? null
  const rangeText =
    low != null && high != null && low !== high
      ? lang === 'es'
        ? `Estimado entre ${formatCompactMXN(low)} y ${formatCompactMXN(high)}.`
        : `Estimated between ${formatCompactMXN(low)} and ${formatCompactMXN(high)}.`
      : null

  const hasTimeline = scandal.contract_year_start != null || scandal.discovery_year != null
  const hasActors = (scandal.key_actors ?? []).length > 0
  const hasSources = (scandal.sources ?? []).length > 0
  const vendors = scandal.linked_vendors ?? []
  const visibilityNone = scandal.compranet_visibility === 'none'

  // Sequential § numbering across conditionally-rendered sections.
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  let sectionIdx = 0
  const numeralFor: Record<string, string> = {}
  const railSections: { id: string; numeral: string; label: string }[] = []
  const registerSection = (id: string, label: string, render: boolean) => {
    if (!render) return
    const numeral = ROMAN[sectionIdx++]
    numeralFor[id] = numeral
    railSections.push({ id, numeral, label })
  }
  registerSection('caso', lang === 'es' ? 'El caso' : 'The case', true)
  registerSection('cronologia', lang === 'es' ? 'La cronología' : 'The timeline', hasTimeline)
  registerSection('dano', lang === 'es' ? 'El daño' : 'The damage', true)
  registerSection('actores', lang === 'es' ? 'Los actores' : 'The actors', hasActors)
  registerSection('proveedores', lang === 'es' ? 'Los proveedores' : 'The vendors', true)
  registerSection('fuentes', lang === 'es' ? 'Las fuentes' : 'The sources', hasSources)

  return (
    <DossierOriginProvider value={{ route: `/cases/${scandal.slug}`, label: name }}>
      <div className="relative" style={{ background: 'var(--color-background)', minHeight: '100vh' }}>
        <PaperGrain />
        <div className="relative max-w-[1180px] mx-auto px-4 sm:px-8 py-6" style={{ zIndex: 1 }}>
          <WayfindingSpine nav={nav} lang={lang} accent={sectorAccent} />

          <CaseHero scandal={scandal} lang={lang} sectorAccent={sectorAccent} sectorName={sectorName} />

          <div className="lg:grid lg:grid-cols-[212px_minmax(0,1fr)] lg:gap-10 items-start">
            {/* Docket rail — sticky on desktop, stacked above on mobile */}
            <div className="lg:sticky lg:top-6 mb-8 lg:mb-0">
              <CaseDocketRail
                scandal={scandal}
                totalCases={allCases?.length ?? null}
                sectorName={sectorName}
                sectorColor={primarySector?.color ?? null}
                sections={railSections}
                lang={lang}
              />
            </div>

            {/* Story column */}
            <div className="max-w-[720px]">
              {/* § I — El caso */}
              <FeatureSection
                id="caso"
                numeral={numeralFor['caso']}
                title={{ en: 'The case', es: 'El caso' }}
                meta={lang === 'es' ? 'Qué pasó' : 'What happened'}
                lang={lang}
              >
                <LedeParagraph sectorAccent={sectorAccent}>{ledeText}</LedeParagraph>
                {bodyText && (
                  <p
                    className="mt-5"
                    style={{
                      fontFamily: '"EB Garamond", Georgia, serif',
                      fontSize: 16,
                      lineHeight: 1.7,
                      color: 'var(--color-text-secondary)',
                      maxWidth: '64ch',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        float: 'left',
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: '3.1em',
                        lineHeight: 0.82,
                        paddingRight: 8,
                        paddingTop: 4,
                        color: 'var(--color-accent)',
                        fontWeight: 700,
                      }}
                    >
                      {bodyText.charAt(0)}
                    </span>
                    {bodyText.slice(1)}
                  </p>
                )}
              </FeatureSection>

              {/* § II — La cronología */}
              {hasTimeline && (
                <FeatureSection
                  id="cronologia"
                  numeral={numeralFor['cronologia']}
                  title={{ en: 'The timeline', es: 'La cronología' }}
                  meta={lang === 'es' ? 'El arco de impunidad' : 'The impunity arc'}
                  lang={lang}
                >
                  <CaseTimeline scandal={scandal} sectorAccent={sectorAccent} lang={lang} />
                </FeatureSection>
              )}

              {/* § III — El daño */}
              <FeatureSection
                id="dano"
                numeral={numeralFor['dano']}
                title={{ en: 'The damage', es: 'El daño' }}
                meta={lang === 'es' ? 'Monto y resolución' : 'Amount and resolution'}
                lang={lang}
              >
                {headlineAmount != null && (
                  <div className="flex flex-wrap items-start gap-7">
                    <ScaleBlock
                      mxn={headlineAmount}
                      sectorAccent={scandal.legal_status === 'impunity' ? disposition.ink : sectorAccent}
                      lang={lang}
                    />
                    <div className="flex-1 min-w-[240px]">
                      {rangeText && (
                        <p
                          style={{
                            fontFamily: '"EB Garamond", Georgia, serif',
                            fontStyle: 'italic',
                            fontSize: 13.5,
                            color: 'var(--color-text-muted)',
                            maxWidth: '44ch',
                          }}
                        >
                          {rangeText}
                        </p>
                      )}
                      <MoneyBenchmark
                        amount={headlineAmount}
                        sectorId={scandal.sector_id ?? scandal.sector_ids?.[0] ?? null}
                        sectorName={sectorName}
                        lang={lang}
                      />
                    </div>
                  </div>
                )}
                {scandal.amount_note && (
                  <MarginNote kicker={lang === 'es' ? 'Nota · Monto' : 'Note · Amount'}>
                    {scandal.amount_note}
                  </MarginNote>
                )}

                <SeverityScale severity={scandal.severity} distribution={severityDistribution} lang={lang} />

                {/* Legal status callout */}
                <div
                  className="mt-8"
                  style={{ borderLeft: `3px solid ${disposition.ring ? 'var(--color-accent)' : disposition.fill}`, paddingLeft: 18 }}
                >
                  <p
                    className="font-mono mb-1.5 uppercase"
                    style={{ fontSize: 11, letterSpacing: '0.16em', color: disposition.ink, fontWeight: 700 }}
                  >
                    {dispositionLabel(scandal.legal_status, lang)}
                  </p>
                  <p
                    style={{
                      fontFamily: '"EB Garamond", Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 15.5,
                      lineHeight: 1.55,
                      color: 'var(--color-text-secondary)',
                      maxWidth: '60ch',
                    }}
                  >
                    {legalStatusBody(scandal.legal_status, lang)}
                  </p>
                </div>
                {scandal.legal_status_note && (
                  <MarginNote kicker={lang === 'es' ? 'Nota · Fallo' : 'Note · Ruling'}>
                    {scandal.legal_status_note}
                  </MarginNote>
                )}
              </FeatureSection>

              {/* § IV — Los actores */}
              {hasActors && (
                <FeatureSection
                  id="actores"
                  numeral={numeralFor['actores']}
                  title={{ en: 'The actors', es: 'Los actores' }}
                  meta={
                    lang === 'es'
                      ? `${scandal.key_actors.length} en el expediente`
                      : `${scandal.key_actors.length} in the file`
                  }
                  lang={lang}
                >
                  <ActorList actors={scandal.key_actors} lang={lang} />
                </FeatureSection>
              )}

              {/* § V — Los proveedores */}
              <FeatureSection
                id="proveedores"
                numeral={numeralFor['proveedores']}
                title={{ en: 'The vendors', es: 'Los proveedores' }}
                meta={
                  vendors.length > 0
                    ? lang === 'es'
                      ? `${vendors.length} vinculados`
                      : `${vendors.length} linked`
                    : undefined
                }
                lang={lang}
              >
                <CompranetVisibilityBanner scandal={scandal} lang={lang} />
                {vendors.length > 0 ? (
                  <LinkedVendorList vendors={vendors} lang={lang} />
                ) : !visibilityNone ? (
                  <p
                    style={{
                      fontFamily: '"EB Garamond", Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 14.5,
                      color: 'var(--color-text-muted)',
                      maxWidth: '60ch',
                    }}
                  >
                    {lang === 'es'
                      ? 'Sin proveedores vinculados al expediente en la base de verdad de terreno.'
                      : 'No vendors linked to this file in the ground-truth base.'}
                  </p>
                ) : null}
              </FeatureSection>

              {/* § VI — Las fuentes */}
              {hasSources && (
                <FeatureSection
                  id="fuentes"
                  numeral={numeralFor['fuentes']}
                  title={{ en: 'The sources', es: 'Las fuentes' }}
                  meta={lang === 'es' ? 'Qué se cita' : 'What is cited'}
                  lang={lang}
                >
                  <SourceList sources={scandal.sources} lang={lang} />
                </FeatureSection>
              )}
            </div>
          </div>

          <KeepReadingFooter current={scandal} allCases={allCases} lang={lang} />
          <ProvenanceFooter lang={lang} />
        </div>
      </div>
    </DossierOriginProvider>
  )
}
