import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ariaApi, caseLibraryApi } from '@/api/client'
import { formatCompactMXN, formatCompactUSD } from '@/lib/utils'
import { findStoryByLongformSlug } from '@/lib/atlas-stories'
import { getStoriesByLensTag, type AriaPattern, type SectorCode } from '@/lib/story-content'
import { SECTOR_NAMES_EN, RISK_COLORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { useExecutiveSummary } from '@/hooks/useExecutiveSummary'
import { PageFooter } from '@/components/layout/PageFooter'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { DotStrip, type DotStripRow } from '@/components/charts/editorial/DotStrip'
import { SaqueoSwimlane, axisSort, type SwimAxis, type SwimRow } from '@/components/journalists/SaqueoSwimlane'
import { VerdictBar } from '@/components/journalists/VerdictBar'
import { compositeMag, severityKey } from '@/lib/journalistsMagnitude'

// ---------------------------------------------------------------------------
// INVESTIGATIONS — hardcoded editorial metadata
// ---------------------------------------------------------------------------

type FraudType =
  | 'ghost_company'
  | 'procurement_fraud'
  | 'embezzlement'
  | 'monopoly'
  | 'overpricing'

type StatusKind = 'procesado' | 'auditado' | 'reporteado' | 'solo_datos'

type Era = 'pena' | 'amlo' | 'cross'

interface LeadStat {
  value: string
  value_es?: string
  label: string
  label_es?: string
}

interface Investigation {
  slug: string
  headline: string
  headline_es?: string
  sub: string
  sub_es?: string
  type: FraudType
  status: StatusKind
  amount: number // MXN billions — kept for sub-stat
  era: Era
  contracts: number
  brief: string // 2-sentence abstract
  brief_es?: string
  yearSpan?: string
  leadStat?: LeadStat
}

const INVESTIGATIONS: Investigation[] = [
  {
    slug: 'el-monopolio-invisible',
    headline: 'The 44 Monopolists: Vendors Who Ate Their Sector',
    sub: 'Grupo Fármacos · MX$133B · 6,303 contracts · one institution',
    type: 'monopoly',
    status: 'reporteado',
    amount: 133.2,
    era: 'cross',
    contracts: 6303,
    yearSpan: '2002–2025',
    brief: 'Four pharmaceutical distributors collected 326 billion pesos from IMSS over 23 years with no meaningful competition. Their combined risk score averages 0.96.',
  },
  {
    slug: 'la-ilusion-competitiva',
    headline: "The Competition That Never Was",
    sub: '49.4% single-bid rate in "competitive" procedures · 2023',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2010–2023',
    brief: 'For 14 straight years, over 45% of Mexico\'s "competitive" procurement had exactly one bidder. The OECD flags anything above 15% as a structural red flag.',
  },
  {
    slug: 'captura-institucional',
    headline: 'Inside Institutional Capture: 15,923 Vendors, 787B in Three Agencies',
    sub: 'IMSS · CFE · PEMEX · P6 pattern at Mexico\'s largest institutions',
    type: 'monopoly',
    status: 'auditado',
    amount: 787,
    era: 'cross',
    contracts: 530000,
    yearSpan: '2002–2025',
    brief: '15,923 vendors show behavioral capture signatures at IMSS, CFE, PEMEX, SCT, and CONAGUA. That\'s nearly a trillion pesos of systematically captured contracting.',
    leadStat: {
      value: '15,923',
      label: 'vendors with capture signatures at top-5 agencies',
      label_es: 'proveedores con firmas de captura en las 5 dependencias principales',
    },
  },
  {
    slug: 'marea-de-adjudicaciones',
    headline: 'The Direct Award Tide: From 60% to 82% in 13 Years',
    sub: '82.2% non-competitive in 2023 · every administration worse than the last',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2010–2023',
    brief: '82.2% of 2023 federal contracts were direct awards — no competition, no public tender. Every administration since 2010 has been worse than the one before it.',
  },
  {
    slug: 'el-sexenio-del-riesgo',
    headline: 'The Riskiest Administration in 23 Years',
    sub: 'AMLO era HR 12.6% · Fox 7.5% · Calderón 8.2% · Peña Nieto 11.2% · v0.8.5',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 2760,
    era: 'amlo',
    contracts: 1049729,
    yearSpan: '2018–2024',
    brief: 'AMLO\'s 12.6% high-risk rate is the highest of any administration in 23 years. Every administration since Fox has been riskier than its predecessor — 5.1 percentage points of drift in 24 years.',
    leadStat: {
      value: '12.6%',
      label: 'highest high-risk rate in 23 years',
      label_es: 'la tasa de riesgo alto+ más alta en 23 años',
    },
  },
  {
    slug: 'el-ejercito-fantasma',
    headline: 'The Ghost Army',
    sub: '6,118 P2 ghost-pattern vendors · 23 years · every sector',
    type: 'ghost_company',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2002–2025',
    brief: 'RUBLI identified 6,118 vendors matching ghost company patterns across 23 years of Mexican federal procurement. They appear, win contracts, then vanish from the tax registry.',
  },
  {
    slug: 'el-gran-precio',
    headline: 'The Bigger the Contract, the Higher the Risk',
    sub: 'Near-monotonic risk ladder across 3M contracts · all sectors',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 3000000,
    yearSpan: '2002–2025',
    brief: "RUBLI's risk model reveals a near-monotonic ladder across 3 million contracts: as contract size grows, corruption risk grows in lockstep. The biggest deals carry the most risk.",
  },
  {
    slug: 'la-industria-del-intermediario',
    headline: 'The Intermediary Industry',
    sub: '2,974 P3 intermediary vendors · thin-margin pass-throughs',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2002–2025',
    brief: '2,974 vendors function as pure procurement intermediaries — no physical product, no technical service, just margin extraction between government agencies and real suppliers.',
  },
  {
    slug: 'el-umbral-de-los-300k',
    headline: 'The 300,000 Peso Threshold',
    sub: '28,264 contracts at exactly 210K MXN · statistical impossibility',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 28264,
    yearSpan: '2018–2023',
    brief: 'Statistical spikes at 210K, 250K, and 300K MXN — mathematically impossible in a random pricing universe. The evidence points to systematic threshold manipulation to avoid competitive bidding requirements.',
  },
  {
    slug: 'volatilidad-el-precio-del-riesgo',
    headline: "Price Volatility: The Algorithm's Smoking Gun",
    headline_es: 'Volatilidad de Precio: La Huella Forense del Algoritmo',
    sub: 'Strongest predictor in v0.8.5 model · coefficient +0.558 across 3M contracts',
    sub_es: 'Predictor más fuerte en modelo v0.8.5 · coeficiente +0.558 en 3M contratos',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 3051294,
    yearSpan: '2002–2025',
    brief: 'Price volatility is the single strongest predictor in RUBLI\'s v0.8.5 risk model, outperforming 17 other features by 43%. It captures the forensic fingerprint of negotiated — not competed — prices.',
    brief_es: 'La volatilidad de precios es el predictor más fuerte del modelo v0.8.5 de RUBLI, superando a los otros 17 factores en un 43%. Captura la huella forense de precios negociados, no competidos.',
  },
  {
    slug: 'el-ano-de-la-emergencia',
    headline: '2020: The Year Competition Stopped',
    headline_es: '2020: El Año en que la Competencia se Detuvo',
    sub: '87% direct-award rate · COVID decree · HEMOSER MX$17.2B same-day awards',
    sub_es: '87% adjudicación directa · decreto COVID · HEMOSER MX$17,200 MDP en mismo día',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 17.2,
    era: 'amlo',
    contracts: 215000,
    yearSpan: '2020–2021',
    brief: "Mexico's COVID emergency decree suspended competitive bidding rules overnight. The direct-award rate hit 87% — and ghost-company vendors like HEMOSER collected MX$17.2 billion in same-day awards from IMSS.",
    brief_es: 'El decreto de emergencia COVID de México suspendió de un día para otro las reglas de licitación competitiva. La tasa de adjudicación directa llegó al 87% — y proveedores fantasma como HEMOSER recibieron 17,200 MDP en adjudicaciones del mismo día del IMSS.',
  },
  {
    slug: 'el-cartel-de-los-vales',
    headline: 'The Voucher Cartel: 240 Billion in a Closed Market',
    headline_es: 'El Cártel de los Vales: 240,000 MDP en un Mercado Cerrado',
    sub: 'Edenred 96.7% DA · Efectivale 2,210 single-bid wins · 3 vendors · 5 administrations',
    sub_es: 'Edenred 96.7% DA · Efectivale 2,210 licitaciones monopropuesta · 3 proveedores · 5 administraciones',
    type: 'monopoly',
    status: 'auditado',
    amount: 240,
    era: 'cross',
    contracts: 3000,
    yearSpan: '2002–2025',
    brief: "Three multinational voucher companies have divided Mexico's federal payment-card market across five administrations with a 96.7% direct-award rate and 2,868 single-bid wins. A market-structure problem, not just procurement.",
    brief_es: 'Tres empresas multinacionales de vales han dividido el mercado federal de tarjetas de pago de México a lo largo de cinco administraciones con una tasa de adjudicación directa del 96.7% y 2,868 licitaciones ganadas por única oferta. Un problema de estructura de mercado, no solo de contratación.',
    leadStat: {
      value: '96.7%',
      value_es: '96.7%',
      label: 'direct-award rate · 3 vendors · 5 administrations',
      label_es: 'tasa de adjudicación directa · 3 proveedores · 5 sexenios',
    },
  },
]

const ERA_TAG: Record<Era, { en: string; es: string }> = {
  pena: { en: 'EPN · 2012–2018', es: 'EPN · 2012–2018' },
  amlo: { en: '4T · 2018–2024', es: '4T · 2018–2024' },
  cross: { en: 'cross-era', es: 'transexenal' },
}

// ---------------------------------------------------------------------------
// ObservatoryTourBadge — surfaces the matching atlas tour (kept)
// ---------------------------------------------------------------------------

function ObservatoryTourBadge({ slug, accent, lang }: { slug: string; accent: string; lang: 'en' | 'es' }) {
  const tour = findStoryByLongformSlug(slug)
  if (!tour) return null
  return (
    <Link
      to={`/atlas?story=${tour.id}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 px-2 py-[3px] text-[10px] font-mono font-bold tracking-[0.12em] rounded-sm border transition-opacity hover:opacity-80"
      style={{ borderColor: `${accent}55`, color: accent, background: `${accent}0d` }}
      aria-label={lang === 'en' ? `${tour.duration} Atlas tour: ${tour.title.en}` : `Tour de ${tour.duration} en El Atlas: ${tour.title.es}`}
    >
      <span aria-hidden="true">◆</span>
      <span>{lang === 'en' ? `${tour.duration} TOUR · ATLAS` : `TOUR ${tour.duration} · ATLAS`}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// ARIA T1 live ticker (kept; EntityIdentityChip only)
// ---------------------------------------------------------------------------

function AriaLiveTicker({ lang }: { lang: 'en' | 'es' }) {
  const { t } = useTranslation('journalists')

  const { data } = useQuery({
    queryKey: ['aria', 'journalists-ticker'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 6 }),
    staleTime: 5 * 60 * 1000,
  })

  const items = data?.data ?? []
  const total = data?.pagination?.total ?? 0

  if (items.length === 0) return null

  return (
    <section
      aria-label={t('ticker.aria', { defaultValue: 'Live investigations' })}
      className="mt-16 pt-8 border-t border-border"
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden="true" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-risk-critical">
            {lang === 'es' ? 'EN VIVO' : 'LIVE'}
          </span>
        </span>
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-secondary tabular-nums">
          {total > 0 ? total.toLocaleString('en-US') : items.length}{' '}
          {lang === 'es' ? 'proveedores bajo investigación activa' : 'vendors under active investigation'}
        </span>
        <span className="h-px flex-1 bg-background-elevated" />
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
          ARIA · TIER 1
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.slice(0, 6).map((item) => {
          const risk = item.risk_score_norm ?? item.avg_risk_score ?? 0
          const flags: ('gt' | 'efos' | 'sfp')[] = []
          if (item.in_ground_truth) flags.push('gt')
          if (item.is_efos_definitivo) flags.push('efos')
          if (item.is_sfp_sanctioned) flags.push('sfp')

          return (
            <div
              key={item.vendor_id}
              className="px-2 py-1.5 bg-background-card border border-border rounded-sm hover:border-border-hover transition-colors"
            >
              <EntityIdentityChip
                type="vendor"
                id={item.vendor_id}
                name={item.vendor_name}
                riskScore={risk}
                ariaTier={item.ips_tier}
                flags={flags.length > 0 ? flags : undefined}
                size="xs"
                className="w-full"
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Enriched row carries era for the register sublabel (SwimRow + era).
// ---------------------------------------------------------------------------

interface EnrichedRow extends SwimRow {
  era: Era
}

// ---------------------------------------------------------------------------
// Main page — «La Línea del Saqueo»
// ---------------------------------------------------------------------------

export default function Journalists() {
  const { t, i18n } = useTranslation('journalists')
  const [searchParams, setSearchParams] = useSearchParams()
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'

  // Cross-surface lens filter (from the Atlas)
  const lensPattern = searchParams.get('pattern') as AriaPattern | null
  const lensSector = searchParams.get('sector') as SectorCode | null
  const lensFilterActive = !!(lensPattern || lensSector)

  // Sort axis — URL-synced, shareable
  const axisParam = searchParams.get('axis')
  const axis: SwimAxis = axisParam === 'chronology' || axisParam === 'severity' ? axisParam : 'magnitude'
  const setAxis = (a: SwimAxis) => {
    const next = new URLSearchParams(searchParams)
    next.set('axis', a)
    setSearchParams(next, { replace: true })
  }

  // Headline figures from the shared source (one query, consistent platform-wide)
  const { totalContracts: statContracts, highRiskRatePct, totalValueMXN } = useExecutiveSummary()
  const hrDisplay = `${highRiskRatePct.toFixed(1)}%`
  const totalValueT = totalValueMXN / 1e12

  // Lazy /cases fetch (deferred a tick → not an eager mount call) — powers the Verdict Bar only.
  const [casesReady, setCasesReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setCasesReady(true), 0)
    return () => window.clearTimeout(id)
  }, [])
  const { data: scandals } = useQuery({
    queryKey: ['cases', 'newsroom-spine'],
    queryFn: () => caseLibraryApi.getAll(),
    staleTime: 60 * 60 * 1000,
    enabled: casesReady,
  })

  // Build localized rows (the 13 investigations are KEPT; presentation only)
  const allRows: EnrichedRow[] = useMemo(
    () =>
      INVESTIGATIONS.map((inv) => ({
        slug: inv.slug,
        label: t(`investigations.${inv.slug}.headline`, {
          defaultValue: isEs ? inv.headline_es ?? inv.headline : inv.headline,
        }),
        brief: t(`investigations.${inv.slug}.brief`, {
          defaultValue: isEs ? inv.brief_es ?? inv.brief : inv.brief,
        }),
        amount: inv.amount,
        contracts: inv.contracts,
        status: inv.status,
        yearSpan: inv.yearSpan,
        sub: inv.sub,
        era: inv.era,
      })),
    [t, isEs],
  )

  // Lens filtering (applies to the whole desk now, not a hidden grid)
  const lensFilteredSlugs = useMemo(() => {
    if (!lensFilterActive) return null
    return new Set(
      getStoriesByLensTag({
        pattern: lensPattern ?? undefined,
        sector: lensSector ?? undefined,
      }).map((s) => s.slug),
    )
  }, [lensPattern, lensSector, lensFilterActive])

  const visibleRows = useMemo(
    () => (lensFilteredSlugs ? allRows.filter((r) => lensFilteredSlugs.has(r.slug)) : allRows),
    [allRows, lensFilteredSlugs],
  )

  const sortedRows = useMemo(() => axisSort(visibleRows, axis), [visibleRows, axis])
  const magMax = useMemo(() => Math.max(1, ...visibleRows.map(compositeMag)), [visibleRows])

  const registerRows: DotStripRow[] = useMemo(
    () =>
      sortedRows.map((r) => ({
        label: r.label,
        sublabel: `${r.yearSpan ?? ''} · ${isEs ? ERA_TAG[r.era].es : ERA_TAG[r.era].en}`,
        fraction: compositeMag(r) / magMax,
        colorRaw: RISK_COLORS[severityKey(r)],
        valueLabel: r.amount > 0 ? formatCompactMXN(r.amount * 1e9) : isEs ? 'patrón' : 'pattern',
        href: `/stories/${r.slug}`,
      })),
    [sortedRows, magMax, isEs],
  )

  const accent = RISK_COLORS.critical

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ============================ BYLINE + NAMEPLATE ============================ */}
        <header className="pt-14 sm:pt-20 pb-8">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden="true" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-text-secondary">RUBLI</span>
            </span>
            <span className="text-text-primary" aria-hidden="true">·</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
              {isEs ? 'Sala de Redacción' : 'Investigations Desk'}
            </span>
            <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted tabular-nums">
              {isEs ? 'Datos hasta sep 2025' : 'Data through Sep 2025'}
            </span>
          </div>

          <h1
            className="text-text-primary"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontSize: 'clamp(2.25rem, 5.5vw, 4rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
            }}
          >
            RUBLI <span className="italic text-risk-critical">{isEs ? 'Investigaciones' : 'Investigations'}</span>
          </h1>
        </header>

        {/* ============================ §0 — EL VEREDICTO (anchor) ============================ */}
        <section className="mb-12 sm:mb-14">
          <div className="surface-card rounded-sm p-8 md:p-12 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} aria-hidden="true" />
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] mb-4 text-text-muted">
              {isEs ? 'En 23 años de contratación federal, mapeada' : 'Over 23 years of federal contracting, mapped'}
            </div>
            <div className="flex items-baseline flex-wrap gap-x-4">
              <span
                className="leading-[0.9] font-extrabold italic tabular-nums"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 'clamp(64px, 11vw, 128px)',
                  color: accent,
                  letterSpacing: '-0.03em',
                }}
                aria-hidden="true"
              >
                {totalValueT.toFixed(1)}
              </span>
              <span
                className="font-serif italic text-text-primary"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(20px, 3vw, 34px)' }}
              >
                {isEs ? 'billones MXN' : 'T MXN'}
              </span>
            </div>
            <p
              className="text-[18px] md:text-[22px] font-serif leading-[1.3] mt-4 mb-4 max-w-[42ch]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--color-text-secondary)' }}
            >
              {isEs ? `${INVESTIGATIONS.length} investigaciones lo desglosan.` : `${INVESTIGATIONS.length} investigations break it down.`}
            </p>
            <div className="w-16 mb-4" style={{ height: 2, background: 'var(--color-border-hover)', opacity: 0.6 }} aria-hidden="true" />
            <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
              {[
                { value: statContracts.toLocaleString('en-US'), label: isEs ? 'contratos' : 'contracts' },
                { value: hrDisplay, label: isEs ? 'riesgo alto+' : 'high-risk+' },
                { value: String(INVESTIGATIONS.length), label: isEs ? 'investigaciones' : 'investigations' },
                ...(!isEs ? [{ value: formatCompactUSD(totalValueMXN), label: 'USD scale' }] : []),
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <span
                    className="tabular-nums font-semibold italic"
                    style={{ fontFamily: 'var(--font-family-serif)', fontSize: 17, color: 'var(--color-text-primary)' }}
                  >
                    {s.value}
                  </span>
                  <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Utility rail (demoted "Start here") */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted">
              {isEs ? 'Empieza aquí' : 'Start here'}
            </span>
            <Link to="/explore?tab=vendors" className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary transition-colors">
              {isEs ? 'Investigar un proveedor →' : 'Look up a vendor →'}
            </Link>
            <Link to="/institutions" className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary transition-colors">
              {isEs ? 'Ranking de instituciones →' : 'Institution ranking →'}
            </Link>
            <Link to="/cases" className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary transition-colors">
              {isEs ? 'Biblioteca de casos →' : 'Case library →'}
            </Link>
          </div>
        </section>

        {/* ============================ §1 — LA LÍNEA DEL SAQUEO ============================ */}
        <section className="mb-4">
          <div className="mb-4">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-text-muted mb-1.5">
              ◆ {isEs ? 'La Línea del Saqueo' : 'The Line of the Looting'}
            </p>
            <h2
              className="text-text-primary"
              style={{ fontFamily: 'var(--font-family-serif, "Playfair Display", serif)', fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {isEs ? 'Cada investigación, en su escala y su tiempo' : 'Every investigation, by scale and time'}
            </h2>
          </div>

          {/* Lens-filter pill (from the Atlas) */}
          {lensFilterActive && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
                ◆ {isEs ? 'Desde el Atlas:' : 'From the Atlas:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.delete('pattern')
                  next.delete('sector')
                  setSearchParams(next, { replace: true })
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold tracking-[0.12em] rounded-sm border border-risk-high/40 text-risk-high bg-risk-high/[0.06] hover:bg-risk-high/[0.12] transition-colors"
              >
                {lensPattern && <span>PATTERN · {lensPattern}</span>}
                {lensSector && <span>SECTOR · {SECTOR_NAMES_EN[lensSector]?.toUpperCase() ?? lensSector.toUpperCase()}</span>}
                <span className="opacity-60" aria-hidden="true">·</span>
                <span className="opacity-80">{isEs ? 'QUITAR' : 'CLEAR'} ✕</span>
              </button>
            </div>
          )}

          {/* Desktop: the swimlane. Mobile: a note → the register below is the mobile mode. */}
          <div className="hidden md:block">
            <PlateFrame
              lang={lang}
              folio="I"
              contextLabel={{ en: 'The newsroom desk', es: 'La mesa de redacción' }}
              caption={
                isEs
                  ? 'Cada barra es una investigación, trazada sobre los años que abarca; la altura y el color muestran su escala e indicador de riesgo.'
                  : 'Each bar is one investigation, plotted across the years it spans; height and color show its scale and risk indicator.'
              }
            >
              <SaqueoSwimlane rows={visibleRows} lang={lang} axis={axis} onAxisChange={setAxis} />
            </PlateFrame>
          </div>
          <div className="md:hidden text-[11px] font-mono text-text-muted mb-2">
            {isEs ? 'Gira el dispositivo para ver la línea de tiempo →' : 'Rotate your device for the timeline →'}
          </div>
        </section>

        {/* ============================ §2 — VERDICT BAR (lazy, fallback-safe) ============================ */}
        {scandals && scandals.length > 0 && <VerdictBar scandals={scandals} lang={lang} />}

        {/* ============================ §3 — EL REGISTRO (register) ============================ */}
        <section className="mb-8">
          <div className="flex items-end justify-between gap-6 mb-4">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-text-muted mb-1.5">
                ◆ {isEs ? 'El escritorio, por magnitud' : 'The desk, ranked'}
              </p>
              <h2
                className="text-text-primary"
                style={{ fontFamily: 'var(--font-family-serif, "Playfair Display", serif)', fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {isEs ? 'Las 13 investigaciones' : 'Every investigation in the desk'}
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted tabular-nums pb-2">
              {visibleRows.length} / {allRows.length} {isEs ? 'mostrando' : 'showing'}
            </span>
          </div>

          {registerRows.length > 0 ? (
            <DotStrip rows={registerRows} rowHeight={36} labelWidth={210} />
          ) : (
            <div className="py-16 text-center border border-dashed border-border rounded-sm">
              <p className="text-sm font-mono text-text-muted">
                {isEs ? 'Ninguna investigación coincide con este filtro.' : 'No investigations match this filter.'}
              </p>
            </div>
          )}

          {/* Atlas tour badges for the 3 stories that have a tour */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {visibleRows.map((r) =>
              findStoryByLongformSlug(r.slug) ? (
                <ObservatoryTourBadge key={r.slug} slug={r.slug} accent={accent} lang={lang} />
              ) : null,
            )}
          </div>
        </section>

        {/* ============================ §4 — ARIA LIVE TICKER ============================ */}
        <AriaLiveTicker lang={lang} />

        {/* ============================ §5 — ATLAS BAND (Day-13 copy) ============================ */}
        <div
          className="mt-14 sm:mt-16 py-4 px-5 flex items-center gap-4 rounded-sm border border-border hover:border-border-hover transition-colors"
          style={{ background: 'var(--color-background-card)' }}
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true">◆</span>
          <p className="text-[12px] font-mono text-text-secondary flex-1 min-w-0">
            <span className="font-bold text-text-primary">{isEs ? 'El Atlas' : 'The Atlas'}</span>
            {' — '}
            {isEs ? 'un mapa vivo de cúmulos de proveedores por escala y riesgo.' : 'a live scatter of vendor clusters by scale and risk indicator.'}
          </p>
          <Link
            to="/atlas"
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.14em] transition-colors hover:opacity-80 whitespace-nowrap"
            style={{ color: 'var(--color-accent)' }}
          >
            {isEs ? 'Explorar →' : 'Explore →'}
          </Link>
        </div>

        {/* ============================ §6 — FOOTER ============================ */}
        <PageFooter />
      </div>
    </div>
  )
}
