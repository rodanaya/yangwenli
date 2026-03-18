/**
 * RedesKnownDossier — Known Networks Investigation Dossier
 *
 * Replaces the old NetworkGraph page. Instead of a force-directed graph,
 * presents named investigation dossiers as editorial cards sourced from
 * the ARIA investigation queue (Tier 1 + Tier 2).
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { ariaApi } from '@/api/client'
import type { AriaQueueItem } from '@/api/types'
import { cn, formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { Search, Shield, ArrowRight, AlertTriangle, Ghost, Building, Users } from 'lucide-react'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const staggerItem: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ---------------------------------------------------------------------------
// Pattern helpers
// ---------------------------------------------------------------------------

const PATTERN_ICONS: Record<string, React.ElementType> = {
  P1: Building,
  P2: Ghost,
  P3: Users,
  P6: Shield,
  P7: AlertTriangle,
}

const PATTERN_BORDER_COLORS: Record<string, string> = {
  P1: 'border-l-red-500',
  P2: 'border-l-amber-500',
  P3: 'border-l-orange-400',
  P6: 'border-l-rose-600',
  P7: 'border-l-yellow-500',
}

function getTierBadgeColor(tier: number): string {
  switch (tier) {
    case 1: return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 2: return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

// All known patterns for filter dropdown
const ALL_PATTERNS = ['P1', 'P2', 'P3', 'P6', 'P7']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RedesKnownDossier() {
  const { t } = useTranslation('redes')

  // Filters
  const [patternFilter, setPatternFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch Tier 1 + Tier 2 from ARIA queue
  const { data: tier1Data, isLoading: loading1 } = useQuery({
    queryKey: ['aria-queue-redes-t1'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 30 }),
    staleTime: 10 * 60 * 1000,
  })
  const { data: tier2Data, isLoading: loading2 } = useQuery({
    queryKey: ['aria-queue-redes-t2'],
    queryFn: () => ariaApi.getQueue({ tier: 2, per_page: 30 }),
    staleTime: 10 * 60 * 1000,
  })

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ['aria-stats-redes'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  const isLoading = loading1 || loading2

  // Merge and sort by IPS
  const dossiers = useMemo(() => {
    const items: AriaQueueItem[] = []
    if (tier1Data?.data) items.push(...tier1Data.data)
    if (tier2Data?.data) items.push(...tier2Data.data)
    // Deduplicate by vendor_id
    const seen = new Set<number>()
    const unique: AriaQueueItem[] = []
    for (const item of items) {
      if (!seen.has(item.vendor_id)) {
        seen.add(item.vendor_id)
        unique.push(item)
      }
    }
    // Sort by IPS descending
    unique.sort((a, b) => b.ips_final - a.ips_final)
    return unique
  }, [tier1Data, tier2Data])

  // Apply filters
  const filtered = useMemo(() => {
    let result = dossiers
    if (patternFilter) {
      result = result.filter((d) => d.primary_pattern === patternFilter)
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter((d) => d.vendor_name.toLowerCase().includes(term))
    }
    return result.slice(0, 40) // cap at 40 for perf
  }, [dossiers, patternFilter, searchTerm])

  const error = !isLoading && dossiers.length === 0 && !tier1Data && !tier2Data

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Editorial header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={Shield}
        serif
        label={t('trackingLabel')}
      />

      {/* Source attribution + stats */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted/60">
        {statsData && (
          <>
            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {t('sourceAttribution', { count: statsData.queue_total })} &middot; {t('sourceRegistries')}
            </span>
            <span className="text-red-400">{t('stats.tier1')}: {statsData.latest_run?.tier1_count ?? 0}</span>
            <span className="text-orange-400">{t('stats.tier2')}: {statsData.latest_run?.tier2_count ?? 0}</span>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('loading').replace('...', '')}
            className="bg-surface-card border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-sm text-text-primary w-64 placeholder:text-text-muted/30"
            aria-label="Search vendors"
          />
        </div>

        <select
          value={patternFilter}
          onChange={(e) => setPatternFilter(e.target.value)}
          className="bg-surface-card border border-white/10 rounded-md px-3 py-1.5 text-sm text-text-primary"
          aria-label={t('filters.byPattern')}
        >
          <option value="">{t('filters.allPatterns')}</option>
          {ALL_PATTERNS.map((p) => (
            <option key={p} value={p}>{t(`patternLabels.${p}`)}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-surface-card border border-red-500/20 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">{t('errorTitle')}</h3>
          <p className="text-text-muted text-sm">{t('errorMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('errorHint')}</p>
        </div>
      )}

      {/* Empty state (loaded but no results) */}
      {!isLoading && !error && filtered.length === 0 && dossiers.length === 0 && (
        <div className="bg-surface-card border border-white/10 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">{t('emptyTitle')}</h3>
          <p className="text-text-muted text-sm">{t('emptyMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('emptyHint')}</p>
        </div>
      )}

      {/* Filter yields nothing */}
      {!isLoading && !error && filtered.length === 0 && dossiers.length > 0 && (
        <div className="bg-surface-card border border-white/10 rounded-xl p-6 text-center">
          <p className="text-text-muted text-sm">No dossiers match the current filters.</p>
        </div>
      )}

      {/* Dossier grid */}
      {!isLoading && filtered.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {filtered.map((item) => (
            <DossierCard key={item.vendor_id} item={item} t={t} />
          ))}
        </motion.div>
      )}

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-[11px] text-text-muted/40 text-center">
          {filtered.length} / {dossiers.length} {t('stats.totalDossiers').toLowerCase()}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dossier Card
// ---------------------------------------------------------------------------

interface DossierCardProps {
  item: AriaQueueItem
  t: (key: string, opts?: Record<string, unknown>) => string
}

function DossierCard({ item, t }: DossierCardProps) {
  const pattern = item.primary_pattern || 'default'
  const PatternIcon = PATTERN_ICONS[pattern] || AlertTriangle
  const borderClass = PATTERN_BORDER_COLORS[pattern] || 'border-l-zinc-500'
  const sectorColor = item.primary_sector_name
    ? SECTOR_COLORS[item.primary_sector_name.toLowerCase()] || '#64748b'
    : '#64748b'

  const patternKey = pattern as string
  const patternLabel = t(`patternLabels.${patternKey}`, { defaultValue: t('patternLabels.default') })
  const patternDesc = t(`patterns.${patternKey}`, { defaultValue: t('patterns.default') })

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'bg-surface-card border border-white/8 rounded-xl overflow-hidden',
        'border-l-4',
        borderClass,
        'hover:border-white/20 transition-colors group',
      )}
    >
      <div className="p-4 space-y-3">
        {/* Top row: pattern badge + tier */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PatternIcon className="w-3.5 h-3.5 text-text-muted/50" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted/60">
              {patternLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {item.is_efos_definitivo && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">
                {t('card.efos')}
              </span>
            )}
            {item.is_sfp_sanctioned && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20">
                {t('card.sfp')}
              </span>
            )}
            {item.new_vendor_risk && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/20">
                {t('card.newVendor')}
              </span>
            )}
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded border font-medium',
                getTierBadgeColor(item.ips_tier),
              )}
            >
              T{item.ips_tier}
            </span>
          </div>
        </div>

        {/* Vendor name (bold serif) */}
        <h3 className="font-serif text-base text-text-primary font-semibold leading-tight">
          {item.vendor_name}
        </h3>

        {/* Sector + period row */}
        <div className="flex items-center gap-2 text-[11px] text-text-muted/60">
          {item.primary_sector_name && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: sectorColor }} />
              {item.primary_sector_name}
            </span>
          )}
          {item.years_active !== undefined && item.years_active > 0 && (
            <span>&middot; {item.years_active} {item.years_active === 1 ? 'year' : 'years'} active</span>
          )}
        </div>

        {/* Key stats */}
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-text-muted/70">
            {formatNumber(item.total_contracts)} {t('card.contracts')}
          </span>
          <span className="text-text-muted/70">
            {formatCompactMXN(item.total_value_mxn)}
          </span>
          <span className="text-text-muted/70">
            {t('card.riskScore')}: {formatPercent(item.avg_risk_score, 0)}
          </span>
          <span className="text-text-muted/50">
            {t('card.ipsScore')}: {item.ips_final.toFixed(2)}
          </span>
        </div>

        {/* Pattern description */}
        <p className="text-[11px] text-text-muted/50 leading-relaxed line-clamp-2">
          {patternDesc}
        </p>

        {/* Action link */}
        <div className="pt-1">
          <Link
            to={`/thread/${item.vendor_id}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-primary hover:text-accent-primary/80 transition-colors group-hover:underline"
          >
            {t('card.viewCase')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
