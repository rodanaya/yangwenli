import { useMemo } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ariaApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { findStoryByLongformSlug } from '@/lib/atlas-stories'
import { getStoriesByLensTag, type AriaPattern, type SectorCode } from '@/lib/story-content'
import { SECTOR_NAMES_EN } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { useExecutiveSummary } from '@/hooks/useExecutiveSummary'
import { PageFooter } from '@/components/layout/PageFooter'

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
  brief: string // 2-sentence abstract shown on the grid card
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

// ---------------------------------------------------------------------------
// Visual system
// ---------------------------------------------------------------------------

const FRAUD_COLOR: Record<FraudType, string> = {
  ghost_company: 'var(--color-risk-critical)',
  monopoly: 'var(--color-sector-educacion)',
  overpricing: 'var(--color-sector-infraestructura)',
  embezzlement: 'var(--color-risk-high)',
  procurement_fraud: 'var(--color-sector-tecnologia)',
}

const STATUS_META: Record<
  StatusKind,
  { label: string; color: string; border: string; bg: string }
> = {
  procesado: {
    label: 'PROSECUTED',
    color: 'text-risk-critical',
    border: 'border-risk-critical/30',
    bg: 'bg-risk-critical/[0.06]',
  },
  auditado: {
    label: 'UNDER AUDIT',
    color: 'text-oecd',
    border: 'border-oecd/30',
    bg: 'bg-oecd/[0.06]',
  },
  reporteado: {
    label: 'REPORTED',
    color: 'text-risk-high',
    border: 'border-risk-high/30',
    bg: 'bg-risk-high/[0.06]',
  },
  solo_datos: {
    label: 'DATA LEAD',
    color: 'text-text-muted',
    border: 'border-border',
    bg: 'bg-background-elevated',
  },
}

const FRAUD_LABEL: Record<FraudType, string> = {
  ghost_company: 'GHOST CO.',
  monopoly: 'MONOPOLY',
  overpricing: 'OVERPRICING',
  embezzlement: 'EMBEZZLEMENT',
  procurement_fraud: 'PROCUREMENT FRAUD',
}

const ERA_LABEL: Record<Era, string> = {
  pena: 'EPN · 2012–2018',
  amlo: '4T · 2018–2024',
  cross: 'CROSS-ERA',
}

