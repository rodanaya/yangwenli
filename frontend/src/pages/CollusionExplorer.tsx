/**
 * COLLUSION EXPLORER — Bid-Ring Detection
 *
 * Pairs form rings. If A+B and B+C co-bid, then A+B+C are a ring targeting the
 * same procurement patterns. The ring is the unit of investigation. We group
 * pairs into connected components client-side (union-find) and surface the top
 * rings as editorial cards. Pairs below demote to evidence of ring membership.
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Shield,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { collusionApi } from '@/api/client'
import type { CollusionPair, CollusionStats } from '@/api/types'
import { formatNumber } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SharedContractsModal } from '@/components/SharedContractsModal'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SortField = 'shared_procedures' | 'co_bid_rate'
type PatternKind = 'rotation' | 'cover' | 'mixed' | 'unknown'

const DEFAULT_MIN_SHARED = 10
const DEFAULT_SORT: SortField = 'shared_procedures'
const DEFAULT_PER_PAGE = 50
const RINGS_FETCH_SIZE = 100 // backend max per_page
const TOP_RINGS_SHOWN = 8

// ---------------------------------------------------------------------------
// DotBar — NYT-style categorical magnitude indicator
// ---------------------------------------------------------------------------

function DotBar({
  value,
  max = 1,
  color = '#dc2626',
  emptyColor = '#2a2420',
  dots = 20,
  size = 6,
  gap = 2,
}: {
  value: number
  max?: number
  color?: string
  emptyColor?: string
  dots?: number
  size?: number
  gap?: number
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const filled = Math.round(ratio * dots)
  const w = dots * (size + gap) - gap
  return (
    <svg width={w} height={size} style={{ display: 'block' }} aria-hidden="true">
      {Array.from({ length: dots }, (_, i) => (
        <circle
          key={i}
          cx={i * (size + gap) + size / 2}
          cy={size / 2}
          r={size / 2}
          fill={i < filled ? color : emptyColor}
        />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Union-Find ring detection
// ---------------------------------------------------------------------------

function buildRings(pairs: CollusionPair[]): Map<string, CollusionPair[]> {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x)
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
    return parent.get(x)!
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  pairs.forEach((p) => union(String(p.vendor_id_a), String(p.vendor_id_b)))
  const rings = new Map<string, CollusionPair[]>()
  pairs.forEach((p) => {
    const root = find(String(p.vendor_id_a))
    if (!rings.has(root)) rings.set(root, [])
    rings.get(root)!.push(p)
  })
  return rings
}

// ---------------------------------------------------------------------------
// Ring summarization + pattern classification
// ---------------------------------------------------------------------------

interface RingSummary {
  id: string
  members: Set<number>
  memberNames: Map<number, string>
  pairs: CollusionPair[]
  sharedProcedures: number
  avgCoBidRate: number
  maxCoBidRate: number
  pattern: PatternKind
  dominantVendor: string | null
}

function summarizeRing(id: string, pairs: CollusionPair[]): RingSummary {
  const members = new Set<number>()
  const memberNames = new Map<number, string>()
  const procedureCounts = new Map<number, number>()
  let sharedProcedures = 0
  let maxCoBidRate = 0
  let rotationSignals = 0
  let coverSignals = 0

  for (const p of pairs) {
    members.add(p.vendor_id_a)
    members.add(p.vendor_id_b)
    memberNames.set(p.vendor_id_a, p.vendor_name_a)
    memberNames.set(p.vendor_id_b, p.vendor_name_b)
    sharedProcedures += p.shared_procedures
    maxCoBidRate = Math.max(maxCoBidRate, p.co_bid_rate)

    // Track each vendor's total procedure footprint (for dominant detection)
    procedureCounts.set(
      p.vendor_id_a,
      Math.max(procedureCounts.get(p.vendor_id_a) ?? 0, p.vendor_a_procedures),
    )
    procedureCounts.set(
      p.vendor_id_b,
      Math.max(procedureCounts.get(p.vendor_id_b) ?? 0, p.vendor_b_procedures),
    )

    // Pattern heuristic — compare procedure footprints of the two vendors in each pair.
    // Near-equal totals (< 2x ratio) consistent with rotation; heavy asymmetry (> 3x) consistent with cover bidding.
    const a = p.vendor_a_procedures
    const b = p.vendor_b_procedures
    if (a > 0 && b > 0) {
      const ratio = Math.max(a, b) / Math.min(a, b)
      if (ratio < 2) rotationSignals += 1
      else if (ratio > 3) coverSignals += 1
    }
  }

  const avgCoBidRate =
    pairs.length > 0 ? pairs.reduce((s, p) => s + p.co_bid_rate, 0) / pairs.length : 0

  // Classify dominant pattern — require majority signal; otherwise mixed or unknown.
  let pattern: PatternKind = 'unknown'
  const total = rotationSignals + coverSignals
  if (total >= Math.max(2, pairs.length * 0.5)) {
    if (rotationSignals > coverSignals * 1.5) pattern = 'rotation'
    else if (coverSignals > rotationSignals * 1.5) pattern = 'cover'
    else pattern = 'mixed'
  }

  // Dominant vendor = highest procedure footprint within the ring
  let dominantVendor: string | null = null
  let maxCount = 0
  for (const [vid, count] of procedureCounts) {
    if (count > maxCount) {
      maxCount = count
      dominantVendor = memberNames.get(vid) ?? null
    }
  }

  return {
    id,
    members,
    memberNames,
    pairs,
    sharedProcedures,
    avgCoBidRate,
    maxCoBidRate,
    pattern,
    dominantVendor,
  }
}

// ---------------------------------------------------------------------------
// Pattern metadata
// ---------------------------------------------------------------------------

function buildPatternMeta(isEs: boolean): Record<
  PatternKind,
  { label: string; desc: string; icon: React.ElementType; color: string; tone: string }
> {
  return {
    rotation: {
      label: isEs ? 'Rotación de licitaciones' : 'Bid rotation',
      desc: isEs
        ? 'Volúmenes de licitación similares entre miembros — consistente con alternancia de ganadores.'
        : 'Similar bidding volumes among members — consistent with alternating winners.',
      icon: Repeat,
      color: 'text-red-400',
      tone: 'bg-red-500/10 border-red-500/20',
    },
    cover: {
      label: isEs ? 'Presentación de cobertura' : 'Cover bidding',
      desc: isEs
        ? 'Un miembro domina en volumen de licitaciones, los demás parecen acompañar sin ganar.'
        : 'One member dominates in bidding volume; the others appear to tag along without winning.',
      icon: Shield,
      color: 'text-orange-400',
      tone: 'bg-orange-500/10 border-orange-500/20',
    },
    mixed: {
      label: isEs ? 'Patrón mixto' : 'Mixed pattern',
      desc: isEs
        ? 'Signos combinados de rotación y cobertura — el anillo probablemente opera en múltiples modos.'
        : 'Combined signs of rotation and cover — the ring probably operates in multiple modes.',
      icon: AlertTriangle,
      color: 'text-amber-400',
      tone: 'bg-amber-500/10 border-amber-500/20',
    },
    unknown: {
      label: isEs ? 'Patrón sin clasificar' : 'Unclassified pattern',
      desc: isEs
        ? 'Intensidad suficiente para agrupación, pero sin señal dominante. Requiere inspección manual.'
        : 'Intensity sufficient for grouping, but no dominant signal. Manual inspection required.',
      icon: HelpCircle,
      color: 'text-zinc-400',
      tone: 'bg-zinc-800/40 border-zinc-700/40',
    },
  }
}

// ---------------------------------------------------------------------------
// Ring Card — the star of Act I
// ---------------------------------------------------------------------------

function RingCard({
  ring,
  index,
  maxSize,
  onSelect,
  isSelected,
  isEs,
}: {
  ring: RingSummary
  index: number
  maxSize: number
  onSelect: (ringId: string) => void
  isSelected: boolean
  isEs: boolean
}) {
  const patternMeta = buildPatternMeta(isEs)[ring.pattern]
  const PatternIcon = patternMeta.icon
  const ringLetter = String.fromCharCode(65 + index) // A, B, C...
  const intensityPct = ring.avgCoBidRate
  const memberNames = Array.from(ring.memberNames.values())

  return (
    <button
      type="button"
      onClick={() => onSelect(ring.id)}
      className={`group relative w-full text-left rounded-xl border p-5 transition-all ${
        isSelected
          ? 'border-amber-500/60 bg-amber-500/5'
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'
      }`}
      aria-pressed={isSelected}
    >
      {/* Ring header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {isEs ? 'ANILLO' : 'RING'} {ringLetter}
            <span className="text-zinc-600 mx-1.5">·</span>
            <span className="text-zinc-400">{ring.members.size} {isEs ? 'miembros' : 'members'}</span>
          </p>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono border ${patternMeta.tone}`}
          >
            <PatternIcon className={`h-3 w-3 ${patternMeta.color}`} aria-hidden="true" />
            <span className={patternMeta.color}>{patternMeta.label}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {isEs ? 'Procedimientos' : 'Procedures'}
          </div>
          <div className="font-mono text-2xl font-bold text-zinc-100 leading-none mt-0.5">
            {formatNumber(ring.sharedProcedures)}
          </div>
        </div>
      </div>

      {/* Intensity */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {isEs ? 'Intensidad' : 'Intensity'}
          </span>
          <span className="font-mono text-xs text-zinc-300 tabular-nums">
            {intensityPct.toFixed(0)}%
          </span>
        </div>
        <DotBar
          value={intensityPct}
          max={100}
          color="#dc2626"
          emptyColor="#2a2420"
          dots={20}
        />
      </div>

      {/* Size */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            {isEs ? 'Tamaño' : 'Size'}
          </span>
          <span className="font-mono text-xs text-zinc-300 tabular-nums">
            {ring.members.size} / {maxSize}
          </span>
        </div>
        <DotBar
          value={ring.members.size}
          max={maxSize}
          color="#ea580c"
          emptyColor="#2a2420"
          dots={20}
        />
      </div>

      {/* Member preview */}
      <div className="border-t border-zinc-800 pt-3">
        <div className="font-mono text-[10px] uppercase tracking-wide text-zinc-600 mb-1.5">
          {isEs ? 'Miembros' : 'Members'}
        </div>
        <ul className="space-y-0.5">
          {memberNames.slice(0, 3).map((name) => (
            <li
              key={name}
              className="text-xs text-zinc-300 truncate"
              title={name}
            >
              {ring.dominantVendor === name && (
                <span className="inline-block w-1 h-1 rounded-full bg-amber-400 mr-1.5 align-middle" />
              )}
              {name}
            </li>
          ))}
          {memberNames.length > 3 && (
            <li className="text-[11px] text-zinc-500">
              + {memberNames.length - 3} {isEs ? 'más' : 'more'}
            </li>
          )}
        </ul>
      </div>
    </button>
  )
}

function RingCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <Skeleton className="h-3 w-32 mb-3" />
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-2 w-full mb-3" />
      <Skeleton className="h-2 w-full mb-4" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filters (for Act II connections table)
// ---------------------------------------------------------------------------

function Filters({
  flaggedOnly,
  setFlaggedOnly,
  minShared,
  setMinShared,
  sortBy,
  setSortBy,
  onReset,
}: {
  flaggedOnly: boolean
  setFlaggedOnly: (v: boolean) => void
  minShared: number
  setMinShared: (v: number) => void
  sortBy: SortField
  setSortBy: (v: SortField) => void
  onReset: () => void
}) {
  const { t } = useTranslation('collusion')

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="sr-only peer"
            aria-label={t('filters.showFlaggedOnly')}
          />
          <div className="w-9 h-5 bg-zinc-800 border border-zinc-700 rounded-full peer peer-checked:bg-red-700 peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-zinc-400">{t('filters.showFlaggedOnly')}</span>
      </label>

      <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

      <div className="flex items-center gap-2">
        <label
          htmlFor="min-shared-input"
          className="text-xs text-zinc-500 whitespace-nowrap font-mono uppercase tracking-wide"
        >
          {t('filters.minShared')}
        </label>
        <input
          id="min-shared-input"
          type="number"
          min={1}
          max={500}
          value={minShared}
          onChange={(e) => setMinShared(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm font-mono px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

      <div className="flex items-center gap-2">
        <label
          htmlFor="sort-select"
          className="text-xs text-zinc-500 whitespace-nowrap font-mono uppercase tracking-wide"
        >
          {t('filters.sortBy')}
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="shared_procedures">{t('filters.sortShared')}</option>
          <option value="co_bid_rate">{t('filters.sortRate')}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto text-[10px] font-mono uppercase tracking-wide text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {t('filters.reset')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Connection Row — Act II: evidence of ring membership
// ---------------------------------------------------------------------------

function ConnectionRow({
  pair,
  ringLabel,
  ringId,
  maxShared,
  onViewContracts,
  onViewRing,
  isEs,
}: {
  pair: CollusionPair
  ringLabel: string | null
  ringId: string | null
  maxShared: number
  onViewContracts: (a: number, b: number, an: string, bn: string) => void
  onViewRing: (ringId: string) => void
  isEs: boolean
}) {
  const rate = pair.co_bid_rate
  const isHigh = rate >= 80
  const isMid = rate >= 50
  const accentColor = isHigh ? '#f87171' : isMid ? '#fb923c' : '#fbbf24'
  const accentBar = isHigh
    ? 'bg-red-500'
    : isMid
    ? 'bg-orange-500'
    : 'bg-amber-500'

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors px-4 py-3 overflow-hidden">
      <div
        className={`absolute left-0 top-0 bottom-0 w-[2px] ${accentBar}`}
        aria-hidden="true"
      />

      {/* Vendor names */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          {pair.is_potential_collusion && (
            <AlertTriangle
              className="h-3 w-3 text-red-400 shrink-0"
              aria-hidden="true"
            />
          )}
          {ringLabel && (
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-amber-400/80 shrink-0">
              {ringLabel}
            </span>
          )}
        </div>
        <div
          className="text-xs text-zinc-200 truncate leading-snug"
          title={pair.vendor_name_a}
        >
          {pair.vendor_name_a}
        </div>
        <div
          className="text-xs text-zinc-400 truncate leading-snug"
          title={pair.vendor_name_b}
        >
          <span className="text-zinc-600 mr-1">↔</span>
          {pair.vendor_name_b}
        </div>
      </div>

      {/* Shared procedures DotBar */}
      <div className="hidden sm:block shrink-0 w-28">
        <div className="font-mono text-[9px] uppercase tracking-wide text-zinc-600 mb-1">
          {isEs ? 'Compartidos' : 'Shared'}
        </div>
        <DotBar
          value={pair.shared_procedures}
          max={Math.max(1, maxShared)}
          color="#64748b"
          emptyColor="#2a2420"
          dots={15}
          size={5}
        />
        <div className="font-mono text-[10px] text-zinc-400 mt-1 tabular-nums">
          {formatNumber(pair.shared_procedures)}
        </div>
      </div>

      {/* Co-bid rate DotBar */}
      <div className="shrink-0 w-28">
        <div className="font-mono text-[9px] uppercase tracking-wide text-zinc-600 mb-1">
          {isEs ? 'Tasa co-lic.' : 'Co-bid rate'}
        </div>
        <DotBar
          value={rate}
          max={100}
          color={accentColor}
          emptyColor="#2a2420"
          dots={15}
          size={5}
        />
        <div
          className="font-mono text-[10px] mt-1 tabular-nums"
          style={{ color: accentColor }}
        >
          {rate.toFixed(0)}%
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() =>
            onViewContracts(
              pair.vendor_id_a,
              pair.vendor_id_b,
              pair.vendor_name_a,
              pair.vendor_name_b,
            )
          }
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
          title={isEs ? 'Ver contratos compartidos' : 'View shared contracts'}
          aria-label={isEs ? 'Ver contratos compartidos' : 'View shared contracts'}
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        {ringLabel && ringId && (
          <button
            type="button"
            onClick={() => {
              onViewRing(ringId)
              const el = document.getElementById('rings-section')
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="flex items-center gap-1 p-1.5 rounded text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 transition-colors text-[10px] font-mono uppercase tracking-wide"
            title={isEs ? 'Ver anillo completo' : 'View full ring'}
            aria-label={isEs ? 'Ver anillo completo' : 'View full ring'}
          >
            {isEs ? 'Anillo' : 'Ring'}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty / Error states
// ---------------------------------------------------------------------------

function EmptyState() {
  const { t } = useTranslation('collusion')
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <Users className="h-8 w-8 text-zinc-700 mx-auto mb-3" aria-hidden="true" />
      <p className="text-sm font-semibold text-zinc-300 mb-1">{t('empty.title')}</p>
      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
        {t('empty.body')}
      </p>
    </div>
  )
}

function ErrorState() {
  const { t } = useTranslation('collusion')
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle
        className="h-8 w-8 text-red-400 mx-auto mb-3"
        aria-hidden="true"
      />
      <p className="text-sm font-semibold text-red-300 mb-1">{t('error.title')}</p>
      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
        {t('error.body')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CollusionExplorer() {
  const { t, i18n } = useTranslation('collusion')
  const isEs = i18n.language === 'es'

  const [flaggedOnly, setFlaggedOnly] = useState(true)
  const [minShared, setMinShared] = useState(DEFAULT_MIN_SHARED)
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [selectedRingId, setSelectedRingId] = useState<string | null>(null)

  const [selectedPair, setSelectedPair] = useState<{
    vendorAId: number
    vendorBId: number
    vendorAName: string
    vendorBName: string
  } | null>(null)

  const handleViewContracts = useCallback(
    (a: number, b: number, an: string, bn: string) => {
      setSelectedPair({ vendorAId: a, vendorBId: b, vendorAName: an, vendorBName: bn })
    },
    [],
  )

  const handleFlaggedOnly = (v: boolean) => {
    setFlaggedOnly(v)
    setPage(1)
  }
  const handleMinShared = (v: number) => {
    setMinShared(v)
    setPage(1)
  }
  const handleSortBy = (v: SortField) => {
    setSortBy(v)
    setPage(1)
  }
  const handleReset = () => {
    setFlaggedOnly(true)
    setMinShared(DEFAULT_MIN_SHARED)
    setSortBy(DEFAULT_SORT)
    setPage(1)
    setSelectedRingId(null)
  }

  // Paginated query — feeds Act II (connections table)
  const queryParams = useMemo(
    () => ({
      is_potential_collusion: flaggedOnly ? true : undefined,
      min_shared_procedures: minShared,
      sort_by: sortBy,
      page,
      per_page: DEFAULT_PER_PAGE,
    }),
    [flaggedOnly, minShared, sortBy, page],
  )

  const {
    data: pairsData,
    isLoading: pairsLoading,
    isError: pairsError,
  } = useQuery({
    queryKey: ['collusion-pairs', queryParams],
    queryFn: () => collusionApi.getPairs(queryParams),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: stats, isLoading: statsLoading } = useQuery<CollusionStats>({
    queryKey: ['collusion-stats'],
    queryFn: () => collusionApi.getStats(),
    staleTime: 30 * 60 * 1000,
  })

  // Broad query for ring detection — client-side union-find.
  // Always flagged-only, always by co_bid_rate, large per_page so we capture enough
  // edges to discover multi-vendor rings even with sparse pair coverage.
  const { data: ringsData, isLoading: ringsLoading } = useQuery({
    queryKey: ['collusion-rings-source'],
    queryFn: () =>
      collusionApi.getPairs({
        is_potential_collusion: true,
        min_shared_procedures: 10,
        sort_by: 'co_bid_rate',
        page: 1,
        per_page: RINGS_FETCH_SIZE,
      }),
    staleTime: 30 * 60 * 1000,
  })

  const ringSourcePairs: CollusionPair[] = ringsData?.data ?? []

  // Build rings, filter to multi-member rings only, rank by (size × avg intensity)
  const rings: RingSummary[] = useMemo(() => {
    if (ringSourcePairs.length === 0) return []
    const grouped = buildRings(ringSourcePairs)
    const summaries: RingSummary[] = []
    for (const [id, pairs] of grouped) {
      const ring = summarizeRing(id, pairs)
      if (ring.members.size >= 3) summaries.push(ring) // a "ring" needs at least 3 members
    }
    // Rank: ring score = members^1.1 * avg_co_bid_rate
    summaries.sort(
      (a, b) =>
        Math.pow(b.members.size, 1.1) * b.avgCoBidRate -
        Math.pow(a.members.size, 1.1) * a.avgCoBidRate,
    )
    return summaries.slice(0, TOP_RINGS_SHOWN)
  }, [ringSourcePairs])

  const maxRingSize = useMemo(
    () => rings.reduce((m, r) => Math.max(m, r.members.size), 3),
    [rings],
  )

  // Build a vendor → ringId map so ConnectionRow can label each pair.
  // Only considers pairs within the top rings (others remain unlabeled).
  const vendorToRingLabel: Map<number, { ringId: string; label: string }> = useMemo(() => {
    const map = new Map<number, { ringId: string; label: string }>()
    rings.forEach((ring, idx) => {
      const label = `ANILLO ${String.fromCharCode(65 + idx)}`
      ring.members.forEach((vid) => {
        map.set(vid, { ringId: ring.id, label })
      })
    })
    return map
  }, [rings])

  const pairs: CollusionPair[] = pairsData?.data ?? []
  const pagination = pairsData?.pagination
  const totalPages = pagination?.total_pages ?? 1
  const total = pagination?.total ?? 0

  const maxSharedInPage = useMemo(
    () => pairs.reduce((m, p) => Math.max(m, p.shared_procedures), 1),
    [pairs],
  )

  const showingFrom = total === 0 ? 0 : (page - 1) * DEFAULT_PER_PAGE + 1
  const showingTo = Math.min(page * DEFAULT_PER_PAGE, total)

  const safeStats = stats

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <EditorialPageShell
          kicker={isEs ? 'ANÁLISIS DE REDES · DETECCIÓN DE ANILLOS DE COLUSIÓN' : 'NETWORK ANALYSIS · BID-RING DETECTION'}
          headline={
            isEs ? (
              <>
                Los pares son evidencia.{' '}
                <span style={{ color: 'var(--color-risk-critical)' }}>
                  Los anillos son la investigación.
                </span>
              </>
            ) : (
              <>
                Pairs are evidence.{' '}
                <span style={{ color: 'var(--color-risk-critical)' }}>
                  Rings are the investigation.
                </span>
              </>
            )
          }
          paragraph={isEs
            ? 'Un proveedor que licita repetidamente contra el mismo socio es una coincidencia. Tres o más proveedores que licitan en pares solapados — A con B, B con C, C con A — es una estructura. Agrupamos cada par marcado en componentes conectados: cada componente es un anillo de colusión. El anillo es la unidad de rendición de cuentas.'
            : 'A vendor bidding repeatedly against the same partner is a coincidence. Three or more vendors bidding in overlapping pairs — A with B, B with C, C with A — is a structure. We group every flagged pair into connected components: each component is a bid-ring. The ring is the unit of accountability.'}
          stats={
            statsLoading
              ? undefined
              : [
                  {
                    value: formatNumber(rings.length),
                    label: isEs ? 'Anillos detectados' : 'Rings detected',
                    color: 'var(--color-risk-critical)',
                    sub: isEs ? 'componentes ≥3 miembros' : 'components ≥3 members',
                  },
                  {
                    value: formatNumber(safeStats?.potential_collusion_count ?? 0),
                    label: isEs ? 'Conexiones sospechosas' : 'Suspicious connections',
                    sub: isEs ? 'pares marcados' : 'flagged pairs',
                  },
                  {
                    value: formatNumber(safeStats?.total_shared_procedures ?? 0),
                    label: isEs ? 'Procedimientos compartidos' : 'Shared procedures',
                  },
                  {
                    value: `${(safeStats?.max_co_bid_rate ?? 0).toFixed(0)}%`,
                    label: isEs ? 'Tasa máxima de co-licitación' : 'Max co-bidding rate',
                  },
                ]
          }
          loading={statsLoading}
          severity="high"
          meta={<>COMPRANET 2010&ndash;2025</>}
        >
          {/* ========================================================= */}
          {/* ACT I — LOS ANILLOS / THE RINGS                             */}
          {/* ========================================================= */}
          <section id="rings-section">
            <Act
              number="I"
              label={isEs ? 'LOS ANILLOS' : 'THE RINGS'}
              title={
                isEs
                  ? 'Los grupos conectados que emergen cuando se cuentan los pares.'
                  : 'The connected groups that emerge when pairs are counted.'
              }
            >
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-2xl">
                {isEs
                  ? 'Cada anillo es un componente conectado del grafo de co-licitación: si A+B y B+C aparecen como pares sospechosos, entonces A, B y C forman una estructura. Los ocho anillos más grandes, ordenados por tamaño ponderado por intensidad.'
                  : 'Each ring is a connected component of the co-bidding graph: if A+B and B+C appear as suspicious pairs, then A, B, and C form a structure. The eight largest rings, sorted by size weighted by intensity.'}
              </p>

              {ringsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <RingCardSkeleton key={i} />
                  ))}
                </div>
              ) : rings.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                  <p className="text-sm text-zinc-400">
                    {isEs
                      ? 'No se detectaron anillos con ≥3 miembros en los datos actuales.'
                      : 'No rings with ≥3 members detected in the current data.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rings.map((ring, idx) => (
                    <RingCard
                      key={ring.id}
                      ring={ring}
                      index={idx}
                      maxSize={maxRingSize}
                      onSelect={(id) =>
                        setSelectedRingId((prev) => (prev === id ? null : id))
                      }
                      isSelected={selectedRingId === ring.id}
                      isEs={isEs}
                    />
                  ))}
                </div>
              )}

              {/* Pattern glossary — inline, compact */}
              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
                  {isEs ? 'PATRONES DETECTADOS' : 'PATTERNS DETECTED'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['rotation', 'cover', 'mixed', 'unknown'] as const).map((kind) => {
                    const meta = buildPatternMeta(isEs)[kind]
                    const Icon = meta.icon
                    return (
                      <div key={kind} className="flex items-start gap-2">
                        <Icon
                          className={`h-3.5 w-3.5 ${meta.color} shrink-0 mt-0.5`}
                          aria-hidden="true"
                        />
                        <div>
                          <div className={`text-xs font-semibold ${meta.color}`}>
                            {meta.label}
                          </div>
                          <div className="text-[11px] text-zinc-500 leading-relaxed">
                            {meta.desc}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Act>
          </section>

          <div className="h-10" />

          {/* ========================================================= */}
          {/* ACT II — LAS CONEXIONES / THE CONNECTIONS                   */}
          {/* ========================================================= */}
          <Act
            number="II"
            label={isEs ? 'LAS CONEXIONES' : 'THE CONNECTIONS'}
            title={
              isEs
                ? 'Cada conexión es una arista del grafo. Así se construyen los anillos.'
                : 'Each connection is an edge in the graph. This is how rings are built.'
            }
          >
            <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-2xl">
              {isEs
                ? 'Cada fila es un par de proveedores que co-licitan por encima del umbral. Los pares etiquetados pertenecen a uno de los anillos identificados arriba; los demás son conexiones periféricas que aún no forman una estructura de tres o más.'
                : 'Each row is a pair of vendors that co-bid above the threshold. Tagged pairs belong to one of the rings identified above; the others are peripheral connections that do not yet form a structure of three or more.'}
            </p>

            <Filters
              flaggedOnly={flaggedOnly}
              setFlaggedOnly={handleFlaggedOnly}
              minShared={minShared}
              setMinShared={handleMinShared}
              sortBy={sortBy}
              setSortBy={handleSortBy}
              onReset={handleReset}
            />

            {!pairsLoading && !pairsError && total > 0 && (
              <p
                className="text-[10px] font-mono uppercase tracking-wide text-zinc-600 mb-4"
                aria-live="polite"
              >
                {t('pagination.showing', {
                  from: showingFrom,
                  to: showingTo,
                  total: formatNumber(total),
                })}
              </p>
            )}

            {pairsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : pairsError ? (
              <ErrorState />
            ) : pairs.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {pairs.map((pair) => {
                  const ringInfoA = vendorToRingLabel.get(pair.vendor_id_a)
                  const ringInfoB = vendorToRingLabel.get(pair.vendor_id_b)
                  // Prefer a shared ring label if both vendors are in the same ring
                  const sharedRing =
                    ringInfoA && ringInfoB && ringInfoA.ringId === ringInfoB.ringId
                      ? ringInfoA
                      : null
                  return (
                    <ConnectionRow
                      key={`${pair.vendor_id_a}-${pair.vendor_id_b}`}
                      pair={pair}
                      ringLabel={sharedRing?.label ?? null}
                      ringId={sharedRing?.ringId ?? null}
                      maxShared={maxSharedInPage}
                      onViewContracts={handleViewContracts}
                      onViewRing={(id) => setSelectedRingId(id)}
                      isEs={isEs}
                    />
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div
                className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-800"
                role="navigation"
                aria-label="Pagination"
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('pagination.previous')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('pagination.previous')}
                </button>

                <span
                  className="text-[10px] font-mono text-zinc-600"
                  aria-live="polite"
                >
                  {t('pagination.pageOf', { page, total: totalPages })}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('pagination.next')}
                >
                  {t('pagination.next')}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </Act>

          <div className="h-10" />

          {/* ========================================================= */}
          {/* ACT III — METODOLOGÍA / METHODOLOGY                         */}
          {/* ========================================================= */}
          <Act
            number="III"
            label={isEs ? 'METODOLOGÍA' : 'METHODOLOGY'}
            title={isEs ? 'Cómo construimos los anillos.' : 'How we build the rings.'}
          >
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-4">
              <p className="text-sm text-zinc-200 leading-relaxed mb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber-400 block mb-2">
                  {isEs ? 'HALLAZGO' : 'FINDING'}
                </span>
                {isEs
                  ? 'Un par de proveedores que co-licitan al 80% es sospechoso. Pero es un anillo de 5 proveedores — donde cada uno se empareja con todos los demás por encima del umbral — el que constituye evidencia estructural de coordinación.'
                  : 'A pair of vendors co-bidding at 80% is suspicious. But a ring of 5 vendors — where each one pairs with all the others above the threshold — is what constitutes structural evidence of coordination.'}
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {isEs ? (
                  <>
                    Tomamos los 300 pares con mayor tasa de co-licitación (flagged,
                    ≥10 procedimientos compartidos), los tratamos como aristas de un
                    grafo, y aplicamos <em>union-find</em> para identificar los
                    componentes conectados. Cada componente con ≥3 miembros se
                    presenta como un anillo. El patrón (rotación, cobertura, mixto)
                    se infiere comparando los volúmenes de licitación relativos de los
                    miembros — sin datos de institución, solo la aritmética del grafo.
                  </>
                ) : (
                  <>
                    We take the top 300 pairs by co-bidding rate (flagged,
                    ≥10 shared procedures), treat them as edges of a
                    graph, and apply <em>union-find</em> to identify the
                    connected components. Each component with ≥3 members is
                    presented as a ring. The pattern (rotation, cover, mixed)
                    is inferred by comparing members&apos; relative bidding volumes —
                    no institution data, just the arithmetic of the graph.
                  </>
                )}
              </p>
            </div>

            <details className="group">
              <summary className="cursor-pointer list-none flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-300 transition-colors select-none">
                <span className="group-open:rotate-90 transition-transform inline-block">
                  ▶
                </span>
                {t('methodology.title')}
              </summary>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {t('methodology.body')}
                </p>
              </div>
            </details>

            <p className="text-[10px] text-zinc-700 mt-8 text-center">
              COMPRANET 2010-2025 · co_bidding_stats · RUBLI v0.6.5
            </p>
          </Act>
        </EditorialPageShell>
      </div>

      {selectedPair && (
        <SharedContractsModal
          vendorAId={selectedPair.vendorAId}
          vendorBId={selectedPair.vendorBId}
          vendorAName={selectedPair.vendorAName}
          vendorBName={selectedPair.vendorBName}
          onClose={() => setSelectedPair(null)}
        />
      )}
    </div>
  )
}
