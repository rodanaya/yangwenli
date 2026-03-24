/**
 * RedesKnownDossier — "LA RED INVISIBLE"
 *
 * Intelligence dossier of known corruption networks in Mexico's procurement system.
 * Presents ARIA Tier 1 + Tier 2 vendors as investigation dossiers.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
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

const PATTERN_PILL_COLORS: Record<string, { active: string; inactive: string }> = {
  P1: {
    active: 'bg-red-500 text-white border-red-500',
    inactive: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20',
  },
  P2: {
    active: 'bg-amber-500 text-black border-amber-500',
    inactive: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
  },
  P3: {
    active: 'bg-orange-500 text-white border-orange-500',
    inactive: 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20',
  },
  P6: {
    active: 'bg-rose-600 text-white border-rose-600',
    inactive: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
  },
  P7: {
    active: 'bg-yellow-500 text-black border-yellow-500',
    inactive: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20',
  },
}

const PATTERN_PILL_LABELS: Record<string, string> = {
  P1: 'P1 MONOPOLIO',
  P2: 'P2 FANTASMA',
  P3: 'P3 INTERMEDIARIO',
  P6: 'P6 CAPTURA',
  P7: 'P7 RIESGO EXTREMO',
}

function getTierBadgeColor(tier: number): string {
  switch (tier) {
    case 1: return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 2: return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

function getIpsColor(ips: number): string {
  if (ips >= 0.8) return 'bg-red-500/20 text-red-300 border-red-500/30'
  if (ips >= 0.6) return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  if (ips >= 0.4) return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
}

// All known patterns for filter
const ALL_PATTERNS = ['P1', 'P2', 'P3', 'P6', 'P7']

// Pattern summary data (known counts from ARIA)
const PATTERN_SUMMARY = [
  { code: 'P1', name: 'Monopolio', desc: 'Dominio de mercado exclusivo', vendors: '26', value: '$703B', borderColor: 'border-red-500' },
  { code: 'P2', name: 'Fantasma', desc: 'Empresas sin operaciones reales', vendors: '3.3K', value: '-', borderColor: 'border-amber-500' },
  { code: 'P3', name: 'Intermediario', desc: 'Intermediarios de papel', vendors: '3.3K', value: '-', borderColor: 'border-orange-400' },
  { code: 'P6', name: 'Captura', desc: 'Captura de instituciones', vendors: '15.8K', value: '$922B', borderColor: 'border-rose-600' },
  { code: 'P7', name: 'Riesgo Extremo', desc: 'Patrones de riesgo extremo', vendors: '108', value: '$374B', borderColor: 'border-yellow-500' },
]

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
      {/* Editorial header — "LA RED INVISIBLE" */}
      <div className="border-b border-border pb-6 mb-8">
        <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
          Análisis de Redes &middot; ARIA Tier 1 y Tier 2
        </div>
        <h1 style={{ fontFamily: 'var(--font-family-serif)' }} className="text-4xl font-bold text-text-primary mb-2">
          La Red Invisible
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          Redes de corrupcion documentadas en contratacion publica federal.{' '}
          285 proveedores en vigilancia maxima (Nivel 1). Patrones identificados por sistema ARIA.
        </p>
      </div>

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

      {/* Pattern summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PATTERN_SUMMARY.map((p) => (
          <button
            key={p.code}
            onClick={() => setPatternFilter(patternFilter === p.code ? '' : p.code)}
            className={cn(
              'border-l-4 pl-3 py-2 rounded-r text-left transition-all',
              p.borderColor,
              patternFilter === p.code
                ? 'bg-white/10 ring-1 ring-white/20'
                : 'bg-background-elevated hover:bg-white/5',
            )}
          >
            <div className="text-xs font-mono font-bold text-text-primary">{p.code}</div>
            <div className="text-xs text-text-muted">{p.name}</div>
            <div className="text-sm font-semibold text-text-primary mt-1">{p.vendors} proveedores</div>
            <div className="text-xs text-text-muted">{p.value}</div>
          </button>
        ))}
      </div>

      {/* Filters — search + pattern pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar proveedor..."
            className="bg-surface-card border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-sm text-text-primary w-64 placeholder:text-text-muted/30"
            aria-label="Search vendors"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_PATTERNS.map((p) => {
            const isActive = patternFilter === p
            const colors = PATTERN_PILL_COLORS[p]
            return (
              <button
                key={p}
                onClick={() => setPatternFilter(isActive ? '' : p)}
                className={cn(
                  'text-[10px] font-mono font-semibold tracking-wider px-2.5 py-1 rounded border transition-all',
                  isActive ? colors?.active : colors?.inactive,
                )}
                aria-pressed={isActive}
                aria-label={`Filter by pattern ${p}`}
              >
                {PATTERN_PILL_LABELS[p] || p}
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
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
          <p className="text-text-muted text-sm">No se encontraron expedientes con los filtros actuales.</p>
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
            <DossierCard key={item.vendor_id} item={item} />
          ))}
        </motion.div>
      )}

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-[11px] text-text-muted/40 text-center">
          {filtered.length} / {dossiers.length} expedientes
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dossier Card — intelligence dossier style
// ---------------------------------------------------------------------------

interface DossierCardProps {
  item: AriaQueueItem
}

function DossierCard({ item }: DossierCardProps) {
  const pattern = item.primary_pattern || 'default'
  const PatternIcon = PATTERN_ICONS[pattern] || AlertTriangle
  const borderClass = PATTERN_BORDER_COLORS[pattern] || 'border-l-zinc-500'
  const sectorColor = item.primary_sector_name
    ? SECTOR_COLORS[item.primary_sector_name.toLowerCase()] || '#64748b'
    : '#64748b'

  const patternLabel = PATTERN_PILL_LABELS[pattern] || pattern.toUpperCase()

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
      <div className="p-5 space-y-3">
        {/* Top row: pattern badge + tier + flags */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PatternIcon className="w-3.5 h-3.5 text-text-muted/50" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-muted/70">
              {patternLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {item.is_efos_definitivo && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20 font-mono">
                EFOS
              </span>
            )}
            {item.is_sfp_sanctioned && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20 font-mono">
                SFP
              </span>
            )}
            {item.new_vendor_risk && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/20 font-mono">
                NUEVO
              </span>
            )}
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold',
                getTierBadgeColor(item.ips_tier),
              )}
            >
              TIER {item.ips_tier}
            </span>
          </div>
        </div>

        {/* Vendor name (bold serif) */}
        <h3
          style={{ fontFamily: 'var(--font-family-serif)' }}
          className="text-lg text-text-primary font-bold leading-tight"
        >
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
            <span>
              &middot; {item.years_active} {item.years_active === 1 ? 'anio' : 'anios'} activo
            </span>
          )}
        </div>

        {/* Key stats row — IPS prominent + contracts + value */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-xs font-mono font-bold px-2 py-0.5 rounded border',
              getIpsColor(item.ips_final),
            )}
          >
            IPS {item.ips_final.toFixed(2)}
          </span>
          <span className="text-[11px] text-text-muted/70">
            {formatNumber(item.total_contracts)} contratos
          </span>
          <span className="text-[11px] font-semibold text-text-primary">
            {formatCompactMXN(item.total_value_mxn)}
          </span>
          <span className="text-[11px] text-text-muted/50">
            Riesgo: {formatPercent(item.avg_risk_score, 0)}
          </span>
        </div>

        {/* Action link */}
        <div className="pt-1 flex items-center justify-between">
          <Link
            to={`/thread/${item.vendor_id}`}
            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-accent-primary hover:text-accent-primary/80 transition-colors group-hover:underline"
          >
            Abrir Expediente <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            to={`/vendors/${item.vendor_id}`}
            className="text-[10px] text-text-muted/40 hover:text-text-muted/70 transition-colors"
          >
            Perfil
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
