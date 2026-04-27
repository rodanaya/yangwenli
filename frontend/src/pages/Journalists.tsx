import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ariaApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { DotBar } from '@/components/ui/DotBar'

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

interface Investigation {
  slug: string
  headline: string
  sub: string
  type: FraudType
  status: StatusKind
  amount: number // MXN billions
  era: Era
  contracts: number
}

const INVESTIGATIONS: Investigation[] = [
  {
    slug: 'el-ejercito-fantasma',
    headline: 'The Ghost Army: 6,034 Vendors That Look Like Nothing',
    sub: 'RUBLI found 6,034 ghost-pattern vendors · only 42 officially confirmed',
    type: 'ghost_company',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 6034,
  },
  {
    slug: 'el-gran-precio',
    headline: 'The Bigger the Contract, the Higher the Risk',
    sub: '23,469 large contracts · MX$6.24T · avg risk score 0.70',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 6240,
    era: 'cross',
    contracts: 23469,
  },
  {
    slug: 'el-monopolio-invisible',
    headline: 'The 44 Monopolists: Vendors Who Ate Their Sector',
    sub: 'Grupo Fármacos · MX$133B · 6,303 contracts · one institution',
    type: 'monopoly',
    status: 'reporteado',
    amount: 133.2,
    era: 'cross',
    contracts: 6303,
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
  },
  {
    slug: 'el-sexenio-del-riesgo',
    headline: 'The Riskiest Administration in 23 Years',
    sub: 'AMLO era HR 17.6% · Fox 7.9% · Calderón 9.7% · Peña Nieto 12.4%',
    type: 'procurement_fraud',
    status: 'reporteado',
    amount: 2760,
    era: 'amlo',
    contracts: 1049729,
  },
  {
    slug: 'la-industria-del-intermediario',
    headline: 'The Intermediary Industry: 2,974 Vendors, 518B MXN',
    sub: 'Infrastructure 174B · Health 129B · Energy 121B · RUBLI P3 pattern',
    type: 'procurement_fraud',
    status: 'solo_datos',
    amount: 518,
    era: 'cross',
    contracts: 10633,
  },
  {
    slug: 'el-umbral-de-los-300k',
    headline: 'The 300,000 Peso Threshold Trap',
    sub: '75,474 contracts at exactly MX$300K · statistical impossibility without coordination',
    type: 'procurement_fraud',
    status: 'solo_datos',
    amount: 22.6,
    era: 'cross',
    contracts: 75474,
  },
  {
    slug: 'volatilidad-el-precio-del-riesgo',
    headline: "Price Volatility: The Algorithm's Smoking Gun",
    sub: 'Strongest predictor in v0.6.5 model · coefficient +0.5343 across 3M contracts',
    type: 'overpricing',
    status: 'solo_datos',
    amount: 0,
    era: 'cross',
    contracts: 0,
  },
]

// ---------------------------------------------------------------------------
// Visual system
// ---------------------------------------------------------------------------

// Routed through canonical risk + sector tokens. Was 5 hex constants per
// FRAUD_COLOR + 4 dark-mode pill styles per STATUS_META. Cream-mode now.
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
    color: 'text-[color:var(--color-oecd)]',
    border: 'border-[color:var(--color-oecd)]/30',
    bg: 'bg-[color:var(--color-oecd)]/[0.06]',
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

// Map MX$ billion amount → 0..1 intensity, log-scaled.
// Linear scaling was useless: amounts span 0–6240 (3 orders of magnitude),
// so most cards rendered 1 dot of 22 with the largest case eating the rest.
// Log-scale spreads them legibly: 22.6B -> ~8 dots, 133B -> ~12, 787B -> ~17,
// 2760B -> ~20, 6240B -> 22. Zero-amount data leads still render empty.
const MAX_AMOUNT = Math.max(...INVESTIGATIONS.map((i) => i.amount))
const LOG_MAX = Math.log(MAX_AMOUNT + 1)
function amountToIntensity(amount: number): number {
  return amount > 0 ? Math.log(amount + 1) / LOG_MAX : 0
}

