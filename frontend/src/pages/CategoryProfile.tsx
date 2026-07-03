/**
 * CategoryProfile — Full drill-down page for a single spending category.
 *
 * Route: /categories/:id
 * Editorial dark-mode aesthetic. Shows historical evolution, sexenio comparison,
 * market concentration, vendor-institution pairs, top contracts, and subcategories.
 */

import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber, formatCompactMXN, formatDualCurrency, shortenContractName } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { categoriesApi } from '@/api/client'
import {
  EditorialComposedChart,
  type ComposedLayer,
  type ColorToken,
} from '@/components/charts/editorial'
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Building2,
  User,
} from 'lucide-react'
import { FuentePill } from '@/components/ui/FuentePill'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { getLedeForCategory } from '@/lib/entity/lede'
import { EditorialChartFrame } from '@/components/stories/EditorialChartFrame'
import { ADMIN_DISPLAY_LEGACY as ADMIN_DISPLAY, ADMIN_DISPLAY as ADMIN_DISPLAY_CANONICAL } from '@/lib/administrations'

// =============================================================================
// Types
// =============================================================================

interface CategoryStat {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number | null
  sector_code: string | null
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  top_vendor: { id: number; name: string } | null
  top_institution: { id: number; name: string } | null
}

interface TrendItem {
  category_id: number
  name_es: string
  name_en: string
  year: number
  contracts: number
  value: number
  avg_risk: number
}

// =============================================================================
// Helpers
// =============================================================================

function getRiskColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return RISK_COLORS[level]
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text
}

const ADMIN_ORDER = [
  ADMIN_DISPLAY_CANONICAL.fox,
  ADMIN_DISPLAY_CANONICAL.calderon,
  ADMIN_DISPLAY_CANONICAL.epn,
  ADMIN_DISPLAY_CANONICAL.amlo,
  ADMIN_DISPLAY_CANONICAL.sheinbaum,
]

