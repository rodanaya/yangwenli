import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ariaApi } from '@/api/client'
import { findStoryByLongformSlug } from '@/lib/atlas-stories'
import { getStoriesByLensTag, type AriaPattern, type SectorCode } from '@/lib/story-content'
import { SECTOR_NAMES_EN, getNewsTypeColor } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PageFooter } from '@/components/layout/PageFooter'

// ---------------------------------------------------------------------------
// INVESTIGATIONS — hardcoded editorial metadata
// ---------------------------------------------------------------------------

type FraudType = 'ghost_company' | 'procurement_fraud' | 'embezzlement' | 'monopoly' | 'overpricing'
type StatusKind = 'procesado' | 'auditado' | 'reporteado' | 'solo_datos'
type Era = 'pena' | 'amlo' | 'cross'

interface Investigation {
  slug: string
  headline: string
  headline_es?: string
  sub: string
  sub_es?: string
  type: FraudType
  status: StatusKind
  amount: number
  era: Era
  contracts: number
  brief: string
  brief_es?: string
  yearSpan?: string
}

const LEAD_SLUG = 'el-sexenio-del-riesgo'

const INVESTIGATIONS: Investigation[] = [
  {
    slug: 'el-sexenio-del-riesgo',
    headline: 'The Riskiest Administration in 23 Years',
    headline_es: 'El Sexenio Más Riesgoso en 23 Años',
    sub: 'AMLO era HR 12.6% · v0.8.5',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 2760,
    era: 'amlo',
    contracts: 1049729,
    yearSpan: '2018–2024',
    brief: "AMLO's 12.6% high-risk rate is the highest of any administration in 23 years. Every administration since Fox has been riskier than the one before it — 5.1 points of drift in a generation.",
    brief_es: 'La tasa de riesgo alto de 12.6% de AMLO es la más alta de cualquier administración en 23 años. Cada sexenio desde Fox ha sido más riesgoso que el anterior — 5.1 puntos de deriva en una generación.',
  },
  {
    slug: 'captura-institucional',
    headline: 'Inside Institutional Capture: 15,923 Vendors at Three Agencies',
    headline_es: 'La Captura Institucional: 15,923 Proveedores en Tres Dependencias',
    sub: 'IMSS · CFE · PEMEX',
    type: 'monopoly',
    status: 'auditado',
    amount: 787,
    era: 'cross',
    contracts: 530000,
    yearSpan: '2002–2025',
    brief: '15,923 vendors show behavioral capture signatures at IMSS, CFE, PEMEX, SCT and CONAGUA — nearly a trillion pesos of systematically captured federal contracting.',
    brief_es: '15,923 proveedores muestran firmas de captura en IMSS, CFE, PEMEX, SCT y CONAGUA — casi un billón de pesos de contratación federal sistemáticamente capturada.',
  },
  {
    slug: 'el-cartel-de-los-vales',
    headline: 'The Voucher Cartel: 240 Billion in a Closed Market',
    headline_es: 'El Cártel de los Vales: 240 Mil Millones en un Mercado Cerrado',
    sub: 'Edenred · Efectivale · Si Vale',
    type: 'monopoly',
    status: 'auditado',
    amount: 240,
    era: 'cross',
    contracts: 3000,
    yearSpan: '2002–2025',
    brief: 'Three multinationals have split Mexico\'s federal payment-card market across five administrations with a 96.7% direct-award rate and 2,868 single-bid wins — a market-structure problem, not just procurement.',
    brief_es: 'Tres multinacionales se han repartido el mercado federal de tarjetas de pago a lo largo de cinco administraciones con 96.7% de adjudicación directa y 2,868 licitaciones de única oferta — un problema de estructura de mercado, no solo de contratación.',
  },
  {
    slug: 'el-monopolio-invisible',
    headline: 'The 44 Monopolists Who Ate Their Sector',
    headline_es: 'Los 44 Monopolistas Que Se Comieron Su Sector',
    sub: 'Grupo Fármacos · IMSS',
    type: 'monopoly',
    status: 'reporteado',
    amount: 133.2,
    era: 'cross',
    contracts: 6303,
    yearSpan: '2002–2025',
    brief: 'Four pharmaceutical distributors collected 326 billion pesos from IMSS over 23 years with no meaningful competition. Their combined risk indicator averages 0.96.',
    brief_es: 'Cuatro distribuidoras farmacéuticas cobraron 326 mil millones de pesos al IMSS en 23 años sin competencia significativa. Su indicador de riesgo combinado promedia 0.96.',
  },
  {
    slug: 'el-ano-de-la-emergencia',
    headline: '2020: The Year Competition Stopped',
    headline_es: '2020: El Año en que la Competencia se Detuvo',
    sub: 'COVID decree · 87% direct award',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 17.2,
    era: 'amlo',
    contracts: 215000,
    yearSpan: '2020–2021',
    brief: "Mexico's COVID emergency decree suspended competitive bidding overnight. The direct-award rate hit 87% — and ghost vendors like HEMOSER collected 17.2 billion pesos in same-day awards from IMSS.",
    brief_es: 'El decreto de emergencia COVID suspendió la licitación competitiva de la noche a la mañana. La adjudicación directa llegó al 87% — y proveedores fantasma como HEMOSER cobraron 17,200 millones de pesos en adjudicaciones del mismo día.',
  },
  {
    slug: 'la-ilusion-competitiva',
    headline: 'The Competition That Never Was',
    headline_es: 'La Competencia Que Nunca Existió',
    sub: 'Single-bid "competitive" tenders',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2010–2023',
    brief: 'For 14 straight years, over 45% of Mexico\'s "competitive" procurement had exactly one bidder. The OECD flags anything above 15% as a structural red flag.',
    brief_es: 'Durante 14 años seguidos, más del 45% de la contratación "competitiva" de México tuvo un solo oferente. La OCDE marca todo lo que supere el 15% como señal estructural de alarma.',
  },
  {
    slug: 'marea-de-adjudicaciones',
    headline: 'The Direct-Award Tide: From 60% to 82%',
    headline_es: 'La Marea de Adjudicaciones: del 60% al 82%',
    sub: 'Every administration worse',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2010–2023',
    brief: '82.2% of 2023 federal contracts were direct awards — no competition, no public tender. Every administration since 2010 has been worse than the one before it.',
    brief_es: 'El 82.2% de los contratos federales de 2023 fueron adjudicaciones directas — sin competencia, sin licitación pública. Cada administración desde 2010 ha sido peor que la anterior.',
  },
  {
    slug: 'el-ejercito-fantasma',
    headline: 'The Ghost Army: 6,118 Vendors That Vanish',
    headline_es: 'El Ejército Fantasma: 6,118 Proveedores Que Desaparecen',
    sub: 'P2 ghost-company pattern',
    type: 'ghost_company',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2002–2025',
    brief: 'RUBLI identified 6,118 vendors matching ghost-company patterns across 23 years. They appear, win contracts, then vanish from the tax registry — only 0.7% are officially confirmed.',
    brief_es: 'RUBLI identificó 6,118 proveedores con patrones de empresa fantasma en 23 años. Aparecen, ganan contratos y desaparecen del registro fiscal — solo el 0.7% está oficialmente confirmado.',
  },
  {
    slug: 'el-gran-precio',
    headline: 'The Bigger the Contract, the Higher the Risk',
    headline_es: 'Mientras Más Grande el Contrato, Mayor el Riesgo',
    sub: '40 mega-contracts above 10B',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 3000000,
    yearSpan: '2002–2025',
    brief: "Across 3 million contracts, risk rises in near-lockstep with size: the 40 contracts above 10 billion pesos — 819 billion in all — are every one high-risk, and oversight runs thinnest exactly there.",
    brief_es: 'En 3 millones de contratos, el riesgo sube casi en paralelo con el tamaño: los 40 contratos por encima de 10 mil millones — 819 mil millones en total — son todos de alto riesgo, y la fiscalización es más débil justo ahí.',
  },
  {
    slug: 'la-industria-del-intermediario',
    headline: 'The Intermediary Industry',
    headline_es: 'La Industria del Intermediario',
    sub: 'P3 pass-through vendors',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 0,
    era: 'cross',
    contracts: 0,
    yearSpan: '2002–2025',
    brief: '2,974 vendors function as pure procurement intermediaries — no physical product, no technical service, just margin extracted between agencies and the real suppliers.',
    brief_es: '2,974 proveedores funcionan como puros intermediarios de contratación — sin producto físico, sin servicio técnico, solo el margen extraído entre las dependencias y los proveedores reales.',
  },
  {
    slug: 'el-umbral-de-los-300k',
    headline: 'The 300,000-Peso Threshold',
    headline_es: 'El Umbral de los 300 Mil Pesos',
    sub: 'Contracts bunched at the limit',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 28264,
    yearSpan: '2018–2023',
    brief: '28,264 contracts bunch at exactly 210K, 250K and 300K pesos — statistically impossible by chance. The pattern points to systematic threshold-splitting to dodge competitive-bidding rules.',
    brief_es: '28,264 contratos se agrupan exactamente en 210, 250 y 300 mil pesos — estadísticamente imposible por azar. El patrón apunta a fraccionamiento sistemático para evadir las reglas de licitación.',
  },
  {
    slug: 'volatilidad-el-precio-del-riesgo',
    headline: "Price Volatility: The Algorithm's Smoking Gun",
    headline_es: 'Volatilidad de Precio: La Huella del Algoritmo',
    sub: 'Strongest predictor · v0.8.5',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 3051294,
    yearSpan: '2002–2025',
    brief: "Price volatility is the single strongest predictor in RUBLI's risk model (coefficient +0.558), outperforming 17 other features. It captures the forensic fingerprint of negotiated — not competed — prices.",
    brief_es: 'La volatilidad de precios es el predictor más fuerte del modelo de RUBLI (coeficiente +0.558), por encima de otros 17 factores. Captura la huella forense de precios negociados, no competidos.',
  },
]

