/**
 * Institution Risk Rankings — Editorial Redesign
 *
 * "Captura Institucional" — which government institutions show signs
 * of vendor capture? NYT/WaPo/Fern investigative journalism aesthetic.
 *
 * Data: GET /api/v1/analysis/institution-rankings
 */

import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { formatCompactMXN, formatNumber, getRiskLevel, toTitleCase } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { InstitutionHealthItem, InstitutionRankingsResponse } from '@/api/types'
import {
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

type SortField = 'hhi' | 'top_vendor_share' | 'total_contracts' | 'avg_risk_score' | 'high_risk_pct' | 'direct_award_pct'
type SortDir = 'asc' | 'desc'

// =============================================================================
// Helpers
// =============================================================================

/** HHI badge color. Note: the API returns HHI on a 0-1 scale (not 0-10000). */
function getHhiBadgeStyle(hhi: number): { bg: string; text: string; labelKey: string } {
  if (hhi >= 0.5) return { bg: '#dc2626', text: '#fff', labelKey: 'health.hhi.capture' }
  if (hhi >= 0.25) return { bg: '#ea580c', text: '#fff', labelKey: 'health.hhi.concentrated' }
  if (hhi >= 0.10) return { bg: '#eab308', text: '#000', labelKey: 'health.hhi.moderate' }
  return { bg: '#16a34a', text: '#fff', labelKey: 'health.hhi.competitive' }
}

function HhiBadge({ hhi }: { hhi: number }) {
  const { t } = useTranslation('institutions')
  const s = getHhiBadgeStyle(hhi)
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {hhi.toFixed(2)} — {t(s.labelKey)}
    </span>
  )
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-30" />
  return sortDir === 'desc'
    ? <ArrowDown className="ml-1 inline h-3 w-3 text-accent" />
    : <ArrowUp className="ml-1 inline h-3 w-3 text-accent" />
}