function formatBillions(amount: number): string {
  if (amount === 0) return 'DATA LEAD'
  if (amount >= 1000) return `MX$${(amount / 1000).toFixed(2)}T`
  return `MX$${amount.toFixed(1)}B`
}

// ---------------------------------------------------------------------------
// Dot-matrix intensity bar
// ---------------------------------------------------------------------------

function IntensityBar({ value, color }: { value: number; color: string }) {
  // Use canonical DotBar geometry but with bigger spacing so the bar
  // stretches across the card row legibly. Default geometry (DR=2, DG=5)
  // shrinks to ~108px, which looks like a tiny strip of black specks
  // floating at the left of a 300px row. Bumping to DR=3, DG=12 makes
  // each dot ~6px diameter and the whole bar ~264px — a clean, scannable
  // intensity readout.
  return (
    <DotBar
      value={Math.min(1, value)}
      max={1}
      color={color}
      dots={22}
      dotR={3}
      dotGap={12}
      ariaLabel="Investigation intensity"
    />
  )
}

// ---------------------------------------------------------------------------
// Featured Investigation — full-width hero
// ---------------------------------------------------------------------------

function FeaturedCard({ item }: { item: Investigation }) {
  const navigate = useNavigate()
  const { t } = useTranslation('journalists')
  const status = STATUS_META[item.status]
  const accent = FRAUD_COLOR[item.type]

  const headline = t(`investigations.${item.slug}.headline`, { defaultValue: item.headline })
  const sub = t(`investigations.${item.slug}.sub`, { defaultValue: item.sub })

  return (
    <button
      onClick={() => navigate(`/stories/${item.slug}`)}
      className={cn(
        'group relative block w-full text-left',
        'bg-background-card border border-border rounded-sm',
        'overflow-hidden transition-colors duration-200',
        'hover:border-border-hover'
      )}
      aria-label={headline}
    >
      {/* Accent glow */}
      <div
        className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full opacity-[0.05] blur-3xl pointer-events-none"
        style={{ background: accent }}
      />

      {/* Top accent rule */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accent, opacity: 0.9 }}
      />

      <div className="relative z-10 grid lg:grid-cols-5 gap-10 p-8 sm:p-10 lg:p-12">
        {/* LEFT — editorial */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-risk-critical">
              {t('featuredLabel')}
            </span>
            <span className="h-px w-8 bg-red-500/50" />
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
              {FRAUD_LABEL[item.type]}
            </span>
          </div>

          <h2
            className="text-text-primary leading-[1.08] mb-5 font-serif"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontSize: 'clamp(1.75rem, 3.6vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
            }}
          >
            {headline}
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-mono tabular-nums mb-8">
            {sub}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mb-8">
            <span
              className={cn(
                'inline-flex items-center px-2 py-[3px] text-[10px] font-mono font-bold tracking-[0.12em] border rounded-sm',
                status.color,
                status.border,
                status.bg
              )}
            >
              [{status.label}]
            </span>
            <span className="inline-flex items-center px-2 py-[3px] text-[10px] font-mono font-bold tracking-[0.12em] text-text-secondary border border-border bg-background-card rounded-sm">
              {ERA_LABEL[item.era]}
            </span>
          </div>

          <span className="inline-flex items-center gap-2 text-sm font-semibold text-risk-critical group-hover:text-risk-critical transition-colors">
            {t('cards.readInvestigation')}
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>

        {/* RIGHT — three stats */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-6 lg:border-l lg:border-border lg:pl-10">
          <div>
            <div
              className="font-mono font-bold text-text-primary leading-none"
              style={{
                fontSize: 'clamp(3rem, 6vw, 5rem)',
                letterSpacing: '-0.04em',
              }}
            >
              {formatBillions(item.amount)}
            </div>
            <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3">
              Validated contract spend
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div
              className="border-l-2 pl-3"
              style={{ borderColor: accent }}
            >
              <div className="text-2xl font-mono font-bold text-text-primary tabular-nums">
                {item.contracts.toLocaleString('en-US')}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1">
                Contracts
              </p>
            </div>
            <div className="border-l-2 border-border-hover pl-3">
              <div className="text-2xl font-mono font-bold text-text-primary tabular-nums">
                {item.sub.match(/\d{4}[–-]\d{4}/)?.[0] ?? '—'}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1">
                Time span
              </p>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Investigation grid card
// ---------------------------------------------------------------------------

function GridCard({ item }: { item: Investigation }) {
  const { t } = useTranslation('journalists')
  const accent = FRAUD_COLOR[item.type]
  const status = STATUS_META[item.status]
  const intensity = amountToIntensity(item.amount)

  const headline = t(`investigations.${item.slug}.headline`, { defaultValue: item.headline })
  const sub = t(`investigations.${item.slug}.sub`, { defaultValue: item.sub })

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
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accent }}
      />

      <div className="pl-6 pr-5 py-5 flex flex-col flex-1 gap-4">
        {/* Type tag */}
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {FRAUD_LABEL[item.type]}
          </span>
          <span className="h-px flex-1 bg-background-elevated" />
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {ERA_LABEL[item.era]}
          </span>
        </div>

        {/* Headline */}
        <h3
          className="text-text-primary leading-[1.18] font-serif"
          style={{
            fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
            fontSize: '17px',
            fontWeight: 700,
            letterSpacing: '-0.015em',
          }}
        >
          {headline}
        </h3>

        {/* One-line lede */}
        <p className="text-xs text-text-secondary font-mono tabular-nums leading-snug line-clamp-2">
          {sub}
        </p>

        {/* Hero number */}
        <div>
          <div
            className="font-mono font-bold text-text-primary leading-none tabular-nums"
            style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}
          >
            {formatBillions(item.amount)}
          </div>
          <p className="text-[11px] text-text-muted font-mono mt-2 tabular-nums">
            {item.contracts.toLocaleString('en-US')} contracts ·{' '}
            {sub.match(/\d{4}[–-]\d{4}/)?.[0] ?? ''}
          </p>
        </div>

        {/* Intensity bar */}
        <div className="flex items-center gap-3">
          <IntensityBar value={intensity} color="#f59e0b" />
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {t('cards.scale')}
          </span>
        </div>

        {/* Footer: status pill + read story link */}
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-[2px] text-[9px] font-mono font-bold tracking-[0.14em] border rounded-sm',
              status.color,
              status.border,
              status.bg
            )}
          >
            [{status.label}]
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted group-hover:text-text-primary transition-colors"
          >
            {t('cards.readStory')}
            <span
              className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Filter strip