function getConcentrationBadge(label: string, t: (key: string) => string) {
  switch (label) {
    case 'highly_concentrated':
      return { text: t('profile.concentration.high'), color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
    case 'moderately_concentrated':
      return { text: t('profile.concentration.moderate'), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' }
    default:
      return { text: t('profile.concentration.competitive'), color: 'var(--color-text-muted)', bg: 'rgba(113,113,122,0.1)' }
  }
}

// =============================================================================
// Dot-matrix chart primitives
// =============================================================================


interface SubcatDotDatum {
  name: string
  value: number
  avg_risk: number
}

/**
 * SubcatDotStrips — horizontal dot-matrix strips, one per subcategory.
 * Replaces a horizontal bar chart. Label on left, dots fill right proportional
 * to subcategory value / max value.
 */
function SubcatDotStrips({ data, color }: { data: SubcatDotDatum[]; color: string }) {
  const DOTS = 50
  const DOT_R = 3
  const DOT_GAP = 8
  const LABEL_W = 180
  const ROW_H = 22
  const VALUE_W = 90

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const width = LABEL_W + DOTS * DOT_GAP + VALUE_W + 16
  const height = data.length * ROW_H + 24

  return (
    <div
      style={{ minHeight: Math.max(200, data.length * ROW_H + 60) }}
      role="img"
      aria-label="Dot matrix chart showing contract value by subcategory"
    >
      <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {data.map((d, rowIdx) => {
          const filled = d.value > 0 ? Math.max(1, Math.round((d.value / maxValue) * DOTS)) : 0
          const cy = 12 + rowIdx * ROW_H + ROW_H / 2
          return (
            <g key={`subcat-${rowIdx}`}>
              <text
                x={LABEL_W - 8}
                y={cy + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--color-text-secondary)"
                fontFamily="var(--font-family-sans)"
              >
                {d.name}
              </text>
              {Array.from({ length: DOTS }).map((_, i) => {
                const isFilled = i < filled
                return (
                  <motion.circle
                    key={`dot-${rowIdx}-${i}`}
                    cx={LABEL_W + i * DOT_GAP + DOT_GAP / 2}
                    cy={cy}
                    r={DOT_R}
                    fill={isFilled ? color : 'var(--color-background-elevated)'}
                    fillOpacity={isFilled ? 0.7 : 1}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={isFilled ? 0 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                  />
                )
              })}
              <text
                x={LABEL_W + DOTS * DOT_GAP + 8}
                y={cy + 3}
                fontSize="10"
                fill="var(--color-text-primary)"
                fontFamily="var(--font-family-mono)"
              >
                {formatCompactMXN(d.value)}
              </text>
              <text
                x={width - 4}
                y={cy + 3}
                textAnchor="end"
                fontSize="10"
                fill={getRiskColor(d.avg_risk)}
                fontFamily="var(--font-family-mono)"
              >
                {(d.avg_risk * 100).toFixed(0)}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function CategoryProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('categories')
  const categoryId = Number(id)

  // Data queries
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['categories', 'trends', 2002, 2025],
    queryFn: () => categoriesApi.getTrends(2002, 2025),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sexenioData, isLoading: sexenioLoading } = useQuery({
    queryKey: ['categories', 'sexenio'],
    queryFn: () => categoriesApi.getSexenio(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: topVendorsData, isLoading: topVendorsLoading, isError: topVendorsError } = useQuery({
    queryKey: ['categories', 'top-vendors', categoryId],
    queryFn: () => categoriesApi.getTopVendors(categoryId),
    enabled: !isNaN(categoryId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const [vendorsTimedOut, setVendorsTimedOut] = useState(false)
  useEffect(() => {
    if (!topVendorsLoading) { setVendorsTimedOut(false); return }
    const tid = setTimeout(() => setVendorsTimedOut(true), 5000)
    return () => clearTimeout(tid)
  }, [topVendorsLoading])

  const { data: vendorInstData, isLoading: vendorInstLoading } = useQuery({
    queryKey: ['categories', 'vendor-institution', categoryId],
    queryFn: () => categoriesApi.getVendorInstitution(categoryId, 20),
    enabled: !isNaN(categoryId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: topContractsData, isLoading: topContractsLoading } = useQuery({
    queryKey: ['categories', 'contracts', categoryId, 'top10'],
    queryFn: () => categoriesApi.getContracts(categoryId, { per_page: 10, sort_by: 'amount_mxn', sort_order: 'desc' }),
    enabled: !isNaN(categoryId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: subcategoryData, isLoading: subcategoryLoading } = useQuery({
    queryKey: ['categories', 'subcategories', categoryId],
    queryFn: () => categoriesApi.getSubcategories(categoryId),
    enabled: !isNaN(categoryId),
    staleTime: 10 * 60 * 1000,
  })

  // Derived: find the current category from the summary list.
  // Must be declared BEFORE categoryExists which references it — otherwise
  // esbuild merges everything into one const chain and creates a TDZ violation.
  const category: CategoryStat | null = useMemo(() => {
    if (!summaryData?.data) return null
    return (summaryData.data as CategoryStat[]).find(c => c.category_id === categoryId) ?? null
  }, [summaryData, categoryId])

  // Gate slow secondary queries on category existence — prevents retry storm on 404 pages.
  const categoryExists = !summaryLoading && !!category

  const { data: competitionData, isLoading: competitionLoading } = useQuery({
    queryKey: ['categories', 'competition', categoryId],
    queryFn: () => categoriesApi.getCompetition(categoryId),
    enabled: !isNaN(categoryId) && categoryExists,
    staleTime: 10 * 60 * 1000,
  })

  const { data: seasonalityData, isLoading: seasonalityLoading } = useQuery({
    queryKey: ['categories', 'seasonality', categoryId],
    queryFn: () => categoriesApi.getSeasonality(categoryId),
    enabled: !isNaN(categoryId) && categoryExists,
    staleTime: 10 * 60 * 1000,
  })

  const { data: patternsData, isLoading: patternsLoading } = useQuery({
    queryKey: ['categories', 'patterns', categoryId],
    queryFn: () => categoriesApi.getPatterns(categoryId),
    enabled: !isNaN(categoryId) && categoryExists,
    staleTime: 10 * 60 * 1000,
  })

  const { data: priceDistData, isLoading: priceDistLoading } = useQuery({
    queryKey: ['categories', 'price-distribution', categoryId],
    queryFn: () => categoriesApi.getPriceDistribution(categoryId),
    enabled: !isNaN(categoryId) && categoryExists,
    staleTime: 10 * 60 * 1000,
  })

  const sectorColor = category?.sector_code ? (SECTOR_COLORS[category.sector_code] || '#64748b') : '#64748b'

  // Timeline data for this category
  const timelineData = useMemo(() => {
    if (!trendsData?.data) return []
    return (trendsData.data as TrendItem[])
      .filter(t => t.category_id === categoryId)
      .sort((a, b) => a.year - b.year)
  }, [trendsData, categoryId])

  // Sexenio data for this category
  const sexenioBarData = useMemo(() => {
    if (!sexenioData?.data) return []
    const catData = sexenioData.data.find(c => c.category_id === categoryId)
    if (!catData) return []

    return ADMIN_ORDER.map(admin => {
      // Find matching key in administrations
      const matchKey = Object.keys(catData.administrations).find(k => (ADMIN_DISPLAY[k] ?? k) === admin)
      const vals = matchKey ? catData.administrations[matchKey] : null
      return {
        admin,
        value: vals?.value ?? 0,
        contracts: vals?.contracts ?? 0,
        avg_risk: vals?.avg_risk ?? 0,
      }
    })
  }, [sexenioData, categoryId])

  // Subcategory bar data
  const subcatBarData = useMemo(() => {
    if (!subcategoryData?.data) return []
    return [...subcategoryData.data]
      .filter(s => !s.is_catch_all && s.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 15)
  }, [subcategoryData])

  // 404 state — editorial "archived folio" treatment
  if (!summaryLoading && !category) {
    const missingFolio = String(Number(id) || 0).padStart(3, '0')
    return (
      <div className="max-w-2xl py-16">
        <div
          className="mb-4 flex items-center gap-3"
          style={{
            fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
            fontSize: '12px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 400,
          }}
        >
          <span style={{ color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 500 }}>
            Folio · {missingFolio}
          </span>
          <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
          <span style={{ fontStyle: 'normal', fontWeight: 300 }}>
            {i18n.language.startsWith('es') ? 'Archivado · sin registro' : 'Archived · no record'}
          </span>
        </div>
        <div className="flex items-start gap-4">
          <div
            className="self-stretch w-[3px] rounded-full shrink-0 mt-2 bg-border"
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <h1
              className="text-text-primary leading-tight mb-3"
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: 'clamp(24px, 3vw, 32px)',
                letterSpacing: '-0.012em',
              }}
            >
              {t('profile.notFound.title')}
            </h1>
            <p className="text-sm text-text-secondary leading-[1.65] mb-5"
              style={{ fontFamily: 'var(--font-family-serif)' }}>
              {t('profile.notFound.description', { id })}
            </p>
            <Link
              to="/sectors?view=categories"
              className="inline-flex items-center gap-1.5 text-[13px] font-mono uppercase tracking-[0.15em] text-accent hover:text-accent/80 transition-colors border border-accent/30 hover:border-accent/60 px-2.5 py-1.5 rounded-sm"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              {t('profile.notFound.backLink')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const riskLevel = category ? getRiskLevelFromScore(category.avg_risk) : 'low'
  const riskColor = category ? getRiskColor(category.avg_risk) : 'var(--color-text-muted)'
  const daPct = category?.direct_award_pct ?? 0
  const daColor = daPct > 50 ? '#f87171' : daPct > 25 ? '#fbbf24' : 'var(--color-text-muted)'

  const topContracts = (topContractsData?.data ?? []) as Array<{
    id: number
    title: string | null
    amount_mxn: number
    contract_year: number | null
    risk_score: number
    risk_level: string | null
    vendor_name: string | null
    vendor_id: number | null
    institution_name: string | null
  }>

  const isEs = i18n.language.startsWith('es')
  const folioNumber = String(categoryId).padStart(3, '0')
  const sectorLabel = category?.sector_code
    ? (isEs ? (category.sector_code === 'infraestructura' ? 'Infraestructura'
              : category.sector_code === 'salud' ? 'Salud'
              : category.sector_code === 'educacion' ? 'Educación'
              : category.sector_code === 'energia' ? 'Energía'
              : category.sector_code === 'tecnologia' ? 'Tecnología'
              : category.sector_code === 'gobernacion' ? 'Gobernación'
              : category.sector_code.charAt(0).toUpperCase() + category.sector_code.slice(1))
            : category.sector_code.charAt(0).toUpperCase() + category.sector_code.slice(1))
    : null
  const avgContractValue = category && category.total_contracts > 0
    ? category.total_value / category.total_contracts
    : 0

  return (
    <div className="space-y-3 pb-8 max-w-5xl mx-auto">
      {/* ================================================================= */}
      {/* HEADER — Folio identity · Playfair Italic headline · hero triptych */}
      {/* ================================================================= */}
      <header className="border-b border-border pb-4">
        <nav aria-label="breadcrumb" className="flex items-center gap-1 mb-3 text-[13px] font-mono text-text-muted/60">
          <Link to="/categories" className="hover:text-text-muted transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            {t('profile.breadcrumb')}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="max-w-[240px] whitespace-normal break-words leading-tight text-text-secondary">
            {isEs ? (category?.name_es || category?.name_en) : (category?.name_en || category?.name_es)}
          </span>
        </nav>

        {summaryLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-10 w-[28rem]" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : category ? (
          <>
            {/* Folio eyebrow — matches AriaQueue rhythm */}
            <div
              className="mb-3 flex items-center gap-3 flex-wrap"
              style={{
                fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
                fontSize: '12px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                fontWeight: 400,
              }}
            >
              <span style={{ color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 500 }}>
                {isEs ? 'Categoría' : 'Category'}·{folioNumber}
              </span>
              <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
              {sectorLabel && category.sector_code && (
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: sectorColor }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sectorColor }} aria-hidden="true" />
                  <span style={{ fontStyle: 'normal', fontWeight: 500 }}>{sectorLabel}</span>
                </span>
              )}
              <span style={{ width: 18, height: 1, background: 'rgba(160, 104, 32, 0.25)' }} />
              <span style={{ fontStyle: 'normal', fontWeight: 300 }}>COMPRANET 2002–2025</span>
            </div>

            {/* Editorial headline — Playfair Italic, sector-spine accent */}
            <div className="flex items-start gap-4">
              <div
                className="self-stretch w-[3px] rounded-full shrink-0 mt-1"
                style={{ backgroundColor: sectorColor }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <h1
                  className="text-text-primary"
                  style={{
                    fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    fontSize: 'clamp(26px, 3.6vw, 36px)',
                    lineHeight: 1.0,
                    letterSpacing: '-0.012em',
                  }}
                >
                  {isEs ? (category.name_es || category.name_en) : (category.name_en || category.name_es)}
                </h1>
                <p className="text-sm text-text-secondary leading-[1.6] mt-3"
                  style={{ fontFamily: 'var(--font-family-serif)' }}>
                  {getLedeForCategory({
                    category_name: category.name_es,
                    category_name_en: category.name_en,
                    total_value_mxn: category.total_value,
                    total_contracts: category.total_contracts,
                    direct_award_pct: category.direct_award_pct,
                    avg_risk_score: category.avg_risk,
                  }, isEs ? 'es' : 'en')}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </header>

      {/* ================================================================= */}
      {/* HERO TRIPTYCH — Playfair Italic 800 anchor stats with risk-spine   */}
      {/* ================================================================= */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30 rounded-sm overflow-hidden">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : category ? (
        <section
          aria-label={isEs ? 'Hallazgos principales' : 'Headline numbers'}
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30 rounded-sm overflow-hidden"
        >
          {/* Stat 1 — Total Value */}
          <div
            className="bg-background-card px-4 py-3 border-l-[3px]"
            style={{ borderLeftColor: sectorColor }}
          >
            <p className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
              §1 · {t('profile.kpi.totalAmount')}
            </p>
            <p
              className="tabular-nums text-text-primary leading-none"
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'normal',
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.4vw, 36px)',
                color: sectorColor,
              }}
            >
              {formatDualCurrency(category.total_value)}
            </p>
            <p className="text-[13px] font-mono text-text-muted mt-1.5">
              {formatNumber(category.total_contracts)} {t('profile.kpi.contracts').toLowerCase()}
              <span className="text-text-muted/50"> · </span>
              {formatCompactMXN(avgContractValue)} {isEs ? 'promedio' : 'avg'}
            </p>
          </div>

          {/* Stat 2 — Risk Indicator */}
          <div
            className="bg-background-card px-4 py-3 border-l-[3px]"
            style={{ borderLeftColor: riskColor }}
          >
            <p className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
              §2 · {t('profile.kpi.avgRisk')}
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className="tabular-nums leading-none"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 'clamp(28px, 3.4vw, 36px)',
                  color: riskColor,
                }}
              >
                {(category.avg_risk * 100).toFixed(0)}
              </p>
              <span className="text-base font-mono text-text-muted">/100</span>
            </div>
            <p className="text-[13px] font-mono mt-1.5" style={{ color: riskColor }}>
              <span className="uppercase tracking-[0.1em]">{riskLevel}</span>
              <span className="text-text-muted/50"> · </span>
              <span className="text-text-muted">
                {isEs ? 'indicador estadístico' : 'statistical indicator'}
              </span>
            </p>
          </div>

          {/* Stat 3 — Direct Award vs OECD */}
          <div
            className="bg-background-card px-4 py-3 border-l-[3px]"
            style={{ borderLeftColor: daColor }}
          >
            <p className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
              §3 · {t('profile.kpi.directAward')}
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className="tabular-nums leading-none"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 'clamp(28px, 3.4vw, 36px)',
                  color: daColor,
                }}
              >
                {daPct.toFixed(0)}
              </p>
              <span className="text-base font-mono text-text-muted">%</span>
            </div>
            <p className="text-[13px] font-mono text-text-muted mt-1.5">
              {daPct > 25 ? (
                <>
                  <span style={{ color: 'var(--color-oecd)' }}>
                    {(daPct / 25).toFixed(1)}×
                  </span>
                  {' '}{isEs ? 'el límite OCDE (25%)' : 'OECD limit (25%)'}
                </>
              ) : (
                <>{isEs ? 'dentro del límite OCDE (25%)' : 'within OECD limit (25%)'}</>
              )}
            </p>
          </div>
        </section>
      ) : null}

      {/* ================================================================= */}
      {/* §4 — Historical Timeline                                          */}
      {/* ================================================================= */}
      <EditorialChartFrame
        kicker={isEs ? '§4 · TENDENCIA ANUAL' : '§4 · ANNUAL TREND'}
        headline={isEs
          ? `Gasto e indicador de riesgo — ${category?.name_es || category?.name_en}`
          : `Spend and risk indicator — ${category?.name_en || category?.name_es}`}
        footer={<span className="font-mono text-xs text-text-muted">COMPRANET · {isEs ? 'valores en MXN' : 'values in MXN'}</span>}
        tone="card"
      >
        {trendsLoading ? (
          <ChartSkeleton height={320} type="area" />
        ) : timelineData.length > 0 ? (
          <div role="img" aria-label="Area chart showing contract value and risk score trends over time">
            {(() => {
              // Pre-multiply risk to display as 0-100% via 'pct' format on right axis.
              const data = timelineData.map((r) => ({
                ...r,
                avg_risk_pct: (Number(r.avg_risk) || 0) * 100,
              }))
              const sectorToken: ColorToken = category?.sector_code
                ? (`sector-${category.sector_code}` as ColorToken)
                : 'neutral'
              const layers: ComposedLayer<typeof data[number]>[] = [
                { kind: 'area', key: 'value', label: t('profile.tooltip.spend'), colorToken: sectorToken, axis: 'left' },
                { kind: 'line', key: 'avg_risk_pct', label: t('profile.tooltip.risk'), colorToken: 'risk-high', style: 'dashed', axis: 'right' },
              ]
              return (
                <EditorialComposedChart
                  data={data}
                  xKey="year"
                  layers={layers}
                  yFormat="mxn-compact"
                  rightYFormat="pct"
                  rightYDomain={[0, 60]}
                  height={320}
                />
              )
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            {t('profile.empty.noTrend')}
          </div>
        )}
      </EditorialChartFrame>

      {/* ================================================================= */}
      {/* §5 — By Administration                                            */}
      {/* ================================================================= */}
      <section>
        <div className="mb-2">
          <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-0.5">
            §5 · {t('profile.sections.byAdmin')}
          </p>
          <h2
            className="text-text-primary leading-tight"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: '17px',
              letterSpacing: '-0.005em',
            }}
          >
            {t('profile.sections.byAdminSubtitle')}
          </h2>
        </div>
        <div className="border border-border/60 rounded-sm bg-background-card p-3">
          {sexenioLoading ? (
            <ChartSkeleton height={120} />
          ) : (
            <section className="mb-6">
              <p className="font-mono text-[12px] uppercase tracking-wider text-text-muted mb-3">
                {isEs ? 'COMPARATIVO POR ADMINISTRACIÓN' : 'BY ADMINISTRATION'}
              </p>
              <div className="divide-y divide-border/20">
                {sexenioBarData.length > 0 ? sexenioBarData.map((row: any) => {
                  const ADMIN_COLORS: Record<string, string> = {
                    Fox: '#3b82f6',
                    Calderon: '#22c55e',
                    'Pena Nieto': '#ef4444',
                    AMLO: '#a16207',
                    Sheinbaum: '#14b8a6',
                  }
                  const ADMIN_LABELS: Record<string, string> = {
                    Fox: 'Fox',
                    Calderon: 'Calderón',
                    'Pena Nieto': 'Peña Nieto',
                    AMLO: 'AMLO',
                    Sheinbaum: 'Sheinbaum',
                  }
                  const color = ADMIN_COLORS[row.admin] ?? '#64748b'
                  return (
                    <div key={row.admin} className="flex items-center justify-between py-2 px-1">
                      <span
                        className="font-mono text-xs font-semibold"
                        style={{ color }}
                      >
                        {ADMIN_LABELS[row.admin] ?? row.admin}
                      </span>
                      <span
                        className="font-mono text-xs tabular-nums text-text-primary"
                        style={{ fontFamily: 'var(--font-family-serif)', fontStyle: 'normal', fontWeight: 800 }}
                      >
                        {formatCompactMXN(row.value)}
                      </span>
                    </div>
                  )
                }) : (
                  <p className="text-xs text-text-muted py-2">{isEs ? 'Sin datos por administración' : 'No administration data'}</p>
                )}
              </div>
              <p className="text-[12px] text-text-muted/70 font-mono mt-2">
                {isEs ? 'Fuente: COMPRANET · valores nominales en MXN' : 'Source: COMPRANET · nominal values in MXN'}
              </p>
            </section>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* §6 — Market Concentration (Top Vendors)                           */}
      {/* ================================================================= */}
      <section>
        <div className="mb-2">
          <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-0.5">
            §6 · {t('profile.sections.concentration')}
          </p>
          <h2
            className="text-text-primary leading-tight"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: '17px',
              letterSpacing: '-0.005em',
            }}
          >
            {t('profile.sections.concentrationSubtitle')}
          </h2>
        </div>
        <div className="rounded-sm border border-border/60 overflow-hidden">
          {topVendorsLoading && !vendorsTimedOut ? (
            <div className="space-y-3 px-4 py-3 bg-background-card">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : topVendorsError ? (
            <div className="py-5 text-center text-text-muted text-sm px-4 bg-background-card">
              {t('profile.empty.noVendors')}
            </div>
          ) : topVendorsData ? (
            <>
              {/* Concentration header */}
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const badge = getConcentrationBadge(topVendorsData.concentration_label, t)
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] font-mono uppercase tracking-[0.15em]"
                        style={{ color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.color}30` }}
                      >
                        {badge.text}
                      </span>
                    )
                  })()}
                  <span className="text-xs text-text-muted font-mono">
                    HHI: {topVendorsData.hhi.toFixed(0)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {t('profile.concentrationMarket', { pct: topVendorsData.top3_share_pct.toFixed(1) })}
                  </span>
                </div>
              </div>
              <div>
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted/60">
                  <span className="w-6 flex-shrink-0">#</span>
                  <span className="flex-1 min-w-0">{t('profile.table.vendor')}</span>
                  <span className="w-28 text-right flex-shrink-0">{t('profile.table.share')}</span>
                  <span className="w-20 text-right flex-shrink-0 hidden md:block">{t('profile.table.amount')}</span>
                  <span className="w-14 text-right flex-shrink-0 hidden md:block">{t('profile.table.contracts')}</span>
                  <span className="w-12 text-right flex-shrink-0 hidden lg:block">{t('profile.table.risk')}</span>
                  <span className="w-12 text-right flex-shrink-0 hidden lg:block">{t('profile.table.directAward')}</span>
                </div>
                <div className="divide-y divide-border/10">
                  {topVendorsData.data.map((v, idx) => {
                    const vendorRiskColor = getRiskColor(v.avg_risk)
                    return (
                      <div
                        key={v.vendor_id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-1.5 hover:bg-background-elevated/40 transition-colors group',
                          idx === 0 && v.market_share_pct > 20 && 'border-l-2 border-l-amber-500/60',
                        )}
                      >
                        <span className="text-[13px] text-text-muted/40 font-mono w-6 flex-shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="xs" hideIcon sectorCode={category?.sector_code ?? null} />
                        </div>
                        <div className="w-28 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <DotBar
                              value={v.market_share_pct}
                              max={100}
                              color={vendorRiskColor}
                              emptyColor="var(--color-background-elevated)"
                              emptyStroke="var(--color-border-hover)"
                              dots={14}
                              dotR={2}
                              dotGap={4.5}
                            />
                            <span className="text-xs font-mono font-bold tabular-nums text-text-primary">
                              {v.market_share_pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <span className="w-20 text-right text-xs font-mono text-text-secondary tabular-nums flex-shrink-0 hidden md:block">
                          {formatCompactMXN(v.vendor_value)}
                        </span>
                        <span className="w-14 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0 hidden md:block">
                          {formatNumber(v.contract_count)}
                        </span>
                        <span
                          className="w-12 text-right text-xs font-mono tabular-nums flex-shrink-0 hidden lg:block"
                          style={{ color: vendorRiskColor }}
                        >
                          {(v.avg_risk * 100).toFixed(0)}%
                        </span>
                        <span className="w-12 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0 hidden lg:block">
                          {v.direct_award_pct.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-5 text-center text-text-muted text-sm px-4 bg-background-card">
              {t('profile.empty.noVendors')}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* §7 — Vendor-Institution Pairs                                     */}
      {/* ================================================================= */}
      <section>
        <div className="mb-2">
          <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-0.5">
            §7 · {t('profile.sections.relations')}
          </p>
          <h2
            className="text-text-primary leading-tight"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: '17px',
              letterSpacing: '-0.005em',
            }}
          >
            {t('profile.sections.relationsSubtitle')}
          </h2>
        </div>
        <div className="rounded-sm border border-border/60 overflow-hidden">
          <div>
            {vendorInstLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (vendorInstData?.data?.length ?? 0) > 0 ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted/60">
                  <span className="w-4 flex-shrink-0">#</span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <User className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    <span>{t('profile.table.vendor')}</span>
                    <span className="text-text-muted/30">&rarr;</span>
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span>{t('profile.table.institution')}</span>
                  </div>
                  <span className="w-20 text-right flex-shrink-0">{t('profile.table.amount')}</span>
                  <span className="w-14 text-right flex-shrink-0 hidden md:block">{t('profile.table.contracts')}</span>
                  <span className="w-12 text-right flex-shrink-0 hidden lg:block">{t('profile.table.risk')}</span>
                </div>
                <div className="divide-y divide-border/10">
                  {vendorInstData!.data.map((pair, idx) => {
                    const maxVal = vendorInstData!.data[0]?.total_value ?? 1
                    return (
                      <div
                        key={`${pair.vendor_id}-${pair.institution_id}`}
                        className="flex items-center gap-3 px-4 py-1.5 hover:bg-background-elevated/40 transition-colors group"
                      >
                        <span className="text-[13px] text-text-muted/40 font-mono w-4 flex-shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <EntityIdentityChip type="vendor" id={pair.vendor_id} name={pair.vendor_name} size="xs" hideIcon sectorCode={category?.sector_code ?? null} />
                            <span className="text-text-muted/30 text-xs flex-shrink-0">&rarr;</span>
                            <EntityIdentityChip type="institution" id={pair.institution_id} name={pair.institution_name} size="xs" hideIcon />
                          </div>
                          <DotBar
                            value={Math.min(pair.total_value / maxVal, 1)}
                            max={1}
                            color={getRiskColor(pair.avg_risk)}
                            emptyColor="var(--color-background-elevated)"
                            emptyStroke="var(--color-border-hover)"
                            dots={30}
                            dotR={1.5}
                            dotGap={4}
                          />
                        </div>
                        <span className="w-20 text-right text-xs font-black font-mono text-text-primary tabular-nums flex-shrink-0">
                          {formatCompactMXN(pair.total_value)}
                        </span>
                        <span className="w-14 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0 hidden md:block">
                          {formatNumber(pair.contract_count)}
                        </span>
                        <span
                          className="w-12 text-right text-xs font-mono tabular-nums flex-shrink-0 hidden lg:block"
                          style={{ color: getRiskColor(pair.avg_risk) }}
                        >
                          {(pair.avg_risk * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-text-muted text-sm">
                {t('profile.empty.noRelations')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* §8 — Top Contracts                                                */}
      {/* ================================================================= */}
      <section>
        <div className="mb-2">
          <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-0.5">
            §8 · {t('profile.sections.contracts')}
          </p>
          <h2
            className="text-text-primary leading-tight"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: '17px',
              letterSpacing: '-0.005em',
            }}
          >
            {t('profile.sections.contractsSubtitle')}
          </h2>
        </div>
        <div className="rounded-sm border border-border/60 overflow-hidden">
          <div>
            {topContractsLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : topContracts.length > 0 ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted/60">
                  <span className="w-4 flex-shrink-0">#</span>
                  <span className="flex-1 min-w-0">{t('profile.table.description')}</span>
                  <span className="w-20 text-right flex-shrink-0">{t('profile.table.amount')}</span>
                  <span className="w-24 text-right flex-shrink-0 hidden md:block">{t('profile.table.vendor')}</span>
                  <span className="w-10 text-right flex-shrink-0 hidden md:block">{t('profile.table.year')}</span>
                  <span className="w-14 text-right flex-shrink-0">{t('profile.table.risk')}</span>
                </div>
                <div className="divide-y divide-border/10">
                  {topContracts.map((c, idx) => {
                    const contractRiskColor = getRiskColor(c.risk_score ?? 0)
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-1.5 hover:bg-background-elevated/30 transition-colors"
                      >
                        <span className="text-[12px] text-text-muted/40 font-mono w-4 flex-shrink-0 tabular-nums">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary whitespace-normal break-words leading-tight" title={c.title ?? ''}>
                            {c.title ? shortenContractName(c.title, 72) : t('profile.actions.noTitle')}
                          </p>
                          {c.institution_name && (
                            <p className="text-[12px] text-text-muted/50 font-mono mt-0.5 whitespace-normal break-words leading-tight" title={c.institution_name ?? ''}>
                              {c.institution_name}
                            </p>
                          )}
                        </div>
                        <span className="w-20 text-right text-xs font-mono font-bold text-text-primary tabular-nums flex-shrink-0">
                          {formatCompactMXN(c.amount_mxn ?? 0)}
                        </span>
                        <div className="w-24 text-right flex-shrink-0 hidden md:block">
                          {c.vendor_id ? (
                            <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="xs" hideIcon sectorCode={category?.sector_code ?? null} />
                          ) : <span className="text-xs text-text-muted">---</span>}
                        </div>
                        <span className="w-10 text-right text-[12px] text-text-muted font-mono flex-shrink-0 hidden md:block">
                          {c.contract_year ?? '---'}
                        </span>
                        <span
                          className="w-14 text-right text-[12px] font-mono uppercase flex-shrink-0"
                          style={{ color: contractRiskColor }}
                        >
                          {c.risk_level ?? '---'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-text-muted text-sm">
                {t('profile.empty.noContracts')}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2">
          <button
            onClick={() => navigate(`/contracts?category_id=${categoryId}`)}
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors font-mono uppercase tracking-wide"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {t('profile.actions.viewAll')}
          </button>
        </div>
      </section>

      {/* ================================================================= */}
      {/* §9 — Subcategories                                                */}
      {/* ================================================================= */}
      {(subcategoryLoading || (subcatBarData.length > 0)) && (
        <section>
          <div className="mb-2">
            <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-0.5">
              §9 · {t('profile.sections.subcategories')}
            </p>
            <h2
              className="text-text-primary leading-tight"
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: '17px',
                letterSpacing: '-0.005em',
              }}
            >
              {t('profile.sections.subcategoriesSubtitle')}
            </h2>
          </div>
          <div className="rounded-sm border border-border/60 overflow-hidden">
            <div className="px-4 pt-4 pb-4 bg-background-card">
              {subcategoryLoading ? (
                <ChartSkeleton height={320} />
              ) : subcatBarData.length > 0 ? (
                <SubcatDotStrips
                  data={subcatBarData.map(s => ({
                    name: truncate(s.name_es || s.name_en, 30),
                    value: s.total_value,
                    avg_risk: s.avg_risk,
                  }))}
                  color={sectorColor}
                />
              ) : (
                <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                  {t('profile.empty.noSubcategories')}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* § 4 El Precio                                                    */}
      {/* ================================================================= */}
      {priceDistLoading ? (
        <div className="rounded-sm border border-border/60 overflow-hidden"><div className="py-8 px-4 bg-background-card"><ChartSkeleton /></div></div>
      ) : priceDistData && priceDistData.n > 0 && priceDistData.p50 !== null ? (() => {
        const isEs = i18n.language.startsWith('es')
        const { p25, p50, p75, mean, iqr, mean_median_ratio, outlier_count, yearly_trend } = priceDistData
        const heavySkew = mean_median_ratio !== null && mean_median_ratio >= 5

        // Sparkline geometry
        const svgW = 280; const svgH = 48; const barW = 18; const barGap = 4
        const maxAvg = yearly_trend.reduce((m, y) => Math.max(m, y.avg_value), 1)

        return (
          <section aria-labelledby="price-section-title" className="scroll-mt-24">
            <div className="rounded-sm border border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 id="price-section-title" className="text-[12px] font-mono font-bold text-text-muted uppercase tracking-[0.15em]">
                    {isEs ? '§10 · El Precio' : '§10 · Pricing'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {heavySkew && (
                      <span
                        className="text-[12px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ color: 'var(--color-risk-high)', backgroundColor: '#f59e0b18', border: '1px solid #f59e0b40' }}
                      >
                        {isEs ? 'Distribución asimétrica' : 'Heavy skew'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-3 px-4 py-2.5 bg-background-card">

                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-sm border border-border p-3 bg-background-card">
                    <div className="text-[12px] font-semibold text-text-muted uppercase tracking-widest">
                      {isEs ? 'Mediana' : 'Median'}
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-text-primary mt-0.5">
                      {formatCompactMXN(p50 ?? 0)}
                    </div>
                    <div className="text-[12px] text-text-muted mt-0.5">P50</div>
                  </div>
                  <div className="rounded-sm border border-border p-3 bg-background-card">
                    <div className="text-[12px] font-semibold text-text-muted uppercase tracking-widest">
                      {isEs ? 'Rango IQR' : 'IQR Range'}
                    </div>
                    <div className="text-base font-bold font-mono tabular-nums text-text-primary mt-0.5 leading-tight">
                      <span className="text-text-muted text-xs">P25 </span>{formatCompactMXN(p25 ?? 0)}
                      <span className="text-text-muted mx-1">–</span>
                      <span className="text-text-muted text-xs">P75 </span>{formatCompactMXN(p75 ?? 0)}
                    </div>
                    {iqr !== null && (
                      <div className="text-[12px] text-text-muted mt-0.5">IQR {formatCompactMXN(iqr)}</div>
                    )}
                  </div>
                  <div className="rounded-sm border border-border p-3 bg-background-card">
                    <div className="text-[12px] font-semibold text-text-muted uppercase tracking-widest">
                      {isEs ? 'Media' : 'Mean'}
                    </div>
                    <div
                      className="text-lg font-bold font-mono tabular-nums mt-0.5"
                      style={{ color: heavySkew ? '#f59e0b' : 'var(--color-text-primary)' }}
                    >
                      {formatCompactMXN(mean ?? 0)}
                    </div>
                    {mean_median_ratio !== null && (
                      <div className="text-[12px] text-text-muted mt-0.5">
                        {mean_median_ratio.toFixed(1)}× {isEs ? 'mediana' : 'median'}
                      </div>
                    )}
                  </div>
                  <div className="rounded-sm border border-border p-3 bg-background-card">
                    <div className="text-[12px] font-semibold text-text-muted uppercase tracking-widest">
                      {isEs ? 'Valores atípicos' : 'Outliers'}
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-text-primary mt-0.5">
                      {formatNumber(outlier_count)}
                    </div>
                    <div className="text-[12px] text-text-muted mt-0.5">
                      {isEs ? 'sobre 1.5×IQR' : 'above 1.5×IQR'}
                    </div>
                  </div>
                </div>

                {/* IQR band visualization */}
                {p25 !== null && p50 !== null && p75 !== null && mean !== null && (
                  <div className="space-y-1.5">
                    <div className="text-[12px] font-semibold text-text-muted uppercase tracking-widest">
                      {isEs ? 'Banda de precios (escala logarítmica)' : 'Price band (log scale)'}
                    </div>
                    {(() => {
                      // Log-scale band bar
                      const logMin = Math.log10(Math.max(p25 * 0.1, 1000))
                      const logMax = Math.log10(Math.min((mean ?? p75) * 10, 1e10))
                      const logRange = logMax - logMin
                      const toX = (v: number) => ((Math.log10(Math.max(v, 1000)) - logMin) / logRange) * 100
                      const x25 = toX(p25)
                      const x50 = toX(p50)
                      const x75 = toX(p75)
                      const xMean = mean !== null ? toX(mean) : null

                      return (
                        <div className="relative h-8 rounded-sm overflow-hidden bg-background-elevated/30 border border-border/40">
                          {/* IQR band */}
                          <div
                            className="absolute top-0 bottom-0 bg-accent/20 border-l border-r border-accent/40"
                            style={{ left: `${x25}%`, width: `${x75 - x25}%` }}
                          />
                          {/* P50 line */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-accent"
                            style={{ left: `${x50}%` }}
                          />
                          {/* Mean diamond */}
                          {xMean !== null && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
                              style={{ backgroundColor: '#f59e0b', left: `calc(${xMean}% - 4px)` }}
                            />
                          )}
                          {/* Labels */}
                          <div className="absolute inset-0 flex items-center">
                            <div className="absolute text-[13px] font-mono text-text-muted" style={{ left: `${Math.max(x25, 1)}%`, transform: 'translateX(-50%)' }}>
                              P25
                            </div>
                            <div className="absolute text-[13px] font-mono text-accent font-bold" style={{ left: `${x50}%`, transform: 'translateX(-50%)', top: '2px' }}>
                              P50
                            </div>
                            <div className="absolute text-[13px] font-mono text-text-muted" style={{ left: `${Math.min(x75, 99)}%`, transform: 'translateX(-50%)' }}>
                              P75
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    <div className="flex items-center gap-4 text-[12px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-2 bg-accent/20 border border-accent/40 rounded-[1px]" />
                        {isEs ? 'Banda IQR (P25–P75)' : 'IQR band (P25–P75)'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-0.5 h-3 bg-accent" />
                        {isEs ? 'Mediana' : 'Median'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rotate-45" style={{ backgroundColor: '#f59e0b' }} />
                        {isEs ? 'Media' : 'Mean'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Skew interpretation */}
                {mean_median_ratio !== null && (
                  <p className="text-sm text-text-secondary leading-relaxed border-l-2 border-accent/30 pl-3">
                    {isEs
                      ? mean_median_ratio >= 10
                        ? `La media (${formatCompactMXN(mean ?? 0)}) es ${mean_median_ratio.toFixed(1)}× la mediana — unos pocos contratos de alto valor distorsionan el promedio. La mediana (${formatCompactMXN(p50 ?? 0)}) refleja mejor el contrato típico.`
                        : mean_median_ratio >= 5
                          ? `La media es ${mean_median_ratio.toFixed(1)}× la mediana, indicando asimetría moderada. Contratos grandes elevan el promedio por encima del caso típico.`
                          : `La distribución es relativamente simétrica. La media y la mediana están próximas (ratio ${mean_median_ratio.toFixed(1)}×).`
                      : mean_median_ratio >= 10
                        ? `Mean (${formatCompactMXN(mean ?? 0)}) is ${mean_median_ratio.toFixed(1)}× the median — a few high-value contracts skew the average. Median (${formatCompactMXN(p50 ?? 0)}) better represents a typical contract.`
                        : mean_median_ratio >= 5
                          ? `Mean is ${mean_median_ratio.toFixed(1)}× the median, indicating moderate skew. Large contracts pull the average above the typical case.`
                          : `Distribution is relatively symmetric. Mean and median are close (ratio ${mean_median_ratio.toFixed(1)}×).`
                    }
                  </p>
                )}

                {/* Yearly avg value sparkline */}
                {yearly_trend.length > 2 && (
                  <div className="space-y-1.5">
                    <div className="text-[12px] font-semibold text-text-muted uppercase tracking-widest">
                      {isEs ? 'Valor medio por año (2015–)' : 'Avg. contract value by year (2015–)'}
                    </div>
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      width={svgW}
                      height={svgH}
                      role="img"
                      aria-label={isEs ? 'Valor medio por año' : 'Average value by year'}
                      className="overflow-visible"
                    >
                      {yearly_trend.map((y, i) => {
                        const barH = Math.max(2, (y.avg_value / maxAvg) * (svgH - 12))
                        const x = i * (barW + barGap)
                        return (
                          <g key={y.year}>
                            <rect
                              x={x}
                              y={svgH - barH}
                              width={barW}
                              height={barH}
                              fill="var(--color-accent)"
                              opacity={0.55}
                              rx={1}
                            />
                            <text
                              x={x + barW / 2}
                              y={svgH}
                              textAnchor="middle"
                              fontSize={7}
                              fill="var(--color-text-muted)"
                            >
                              {String(y.year).slice(2)}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                )}

              </div>
            </div>
          </section>
        )
      })() : null}

      {/* ================================================================= */}
      {/* § 5 La Competencia                                               */}
      {/* ================================================================= */}
      {competitionLoading ? (
        <div className="rounded-sm border border-border/60 overflow-hidden"><div className="py-8 px-4 bg-background-card"><ChartSkeleton /></div></div>
      ) : competitionData && competitionData.total_contracts > 0 ? (() => {
        const isEs = i18n.language.startsWith('es')
        const { procedure_breakdown, yearly_trend, sector_da_avg, sector_sb_avg } = competitionData

        // Canonical procedure labels
        const PROC_LABELS: Record<string, { es: string; en: string; color: string }> = {
          directa:     { es: 'Adjudicación directa', en: 'Direct award',   color: '#f87171' },
          licitacion:  { es: 'Licitación pública',   en: 'Public tender',  color: '#334155' }, // slate-700 — §3.10: not green-for-good
          invitacion:  { es: 'Invitación a 3',       en: 'Invitation ×3',  color: '#fbbf24' },
          otro:        { es: 'Otro',                 en: 'Other',          color: '#94a3b8' },
          desconocido: { es: 'Desconocido',          en: 'Unknown',        color: '#64748b' },
        }

        const daRow = procedure_breakdown.find(p => p.type === 'directa')
        const tendRow = procedure_breakdown.find(p => p.type === 'licitacion')
        const daPct = daRow?.pct_contracts ?? 0
        const sectorDa = sector_da_avg ?? 0

        // Flag: is this category above sector DA average?
        const daAboveSector = sector_da_avg != null && daPct > sectorDa + 10

        // Find the single-bid pct from category summary
        const catSbPct = competitionData.yearly_trend.length > 0
          ? competitionData.yearly_trend.reduce((sum, y) => sum + y.sb_pct, 0) / competitionData.yearly_trend.length
          : 0

        return (
          <section className="pt-2">
            <div className="rounded-sm border border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-text-muted">
                    {isEs ? '§11 · COMPETENCIA' : '§11 · COMPETITION'}
                  </span>
                  {daAboveSector && (
                    <span
                      className="text-[13px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
                      style={{ color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}
                    >
                      {isEs ? 'Alta adjudicación directa' : 'High direct award'}
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-family-serif)" }}>
                  {isEs ? 'La Competencia' : 'Competition'}
                </h3>
                <p className="text-sm text-text-secondary">
                  {isEs
                    ? 'Cómo se distribuyen los contratos por tipo de procedimiento, y qué tan competitivo es este mercado.'
                    : 'How contracts distribute by procedure type, and how competitive this market is.'}
                </p>
              </div>
              <div className="space-y-3 px-4 py-2.5 bg-background-card">

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div
                      className="text-2xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-serif)', color: daPct > 70 ? '#f87171' : daPct > 50 ? '#fb923c' : '#64748b' }}
                    >
                      {daPct.toFixed(0)}%
                    </div>
                    <div className="text-[12px] text-text-muted uppercase tracking-wider mt-0.5">
                      {isEs ? 'Directa' : 'Direct award'}
                    </div>
                    {sector_da_avg != null && (
                      <div className="text-[12px] text-text-muted mt-0.5">
                        {isEs ? 'sector' : 'sector'} {sectorDa.toFixed(0)}%
                        <span className={daPct > sectorDa ? ' text-risk-high' : ' text-text-muted'}> {daPct > sectorDa ? '▲' : '▼'}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div
                      className="text-2xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-serif)', color: (tendRow?.pct_contracts ?? 0) > 20 ? '#334155' : '#94a3b8' }}
                    >
                      {(tendRow?.pct_contracts ?? 0).toFixed(0)}%
                    </div>
                    <div className="text-[12px] text-text-muted uppercase tracking-wider mt-0.5">
                      {isEs ? 'Licitación' : 'Public tender'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-2xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-serif)', color: catSbPct > 10 ? '#fb923c' : '#94a3b8' }}
                    >
                      {catSbPct.toFixed(0)}%
                    </div>
                    <div className="text-[12px] text-text-muted uppercase tracking-wider mt-0.5">
                      {isEs ? 'Oferta única' : 'Single bid'}
                    </div>
                    {sector_sb_avg != null && (
                      <div className="text-[12px] text-text-muted mt-0.5">
                        {isEs ? 'sector' : 'sector'} {sector_sb_avg.toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Procedure breakdown bar */}
                <div>
                  <div className="text-[12px] font-medium uppercase tracking-widest text-text-muted mb-2">
                    {isEs ? 'Desglose por procedimiento' : 'Procedure breakdown'}
                  </div>
                  <div className="h-5 rounded-sm overflow-hidden flex w-full">
                    {procedure_breakdown
                      .filter(p => p.pct_contracts > 0.5)
                      .map(p => {
                        const meta = PROC_LABELS[p.type] ?? { es: p.type, en: p.type, color: 'var(--color-text-muted)' }
                        return (
                          <div
                            key={p.type}
                            title={`${isEs ? meta.es : meta.en}: ${p.pct_contracts.toFixed(1)}%`}
                            style={{ width: `${p.pct_contracts}%`, backgroundColor: meta.color }}
                            className="h-full transition-all"
                          />
                        )
                      })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {procedure_breakdown
                      .filter(p => p.pct_contracts > 0.5)
                      .map(p => {
                        const meta = PROC_LABELS[p.type] ?? { es: p.type, en: p.type, color: 'var(--color-text-muted)' }
                        return (
                          <div key={p.type} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                            <span className="text-[13px] text-text-secondary">
                              {isEs ? meta.es : meta.en}
                            </span>
                            <span className="text-[13px] font-mono tabular-nums text-text-muted">
                              {p.pct_contracts.toFixed(0)}%
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>

                {/* DA trend sparkline */}
                {yearly_trend.length > 3 && (() => {
                  const W = 320; const H = 48
                  const pts = yearly_trend.map((y, i) => {
                    const x = (i / (yearly_trend.length - 1)) * W
                    const yv = H - (y.da_pct / 100) * H
                    return `${x.toFixed(1)},${yv.toFixed(1)}`
                  }).join(' ')
                  const firstYear = yearly_trend[0].year
                  const lastYear = yearly_trend[yearly_trend.length - 1].year
                  return (
                    <div>
                      <div className="text-[12px] font-medium uppercase tracking-widest text-text-muted mb-1">
                        {isEs ? 'Tendencia adjudicación directa %' : 'Direct award % trend'}
                      </div>
                      <div className="relative">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}
                          role="img" aria-label={isEs ? 'Tendencia adjudicación directa %' : 'Direct award % trend'}
                        >
                          {/* Sector avg reference line */}
                          {sector_da_avg != null && (
                            <line
                              x1="0" y1={H - (sector_da_avg / 100) * H}
                              x2={W} y2={H - (sector_da_avg / 100) * H}
                              stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3"
                            />
                          )}
                          <polyline
                            points={pts}
                            fill="none"
                            stroke="#f87171"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex justify-between text-[13px] text-text-muted font-mono mt-0.5">
                          <span>{firstYear}</span>
                          {sector_da_avg != null && (
                            <span className="text-text-muted/60">
                              — {isEs ? 'promedio sector' : 'sector avg'} {sector_da_avg.toFixed(0)}%
                            </span>
                          )}
                          <span>{lastYear}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

              </div>
            </div>
          </section>
        )
      })() : null}

      {/* ================================================================= */}
      {/* § 6 La Estacionalidad                                            */}
      {/* ================================================================= */}
      {seasonalityLoading ? (
        <div className="rounded-sm border border-border/60 overflow-hidden"><div className="py-8 px-4 bg-background-card"><ChartSkeleton /></div></div>
      ) : seasonalityData && seasonalityData.monthly.length > 0 ? (() => {
        const isEs = i18n.language.startsWith('es')
        const { monthly, december_pct_value, december_index, yearly_december } = seasonalityData
        const maxPct = Math.max(...monthly.map(m => m.pct_value), 0.1)
        const decemberRush = december_index >= 1.5
        const MONTH_SHORT_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        const MONTH_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

        return (
          <section className="pt-2">
            <div className="rounded-sm border border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-text-muted">
                    {isEs ? '§12 · ESTACIONALIDAD' : '§12 · SEASONALITY'}
                  </span>
                  {decemberRush && (
                    <span
                      className="text-[13px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
                      style={{ color: '#fb923c', backgroundColor: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)' }}
                    >
                      {isEs ? 'Avalancha diciembre' : 'December rush'}
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-family-serif)" }}>
                  {isEs ? 'La Estacionalidad' : 'Seasonality'}
                </h3>
                <p className="text-sm text-text-secondary">
                  {isEs
                    ? 'Distribución mensual del gasto. Un pico en diciembre es señal de presión de fin de año y posible evasión de controles.'
                    : 'Monthly spend distribution. A December spike signals year-end pressure and potential control evasion.'}
                </p>
              </div>
              <div className="space-y-3 px-4 py-2.5 bg-background-card">

                {/* December KPI */}
                <div className="flex items-center gap-6">
                  <div>
                    <div
                      className="text-3xl font-bold tabular-nums"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        color: decemberRush ? '#fb923c' : 'var(--color-text-primary)',
                      }}
                    >
                      {december_pct_value.toFixed(1)}%
                    </div>
                    <div className="text-[12px] text-text-muted uppercase tracking-wider mt-0.5">
                      {isEs ? 'del gasto en diciembre' : 'of spend in December'}
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary leading-relaxed max-w-xs">
                    {december_index >= 2.0
                      ? isEs
                        ? `${december_index.toFixed(1)}× la cuota uniforme esperada (8.3%). Patrón de avalancha severo.`
                        : `${december_index.toFixed(1)}× the expected uniform share (8.3%). Severe rush pattern.`
                      : december_index >= 1.5
                        ? isEs
                          ? `${december_index.toFixed(1)}× la cuota esperada. Elevación significativa de fin de año.`
                          : `${december_index.toFixed(1)}× the expected share. Significant year-end spike.`
                        : isEs
                          ? `${december_index.toFixed(1)}× la cuota esperada (8.3%). Distribución relativamente uniforme.`
                          : `${december_index.toFixed(1)}× the expected share (8.3%). Relatively even distribution.`
                    }
                  </div>
                </div>

                {/* Monthly bar chart */}
                <div>
                  <div className="text-[12px] font-medium uppercase tracking-widest text-text-muted mb-2">
                    {isEs ? 'Gasto por mes (% del total)' : 'Spend by month (% of total)'}
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {monthly.map((m) => {
                      const heightPct = (m.pct_value / maxPct) * 100
                      const isDec = m.month === 12
                      return (
                        <div
                          key={m.month}
                          className="flex-1 flex flex-col items-center gap-0.5"
                          title={`${isEs ? MONTH_SHORT_ES[m.month - 1] : MONTH_SHORT_EN[m.month - 1]}: ${m.pct_value.toFixed(1)}%`}
                        >
                          <div className="w-full flex items-end" style={{ height: 52 }}>
                            <div
                              className="w-full rounded-sm transition-all"
                              style={{
                                height: `${Math.max(heightPct, 4)}%`,
                                backgroundColor: isDec
                                  ? (decemberRush ? '#fb923c' : '#fbbf24')
                                  : 'var(--color-border)',
                              }}
                            />
                          </div>
                          <div className="text-[8px] text-text-muted font-mono">
                            {isEs ? MONTH_SHORT_ES[m.month - 1].charAt(0) : MONTH_SHORT_EN[m.month - 1].charAt(0)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* uniform reference label */}
                  <div className="text-[13px] text-text-muted/60 mt-1 text-right font-mono">
                    — {isEs ? 'cuota uniforme 8.3%' : 'uniform 8.3%'}
                  </div>
                </div>

                {/* Year-over-year December trend */}
                {yearly_december.length > 4 && (() => {
                  const W = 320; const H = 40
                  const pts = yearly_december.map((y, i) => {
                    const x = (i / (yearly_december.length - 1)) * W
                    const yv = H - Math.min(y.dec_pct / 40, 1) * H
                    return `${x.toFixed(1)},${yv.toFixed(1)}`
                  }).join(' ')
                  return (
                    <div>
                      <div className="text-[12px] font-medium uppercase tracking-widest text-text-muted mb-1">
                        {isEs ? 'Diciembre % año a año' : 'December % year-over-year'}
                      </div>
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 40 }}
                        role="img" aria-label={isEs ? 'Diciembre % año a año' : 'December % year-over-year'}
                      >
                        {/* 8.33% reference */}
                        <line x1="0" y1={H - (8.33 / 40) * H} x2={W} y2={H - (8.33 / 40) * H}
                          stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
                        <polyline points={pts} fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                      <div className="flex justify-between text-[13px] text-text-muted font-mono mt-0.5">
                        <span>{yearly_december[0].year}</span>
                        <span className="text-text-muted/60">— {isEs ? 'cuota uniform' : 'uniform'} 8.3%</span>
                        <span>{yearly_december[yearly_december.length - 1].year}</span>
                      </div>
                    </div>
                  )
                })()}

              </div>
            </div>
          </section>
        )
      })() : null}

      {/* ================================================================= */}
      {/* § 7 Los Patrones                                                 */}
      {/* ================================================================= */}
      {patternsLoading ? (
        <div className="rounded-sm border border-border/60 overflow-hidden"><div className="py-8 px-4 bg-background-card"><ChartSkeleton /></div></div>
      ) : patternsData && patternsData.patterns.length > 0 ? (() => {
        const isEs = i18n.language.startsWith('es')
        const { patterns, tier_distribution, vendors_in_aria, total_vendors, dominant_pattern } = patternsData
        const maxVendors = Math.max(...patterns.map(p => p.vendor_count), 1)
        const t1 = tier_distribution.find(t => t.tier === 1)?.count ?? 0
        const t2 = tier_distribution.find(t => t.tier === 2)?.count ?? 0
        const highPriorityCount = t1 + t2

        return (
          <section className="pt-2">
            <div className="rounded-sm border border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-text-muted">
                    {isEs ? '§13 · PATRONES' : '§13 · PATTERNS'}
                  </span>
                  {dominant_pattern && (
                    <span
                      className="text-[13px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
                      style={{
                        color: patterns[0]?.color ?? '#94a3b8',
                        backgroundColor: `${patterns[0]?.color ?? '#94a3b8'}18`,
                        border: `1px solid ${patterns[0]?.color ?? '#94a3b8'}40`,
                      }}
                    >
                      {dominant_pattern}
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-family-serif)" }}>
                  {isEs ? 'Los Patrones' : 'Fraud Patterns'}
                </h3>
                <p className="text-sm text-text-secondary">
                  {isEs
                    ? `Qué patrones de fraude detecta el modelo ARIA en los ${vendors_in_aria.toLocaleString('es-MX')} proveedores activos en esta categoría.`
                    : `What fraud patterns the ARIA model detects across the ${vendors_in_aria.toLocaleString('en-US')} vendors active in this category.`}
                </p>
              </div>
              <div className="space-y-3 px-4 py-2.5 bg-background-card">

                {/* T1/T2 KPI */}
                {highPriorityCount > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-sm border border-risk-high/30 bg-risk-high/5">
                    <div
                      className="text-xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-serif)', color: '#f87171' }}
                    >
                      {highPriorityCount.toLocaleString(isEs ? 'es-MX' : 'en-US')}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {isEs
                        ? `proveedores T1/T2 (investigación prioritaria) de ${vendors_in_aria.toLocaleString('es-MX')} en ARIA`
                        : `T1/T2 vendors (priority investigation) out of ${vendors_in_aria.toLocaleString('en-US')} in ARIA`}
                    </div>
                  </div>
                )}

                {/* Pattern bars */}
                <div className="space-y-2">
                  {patterns.slice(0, 6).map(p => {
                    const barW = (p.vendor_count / maxVendors) * 100
                    return (
                      <div key={p.pattern}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[12px] font-bold font-mono px-1.5 py-0.5 rounded-sm"
                              style={{ color: p.color, backgroundColor: `${p.color}18`, border: `1px solid ${p.color}40` }}
                            >
                              {p.pattern}
                            </span>
                            <span className="text-[13px] text-text-secondary">
                              {isEs ? p.label_es : p.label_en}
                            </span>
                          </div>
                          <span className="text-[13px] font-mono tabular-nums text-text-muted">
                            {p.vendor_count.toLocaleString(isEs ? 'es-MX' : 'en-US')}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-border/30 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${barW}%`, backgroundColor: p.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="text-[12px] text-text-muted border-t border-border/30 pt-2">
                  {isEs
                    ? `${vendors_in_aria.toLocaleString('es-MX')} de ${total_vendors.toLocaleString('es-MX')} proveedores (${((vendors_in_aria / total_vendors) * 100).toFixed(0)}%) en la cola ARIA`
                    : `${vendors_in_aria.toLocaleString('en-US')} of ${total_vendors.toLocaleString('en-US')} vendors (${((vendors_in_aria / total_vendors) * 100).toFixed(0)}%) in the ARIA queue`}
                </div>
              </div>
            </div>
          </section>
        )
      })() : null}

      {/* ================================================================= */}
      {/* § 8 El Veredicto                                                  */}
      {/* ================================================================= */}
      {category && topVendorsData && (() => {
        const isEs = i18n.language.startsWith('es')
        const risk = category.avg_risk
        const da = category.direct_award_pct
        const hhi = topVendorsData.hhi
        const top3 = topVendorsData.top3_share_pct
        const catName = category.name_es || category.name_en
        const catNameEn = category.name_en || category.name_es

        let verdictColor: string
        let verdictEs: string
        let verdictEn: string
        let descEs: string
        let descEn: string

        if (risk >= 0.60) {
          verdictColor = '#f87171'
          verdictEs = 'Patrón Anómalo'
          verdictEn = 'Anomalous Pattern'
          descEs = `El modelo detecta señales de alta intensidad en ${catName}. Múltiples factores de riesgo se activan simultáneamente, superando el umbral de alerta crítica del sistema.`
          descEn = `The model detects high-intensity signals in ${catName}. Multiple risk factors activate simultaneously, exceeding the system's critical alert threshold.`
        } else if (hhi > 2500 && da > 60) {
          verdictColor = '#fb923c'
          verdictEs = 'Capturado'
          verdictEn = 'Captured'
          descEs = `Alta concentración (HHI ${hhi.toFixed(0)}) combinada con ${da.toFixed(0)}% adjudicación directa. Pocos proveedores acceden a contratos sin competencia — patrón consistente con captura de mercado.`
          descEn = `High concentration (HHI ${hhi.toFixed(0)}) combined with ${da.toFixed(0)}% direct-award rate. Few vendors win contracts without competition — a pattern consistent with market capture.`
        } else if (hhi > 1500 || top3 > 60) {
          verdictColor = '#fbbf24'
          verdictEs = 'Oligopólico'
          verdictEn = 'Oligopolistic'
          descEs = `${catName} muestra concentración significativa: los 3 principales proveedores controlan el ${top3.toFixed(0)}% del valor. No alcanza el umbral de captura pero requiere monitoreo activo.`
          descEn = `${catNameEn} shows significant concentration: the top 3 vendors control ${top3.toFixed(0)}% of value. Does not reach the capture threshold but warrants active monitoring.`
        } else {
          verdictColor = 'var(--color-text-muted)'
          verdictEs = 'Competitivo'
          verdictEn = 'Competitive'
          descEs = `Los indicadores de ${catName} no registran señales de captura o concentración anómala. El mercado mantiene características de competencia estructural dentro del rango esperado para su sector.`
          descEn = `${catNameEn} indicators show no signals of capture or anomalous concentration. The market maintains structural competition within the expected range for its sector.`
        }

        return (
          <section>
            <div className="mb-2">
              <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-0.5">
                {isEs ? '§14 · DIAGNÓSTICO' : '§14 · VERDICT'}
              </p>
              <h2
                className="text-text-primary leading-tight"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: '17px',
                  letterSpacing: '-0.005em',
                }}
              >
                {isEs ? 'El Veredicto' : 'Market Health Verdict'}
              </h2>
            </div>
            <div
              className="border border-border/60 rounded-sm bg-background-card p-4 border-l-[3px]"
              style={{ borderLeftColor: verdictColor }}
            >
              <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
                <div className="shrink-0">
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-sm text-[13px] font-mono font-bold uppercase tracking-[0.15em]"
                    style={{ color: verdictColor, backgroundColor: `${verdictColor}15`, border: `1px solid ${verdictColor}30` }}
                  >
                    {isEs ? verdictEs : verdictEn}
                  </span>
                </div>
                <div className="space-y-3 flex-1 min-w-0">
                  <p className="text-sm text-text-secondary leading-[1.65]" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    {isEs ? descEs : descEn}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-mono text-text-muted/80 pt-2 border-t border-border/40">
                    <span>HHI <span className="font-bold tabular-nums" style={{ color: verdictColor }}>{hhi.toFixed(0)}</span></span>
                    <span>Top 3 <span className="font-bold tabular-nums" style={{ color: verdictColor }}>{top3.toFixed(0)}%</span></span>
                    <span>{isEs ? 'AD' : 'DA'} <span className="font-bold tabular-nums" style={{ color: daColor }}>{da.toFixed(0)}%</span></span>
                    <span>{isEs ? 'Riesgo' : 'Risk'} <span className="font-bold tabular-nums" style={{ color: riskColor }}>{(risk * 100).toFixed(0)}/100</span></span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ================================================================= */}
      {/* § 9 La Comparación (sister categories in same sector)             */}
      {/* ================================================================= */}
      {category && summaryData?.data && (() => {
        const isEs = i18n.language.startsWith('es')
        const sectorId = category.sector_id
        if (!sectorId) return null

        const sisters = (summaryData.data as CategoryStat[])
          .filter(c => c.sector_id === sectorId && c.category_id !== categoryId && c.total_contracts > 0)
          .sort((a, b) => b.avg_risk - a.avg_risk)
          .slice(0, 8)

        if (sisters.length === 0) return null

        return (
          <section>
            <div className="mb-2">
              <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-0.5">
                {isEs ? '§15 · COMPARACIÓN' : '§15 · COMPARISON'}
              </p>
              <h2
                className="text-text-primary leading-tight"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: '17px',
                  letterSpacing: '-0.005em',
                }}
              >
                {isEs ? 'Categorías del mismo sector' : 'Sister Categories in Sector'}
              </h2>
            </div>
            <div className="rounded-sm border border-border/60 overflow-hidden">
              <div>
                <div className="divide-y divide-border/10">
                  {sisters.map((sc) => {
                    const scRisk = sc.avg_risk
                    const scColor = getRiskColor(scRisk)
                    return (
                      <div
                        key={sc.category_id}
                        className="flex items-center gap-3 px-4 py-1.5 hover:bg-background-elevated/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <EntityIdentityChip
                            type="category"
                            id={sc.category_id}
                            name={isEs ? sc.name_es : sc.name_en}
                            size="xs"
                            sectorCode={sc.sector_code ?? null}
                            riskScore={sc.avg_risk ?? null}
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <DotBar
                            value={scRisk}
                            max={1}
                            color={scColor}
                            emptyColor="var(--color-background-elevated)"
                            emptyStroke="var(--color-border-hover)"
                            dots={12}
                            dotR={1.75}
                            dotGap={4}
                            thresholds={[0.25, 0.40, 0.60]}
                          />
                          <span
                            className="text-xs font-mono tabular-nums w-8 text-right"
                            style={{ color: scColor }}
                          >
                            {(scRisk * 100).toFixed(0)}%
                          </span>
                        </div>
                        <span className="text-xs font-mono text-text-muted tabular-nums w-14 text-right hidden md:block">
                          {sc.direct_award_pct.toFixed(0)}% DA
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ================================================================= */}
      {/* Editorial Closing                                                 */}
      {/* ================================================================= */}
      {category && (() => {
        const isEs = i18n.language.startsWith('es')
        const catName = category.name_es || category.name_en
        const da = category.direct_award_pct
        const risk = category.avg_risk
        const catId = categoryId

        let prose = ''
        if (da > 60 && risk >= 0.40) {
          prose = isEs
            ? `${catName} combina una tasa de adjudicación directa del ${da.toFixed(0)}% con un indicador de riesgo promedio de ${(risk * 100).toFixed(0)}/100 — patrón consistente con captura de mercado documentada. RUBLI marca esta categoría como de revisión prioritaria.`
            : `${catName} combines a direct-award rate of ${da.toFixed(0)}% with a risk indicator of ${(risk * 100).toFixed(0)}/100 — a pattern consistent with documented market capture. RUBLI flags this category as priority for review.`
        } else if (da > 50) {
          prose = isEs
            ? `El ${da.toFixed(0)}% de adjudicaciones directas en ${catName} supera el promedio federal. Este nivel de contratación sin licitación merece seguimiento continuo.`
            : `${catName}'s ${da.toFixed(0)}% direct-award rate exceeds the federal average. This level of no-bid contracting warrants continued monitoring.`
        } else if (risk >= 0.40) {
          prose = isEs
            ? `El indicador de riesgo promedio de ${catName} (${(risk * 100).toFixed(0)}/100) ubica esta categoría en alerta alta. El modelo identifica anomalías estadísticas que justifican revisión.`
            : `${catName}'s average risk indicator (${(risk * 100).toFixed(0)}/100) places this category on high alert. The model identifies statistical anomalies warranting review.`
        } else {
          prose = isEs
            ? `${catName} registra indicadores dentro del rango esperado para su sector. No se detectan señales de captura de alta prioridad en el período analizado.`
            : `${catName} records indicators within the expected range for its sector. No high-priority capture signals are detected in the analyzed period.`
        }

        return (
          <section className="pt-2 border-t border-border/40 space-y-4">
            <p className="text-sm text-text-secondary leading-[1.65]" style={{ fontFamily: 'var(--font-family-serif)' }}>
              {prose}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/aria?category_id=${catId}`}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors border border-accent/30 hover:border-accent/60 px-2.5 py-1 rounded-sm"
              >
                {isEs ? `Cola ARIA · ${catName.split(' ').slice(0, 2).join(' ')}` : `ARIA Queue · ${catName.split(' ').slice(0, 2).join(' ')}`}
              </Link>
              <Link
                to={`/atlas?lens=CATEGORIES&pin=${catId}`}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors border border-border/40 hover:border-border px-2.5 py-1 rounded-sm"
              >
                {isEs ? 'Ver en el Atlas' : 'View in Atlas'}
              </Link>
              <span className="text-[12px] font-mono text-text-muted/50 uppercase tracking-wider">
                {isEs ? 'Indicador estadístico · no prueba de irregularidades' : 'Statistical indicator · not evidence of wrongdoing'}
              </span>
            </div>
          </section>
        )
      })()}

      {/* ================================================================= */}
      {/* Footer                                                            */}
      {/* ================================================================= */}
      <div className="pt-2">
        <FuentePill source="COMPRANET 2002-2025" />
      </div>
    </div>
  )
}