function SortButton({
  field,
  sortField,
  sortDir,
  onSort,
  children,
}: {
  field: SortField
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
  children: React.ReactNode
}) {
  return (
    <button
      className="flex items-center whitespace-nowrap font-medium hover:text-accent transition-colors focus:outline-none"
      onClick={() => onSort(field)}
      aria-sort={field === sortField ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      {children}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </button>
  )
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function PageSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid grid-cols-3 gap-8">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-4 w-full max-w-2xl" />
      <div className="grid grid-cols-3 gap-6">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

// =============================================================================
// Capture Spotlight Card (Top 3 editorial cards)
// =============================================================================

function CaptureSpotlightCard({ item, rank }: { item: InstitutionHealthItem; rank: number }) {
  const { t } = useTranslation('institutions')
  const s = getHhiBadgeStyle(item.hhi)
  const isCaptured = item.hhi >= 0.5

  return (
    <Link
      to={`/institutions/${item.institution_id}`}
      className="group block relative"
      aria-label={`${t('health.viewInstitutionalProfile')} ${toTitleCase(item.institution_name)}`}
    >
      <div
        className="rounded-lg border border-border bg-background-card p-5 transition-all hover:border-accent/50 focus-within:ring-2 focus-within:ring-accent"
        style={isCaptured ? { borderLeftWidth: '4px', borderLeftColor: '#dc2626' } : undefined}
      >
        {/* Rank + HHI badge */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <span
            className="text-4xl font-black tabular-nums opacity-15 leading-none"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {rank}
          </span>
          <span
            className="rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: s.bg, color: s.text }}
          >
            {t(s.labelKey)}
          </span>
        </div>

        {/* Institution name — serif, bold */}
        <h3
          className="text-lg font-bold text-text-primary leading-snug mb-1 line-clamp-2"
          style={{ fontFamily: 'var(--font-family-serif)' }}
          title={item.institution_name}
        >
          {toTitleCase(item.institution_name)}
        </h3>

        {item.institution_type && (
          <p className="text-xs text-text-muted mb-4">{item.institution_type}</p>
        )}

        {/* HHI score — large */}
        <div className="mb-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{t('health.hhiLabel')}</p>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: s.bg, fontFamily: 'var(--font-family-serif)' }}
          >
            {item.hhi.toFixed(3)}
          </p>
        </div>

        {/* Key metrics */}
        <div className="space-y-2 text-sm border-t border-border pt-3">
          <div className="flex justify-between">
            <span className="text-text-muted">{t('health.dominantVendor')}</span>
            <span className="font-bold tabular-nums text-text-primary">
              {item.top_vendor_share.toFixed(1)}% {t('health.ofSpend')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">{t('health.totalSpend')}</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {formatCompactMXN(item.total_value)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">{t('columns.contracts')}</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {formatNumber(item.total_contracts)}
            </span>
          </div>
        </div>

        {/* Link */}
        <div className="mt-4 flex items-center gap-1 text-xs text-accent group-hover:underline">
          <span>{t('health.viewInstitutionalProfile')}</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </Link>
  )
}

// =============================================================================
// HHI Methodology Explainer (editorial note style)
// =============================================================================

function HhiMethodologyNote() {
  const { t } = useTranslation('institutions')
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-b border-border">
      <button
        className="w-full flex items-center justify-between py-4 text-left hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-text-muted font-semibold">
            {t('health.methodology.label')}
          </span>
          <span className="text-sm text-text-secondary">
            {t('health.methodology.question')}
          </span>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-text-muted flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="pb-6 space-y-4">
          {/* Pull quote */}
          <blockquote
            className="border-l-4 border-red-600 pl-4 py-2 my-4"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            <p className="text-lg text-text-primary italic leading-relaxed">
              "{t('health.methodology.pullQuote')}"
            </p>
          </blockquote>

          <div className="text-sm text-text-secondary leading-relaxed space-y-3 max-w-3xl">
            <p dangerouslySetInnerHTML={{ __html: t('health.methodology.body1') }} // safe: static translation-only markup (<strong>), no user input
            />
            <p>{t('health.methodology.body2')}</p>
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { range: '0.00 - 0.10', labelKey: 'health.hhi.competitive', color: '#16a34a', descKey: 'health.methodology.tier_competitive_desc' },
              { range: '0.10 - 0.25', labelKey: 'health.hhi.moderate', color: '#eab308', descKey: 'health.methodology.tier_moderate_desc' },
              { range: '0.25 - 0.50', labelKey: 'health.hhi.concentrated', color: '#ea580c', descKey: 'health.methodology.tier_concentrated_desc' },
              { range: '0.50 - 1.00', labelKey: 'health.hhi.capture', color: '#dc2626', descKey: 'health.methodology.tier_capture_desc' },
            ].map(tier => (
              <div key={tier.range} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                  <span className="font-semibold text-xs" style={{ color: tier.color }}>{t(tier.labelKey)}</span>
                </div>
                <p className="text-xs font-mono tabular-nums text-text-muted">{tier.range}</p>
                <p className="text-xs text-text-secondary">{t(tier.descKey)}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-muted italic">
            {t('health.methodology.noteText')}
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Rankings Table (editorial style)
// =============================================================================

function RankingsTable({ items }: { items: InstitutionHealthItem[] }) {
  const { t } = useTranslation('institutions')
  const [sortField, setSortField] = useState<SortField>('hhi')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const av = a[sortField] as number
        const bv = b[sortField] as number
        return sortDir === 'desc' ? bv - av : av - bv
      })
      .slice(0, 20)
  }, [items, sortField, sortDir])

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table
        className="w-full text-sm border-collapse"
        role="table"
        aria-label={t('health.tableAriaLabel')}
      >
        <thead>
          <tr className="bg-background-elevated border-b border-border text-text-muted text-xs">
            <th scope="col" className="px-4 py-3 text-left w-8 font-medium">{t('health.colNumber')}</th>
            <th scope="col" className="px-4 py-3 text-left font-medium min-w-[220px]">{t('health.colInstitution')}</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="hhi" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                {t('health.colHhi')}
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="top_vendor_share" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                {t('health.colTopVendor')}
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="total_contracts" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                {t('health.colContracts')}
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="avg_risk_score" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                {t('health.colAvgRisk')}
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <SortButton field="high_risk_pct" sortField={sortField} sortDir={sortDir} onSort={handleSort}>
                {t('health.colCriticalContracts')}
              </SortButton>
            </th>
            <th scope="col" className="px-4 py-3 text-center font-medium w-28">{t('health.colProfile')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => {
            const riskLevel = getRiskLevel(item.avg_risk_score)
            const riskColor = RISK_COLORS[riskLevel]
            const isCaptured = item.hhi >= 0.5
            const isConcentrated = item.hhi >= 0.25 && item.hhi < 0.5
            return (
              <tr
                key={item.institution_id}
                className="border-b border-border/40 hover:bg-background-elevated/50 transition-colors"
                style={
                  isCaptured
                    ? { borderLeft: '4px solid #dc2626' }
                    : isConcentrated
                    ? { borderLeft: '4px solid #ea580c' }
                    : undefined
                }
              >
                <td className="px-4 py-3 text-text-muted font-mono tabular-nums text-xs">
                  {idx + 1}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text-primary text-sm">
                    {toTitleCase(item.institution_name)}
                  </span>
                  {item.institution_type && (
                    <span className="ml-2 text-xs text-text-muted">
                      {item.institution_type}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <HhiBadge hhi={item.hhi} />
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm">
                  {item.top_vendor_share.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-text-secondary">
                  {formatNumber(item.total_contracts)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm font-semibold" style={{ color: riskColor }}>
                  {(item.avg_risk_score * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-text-secondary">
                  {item.high_risk_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    to={`/institutions/${item.institution_id}`}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    aria-label={`${t('health.viewProfile')} ${toTitleCase(item.institution_name)}`}
                  >
                    {t('health.viewProfile')}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// =============================================================================
// Main Page
// =============================================================================

export default function InstitutionHealth() {
  const { t } = useTranslation('institutions')
  const { data, isLoading, error } = useQuery<InstitutionRankingsResponse>({
    queryKey: ['institution-rankings', 'hhi', 50, 100],
    queryFn: () => analysisApi.getInstitutionRankings('hhi', 100, 50),
    staleTime: 10 * 60 * 1000,
  })

  // All hooks MUST be called before any early returns (Rules of Hooks)
  const items = data?.data ?? []
  const capturedTop3 = useMemo(
    () => [...items].sort((a, b) => b.hhi - a.hhi).slice(0, 3),
    [items]
  )

  if (isLoading) return <PageSkeleton />

  if (error || !data) {
    return (
      <div className="p-8 text-center text-text-muted">
        <AlertTriangle className="mx-auto h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm">{t('health.loadError')}</p>
      </div>
    )
  }

  const totalInstitutions = data.total_institutions ?? items.length

  // Summary stats derived from data
  const capturedCount = items.filter(i => i.hhi >= 0.5).length
  const capturedSpend = items
    .filter(i => i.hhi >= 0.5)
    .reduce((sum, i) => sum + i.total_value, 0)
  const totalSpend = items.reduce((sum, i) => sum + i.total_value, 0)
  const capturedSpendPct = totalSpend > 0
    ? ((capturedSpend / totalSpend) * 100).toFixed(1)
    : '0'

  return (
    <motion.article
      className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Section 1: Editorial headline */}
      <motion.div variants={staggerItem}>
        <EditorialHeadline
          section={t('health.section')}
          headline={t('health.headline')}
          subtitle={t('health.subtitle')}
        />
      </motion.div>

      {/* Section 2: Hallazgo stats row */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-2"
        variants={staggerItem}
      >
        <HallazgoStat
          value={formatNumber(totalInstitutions)}
          label={t('health.statsInstitutions')}
          annotation={t('health.statsInstitutionsAnnotation')}
          color="border-zinc-500"
        />
        <HallazgoStat
          value={String(capturedCount)}
          label={t('health.statsCaptured')}
          annotation={t('health.statsCapturedAnnotation')}
          color="border-red-500"
        />
        <HallazgoStat
          value={`${capturedSpendPct}%`}
          label={t('health.statsSpend')}
          annotation={formatCompactMXN(capturedSpend)}
          color="border-orange-500"
        />
      </motion.div>

      {/* Section 3: Investigation lede paragraph */}
      <motion.div variants={staggerItem}>
        <div
          className="text-lg text-text-secondary leading-relaxed max-w-3xl"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {/* safe: interpolated values are numeric (capturedCount=integer, capturedSpend=formatted number); no user-controlled strings */}
          <p dangerouslySetInnerHTML={{
            __html: t('health.lede', {
              count: capturedCount,
              amount: formatCompactMXN(capturedSpend),
            })
          }} />
        </div>
      </motion.div>

      {/* Section 4: Top 3 Capture Spotlight */}
      <motion.div variants={staggerItem}>
        <div className="mb-4">
          <h2
            className="text-xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('health.top3Title')}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {t('health.top3Subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {capturedTop3.map((item, idx) => (
            <CaptureSpotlightCard key={item.institution_id} item={item} rank={idx + 1} />
          ))}
        </div>
      </motion.div>

      {/* Section 5: Rankings table */}
      <motion.div variants={staggerItem}>
        <div className="border-t border-border pt-6 mb-4">
          <h2
            className="text-xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('health.rankingsTitle')}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {t('health.rankingsSubtitle')}
          </p>
        </div>
        <RankingsTable items={items} />
      </motion.div>

      {/* Section 6: HHI Methodology note */}
      <motion.div variants={staggerItem}>
        <HhiMethodologyNote />
      </motion.div>

      {/* Section 7: Impacto humano block */}
      <motion.div variants={staggerItem}>
        <div
          className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-5"
        >
          <p className="text-xs uppercase tracking-[0.15em] text-amber-500 font-semibold mb-3">
            {t('health.impactLabel')}
          </p>
          <p
            className="text-base text-text-secondary leading-relaxed"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('health.impactText')}
          </p>
        </div>
      </motion.div>
    </motion.article>
  )
}