// ---------------------------------------------------------------------------

type FilterKey =
  | 'all'
  | 'ghost_company'
  | 'monopoly'
  | 'overpricing'
  | 'procurement_fraud'
  | 'era_pena'
  | 'era_amlo'
  | 'era_cross'

interface FilterDef {
  key: FilterKey
  label: string
  match: (i: Investigation) => boolean
  accent?: string
}

function FilterStrip({
  active,
  onChange,
  counts,
}: {
  active: FilterKey
  onChange: (k: FilterKey) => void
  counts: Record<FilterKey, number>
}) {
  const { t } = useTranslation('journalists')

  const filters: FilterDef[] = [
    { key: 'all', label: t('filters.all', { defaultValue: 'All' }), match: () => true },
    {
      key: 'ghost_company',
      label: t('filters.ghost', { defaultValue: 'Ghost Companies' }),
      match: (i) => i.type === 'ghost_company',
      accent: FRAUD_COLOR.ghost_company,
    },
    {
      key: 'monopoly',
      label: t('filters.monopoly', { defaultValue: 'Monopoly' }),
      match: (i) => i.type === 'monopoly',
      accent: FRAUD_COLOR.monopoly,
    },
    {
      key: 'overpricing',
      label: t('filters.overpricing', { defaultValue: 'Overpricing' }),
      match: (i) => i.type === 'overpricing',
      accent: FRAUD_COLOR.overpricing,
    },
    {
      key: 'procurement_fraud',
      label: t('filters.fraud', { defaultValue: 'Procurement Fraud' }),
      match: (i) => i.type === 'procurement_fraud' || i.type === 'embezzlement',
      accent: FRAUD_COLOR.procurement_fraud,
    },
    {
      key: 'era_pena',
      label: t('filters.eraPena', { defaultValue: 'Peña era' }),
      match: (i) => i.era === 'pena',
    },
    {
      key: 'era_amlo',
      label: t('filters.eraAmlo', { defaultValue: '4T era' }),
      match: (i) => i.era === 'amlo',
    },
    {
      key: 'era_cross',
      label: t('filters.eraCross', { defaultValue: 'Cross-era' }),
      match: (i) => i.era === 'cross',
    },
  ]

  return (
    <div
      role="tablist"
      aria-label={t('filters.aria', { defaultValue: 'Filter investigations' })}
      className="flex flex-wrap gap-2"
    >
      {filters.map((f) => {
        const isActive = active === f.key
        return (
          <button
            key={f.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(f.key)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-[0.1em] border transition-colors',
              isActive
                ? 'bg-background-elevated text-text-primary border-border font-bold'
                : 'bg-transparent text-text-secondary border-border hover:text-text-primary hover:border-border-hover'
            )}
          >
            {f.accent && !isActive && (
              <span
                className="block w-1.5 h-1.5"
                style={{ background: f.accent }}
                aria-hidden="true"
              />
            )}
            <span>{f.label}</span>
            <span
              className={cn(
                'tabular-nums text-[10px]',
                isActive ? 'text-text-muted' : 'text-text-muted'
              )}
            >
              {counts[f.key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ARIA T1 live ticker — compact bottom strip
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
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
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
          const pct = Math.round(risk * 100)
          const name =
            item.vendor_name.length > 44
              ? item.vendor_name.slice(0, 44) + '…'
              : item.vendor_name

          return (
            <Link
              key={item.vendor_id}
              to={`/thread/${item.vendor_id}`}
              className={cn(
                'group flex items-center justify-between gap-3',
                'px-3 py-2.5 bg-background-card border border-border',
                'rounded-sm hover:border-border-hover transition-colors'
              )}
            >
              <span
                className="text-[11px] text-text-secondary font-mono truncate group-hover:text-text-primary"
                title={item.vendor_name}
              >
                {name}
              </span>
              <span
                className="text-[10px] font-mono font-bold tabular-nums flex-shrink-0"
                style={{
                  color: risk >= 0.6 ? '#ef4444' : risk >= 0.4 ? '#fb923c' : '#f59e0b',
                }}
              >
                {pct}
              </span>
            </Link>
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
  const { t } = useTranslation('journalists')
  const [active, setActive] = useState<FilterKey>('all')

  // Featured = biggest amount
  const featured = useMemo(
    () =>
      [...INVESTIGATIONS].sort((a, b) => b.amount - a.amount)[0],
    []
  )

  const remaining = useMemo(
    () => INVESTIGATIONS.filter((i) => i.slug !== featured.slug),
    [featured]
  )

  // Filter definitions (duplicated here for counts — keeps filter UI self-contained)
  const counts = useMemo<Record<FilterKey, number>>(() => {
    const base = (pred: (i: Investigation) => boolean) =>
      remaining.filter(pred).length
    return {
      all: remaining.length,
      ghost_company: base((i) => i.type === 'ghost_company'),
      monopoly: base((i) => i.type === 'monopoly'),
      overpricing: base((i) => i.type === 'overpricing'),
      procurement_fraud: base(
        (i) => i.type === 'procurement_fraud' || i.type === 'embezzlement'
      ),
      era_pena: base((i) => i.era === 'pena'),
      era_amlo: base((i) => i.era === 'amlo'),
      era_cross: base((i) => i.era === 'cross'),
    }
  }, [remaining])

  const filtered = useMemo(() => {
    switch (active) {
      case 'all':
        return remaining
      case 'ghost_company':
        return remaining.filter((i) => i.type === 'ghost_company')
      case 'monopoly':
        return remaining.filter((i) => i.type === 'monopoly')
      case 'overpricing':
        return remaining.filter((i) => i.type === 'overpricing')
      case 'procurement_fraud':
        return remaining.filter(
          (i) => i.type === 'procurement_fraud' || i.type === 'embezzlement'
        )
      case 'era_pena':
        return remaining.filter((i) => i.era === 'pena')
      case 'era_amlo':
        return remaining.filter((i) => i.era === 'amlo')
      case 'era_cross':
        return remaining.filter((i) => i.era === 'cross')
      default:
        return remaining
    }
  }, [active, remaining])

  // Summary stats for the masthead
  const totalCount = INVESTIGATIONS.length
  const prosecutedCount = INVESTIGATIONS.filter(
    (i) => i.status === 'procesado'
  ).length
  const activeLeadsCount = INVESTIGATIONS.filter(
    (i) => i.status === 'reporteado' || i.status === 'solo_datos'
  ).length
  const updatedDate = new Date().toLocaleDateString('en-US', {
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
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
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
            <span className="italic text-risk-critical">Investigations</span>
          </h1>

          <p
            className="mt-6 max-w-3xl text-text-secondary"
            style={{
              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(1rem, 1.4vw, 1.25rem)',
              lineHeight: 1.55,
            }}
          >
            {t('masthead.deck', {
              defaultValue:
                'Ten investigations into how MX$422 billion moved through Mexican federal procurement. Each story begins with 3.05 million contracts and ends with the people who signed them.',
            })}
          </p>

          {/* Subline: counts */}
          <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-3 text-[11px] font-mono uppercase tracking-[0.12em] text-text-muted">
            <span>
              <span className="text-text-primary font-bold tabular-nums">
                {totalCount}
              </span>{' '}
              {t('masthead.totalLabel', { defaultValue: 'Investigations' })}
            </span>
            <span className="text-text-primary">·</span>
            <span>
              <span className="text-risk-critical font-bold tabular-nums">
                {prosecutedCount}
              </span>{' '}
              {t('masthead.prosecutedLabel', { defaultValue: 'Prosecuted' })}
            </span>
            <span className="text-text-primary">·</span>
            <span>
              <span className="text-risk-high font-bold tabular-nums">
                {activeLeadsCount}
              </span>{' '}
              {t('masthead.activeLabel', { defaultValue: 'Active leads' })}
            </span>
          </div>
        </header>

        {/* =================================================================
            FEATURED
        ================================================================= */}
        <section className="mb-14">
          <FeaturedCard item={featured} />
        </section>

        {/* =================================================================
            FILTER STRIP
        ================================================================= */}
        <section className="mb-8">
          <div className="flex items-end justify-between gap-6 mb-5">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted mb-1.5">
                {t('grid.kicker', { defaultValue: 'The Full Dossier' })}
              </p>
              <h2
                className="text-text-primary"
                style={{
                  fontFamily:
                    'var(--font-family-serif, "Playfair Display", serif)',
                  fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                {t('grid.title', { defaultValue: 'All investigations' })}
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted tabular-nums pb-2">
              {filtered.length} / {remaining.length}{' '}
              {t('grid.showing', { defaultValue: 'showing' })}
            </span>
          </div>

          <FilterStrip active={active} onChange={setActive} counts={counts} />
        </section>

        {/* =================================================================
            INVESTIGATION GRID
        ================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((item) => (
            <GridCard key={item.slug} item={item} />
          ))}
          {filtered.length === 0 && (
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
            FOOTER
        ================================================================= */}
        <footer className="mt-16 pt-8 pb-16 border-t border-border">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
            <span>
              Source:{' '}
              <span className="text-text-secondary">COMPRANET / SHCP</span>
            </span>
            <span className="text-text-primary">·</span>
            <span>
              Risk model{' '}
              <span className="text-text-secondary tabular-nums">v0.6.5</span>
            </span>
            <span className="text-text-primary">·</span>
            <span>
              Test AUC <span className="text-text-secondary tabular-nums">0.828</span>
            </span>
            <span className="text-text-primary">·</span>
            <span>
              <span className="text-text-secondary tabular-nums">3,051,294</span>{' '}
              contracts analyzed
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
