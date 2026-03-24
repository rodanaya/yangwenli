import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Building2, Users, X, Clock } from 'lucide-react'
import { vendorApi, institutionApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { RISK_THRESHOLDS } from '@/lib/constants'

const RECENT_KEY = 'rubli_recent_searches'
const MAX_RECENT = 5

interface RecentEntry {
  name: string
  path: string
  type: 'vendor' | 'institution'
}

function loadRecent(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentEntry[]
  } catch {
    return []
  }
}

function saveRecent(entry: RecentEntry) {
  const prev = loadRecent().filter(r => r.path !== entry.path)
  const next = [entry, ...prev].slice(0, MAX_RECENT)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
}

interface SearchResult {
  id: number
  name: string
  type: 'vendor' | 'institution'
  sub?: string
  riskLevel?: string
}

const QUICK_CHIPS = [
  { label: 'IMSS',      type: 'institution' as const },
  { label: 'PEMEX',     type: 'vendor'      as const },
  { label: 'Segalmex',  type: 'vendor'      as const },
  { label: 'CFE',       type: 'institution' as const },
  { label: 'Odebrecht', type: 'vendor'      as const },
  { label: 'SAT',       type: 'institution' as const },
]

const RISK_COLORS: Record<string, string> = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#fbbf24',
  low:      '#4ade80',
}

// Detect OS for keyboard hint display
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<RecentEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track recent navigations from URL
  useEffect(() => {
    setRecentSearches(loadRecent())
  }, [location.pathname])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setIsLoading(true)
    try {
      const [vRes, iRes] = await Promise.all([
        vendorApi.search(q, 5),
        institutionApi.search(q, 5),
      ])
      const combined: SearchResult[] = [
        ...(vRes.data || []).map(v => {
          const score = (v as any).avg_risk_score as number | undefined
          let riskLevel: string | undefined
          if (score != null) {
            if (score >= RISK_THRESHOLDS.critical) riskLevel = 'critical'
            else if (score >= RISK_THRESHOLDS.high) riskLevel = 'high'
            else if (score >= RISK_THRESHOLDS.medium) riskLevel = 'medium'
            else riskLevel = 'low'
          }
          return {
            id: v.id,
            name: v.name,
            type: 'vendor' as const,
            sub: v.primary_sector_id ? String(v.primary_sector_id) : undefined,
            riskLevel,
          }
        }),
        ...(iRes.data || []).map(i => ({
          id: i.id,
          name: i.name,
          type: 'institution' as const,
        })),
      ]
      setResults(combined)
      setActiveIndex(-1)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handleGlobalKey)
    return () => document.removeEventListener('keydown', handleGlobalKey)
  }, [])

  function selectResult(result: SearchResult) {
    const path = result.type === 'vendor' ? `/vendors/${result.id}` : `/institutions/${result.id}`
    saveRecent({ name: result.name, path, type: result.type })
    setRecentSearches(loadRecent())
    navigate(path)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  function handleChip(chip: (typeof QUICK_CHIPS)[0]) {
    setQuery(chip.label)
    inputRef.current?.focus()
    search(chip.label)
    setIsOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return
    const total = results.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % total)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i - 1 + total) % total)
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectResult(results[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const showRecent = isOpen && !query && recentSearches.length > 0
  const showDropdown = isOpen && (results.length > 0 || isLoading || showRecent)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search vendors, RFC, institutions…"
          className="w-full h-9 pl-8 pr-20 rounded-lg border border-border/40 bg-background-elevated/60 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
          aria-label="Search vendors, RFC, and institutions"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
        />
        {/* Keyboard shortcut hint or clear button */}
        {query ? (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <span
            className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/30 bg-background-card text-[10px] text-text-muted/60 font-mono select-none pointer-events-none"
            aria-hidden="true"
          >
            {isMac ? '⌘' : 'Ctrl'}K
          </span>
        )}
      </div>

      {/* Quick access chips */}
      {!query && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip.label}
              onClick={() => handleChip(chip)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-border/30 text-text-muted hover:border-accent/40 hover:text-text-secondary transition-all"
            >
              {chip.type === 'institution' ? (
                <Building2 className="h-2.5 w-2.5" />
              ) : (
                <Users className="h-2.5 w-2.5" />
              )}
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border/40 bg-background-surface shadow-xl overflow-hidden"
        >
          {/* Recent searches */}
          {showRecent && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] text-text-muted uppercase tracking-wide flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Recientes
              </div>
              {recentSearches.map((r, i) => (
                <button
                  key={r.path}
                  id={`search-result-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  onClick={() => navigate(r.path)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                    'text-text-secondary hover:bg-background-elevated/60'
                  )}
                >
                  {r.type === 'institution' ? (
                    <Building2 className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                  ) : (
                    <Users className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                  )}
                  <span className="truncate">{r.name}</span>
                  <span className="ml-auto text-[10px] text-text-muted font-mono uppercase">{r.type}</span>
                </button>
              ))}
              <div className="border-t border-border/20 mx-2 mb-1" />
            </>
          )}
          {isLoading && (
            <div className="px-3 py-2.5 text-xs text-text-muted">Searching…</div>
          )}
          {!isLoading && results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              id={`search-result-${i}`}
              role="option"
              aria-selected={activeIndex === i}
              onClick={() => selectResult(r)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                activeIndex === i
                  ? 'bg-accent/10 text-text-primary'
                  : 'text-text-secondary hover:bg-background-elevated/60'
              )}
            >
              {r.type === 'institution' ? (
                <Building2 className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
              ) : (
                <Users className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
              )}
              <span className="truncate font-medium">{r.name}</span>
              {r.riskLevel && r.riskLevel !== 'low' && (
                <span
                  className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${RISK_COLORS[r.riskLevel]}20`,
                    color: RISK_COLORS[r.riskLevel],
                  }}
                >
                  {r.riskLevel}
                </span>
              )}
              {(!r.riskLevel || r.riskLevel === 'low') && (
                <span className="ml-auto text-[10px] text-text-muted font-mono uppercase">
                  {r.type === 'vendor' ? 'vendor' : 'institution'}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