const TYPE_LABEL: Record<FraudType, { en: string; es: string }> = {
  ghost_company: { en: 'Ghost companies', es: 'Empresas fantasma' },
  procurement_fraud: { en: 'Procurement', es: 'Contratación' },
  embezzlement: { en: 'Embezzlement', es: 'Desvío de recursos' },
  monopoly: { en: 'Market capture', es: 'Captura de mercado' },
  overpricing: { en: 'Overpricing', es: 'Sobreprecio' },
}

// ---------------------------------------------------------------------------
// ObservatoryTourBadge — surfaces the matching Atlas tour (kept)
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
  const { data } = useQuery({
    queryKey: ['aria', 'journalists-ticker'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 6 }),
    staleTime: 5 * 60 * 1000,
  })

  const items = data?.data ?? []
  const total = data?.pagination?.total ?? 0
  if (items.length === 0) return null

  return (
    <section aria-label={lang === 'es' ? 'Investigaciones en vivo' : 'Live investigations'} className="mt-16 pt-8 border-t border-border">
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden="true" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-risk-critical">
            {lang === 'es' ? 'EN VIVO' : 'LIVE'}
          </span>
        </span>
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-secondary tabular-nums">
          {(total > 0 ? total : items.length).toLocaleString('en-US')}{' '}
          {lang === 'es' ? 'proveedores bajo investigación activa' : 'vendors under active investigation'}
        </span>
        <span className="h-px flex-1 bg-background-elevated" />
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">ARIA · TIER 1</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.slice(0, 6).map((item) => {
          const risk = item.risk_score_norm ?? item.avg_risk_score ?? 0
          const flags: ('gt' | 'efos' | 'sfp')[] = []
          if (item.in_ground_truth) flags.push('gt')
          if (item.is_efos_definitivo) flags.push('efos')
          if (item.is_sfp_sanctioned) flags.push('sfp')
          return (
            <div key={item.vendor_id} className="px-2 py-1.5 bg-background-card border border-border rounded-sm hover:border-border-hover transition-colors">
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
// Main page — the Newsroom front page (lead + clean section-colored list)
// ---------------------------------------------------------------------------

interface Story {
  slug: string
  headline: string
  brief: string
  type: FraudType
  color: string
}

export default function Journalists() {
  const { t, i18n } = useTranslation('journalists')
  const [searchParams, setSearchParams] = useSearchParams()
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'

  // Cross-surface lens filter (from the Atlas)
  const lensPattern = searchParams.get('pattern') as AriaPattern | null
  const lensSector = searchParams.get('sector') as SectorCode | null
  const lensFilterActive = !!(lensPattern || lensSector)
  const lensFilteredSlugs = useMemo(() => {
    if (!lensFilterActive) return null
    return new Set(
      getStoriesByLensTag({ pattern: lensPattern ?? undefined, sector: lensSector ?? undefined }).map((s) => s.slug),
    )
  }, [lensPattern, lensSector, lensFilterActive])

  // Localize the 12 stories (kept editorial set; presentation only)
  const stories: Story[] = useMemo(
    () =>
      INVESTIGATIONS.map((inv) => ({
        slug: inv.slug,
        headline: t(`investigations.${inv.slug}.headline`, { defaultValue: isEs ? inv.headline_es ?? inv.headline : inv.headline }),
        brief: t(`investigations.${inv.slug}.brief`, { defaultValue: isEs ? inv.brief_es ?? inv.brief : inv.brief }),
        type: inv.type,
        color: getNewsTypeColor(inv.type),
      })),
    [t, isEs],
  )

  const shown = useMemo(
    () => (lensFilteredSlugs ? stories.filter((s) => lensFilteredSlugs.has(s.slug)) : stories),
    [stories, lensFilteredSlugs],
  )
  const lead = shown.find((s) => s.slug === LEAD_SLUG) ?? shown[0]
  const rest = shown.filter((s) => s.slug !== lead?.slug)

  const typeLabel = (type: FraudType) => (isEs ? TYPE_LABEL[type].es : TYPE_LABEL[type].en)

  const clearLens = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('pattern')
    next.delete('sector')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ── Nameplate (compact — the lead story is the hero, not this) ── */}
        <header className="pt-12 sm:pt-16 pb-6 border-b-2 border-text-primary/85">
          <div className="flex items-center justify-between gap-3 mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden="true" />
              <span className="font-bold tracking-[0.2em] text-text-secondary">RUBLI</span>
            </span>
            <span className="tabular-nums">{isEs ? 'Datos hasta sep 2025' : 'Data through Sep 2025'}</span>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1
              className="text-text-primary"
              style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}
            >
              {isEs ? 'Sala de Redacción' : 'The Newsroom'}
            </h1>
            <p className="text-[12px] font-serif italic text-text-muted pb-1" style={{ fontFamily: '"EB Garamond", Georgia, serif' }}>
              {isEs ? `${stories.length} investigaciones sobre la contratación federal` : `${stories.length} investigations into federal contracting`}
            </p>
          </div>
        </header>

        {/* ── Lens filter pill (from the Atlas) ── */}
        {lensFilterActive && (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">◆ {isEs ? 'Desde el Atlas:' : 'From the Atlas:'}</span>
            <button
              type="button"
              onClick={clearLens}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold tracking-[0.12em] rounded-sm border border-risk-high/40 text-risk-high bg-risk-high/[0.06] hover:bg-risk-high/[0.12] transition-colors"
            >
              {lensPattern && <span>PATTERN · {lensPattern}</span>}
              {lensSector && <span>SECTOR · {SECTOR_NAMES_EN[lensSector]?.toUpperCase() ?? lensSector.toUpperCase()}</span>}
              <span className="opacity-60" aria-hidden="true">·</span>
              <span className="opacity-80">{isEs ? 'QUITAR' : 'CLEAR'} ✕</span>
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-sm mt-8">
            <p className="text-sm font-mono text-text-muted">
              {isEs ? 'Ninguna investigación coincide con este filtro.' : 'No investigations match this filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── LEAD STORY ── */}
            {lead && (
              <Link
                to={`/stories/${lead.slug}`}
                className="group block py-8 sm:py-10"
                style={{ borderLeft: `4px solid ${lead.color}`, paddingLeft: 'clamp(20px, 3vw, 36px)' }}
              >
                <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] mb-3" style={{ color: lead.color }}>
                  {typeLabel(lead.type)}
                </div>
                <h2
                  className="text-text-primary group-hover:underline decoration-1 underline-offset-[6px]"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(30px, 4.6vw, 54px)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.02em' }}
                >
                  {lead.headline}
                </h2>
                <p
                  className="mt-4 max-w-3xl text-text-secondary"
                  style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(18px, 1.6vw, 21px)', lineHeight: 1.5 }}
                >
                  {lead.brief}
                </p>
                <div className="mt-4">
                  <ObservatoryTourBadge slug={lead.slug} accent={lead.color} lang={lang} />
                </div>
              </Link>
            )}

            {/* ── THE LIST ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-9 border-t border-text-primary/15 pt-9">
              {rest.map((s) => (
                <Link
                  key={s.slug}
                  to={`/stories/${s.slug}`}
                  className="group block"
                  style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: '16px' }}
                >
                  <div className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] mb-2" style={{ color: s.color }}>
                    {typeLabel(s.type)}
                  </div>
                  <h3
                    className="text-text-primary group-hover:underline decoration-1 underline-offset-[4px]"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '21px', fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.01em' }}
                  >
                    {s.headline}
                  </h3>
                  <p
                    className="mt-2 text-text-secondary line-clamp-3"
                    style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '15px', lineHeight: 1.45 }}
                  >
                    {s.brief}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── ARIA live ticker (kept) ── */}
        <AriaLiveTicker lang={lang} />

        {/* ── Atlas band (kept, Day-13 copy) ── */}
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
          <Link to="/atlas" className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.14em] transition-colors hover:opacity-80 whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
            {isEs ? 'Explorar →' : 'Explore →'}
          </Link>
        </div>

        <PageFooter />
      </div>
    </div>
  )
}
