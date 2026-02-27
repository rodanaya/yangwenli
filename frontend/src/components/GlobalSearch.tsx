import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, Users, X } from 'lucide-react'
import { vendorApi, institutionApi } from '@/api/client'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: number
  name: string
  type: 'vendor' | 'institution'
  sub?: string
}

const QUICK_CHIPS = [
  { label: 'IMSS', type: 'institution' as const },
  { label: 'PEMEX', type: 'vendor' as const },
  { label: 'Segalmex', type: 'vendor' as const },
  { label: 'CFE', type: 'institution' as const },
]

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        ...(vRes.data || []).map(v => ({
          id: v.vendor_id,
          name: v.vendor_name,
          type: 'vendor' as const,
          sub: v.primary_sector_code || undefined,
        })),
        ...(iRes.data || []).map(i => ({
          id: i.institution_id,
          name: i.institution_name,
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

  function selectResult(result: SearchResult) {
    navigate(result.type === 'vendor' ? `/vendors/${result.id}` : `/institutions/${result.id}`)
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

  const showDropdown = isOpen && (results.length > 0 || isLoading)

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
          placeholder="Search vendors, institutions…"
          className="w-full h-9 pl-8 pr-8 rounded-lg border border-border/40 bg-background-elevated/60 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
          aria-label="Search vendors and institutions"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
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
              <span className="ml-auto text-[10px] text-text-muted font-mono uppercase">
                {r.type === 'vendor' ? 'vendor' : 'institution'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
