/**
 * CategoriesIndex — "El Qué" / "What Was Bought"
 *
 * Editorial landmark listing all 72 spending categories in Mexican federal
 * procurement. The "WHAT" axis of the exploration space: filterable by
 * sector, sortable by spend / risk / contracts / direct-award.
 *
 * Design: dark editorial aesthetic — serif headers, mono kickers,
 * sector-color left borders, DotBar risk indicators.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { DotBar } from '@/components/ui/DotBar'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS, getSectorName } from '@/lib/constants'
import { CategoryTreemap } from '@/components/categories/CategoryTreemap'
import { EditorialChartFrame } from '@/components/stories/EditorialChartFrame'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopVendor {
  id: number
  name: string
}

interface CategorySummaryItem {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number
  sector_code: string
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  top_vendor: TopVendor | null
}

interface CategorySummaryResponse {
  data: CategorySummaryItem[]
  total: number
}

// ── Sort / filter types ────────────────────────────────────────────────────────

type SortKey = 'spend' | 'risk' | 'contracts' | 'direct_award'

// ── Constants ─────────────────────────────────────────────────────────────────

// All sector codes used in filter pills — sourced from SECTORS constant so we
// never drift from the canonical 12-sector taxonomy.
const ALL_SECTOR_CODES = SECTORS.map((s) => s.code)

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortCategories(
  items: CategorySummaryItem[],
  key: SortKey
): CategorySummaryItem[] {
  const sorted = [...items]
  switch (key) {
    case 'spend':
      return sorted.sort((a, b) => b.total_value - a.total_value)
    case 'risk':
      return sorted.sort((a, b) => b.avg_risk - a.avg_risk)
    case 'contracts':
      return sorted.sort((a, b) => b.total_contracts - a.total_contracts)
    case 'direct_award':
      return sorted.sort((a, b) => b.direct_award_pct - a.direct_award_pct)
  }
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-none" />
      ))}
    </div>
  )
}

// ── Category card ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
  item: CategorySummaryItem
  lang: string
}

function CategoryCard({ item, lang }: CategoryCardProps) {
  const { t } = useTranslation('categories')
  const sectorColor = SECTOR_COLORS[item.sector_code] ?? '#64748b'
  const categoryName = lang === 'es' ? item.name_es : item.name_en
  const isHighDirectAward = item.direct_award_pct > 70

  return (
    <Link
      to={`/categories/${item.category_id}`}
      className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      aria-label={categoryName}
    >
      <article
        className="h-full bg-background-card border border-border hover:border-border-hover transition-colors duration-150 pl-0"
        style={{ borderLeftColor: sectorColor, borderLeftWidth: 3 }}
      >
        <div className="p-3 flex flex-col gap-2 h-full">
          {/* Category name */}
          <div className="flex-1">
            <h3
              className="font-serif text-base font-bold leading-snug text-text-primary transition-colors group-hover:text-accent"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {categoryName}
            </h3>
          </div>

          {/* Spend */}
          <div
            className="font-mono text-sm tabular-nums font-semibold"
            style={{ color: 'var(--color-accent)' }}
          >
            {formatCompactMXN(item.total_value)}
          </div>

          {/* Risk DotBar */}
          <div className="space-y-1">
            <div
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('index.riskLabel')}
            </div>
            <DotBar
              value={item.avg_risk}
              max={1}
              dots={8}
              color={sectorColor}
              ariaLabel={`${t('index.riskLabel')}: ${(item.avg_risk * 100).toFixed(1)}%`}
            />
          </div>

          {/* Bottom row: contract count + direct award badge */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-mono text-[11px] tabular-nums"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {formatNumber(item.total_contracts)}{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>
                {t('index.contracts')}
              </span>
            </span>

            {isHighDirectAward && (
              <span
                className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 border"
                style={{
                  color: '#a06820',
                  borderColor: '#a06820',
                  background: 'rgba(160,104,32,0.08)',
                }}
              >
                {t('index.directAwardBadge', {
                  pct: Math.round(item.direct_award_pct),
                })}
              </span>
            )}
          </div>

          {/* Top vendor chip */}
          {item.top_vendor && (
            <div className="pt-1 border-t border-border">
              <div
                className="text-[10px] font-mono uppercase tracking-widest mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('index.topVendor')}
              </div>
              <EntityIdentityChip
                type="vendor"
                id={item.top_vendor.id}
                name={item.top_vendor.name}
              />
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CategoriesIndex() {
  const { t, i18n } = useTranslation('categories')
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [activeSector, setActiveSector] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<CategorySummaryResponse>({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 600_000,
  })

  // Derived totals for the stats row
  const { totalContracts, totalValue } = useMemo(() => {
    if (!data?.data) return { totalContracts: 0, totalValue: 0 }
    return {
      totalContracts: data.data.reduce((s, c) => s + c.total_contracts, 0),
      totalValue: data.data.reduce((s, c) => s + c.total_value, 0),
    }
  }, [data])

  // Filter then sort
  const displayed = useMemo(() => {
    if (!data?.data) return []
    const filtered = activeSector
      ? data.data.filter((c) => c.sector_code === activeSector)
      : data.data
    return sortCategories(filtered, sortKey)
  }, [data, activeSector, sortKey])

  // Sector pills: only show sectors that actually have categories in the data
  const presentSectorCodes = useMemo(() => {
    if (!data?.data) return ALL_SECTOR_CODES
    const seen = new Set(data.data.map((c) => c.sector_code))
    return ALL_SECTOR_CODES.filter((code) => seen.has(code))
  }, [data])

  // Sort button definitions
  const sortButtons: { key: SortKey; label: string }[] = [
    { key: 'spend', label: t('index.sortSpend') },
    { key: 'risk', label: t('index.sortRisk') },
    { key: 'contracts', label: t('index.sortContracts') },
    { key: 'direct_award', label: t('index.sortDirectAward') },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* ── Editorial header ────────────────────────────────────────────────── */}
      <header className="bg-background-elevated border-b border-border px-6 py-10 md:px-12 lg:px-16">
        {/* Kicker */}
        <p
          className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('index.kicker')}
        </p>

        {/* Headline */}
        <h1
          className="text-4xl font-bold leading-tight mb-4"
          style={{
            fontFamily: 'Playfair Display, serif',
            color: 'var(--color-text-primary)',
            fontSize: 'clamp(28px, 4vw, 36px)',
          }}
        >
          {t('index.headline')}
        </h1>

        {/* Lede */}
        <p
          className="max-w-2xl leading-relaxed mb-8"
          style={{
            fontFamily: 'EB Garamond, Georgia, serif',
            fontSize: 15,
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('index.lede')}
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-8">
          <div>
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('index.statContracts')}
            </div>
            <div
              className="font-mono text-xl tabular-nums font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {formatNumber(totalContracts)}
            </div>
          </div>
          <div>
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('index.statSpend')}
            </div>
            <div
              className="font-mono text-xl tabular-nums font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              {formatCompactMXN(totalValue)}
            </div>
          </div>
          <div>
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('index.statCategories')}
            </div>
            <div
              className="font-mono text-xl tabular-nums font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              72
            </div>
          </div>
        </div>
      </header>

      {/* ── Treemap ─────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-12 lg:px-16 pb-4">
        <EditorialChartFrame
          kicker={
            lang === 'es'
              ? '72 CATEGORÍAS DE GASTO · COMPRANET 2002–2025'
              : '72 SPENDING CATEGORIES · COMPRANET 2002–2025'
          }
          headline={
            lang === 'es'
              ? 'Dónde va el dinero público: nueve billones en 72 categorías'
              : 'Where public money flows: nine trillion pesos across 72 categories'
          }
          footer={
            lang === 'es'
              ? 'Datos de contratos federales COMPRANET · RUBLI v0.8.5 · Gasto validado: 9.9T MXN'
              : 'COMPRANET federal contract data · RUBLI v0.8.5 · Validated spend: 9.9T MXN'
          }
        >
          <CategoryTreemap
            categories={data?.data ?? []}
            lang={lang}
            activeSector={activeSector}
          />
        </EditorialChartFrame>
      </div>

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 md:px-12 lg:px-16">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Sort buttons */}
          <div
            className="flex items-center gap-1 flex-wrap"
            role="group"
            aria-label={t('index.sortAriaLabel')}
          >
            <span
              className="font-mono text-[10px] uppercase tracking-widest mr-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('index.sortBy')}
            </span>
            {sortButtons.map(({ key, label }) => {
              const isActive = sortKey === key
              return (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  aria-pressed={isActive}
                  className="font-mono text-[11px] uppercase tracking-wide px-3 py-1 border transition-colors"
                  style={
                    isActive
                      ? {
                          background: '#a06820',
                          borderColor: '#a06820',
                          color: '#ffffff',
                        }
                      : {
                          background: 'transparent',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)',
                        }
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sector filter pills */}
        <div
          className="flex flex-wrap gap-1.5 mt-3"
          role="group"
          aria-label={t('index.sectorFilterAriaLabel')}
        >
          {/* "Todos" pill */}
          <button
            onClick={() => setActiveSector(null)}
            aria-pressed={activeSector === null}
            className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors"
            style={
              activeSector === null
                ? {
                    background: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-text-secondary)',
                    color: 'var(--color-background)',
                  }
                : {
                    background: 'transparent',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }
            }
          >
            {t('index.allSectors')}
          </button>

          {presentSectorCodes.map((code) => {
            const isActive = activeSector === code
            const hex = SECTOR_COLORS[code] ?? '#64748b'
            const label = getSectorName(code, lang as 'en' | 'es')
            return (
              <button
                key={code}
                onClick={() => setActiveSector(isActive ? null : code)}
                aria-pressed={isActive}
                className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors"
                style={
                  isActive
                    ? {
                        background: hex,
                        borderColor: hex,
                        color: '#ffffff',
                      }
                    : {
                        background: 'transparent',
                        borderColor: hex,
                        color: hex,
                      }
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-4 md:px-12 lg:px-16"
        aria-label={t('index.gridAriaLabel')}
      >
        {isLoading && <LoadingGrid />}

        {isError && (
          <p
            className="font-mono text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('index.errorMessage')}
          </p>
        )}

        {!isLoading && !isError && displayed.length === 0 && (
          <div
            className="py-16 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-mono text-text-muted">{t('index.noResults')}</p>
          </div>
        )}

        {!isLoading && !isError && displayed.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayed.map((item) => (
              <CategoryCard key={item.category_id} item={item} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
