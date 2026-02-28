/**
 * Command Palette — Section 4.4 upgrade
 * Centered modal (Cmd+K) with federated search + quick navigation actions.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, BookOpen, Building2, FileText, FlaskConical,
  GitBranch, Globe, LayoutDashboard, Network, Scale,
  Shield, Users, Zap,
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
  { id: 'dashboard',    label: 'Dashboard',              icon: LayoutDashboard, href: '/',                       shortcut: 'G D' },
  { id: 'contracts',    label: 'Contracts',              description: 'Browse 3.1M contracts', icon: FileText,  href: '/contracts',      shortcut: 'G C' },
  { id: 'vendors',      label: 'Explore Vendors',        icon: Users,           href: '/explore?tab=vendors' },
  { id: 'institutions', label: 'Explore Institutions',   icon: Building2,       href: '/explore?tab=institutions' },
  { id: 'sectors',      label: 'Sectors Overview',       icon: BarChart3,       href: '/sectors' },
  { id: 'network',      label: 'Network Graph',          icon: Network,         href: '/network' },
  { id: 'workspace',    label: 'Workspace / Watchlist',  icon: Shield,          href: '/workspace' },
  { id: 'cases',        label: 'Case Library',           icon: BookOpen,        href: '/cases' },
  { id: 'intelligence', label: 'Procurement Intelligence', icon: Zap,           href: '/intelligence' },
  { id: 'temporal',     label: 'Temporal Patterns',      icon: GitBranch,       href: '/temporal' },
  { id: 'methodology',  label: 'Risk Methodology',       icon: FlaskConical,    href: '/methodology' },
  { id: 'model',        label: 'Model Transparency',     icon: Scale,           href: '/model' },
  { id: 'ground-truth', label: 'Ground Truth Cases',     icon: Globe,           href: '/ground-truth' },
]

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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search vendors, contracts, cases… or navigate"
        value={query}
        onValueChange={setQuery}
      />
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

        {/* ── Entity results ── */}
        {hasResults && (
          <>
            {results!.vendors.length > 0 && (
              <CommandGroup heading="Vendors">
                {results!.vendors.map((v) => (
                  <CommandItem
                    key={`v-${v.id}`}
                    value={`vendor-${v.id}-${v.name}`}
                    onSelect={() => go(`/vendors/${v.id}`)}
                    className="gap-2"
                  >
                    <Users className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="truncate">{v.name}</span>
                    {v.rfc && <span className="text-xs font-mono text-text-muted ml-1 shrink-0">{v.rfc}</span>}
                    {v.risk_score != null && (
                      <span className="ml-auto text-xs font-mono text-text-muted shrink-0">
                        {v.risk_score.toFixed(2)}
                      </span>
                    )}
                  </CommandItem>
                ))}
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
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results!.contracts.length > 0 && (
              <CommandGroup heading="Contracts">
                {results!.contracts.map((c) => (
                  <CommandItem
                    key={`c-${c.id}`}
                    value={`contract-${c.id}-${c.title}`}
                    onSelect={() => go(`/contracts?search=${encodeURIComponent(c.title)}`)}
                    className="gap-2"
                  >
                    <FileText className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="truncate flex-1">{c.title}</span>
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

      {/* Footer hint */}
      <div className="border-t border-border/40 px-3 py-2 flex items-center gap-3 text-[10px] text-text-muted">
        <span><kbd className="px-1 py-0.5 rounded bg-background-elevated border border-border/40 font-mono">↑↓</kbd> navigate</span>
        <span><kbd className="px-1 py-0.5 rounded bg-background-elevated border border-border/40 font-mono">↵</kbd> select</span>
        <span><kbd className="px-1 py-0.5 rounded bg-background-elevated border border-border/40 font-mono">Esc</kbd> close</span>
      </div>
    </CommandDialog>
  )
}
