/**
 * ARIA Intelligence Briefing
 *
 * A published intelligence product — not a work queue.
 * The ARIA pipeline is run by the team; results are showcased here
 * as curated investigation leads with pre-generated editorial memos.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { PageHeader } from '@/components/layout/PageHeader'
import { ariaApi } from '@/api/client'
import type { AriaQueueItem, AriaStatsResponse } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Sparkles,
  FileText,
  Building2,
} from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

const PATTERN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  P1: { label: 'Monopoly',      color: 'text-red-300',    bg: 'bg-red-950/60',    border: 'border-red-800' },
  P2: { label: 'Ghost Co.',     color: 'text-purple-300', bg: 'bg-purple-950/60', border: 'border-purple-800' },
  P3: { label: 'Intermediary',  color: 'text-orange-300', bg: 'bg-orange-950/60', border: 'border-orange-800' },
  P4: { label: 'Bid Rigging',   color: 'text-yellow-300', bg: 'bg-yellow-950/60', border: 'border-yellow-800' },
  P5: { label: 'Overpricing',   color: 'text-blue-300',   bg: 'bg-blue-950/60',   border: 'border-blue-800' },
  P6: { label: 'Inst. Capture', color: 'text-pink-300',   bg: 'bg-pink-950/60',   border: 'border-pink-800' },
  P7: { label: 'Conflict',      color: 'text-gray-300',   bg: 'bg-gray-800/60',   border: 'border-gray-700' },
}

const IPS_COLOR = (score: number) => {
  if (score >= 0.75) return 'bg-red-500'
  if (score >= 0.50) return 'bg-orange-500'
  if (score >= 0.30) return 'bg-yellow-500'
  return 'bg-blue-500'
}

// ============================================================================
// Sub-components
// ============================================================================

function IpsBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', IPS_COLOR(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text-muted w-8 text-right">{pct}</span>
    </div>
  )
}

function PatternPill({ pattern }: { pattern: string | null }) {
  if (!pattern || !PATTERN_META[pattern]) return null
  const meta = PATTERN_META[pattern]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border', meta.bg, meta.color, meta.border)}>
      {meta.label}
    </span>
  )
}

function NewVendorBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-950/60 text-purple-300 border border-purple-800">
      <Sparkles className="h-3 w-3" />
      NEW
    </span>
  )
}

// ============================================================================
// Spotlight Card — editorial Tier 1 card
// ============================================================================

function SpotlightCard({ item, index }: { item: AriaQueueItem; index: number }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const ips = item.ips_final ?? 0
  const value = item.total_value_mxn ?? 0
  const contracts = item.total_contracts ?? 0
  const memo = item.memo_text ?? ''
  const memoSnippet = memo.length > 0
    ? memo.slice(0, 220).replace(/^#{1,3}\s+.+\n?/, '').trim()
    : null

  return (
    <motion.div variants={staggerItem}>
      <Card className="border border-surface-3 bg-surface-1 hover:border-accent/40 transition-colors group h-full flex flex-col">
        <CardContent className="p-5 flex flex-col gap-3 flex-1">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-xs font-mono text-text-muted">#{index + 1}</span>
                <PatternPill pattern={item.primary_pattern ?? null} />
                {item.new_vendor_risk && <NewVendorBadge />}
                {item.is_efos_definitivo && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-950/60 text-red-300 border border-red-800">
                    EFOS
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2">
                {item.vendor_name}
              </h3>
              {item.top_institution && (
                <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.top_institution}</span>
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold font-mono text-text-primary">
                {Math.round(ips * 100)}
              </div>
              <div className="text-xs text-text-muted">IPS</div>
            </div>
          </div>

          {/* IPS bar */}
          <IpsBar score={ips} />

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-surface-2 rounded p-2">
              <div className="text-text-muted mb-0.5">Total Value</div>
              <div className="font-semibold text-text-primary">{formatCompactMXN(value)}</div>
            </div>
            <div className="bg-surface-2 rounded p-2">
              <div className="text-text-muted mb-0.5">Contracts</div>
              <div className="font-semibold text-text-primary">{formatNumber(contracts)}</div>
            </div>
            {item.avg_risk_score != null && (
              <div className="bg-surface-2 rounded p-2">
                <div className="text-text-muted mb-0.5">Avg Risk</div>
                <div className="font-semibold text-text-primary">
                  {(item.avg_risk_score * 100).toFixed(0)}%
                </div>
              </div>
            )}
            {item.direct_award_rate != null && (
              <div className="bg-surface-2 rounded p-2">
                <div className="text-text-muted mb-0.5">Direct Award</div>
                <div className="font-semibold text-text-primary">
                  {(item.direct_award_rate * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>

          {/* Memo excerpt */}
          {memoSnippet && (
            <div className="border-t border-surface-3 pt-3">
              <p className="text-xs text-text-secondary italic leading-relaxed line-clamp-3">
                "{memoSnippet}…"
              </p>
            </div>
          )}

          {/* Full memo expandable */}
          {memo.length > 220 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 self-start"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Less' : 'Full memo'}
            </button>
          )}
          {expanded && memo && (
            <div className="border border-surface-3 rounded p-3 bg-surface-2 text-xs text-text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {memo}
            </div>
          )}

          {/* Red Thread CTA */}
          <div className="mt-auto pt-2 border-t border-surface-3">
            <button
              onClick={() => navigate(`/vendors/${item.vendor_id}`)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 py-1.5 rounded hover:bg-accent/10 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Investigate vendor
              <ExternalLink className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Lead Row — compact expandable table row for Tier 2-4
// ============================================================================

function LeadRow({
  item,
  expanded,
  onToggle,
}: {
  item: AriaQueueItem
  expanded: boolean
  onToggle: () => void
}) {
  const navigate = useNavigate()
  const ips = item.ips_final ?? 0

  return (
    <>
      <tr
        className={cn(
          'border-b border-surface-3 hover:bg-surface-2/50 cursor-pointer transition-colors text-sm',
          expanded && 'bg-surface-2/30'
        )}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-text-muted shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-text-muted shrink-0" />
            )}
            <span className="font-medium text-text-primary line-clamp-1">{item.vendor_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="flex flex-wrap gap-1">
            <PatternPill pattern={item.primary_pattern ?? null} />
            {item.new_vendor_risk && <NewVendorBadge />}
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-text-secondary">
          {formatCompactMXN(item.total_value_mxn ?? 0)}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <IpsBar score={ips} />
        </td>
        <td className="px-4 py-3">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/vendors/${item.vendor_id}`) }}
            className="text-accent hover:text-accent/80 p-1 rounded hover:bg-accent/10 transition-colors"
            aria-label="View vendor"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-surface-3 bg-surface-2/20">
          <td colSpan={5} className="px-6 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-2">
              <div>
                <span className="text-text-muted">Contracts: </span>
                <span className="text-text-primary font-medium">{formatNumber(item.total_contracts ?? 0)}</span>
              </div>
              {item.avg_risk_score != null && (
                <div>
                  <span className="text-text-muted">Avg Risk: </span>
                  <span className="text-text-primary font-medium">{(item.avg_risk_score * 100).toFixed(0)}%</span>
                </div>
              )}
              {item.direct_award_rate != null && (
                <div>
                  <span className="text-text-muted">Direct Award: </span>
                  <span className="text-text-primary font-medium">{(item.direct_award_rate * 100).toFixed(0)}%</span>
                </div>
              )}
              {item.top_institution && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-text-muted">Institution: </span>
                  <span className="text-text-primary font-medium">{item.top_institution}</span>
                </div>
              )}
            </div>
            {item.memo_text && (
              <p className="text-xs text-text-secondary italic leading-relaxed border-t border-surface-3 pt-2 line-clamp-3">
                "{item.memo_text.slice(0, 300).replace(/^#{1,3}\s+.+\n?/, '').trim()}…"
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <Card className="border border-surface-3 bg-surface-1">
      <CardContent className="p-5 flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', accent ?? 'bg-accent/10')}>
          <Icon className={cn('h-5 w-5', accent ? 'text-white' : 'text-accent')} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-0.5">{label}</div>
          <div className="text-xl font-bold text-text-primary font-mono">{value}</div>
          {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function AriaPage() {
  const [search, setSearch] = useState('')
  const [patternFilter, setPatternFilter] = useState<string | null>(null)
  const [newVendorOnly, setNewVendorOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const PER_PAGE = 50

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery<AriaStatsResponse>({
    queryKey: ['aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 5 * 60_000,
  })

  // Tier 1 spotlight
  const { data: tier1Data, isLoading: tier1Loading } = useQuery({
    queryKey: ['aria-queue', { tier: 1 }],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 12 }),
    staleTime: 5 * 60_000,
  })

  // Full leads table
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['aria-queue-leads', { page, search, patternFilter, newVendorOnly }],
    queryFn: () =>
      ariaApi.getQueue({
        page,
        per_page: PER_PAGE,
        search: search || undefined,
        pattern: patternFilter ?? undefined,
        new_vendor_only: newVendorOnly || undefined,
        tier: patternFilter || newVendorOnly || search ? undefined : 2, // default to tier 2+ when no filter
      }),
    staleTime: 2 * 60_000,
  })

  const totalLeads = leadsData?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalLeads / PER_PAGE)

  const patternCounts = stats?.pattern_counts ?? {}
  const efosCount = stats?.external_counts?.efos ?? 0
  const sfpCount = stats?.external_counts?.sfp ?? 0
  const elevatedValue = stats?.elevated_value_mxn ?? 0

  const tier1Items: AriaQueueItem[] = tier1Data?.data ?? []
  const leadsItems: AriaQueueItem[] = leadsData?.data ?? []

  const lastRunAt = stats?.latest_run?.completed_at
    ? new Date(stats.latest_run.completed_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-surface-0">
      <PageHeader
        title="ARIA Intelligence Briefing"
        subtitle="Automated Risk Investigation Algorithm — curated procurement risk intelligence"
        icon={Shield}
      />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Hero Stats ── */}
        <section>
          {lastRunAt && (
            <p className="text-xs text-text-muted mb-4 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Last pipeline run: {lastRunAt}
            </p>
          )}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))
            ) : (
              <>
                <motion.div variants={staggerItem}>
                  <StatCard
                    icon={Shield}
                    label="Total Leads"
                    value={formatNumber(stats?.queue_total ?? 0)}
                    sub="vendors in pipeline"
                    accent="bg-red-600"
                  />
                </motion.div>
                <motion.div variants={staggerItem}>
                  <StatCard
                    icon={DollarSign}
                    label="Elevated Value"
                    value={formatCompactMXN(elevatedValue)}
                    sub="Tier 1 + 2 combined"
                    accent="bg-orange-600"
                  />
                </motion.div>
                <motion.div variants={staggerItem}>
                  <StatCard
                    icon={AlertTriangle}
                    label="EFOS Listed"
                    value={formatNumber(efosCount)}
                    sub={`+ ${formatNumber(sfpCount)} SFP sanctioned`}
                    accent="bg-yellow-600"
                  />
                </motion.div>
                <motion.div variants={staggerItem}>
                  <StatCard
                    icon={Sparkles}
                    label="New Vendor Risk"
                    value={formatNumber(stats?.new_vendor_count ?? 0)}
                    sub="ghost company signals"
                    accent="bg-purple-600"
                  />
                </motion.div>
              </>
            )}
          </motion.div>
        </section>

        {/* ── Pattern Breakdown ── */}
        {Object.keys(patternCounts).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Filter by Pattern
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setPatternFilter(null); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  patternFilter === null
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface-2 text-text-secondary border-surface-3 hover:border-accent/50'
                )}
              >
                All
              </button>
              {Object.entries(patternCounts).map(([pattern, count]) => {
                const meta = PATTERN_META[pattern]
                if (!meta) return null
                return (
                  <button
                    key={pattern}
                    onClick={() => { setPatternFilter(patternFilter === pattern ? null : pattern); setPage(1) }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                      patternFilter === pattern
                        ? cn(meta.bg, meta.color, meta.border)
                        : 'bg-surface-2 text-text-secondary border-surface-3 hover:border-accent/50'
                    )}
                  >
                    <span>{pattern}</span>
                    <span className="font-semibold">{meta.label}</span>
                    <span className="opacity-60">({formatNumber(count)})</span>
                  </button>
                )
              })}
              <button
                onClick={() => { setNewVendorOnly(!newVendorOnly); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                  newVendorOnly
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                    : 'bg-surface-2 text-text-secondary border-surface-3 hover:border-accent/50'
                )}
              >
                <Sparkles className="h-3 w-3" />
                New Vendor Risk
                {stats?.new_vendor_count ? <span className="opacity-60">({formatNumber(stats.new_vendor_count)})</span> : null}
              </button>
            </div>
          </section>
        )}

        {/* ── Tier 1 Spotlight ── */}
        {!patternFilter && !newVendorOnly && !search && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-400" />
                  Critical Leads — Tier 1
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Highest-priority vendors by Investigation Priority Score
                </p>
              </div>
            </div>

            {tier1Loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : tier1Items.length === 0 ? (
              <Card className="border border-surface-3 bg-surface-1">
                <CardContent className="p-8 text-center text-text-muted">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No Tier 1 leads found. Run the ARIA pipeline to populate.</p>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {tier1Items.map((item, i) => (
                  <SpotlightCard key={item.vendor_id} item={item} index={i} />
                ))}
              </motion.div>
            )}
          </section>
        )}

        {/* ── Full Leads Table ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Users className="h-5 w-5 text-text-muted" />
                {patternFilter || newVendorOnly || search ? 'Filtered Results' : 'All Leads'}
              </h2>
              {totalLeads > 0 && (
                <p className="text-xs text-text-muted mt-0.5">{formatNumber(totalLeads)} vendors</p>
              )}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search vendors…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-3 py-2 text-sm bg-surface-2 border border-surface-3 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/60 w-64"
              />
            </div>
          </div>

          <Card className="border border-surface-3 bg-surface-1 overflow-hidden">
            {leadsLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
            ) : leadsItems.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No leads match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-2/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                        Vendor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide hidden md:table-cell">
                        Pattern
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide hidden sm:table-cell">
                        Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide hidden lg:table-cell w-36">
                        IPS
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {leadsItems.map((item) => (
                      <LeadRow
                        key={item.vendor_id}
                        item={item}
                        expanded={expandedId === item.vendor_id}
                        onToggle={() =>
                          setExpandedId(expandedId === item.vendor_id ? null : item.vendor_id)
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm border border-surface-3 rounded-lg text-text-secondary hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm border border-surface-3 rounded-lg text-text-secondary hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* ── Methodology Note ── */}
        <section>
          <Card className="border border-surface-3 bg-surface-1">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                <div className="text-xs text-text-muted space-y-1">
                  <p className="font-semibold text-text-secondary">About ARIA</p>
                  <p>
                    The Automated Risk Investigation Algorithm (ARIA) combines ML risk scores, anomaly detection,
                    pattern classification, and external registry cross-referencing (EFOS, SFP, RUPC) to rank
                    vendors by Investigation Priority Score (IPS). Editorial memos are pre-generated by the
                    analysis team using LLM-assisted synthesis of procurement signals.
                  </p>
                  <p>
                    IPS scores are risk indicators, not corruption verdicts. High scores indicate statistical
                    similarity to documented corruption patterns and warrant further investigation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  )
}
