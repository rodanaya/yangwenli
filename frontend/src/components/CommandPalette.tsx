/**
 * Command Palette — Section 4.4 upgrade
 * Centered modal (Cmd+K) with federated search + quick navigation actions.
 * Section 5 addition: saved searches (localStorage, max 8).
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, BarChart3, BookOpen, Building2, FileText, Filter,
  FlaskConical, GitBranch, Globe, LayoutDashboard, Network, Scale,
  Shield, TrendingUp, Users, Zap, Bookmark, X as XIcon,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { searchApi } from '@/api/client'
import { useDebouncedValue } from '@/hooks/useDebouncedSearch'
import { useSavedSearches } from '@/hooks/useSavedSearches'
import { RISK_COLORS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Quick-action definitions
// ---------------------------------------------------------------------------

interface QuickAction {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  href: string
  shortcut?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'dashboard',    label: 'Dashboard',                icon: LayoutDashboard, href: '/',                                  shortcut: 'G D' },
  { id: 'contracts',    label: 'Contracts',                description: 'Browse 3.1M contracts', icon: FileText,              href: '/contracts',                         shortcut: 'G C' },
  { id: 'vendors',      label: 'Explore Vendors',          icon: Users,           href: '/explore?tab=vendors',               shortcut: 'G V' },
  { id: 'institutions', label: 'Explore Institutions',     icon: Building2,       href: '/explore?tab=institutions',          shortcut: 'G I' },
  { id: 'sectors',      label: 'Sectors Overview',         icon: BarChart3,       href: '/sectors',                          shortcut: 'G S' },
  { id: 'network',      label: 'Network Graph',            icon: Network,         href: '/network',                          shortcut: 'G N' },
  { id: 'workspace',    label: 'Workspace / Watchlist',    icon: Shield,          href: '/workspace',                        shortcut: 'G W' },
  { id: 'cases',        label: 'Case Library',             icon: BookOpen,        href: '/cases',                            shortcut: 'G L' },
  { id: 'intelligence', label: 'Procurement Intelligence', icon: Zap,             href: '/procurement-intelligence' },
  { id: 'temporal',     label: 'Temporal Patterns',        icon: GitBranch,       href: '/administrations' },
  { id: 'methodology',  label: 'Risk Methodology',         icon: FlaskConical,    href: '/methodology' },
  { id: 'model',        label: 'Model Transparency',       icon: Scale,           href: '/model' },
  { id: 'ground-truth', label: 'Ground Truth Cases',       icon: Globe,           href: '/ground-truth' },
]

// Research actions — shown when palette opens with no query
const RESEARCH_ACTIONS: QuickAction[] = [
  {
    id: 'critical-contracts',
    label: 'Show critical risk contracts',
    description: 'Contracts with risk score >= 0.50',
    icon: AlertTriangle,
    href: '/contracts?risk_level=critical',
  },
  {
    id: 'single-bid-contracts',
    label: 'Single bid contracts',
    description: 'Competitive procedures with only 1 bidder',
    icon: Filter,
    href: '/contracts?is_single_bid=true',
  },
  {
    id: 'compare-sectors',
    label: 'Compare sectors',
    description: 'Risk and spend side-by-side across all 12 sectors',
    icon: BarChart3,
    href: '/sectors',
  },
  {
    id: 'top-risk-vendors',
    label: 'Top risk vendors',
    description: 'Vendors ranked by average risk score',
    icon: TrendingUp,
    href: '/explore?tab=vendors&sort_by=risk_score',
  },
  {
    id: 'imss-vendors',
    label: 'IMSS vendor investigation',
    description: 'Vendors contracted by IMSS',
    icon: Users,
    href: '/explore?tab=vendors&search=IMSS',
  },
]

// Suggested search terms shown in idle state
const SUGGESTED_SEARCHES = [
  { label: 'RFC: search by tax ID', query: '' },
  { label: 'PEMEX', query: 'PEMEX' },
  { label: 'Segalmex', query: 'Segalmex' },
  { label: 'IMSS', query: 'IMSS' },
  { label: 'single bid', query: 'single bid' },
  { label: 'CFE', query: 'CFE' },
]

const SAVED_SEARCHES_KEY = 'rubli_saved_searches'

// ---------------------------------------------------------------------------
// Risk level pill
// ---------------------------------------------------------------------------

function RiskPill({ level }: { level: string }) {
  const color = RISK_COLORS[level as keyof typeof RISK_COLORS] ?? RISK_COLORS.low
  return (
    <span
      className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {level}
    </span>
  )
}

// Derive risk level from numeric score (same thresholds as constants.ts)
function riskLevelFromScore(score: number | null | undefined): string | null {
  if (score == null) return null
  if (score >= 0.5) return 'critical'
  if (score >= 0.3) return 'high'
  if (score >= 0.1) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const { items: savedSearches, save: saveSearch, remove: removeSavedSearch } = useSavedSearches(SAVED_SEARCHES_KEY)

  // Reset query when palette closes
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  // Federated search — only fires when query >= 2 chars
  const { data: results, isFetching } = useQuery({
    queryKey: ['cmd-search', debouncedQuery],
    queryFn: () => searchApi.federated(debouncedQuery, 5),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })

  const go = useCallback(
    (href: string) => {
      onOpenChange(false)
      navigate(href)
    },
    [navigate, onOpenChange]
  )

  const applyQuery = useCallback((q: string) => {
    setQuery(q)
  }, [])

  const handleSaveSearch = useCallback(() => {
    if (!query.trim()) return
    saveSearch(query.trim(), query.trim())
  }, [query, saveSearch])

  // Filter quick actions by query (client-side)
  const filteredActions =
    query.length > 0
      ? QUICK_ACTIONS.filter(
          (a) =>
            a.label.toLowerCase().includes(query.toLowerCase()) ||
            a.description?.toLowerCase().includes(query.toLowerCase())
        )
      : QUICK_ACTIONS

  const hasResults =
    results &&
    (results.vendors.length > 0 ||
      results.institutions.length > 0 ||
      results.contracts.length > 0 ||
      results.cases.length > 0)

  const isIdle = query.length === 0
  const hasSavedSearches = savedSearches.length > 0

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* ── Saved search chips (shown when there are saved searches) ── */}
      {hasSavedSearches && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-1 border-b border-border/30">
          <Bookmark className="h-3 w-3 text-text-muted shrink-0" aria-hidden="true" />
          {savedSearches.map((s, i) => (
            <span
              key={`${s.value}-${i}`}
              className="flex items-center gap-1 text-[11px] bg-accent/10 text-accent border border-accent/20 rounded-full px-2 py-0.5 max-w-[120px]"
            >
              <button
                type="button"
                className="truncate hover:underline focus:outline-none"
                onClick={() => applyQuery(s.value)}
                aria-label={`Apply saved search: ${s.label}`}
                title={s.label}
              >
                {s.label}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeSavedSearch(i)
                }}
                className="shrink-0 opacity-60 hover:opacity-100 focus:outline-none"
                aria-label={`Remove saved search: ${s.label}`}
              >
                <XIcon className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <CommandInput
        placeholder="Search vendors, RFC, contracts, cases… or navigate"
        value={query}
        onValueChange={setQuery}
      />

      {/* ── Save current search button ── */}
      {query.trim().length > 0 && (
        <div className="flex items-center justify-end px-3 py-1 border-b border-border/30">
          <button
            type="button"
            onClick={handleSaveSearch}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors"
            aria-label={`Save search "${query}"`}
          >
            <Bookmark className="h-3 w-3" aria-hidden="true" />
            Save this search
          </button>
        </div>
      )}

      <CommandList>
        {/* ── Loading indicator ── */}
        {isFetching && debouncedQuery.length >= 2 && (
          <div className="flex items-center justify-center py-3 text-xs text-text-muted gap-1.5">
            <span className="animate-pulse">Searching…</span>
          </div>
        )}

        {/* ── No results ── */}
        {!isFetching && debouncedQuery.length >= 2 && !hasResults && filteredActions.length === 0 && (
          <CommandEmpty>No results for "{query}"</CommandEmpty>
        )}

        {/* ── Idle state: suggested searches + research actions ── */}
        {isIdle && (
          <>
            <CommandGroup heading="Suggested searches">
              {SUGGESTED_SEARCHES.map((s) => (
                <CommandItem
                  key={s.label}
                  value={`suggest-${s.label}`}
                  onSelect={() => {
                    if (s.query) {
                      applyQuery(s.query)
                    } else {
                      applyQuery('')
                    }
                  }}
                  className="gap-2 text-text-muted"
                >
                  <span className="text-xs font-mono bg-background-elevated px-1.5 py-0.5 rounded border border-border/30 shrink-0">
                    {s.query || 'RFC'}
                  </span>
                  <span className="text-sm">{s.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Research actions">
              {RESEARCH_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <CommandItem
                    key={action.id}
                    value={`research-${action.id}-${action.label}`}
                    onSelect={() => go(action.href)}
                    className="gap-2"
                  >
                    <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span>{action.label}</span>
                    {action.description && (
                      <span className="text-xs text-text-muted ml-1">{action.description}</span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>

            <CommandSeparator />
          </>
        )}

        {/* ── Entity results (ranked by risk level via backend ORDER BY) ── */}
        {hasResults && (
          <>
            {results!.vendors.length > 0 && (
              <CommandGroup heading="Vendors">
                {results!.vendors.map((v) => {
                  const riskLevel = riskLevelFromScore(v.risk_score)
                  return (
                    <CommandItem
                      key={`v-${v.id}`}
                      value={`vendor-${v.id}-${v.name}`}
                      onSelect={() => go(`/vendors/${v.id}`)}
                      className="gap-2"
                    >
                      <Users className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span className="truncate">{v.name}</span>
                      {v.rfc && <span className="text-xs font-mono text-text-muted ml-1 shrink-0">{v.rfc}</span>}
                      {riskLevel && riskLevel !== 'low' && <RiskPill level={riskLevel} />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {results!.institutions.length > 0 && (
              <CommandGroup heading="Institutions">
                {results!.institutions.map((inst) => (
                  <CommandItem
                    key={`i-${inst.id}`}
                    value={`institution-${inst.id}-${inst.name}`}
                    onSelect={() => go(`/institutions/${inst.id}`)}
                    className="gap-2"
                  >
                    <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="truncate">{inst.name}</span>
                    {inst.institution_type && (
                      <span className="text-xs text-text-muted ml-1 shrink-0">{inst.institution_type.replace(/_/g, ' ')}</span>
                    )}
                    {inst.total_contracts != null && (
                      <span className="ml-auto text-xs font-mono text-text-muted shrink-0">
                        {inst.total_contracts.toLocaleString()} contracts
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results!.contracts.length > 0 && (
              <CommandGroup heading="Contracts — highest risk first">
                {results!.contracts.map((c) => (
                  <CommandItem
                    key={`c-${c.id}`}
                    value={`contract-${c.id}-${c.title}`}
                    onSelect={() => go(`/contracts?search=${encodeURIComponent(c.title)}`)}
                    className="gap-2"
                  >
                    <FileText className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="truncate flex-1">{c.title}</span>
                    {c.year && <span className="text-xs text-text-muted shrink-0">{c.year}</span>}
                    {c.risk_level && <RiskPill level={c.risk_level} />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results!.cases.length > 0 && (
              <CommandGroup heading="Cases">
                {results!.cases.map((cs) => (
                  <CommandItem
                    key={`cs-${cs.slug}`}
                    value={`case-${cs.slug}-${cs.title}`}
                    onSelect={() => go(`/cases/${cs.slug}`)}
                    className="gap-2"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="truncate flex-1">{cs.title}</span>
                    {cs.sector && <span className="text-xs text-text-muted shrink-0">{cs.sector}</span>}
                    {cs.year && <span className="text-xs text-text-muted shrink-0">{cs.year}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />
          </>
        )}

        {/* ── Quick navigation actions ── */}
        {filteredActions.length > 0 && (
          <CommandGroup heading={debouncedQuery.length >= 2 && hasResults ? 'Pages' : 'Go to'}>
            {filteredActions.map((action) => {
              const Icon = action.icon
              return (
                <CommandItem
                  key={action.id}
                  value={`nav-${action.id}-${action.label}`}
                  onSelect={() => go(action.href)}
                  className="gap-2"
                >
                  <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <span>{action.label}</span>
                  {action.description && (
                    <span className="text-xs text-text-muted ml-1">{action.description}</span>
                  )}
                  {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer hint — hidden on mobile to avoid overflow */}
      <div className="hidden md:flex border-t border-border/40 px-3 py-2 items-center gap-3 text-[10px] text-text-muted">
        <span><kbd className="px-1 py-0.5 rounded bg-background-elevated border border-border/40 font-mono">↑↓</kbd> navigate</span>
        <span><kbd className="px-1 py-0.5 rounded bg-background-elevated border border-border/40 font-mono">↵</kbd> select</span>
        <span><kbd className="px-1 py-0.5 rounded bg-background-elevated border border-border/40 font-mono">Esc</kbd> close</span>
        <span className="ml-auto">Tip: type an RFC (e.g. <kbd className="px-1 py-0.5 rounded bg-background-elevated border border-border/40 font-mono">ABC123456789</kbd>) to find a vendor</span>
      </div>
    </CommandDialog>
  )
}