// Locale-aware display of the sub-stat (amount in billions)
function formatBillions(amount: number, lang: 'en' | 'es' = 'en'): string {
  if (amount === 0) return '—'
  if (lang === 'es') {
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)} billones MXN`
    const mdp = Math.round(amount * 1000)
    return `${new Intl.NumberFormat('es-MX').format(mdp)} MDP`
  }
  if (amount >= 1000) return `MX$${(amount / 1000).toFixed(2)}T`
  return `MX$${amount.toFixed(1)}B`
}

// ---------------------------------------------------------------------------
// ObservatoryTourBadge — small chip that surfaces the matching atlas tour
// ---------------------------------------------------------------------------

function ObservatoryTourBadge({ slug, accent, lang }: { slug: string; accent: string; lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  const tour = findStoryByLongformSlug(slug)
  if (!tour) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        navigate(`/atlas?story=${tour.id}`)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); navigate(`/atlas?story=${tour.id}`) } }}
      className="inline-flex items-center gap-1.5 px-2 py-[3px] text-[10px] font-mono font-bold tracking-[0.12em] rounded-sm border transition-opacity hover:opacity-80"
      style={{ borderColor: `${accent}55`, color: accent, background: `${accent}0d` }}
      aria-label={lang === 'en' ? `${tour.duration} Atlas tour: ${tour.title.en}` : `Tour de ${tour.duration} en El Atlas: ${tour.title.es}`}
    >
      <span>◆</span>
      <span>{lang === 'en' ? `${tour.duration} TOUR · OBSERVATORY` : `TOUR ${tour.duration} · OBSERVATORIO`}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// LEAD STORY — top of page, full-bleed hero
// ---------------------------------------------------------------------------

function LeadStoryCard({ item }: { item: Investigation }) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('journalists')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const status = STATUS_META[item.status]
  const accent = FRAUD_COLOR[item.type]
  const headline = t(`investigations.${item.slug}.headline`, { defaultValue: isEs ? (item.headline_es ?? item.headline) : item.headline })
  const sub = t(`investigations.${item.slug}.sub`, { defaultValue: isEs ? (item.sub_es ?? item.sub) : item.sub })
  const brief = t(`investigations.${item.slug}.brief`, { defaultValue: isEs ? (item.brief_es ?? item.brief) : item.brief })
  const statusLabel = t(`status.${item.status}`, { defaultValue: status.label })

  // Editorial figure: use leadStat if available, otherwise fall back to amount
  const leadStatValue = item.leadStat
    ? (isEs && item.leadStat.value_es ? item.leadStat.value_es : item.leadStat.value)
    : formatBillions(item.amount, lang)
  const leadStatLabel = item.leadStat
    ? (isEs && item.leadStat.label_es ? item.leadStat.label_es : item.leadStat.label)
    : (isEs ? 'gasto validado en contratos' : 'validated contract spend')

  return (
    <article
      onClick={() => navigate(`/stories/${item.slug}`)}
      className="group relative block w-full text-left bg-background-card rounded-sm overflow-hidden cursor-pointer transition-shadow hover:shadow-2xl"
      style={{ border: '1px solid var(--color-border)' }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/stories/${item.slug}`) }}
      aria-label={headline}
    >
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-[3px] z-10" style={{ background: accent }} />

      <div className="relative z-10 grid lg:grid-cols-12 gap-x-10 gap-y-6 p-8 sm:p-10 md:p-14">
        {/* LEFT COLUMN — editorial */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
              ◆ {t('featuredLabel', { defaultValue: 'LEAD INVESTIGATION' })}
            </span>
            <span className="h-px flex-1 max-w-12" style={{ background: accent, opacity: 0.45 }} />
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
              {t(`typeLabel.${item.type}`, { defaultValue: FRAUD_LABEL[item.type] })}
            </span>
          </div>

          <h2
            className="text-text-primary leading-[1.04] mb-6 text-balance"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
            }}
          >
            {headline}
          </h2>

          <p
            className="text-text-secondary leading-[1.55] mb-7 text-pretty max-w-2xl italic"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontSize: 'clamp(1rem, 1.4vw, 1.2rem)',
            }}
          >
            {brief}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mb-7">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-1 text-[10px] font-mono font-bold tracking-[0.14em] border rounded-sm',
                status.color, status.border, status.bg,
              )}
            >
              [{statusLabel}]
            </span>
            <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-mono font-bold tracking-[0.14em] text-text-secondary border border-border bg-background rounded-sm">
              {t(`eraLabel.${item.era}`, { defaultValue: ERA_LABEL[item.era] })}
            </span>
            <ObservatoryTourBadge slug={item.slug} accent={accent} lang={lang} />
          </div>

          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] transition-colors" style={{ color: accent }}>
            {t('cards.readInvestigation', { defaultValue: 'Read the full investigation' })}
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </span>
        </div>

        {/* RIGHT COLUMN — editorial stat block */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6 lg:border-l lg:border-border lg:pl-10">
          {/* Hero editorial figure */}
          <div>
            <div
              className="font-extrabold text-text-primary leading-[0.9] tracking-[-0.04em] tabular-nums"
              style={{
                fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
                fontSize: 'clamp(2.5rem, 6.5vw, 5rem)',
                color: accent,
              }}
            >
              {leadStatValue}
            </div>
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted mt-3">
              {leadStatLabel}
            </p>
          </div>

          {/* Sub-stats grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="border-l-2 pl-3" style={{ borderColor: accent }}>
              <div className="text-2xl font-mono font-bold text-text-primary tabular-nums leading-none">
                {item.contracts > 0 ? item.contracts.toLocaleString('en-US') : '—'}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
                {t('lead.statContracts', { defaultValue: 'Contracts' })}
              </p>
            </div>
            <div className="border-l-2 border-border-hover pl-3">
              <div className="text-2xl font-mono font-bold text-text-primary tabular-nums leading-none">
                {item.yearSpan ?? item.sub.match(/\d{4}[–-]\d{4}/)?.[0] ?? '—'}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
                {t('lead.statSpan', { defaultValue: 'Time span' })}
              </p>
            </div>
          </div>

          {/* Sub copy */}
          {item.amount > 0 && (
            <div className="pt-4 border-t border-border/60">
              <p className="text-[11px] font-mono text-text-muted leading-[1.5] tabular-nums">
                {isEs ? 'Gasto validado:' : 'Validated spend:'}{' '}
                <span className="text-text-secondary">{formatBillions(item.amount, lang)}</span>
              </p>
              <p className="text-[11px] font-mono text-text-muted leading-[1.5] tabular-nums mt-1">
                {sub}
              </p>
            </div>
          )}
          {item.amount === 0 && (
            <div className="pt-4 border-t border-border/60">
              <p className="text-[11px] font-mono text-text-muted leading-[1.5] tabular-nums">
                {sub}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Section break
// ---------------------------------------------------------------------------

function SectionBreak() {
  return (
    <div className="my-12 sm:my-14 flex items-center justify-center" aria-hidden="true">
      <span className="block h-px w-16 bg-border" />
      <span className="mx-3 h-1.5 w-1.5 rounded-full bg-text-muted opacity-60" aria-hidden="true" />
      <span className="block h-px w-16 bg-border" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Unified InvestigationCard — replaces both EditorsPickCard and GridCard
// ---------------------------------------------------------------------------

function InvestigationCard({ item, variant }: { item: Investigation; variant: 'pick' | 'grid' }) {
  const { t, i18n } = useTranslation('journalists')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'
  const accent = FRAUD_COLOR[item.type]
  const status = STATUS_META[item.status]
  const headline = t(`investigations.${item.slug}.headline`, { defaultValue: isEs ? (item.headline_es ?? item.headline) : item.headline })
  const brief = t(`investigations.${item.slug}.brief`, { defaultValue: isEs ? (item.brief_es ?? item.brief) : item.brief })
  const statusLabel = t(`status.${item.status}`, { defaultValue: status.label })

  const leadStatValue = item.leadStat
    ? (isEs && item.leadStat.value_es ? item.leadStat.value_es : item.leadStat.value)
    : (item.amount > 0 ? formatBillions(item.amount, lang) : null)
  const leadStatLabel = item.leadStat
    ? (isEs && item.leadStat.label_es ? item.leadStat.label_es : item.leadStat.label)
    : (item.amount > 0 ? (isEs ? 'gasto validado' : 'validated spend') : null)

  if (variant === 'pick') {
    return (
      <Link
        to={`/stories/${item.slug}`}
        className="group relative flex flex-col bg-background-card rounded-sm overflow-hidden transition-shadow hover:shadow-xl"
        style={{ border: '1px solid var(--color-border)' }}
        aria-label={headline}
      >
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />

        <div className="relative p-6 sm:p-7 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
              {t(`typeLabel.${item.type}`, { defaultValue: FRAUD_LABEL[item.type] })}
            </span>
            <span className="text-[9px] font-mono text-text-muted">·</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
              {t(`eraLabel.${item.era}`, { defaultValue: ERA_LABEL[item.era] })}
            </span>
          </div>

          <h3
            className="text-text-primary leading-[1.12] mb-4 text-balance"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontSize: 'clamp(1.4rem, 2.3vw, 1.85rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {headline}
          </h3>

          <p className="text-[14px] leading-[1.6] text-text-secondary mb-5 flex-1 text-pretty">
            {brief}
          </p>

          {/* Mono stat — the editorial figure */}
          {leadStatValue && (
            <div className="flex items-end gap-4 mb-4 pt-4 border-t border-border/60">
              <div>
                <div
                  className="font-extrabold tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
                    color: accent,
                    fontSize: 24,
                  }}
                >
                  {leadStatValue}
                </div>
                {leadStatLabel && (
                  <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1">
                    {leadStatLabel}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-[2px] text-[9px] font-mono font-bold tracking-[0.14em] border rounded-sm',
                  status.color, status.border, status.bg,
                )}
              >
                [{statusLabel}]
              </span>
              <ObservatoryTourBadge slug={item.slug} accent={accent} lang={lang} />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] font-bold transition-transform" style={{ color: accent }}>
              {t('cards.readStory', { defaultValue: 'Read story' })}
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </Link>
    )
  }

  // variant === 'grid'
  return (
    <Link
      to={`/stories/${item.slug}`}
      className={cn(
        'group relative flex flex-col',
        'bg-background-card border border-border rounded-sm',
        'transition-colors duration-200 hover:border-border-hover'
      )}
      aria-label={headline}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />

      <div className="pl-5 pr-5 pt-4 pb-4 flex flex-col flex-1">
        {/* Top: fraud type + era */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {t(`typeLabel.${item.type}`, { defaultValue: FRAUD_LABEL[item.type] })}
          </span>
          <span className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
          <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-text-muted">
            {t(`eraLabel.${item.era}`, { defaultValue: ERA_LABEL[item.era] })}
          </span>
        </div>

        {/* Headline */}
        <h3
          className="text-text-primary leading-[1.22] mb-5"
          style={{
            fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          {headline}
        </h3>

        {/* Brief abstract */}
        <p className="mt-auto mb-5 text-[13px] leading-[1.6] text-text-primary">
          {brief}
        </p>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-[2px] text-[9px] font-mono font-bold tracking-[0.14em] border rounded-sm',
                status.color, status.border, status.bg
              )}
            >
              [{statusLabel}]
            </span>
            <ObservatoryTourBadge slug={item.slug} accent={accent} lang={lang} />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted group-hover:text-text-primary transition-colors">
            {t('cards.readStory', { defaultValue: 'Read story' })}
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Type legend — non-interactive color key for the dossier grid
// ---------------------------------------------------------------------------

function DossierLegend({ lang }: { lang: 'en' | 'es' }) {
  const isEs = lang === 'es'
  const items: Array<{ type: FraudType; labelEn: string; labelEs: string }> = [
    { type: 'ghost_company', labelEn: 'Ghost Companies', labelEs: 'Empresas Fantasma' },
    { type: 'monopoly', labelEn: 'Monopoly / Capture', labelEs: 'Monopolio / Captura' },
    { type: 'overpricing', labelEn: 'Overpricing', labelEs: 'Sobreprecio' },
    { type: 'procurement_fraud', labelEn: 'Procurement Fraud', labelEs: 'Fraude en Licitación' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-hidden="true">
      {items.map(({ type, labelEn, labelEs }) => (
        <span key={type} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-[1px] flex-shrink-0"
            style={{ background: FRAUD_COLOR[type] }}
          />
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
            {isEs ? labelEs : labelEn}
          </span>
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ARIA T1 live ticker
// ---------------------------------------------------------------------------

function AriaLiveTicker() {
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
            LIVE
          </span>
        </span>
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-secondary tabular-nums">
          {total > 0 ? total.toLocaleString('en-US') : items.length}{' '}
          {t('ticker.label', { defaultValue: 'vendors under active investigation' })}
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
// Main page
// ---------------------------------------------------------------------------

export default function Journalists() {
  const { t, i18n } = useTranslation('journalists')
  const [searchParams, setSearchParams] = useSearchParams()
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const isEs = lang === 'es'

  // Cross-surface lens filter
  const lensPattern = searchParams.get('pattern') as AriaPattern | null
  const lensSector = searchParams.get('sector') as SectorCode | null
  const lensFilterActive = !!(lensPattern || lensSector)

  // Headline figures from the shared source (one query, consistent everywhere —
  // footer + stat strip + deck all read the same live numbers).
  const { totalContracts: statContracts, highRiskRatePct, totalValueMXN } = useExecutiveSummary()
  const hrDisplay = `${highRiskRatePct.toFixed(1)}%`
  const totalValueT = totalValueMXN / 1e12

  // Stable editorial ranking: lead = el-sexenio-del-riesgo (amount=2760 tops the sort)
  const editorialRanked = useMemo(
    () => [...INVESTIGATIONS].sort((a, b) => b.amount - a.amount),
    [],
  )
  const lead = editorialRanked[0]
  const editorsPicks = editorialRanked.slice(1, 3)
  const tierTwoSlugSet = useMemo(
    () => new Set([lead.slug, ...editorsPicks.map((i) => i.slug)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const dossier = useMemo(
    () => INVESTIGATIONS.filter((i) => !tierTwoSlugSet.has(i.slug)),
    [tierTwoSlugSet],
  )

  // Lens filtering — applied to full dossier (non-promoted)
  const lensFilteredSlugs = useMemo(() => {
    if (!lensFilterActive) return null
    return new Set(
      getStoriesByLensTag({
        pattern: lensPattern ?? undefined,
        sector: lensSector ?? undefined,
      }).map((s) => s.slug),
    )
  }, [lensPattern, lensSector, lensFilterActive])

  const dossierFiltered = useMemo(() => {
    if (!lensFilteredSlugs) return dossier
    return dossier.filter((i) => lensFilteredSlugs.has(i.slug))
  }, [dossier, lensFilteredSlugs])

  const updatedDate = new Date().toLocaleDateString(isEs ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =================================================================
            MASTHEAD
        ================================================================= */}
        <header className="pt-14 sm:pt-20 pb-10">
          {/* Top byline row */}
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden="true" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-text-secondary">
                RUBLI
              </span>
            </span>
            <span className="text-text-primary">·</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
              {t('masthead.desk', { defaultValue: 'Investigations Desk' })}
            </span>
            <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted tabular-nums">
              {t('masthead.updated', { defaultValue: 'Updated' })} {updatedDate}
            </span>
          </div>

          {/* Nameplate — kept unchanged */}
          <h1
            className="text-text-primary"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontSize: 'clamp(2.5rem, 6.5vw, 5rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
            }}
          >
            RUBLI{' '}
            <span className="italic text-risk-critical">{t('masthead.headline', { defaultValue: 'Investigations' })}</span>
          </h1>

          {/* Deck — scope-true, no conflicting number */}
          <p
            className="mt-6 max-w-3xl text-text-secondary"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(1rem, 1.4vw, 1.25rem)',
              lineHeight: 1.55,
            }}
          >
            {isEs
              ? `${INVESTIGATIONS.length} investigaciones sobre ${totalValueT.toFixed(1)} billones MXN en contratación pública federal — donde tres de cada cuatro pesos se adjudicaron sin competencia.`
              : `${INVESTIGATIONS.length} investigations into MX$${totalValueT.toFixed(1)}T of federal contracting — where three of four pesos were awarded without competition.`}
          </p>

          {/* Stat strip — 4 real figures, hairline-separated */}
          <div
            className="mt-8 flex flex-wrap items-baseline gap-x-0 gap-y-3 text-[11px] font-mono uppercase tracking-[0.12em]"
            role="list"
            aria-label={isEs ? 'Cifras clave' : 'Key figures'}
          >
            {[
              {
                value: statContracts.toLocaleString('en-US'),
                label: isEs ? 'contratos' : 'contracts',
              },
              {
                value: hrDisplay,
                label: isEs ? 'riesgo alto+' : 'high-risk+',
              },
              {
                value: isEs ? `${totalValueT.toFixed(1)} billones MXN` : `MX$${totalValueT.toFixed(1)}T`,
                label: isEs ? 'validado' : 'validated',
              },
              {
                value: String(INVESTIGATIONS.length),
                label: isEs ? 'investigaciones' : 'investigations',
              },
            ].map((stat, idx, arr) => (
              <span key={stat.label} className="inline-flex items-baseline gap-2" role="listitem">
                <span className="text-text-primary font-bold tabular-nums">{stat.value}</span>
                <span className="text-text-muted">{stat.label}</span>
                {idx < arr.length - 1 && (
                  <span className="mx-3 text-border" aria-hidden="true">·</span>
                )}
              </span>
            ))}
          </div>

          {/* Lookup row — reader query interface */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-text-muted mr-1">
              {isEs ? 'Empieza aquí:' : 'Start here:'}
            </span>
            <Link
              to="/explore?tab=vendors"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.1em] border border-border rounded-sm bg-background-card text-text-secondary hover:text-text-primary transition-colors"
              style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
            >
              {isEs ? 'Investigar un proveedor' : 'Look up a vendor'} →
            </Link>
            <Link
              to="/institutions"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.1em] border border-border rounded-sm bg-background-card text-text-secondary hover:text-text-primary transition-colors"
            >
              {isEs ? 'Ranking de instituciones' : 'Institution ranking'} →
            </Link>
            <Link
              to="/cases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.1em] border border-border rounded-sm bg-background-card text-text-secondary hover:text-text-primary transition-colors"
            >
              {isEs ? 'Biblioteca de casos' : 'Case library'} →
            </Link>
          </div>
        </header>

        {/* =================================================================
            TIER 1 — LEAD STORY
        ================================================================= */}
        <section className="mb-14 sm:mb-16">
          <LeadStoryCard item={lead} />
        </section>

        {/* =================================================================
            TIER 2 — EDITOR'S PICKS (2-up, unified InvestigationCard)
        ================================================================= */}
        {editorsPicks.length === 2 && (
          <>
            <SectionBreak />
            <section className="mb-14 sm:mb-16">
              <div className="flex items-end justify-between gap-6 mb-6">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-text-muted mb-1.5">
                    ◆ {t('picks.kicker', { defaultValue: 'Editor\'s Picks' })}
                  </p>
                  <h2
                    className="text-text-primary"
                    style={{
                      fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
                      fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {t('picks.title', { defaultValue: 'Investigations of consequence' })}
                  </h2>
                </div>
                <p className="text-[10px] font-mono text-text-muted leading-[1.45] max-w-xs hidden sm:block">
                  {t('picks.dek', {
                    defaultValue: 'Two stories where data, dollars, and documentation align.',
                  })}
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {editorsPicks.map((item) => (
                  <InvestigationCard
                    key={item.slug}
                    item={item}
                    variant="pick"
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* =================================================================
            TIER 3 — THE FULL DOSSIER (one ranked grid, light legend)
        ================================================================= */}
        <SectionBreak />
        <section className="mb-8">
          <div className="flex items-end justify-between gap-6 mb-4">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-text-muted mb-1.5">
                ◆ {t('grid.kicker', { defaultValue: 'The Full Dossier' })}
              </p>
              <h2
                className="text-text-primary"
                style={{
                  fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
                  fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                {t('grid.title', { defaultValue: 'Every investigation in the desk' })}
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted tabular-nums pb-2">
              {dossierFiltered.length} / {dossier.length}{' '}
              {t('grid.showing', { defaultValue: 'showing' })}
            </span>
          </div>

          {/* Non-interactive type legend */}
          <DossierLegend lang={lang} />

          {/* Cross-surface lens-filter pill */}
          {lensFilterActive && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
                ◆ {t('grid.fromObservatory', { defaultValue: 'From the Atlas:' })}
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
                <span className="opacity-60">·</span>
                <span className="opacity-80">{t('grid.clear', { defaultValue: 'CLEAR' })} ✕</span>
              </button>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-14 sm:mb-16">
          {dossierFiltered.map((item) => (
            <InvestigationCard key={item.slug} item={item} variant="grid" />
          ))}
          {dossierFiltered.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-border rounded-sm">
              <p className="text-sm font-mono text-text-muted">
                {t('grid.empty', {
                  defaultValue: 'No investigations match this filter.',
                })}
              </p>
            </div>
          )}
        </section>

        {/* =================================================================
            ARIA LIVE TICKER
        ================================================================= */}
        <AriaLiveTicker />

        {/* =================================================================
            OBSERVATORY — slim one-line link band
        ================================================================= */}
        <div
          className="mt-14 sm:mt-16 py-4 px-5 flex items-center gap-4 rounded-sm border border-border hover:border-border-hover transition-colors"
          style={{ background: 'var(--color-background-card)' }}
        >
          <span
            className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] flex-shrink-0"
            style={{ color: 'var(--color-accent)' }}
            aria-hidden="true"
          >
            ◆
          </span>
          <p className="text-[12px] font-mono text-text-secondary flex-1 min-w-0">
            <span className="font-bold text-text-primary">
              {isEs ? 'El Atlas' : 'The Atlas'}
            </span>
            {' — '}
            {isEs
              ? 'una constelación viva de 1,200 clusters de proveedores.'
              : 'a living constellation of 1,200 vendor clusters.'}
          </p>
          <Link
            to="/atlas"
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.14em] transition-colors hover:opacity-80 whitespace-nowrap"
            style={{ color: 'var(--color-accent)' }}
          >
            {isEs ? 'Explorar →' : 'Explore →'}
          </Link>
        </div>

        {/* =================================================================
            FOOTER — shared credibility strip (live contract count)
        ================================================================= */}
        <PageFooter />
      </div>
    </div>
  )
}
