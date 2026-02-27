/**
 * Smart Search Component — Section 4.4
 * Federated search across vendors, institutions, contracts, and cases.
 * Replaces two parallel queries with a single /api/v1/search call.
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Building2, Users, FileText, BookOpen,
  Loader2, Clock, TrendingUp,
} from 'lucide-react'
import { searchApi } from '@/api/client'
import { useDebouncedValue } from '@/hooks/useDebouncedSearch'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentSuggestion {
  type: 'recent' | 'popular'
  label: string
}

interface EntitySuggestion {
  type: 'vendor' | 'institution' | 'contract' | 'case'
  id: number | string    // number for vendor/institution/contract, slug string for case
  label: string
  sublabel?: string
  riskLevel?: string | null
}

type SearchSuggestion = RecentSuggestion | EntitySuggestion

interface SmartSearchProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (suggestion: SearchSuggestion) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

// ---------------------------------------------------------------------------
// Recent searches
// ---------------------------------------------------------------------------

const RECENT_SEARCHES_KEY = 'rubli-recent-searches'
const MAX_RECENT_SEARCHES = 5

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query)
  recent.unshift(query)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)))
}

const POPULAR_SEARCHES = ['PEMEX', 'CFE', 'IMSS', 'Salud', 'Infraestructura']

// ---------------------------------------------------------------------------
// Risk badge helper
// ---------------------------------------------------------------------------

function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return null
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${colors[level] ?? ''}`}>
      {level}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Group header
// ---------------------------------------------------------------------------

function GroupHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold tracking-widest text-text-muted uppercase">
      {label}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SmartSearch = memo(function SmartSearch({
  value,
  onChange,
  onSelect,
  placeholder = 'Search vendors, institutions, contracts…',
  className = '',
  autoFocus = false,
}: SmartSearchProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = 'smart-search-listbox'

  const debouncedValue = useDebouncedValue(value, 300)

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Single federated query
  const { data: federated, isLoading } = useQuery({
    queryKey: ['search', 'federated', debouncedValue],
    queryFn: () => searchApi.federated(debouncedValue, 5),
    enabled: debouncedValue.length >= 2,
    staleTime: 30_000,
  })

  // Build grouped suggestions
  const suggestions: EntitySuggestion[] = []

  if (federated) {
    federated.vendors.forEach((v) =>
      suggestions.push({
        type: 'vendor',
        id: v.id,
        label: v.name,
        sublabel: v.rfc ?? `${v.contracts} contracts`,
        riskLevel: null,
      })
    )
    federated.institutions.forEach((i) =>
      suggestions.push({
        type: 'institution',
        id: i.id,
        label: i.name,
        sublabel: i.institution_type ?? undefined,
      })
    )
    federated.contracts.forEach((c) =>
      suggestions.push({
        type: 'contract',
        id: c.id,
        label: c.title,
        sublabel: c.year ? String(c.year) : undefined,
        riskLevel: c.risk_level,
      })
    )
    federated.cases.forEach((cs) =>
      suggestions.push({
        type: 'case',
        id: cs.slug,
        label: cs.title,
        sublabel: cs.sector ?? (cs.year ? String(cs.year) : undefined),
      })
    )
  }

  const showRecent = !value && recentSearches.length > 0
  const showPopular = !value && !showRecent

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
      setIsOpen(true)
    },
    [onChange]
  )

  // Navigate to entity page on selection
  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.type === 'recent' || suggestion.type === 'popular') {
        onChange(suggestion.label)
        addRecentSearch(suggestion.label)
      } else {
        onSelect?.(suggestion)
        onChange('')
        // Navigate to entity detail
        switch (suggestion.type) {
          case 'vendor':
            navigate(`/vendors/${suggestion.id}`)
            break
          case 'institution':
            navigate(`/institutions/${suggestion.id}`)
            break
          case 'contract':
            navigate(`/contracts/${suggestion.id}`)
            break
          case 'case':
            navigate(`/cases/${suggestion.id}`)
            break
        }
      }
      setIsOpen(false)
      inputRef.current?.blur()
    },
    [onChange, onSelect, navigate]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (value.trim()) {
        addRecentSearch(value.trim())
        setRecentSearches(getRecentSearches())
        setIsOpen(false)
      }
    },
    [value]
  )

  const handleClear = useCallback(() => {
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  const handleFocus = useCallback(() => {
    setIsOpen(true)
    setActiveIndex(-1)
  }, [])

  // All keyboard-navigable items
  const allItems: SearchSuggestion[] = (() => {
    if (suggestions.length > 0) return suggestions
    if (showRecent) return recentSearches.map((s) => ({ type: 'recent' as const, label: s }))
    if (showPopular) return POPULAR_SEARCHES.map((s) => ({ type: 'popular' as const, label: s }))
    return []
  })()

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || allItems.length === 0) {
        if (e.key === 'ArrowDown') {
          setIsOpen(true)
          setActiveIndex(0)
          e.preventDefault()
        }
        return
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1))
          break
        case 'Enter':
          if (activeIndex >= 0 && activeIndex < allItems.length) {
            e.preventDefault()
            handleSuggestionClick(allItems[activeIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          setActiveIndex(-1)
          inputRef.current?.blur()
          break
      }
    },
    [isOpen, allItems, activeIndex, handleSuggestionClick]
  )

  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedValue])

  const ICON_MAP: Record<EntitySuggestion['type'], React.ReactNode> = {
    vendor: <Users className="h-4 w-4 text-text-muted flex-shrink-0" />,
    institution: <Building2 className="h-4 w-4 text-text-muted flex-shrink-0" />,
    contract: <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />,
    case: <BookOpen className="h-4 w-4 text-text-muted flex-shrink-0" />,
  }

  const showDropdown =
    isOpen && (suggestions.length > 0 || showRecent || showPopular || isLoading)

  // Group suggestions by type for rendering
  const vendorSuggestions = suggestions.filter((s) => s.type === 'vendor')
  const institutionSuggestions = suggestions.filter((s) => s.type === 'institution')
  const contractSuggestions = suggestions.filter((s) => s.type === 'contract')
  const caseSuggestions = suggestions.filter((s) => s.type === 'case')

  function renderEntityRow(suggestion: EntitySuggestion, globalIndex: number) {
    return (
      <button
        key={`${suggestion.type}-${suggestion.id}`}
        id={`search-option-${globalIndex}`}
        type="button"
        role="option"
        aria-selected={globalIndex === activeIndex}
        onClick={() => handleSuggestionClick(suggestion)}
        className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
          globalIndex === activeIndex ? 'bg-accent/10' : 'hover:bg-background-elevated'
        }`}
      >
        {ICON_MAP[suggestion.type]}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{suggestion.label}</p>
          {suggestion.sublabel && (
            <p className="text-xs text-text-muted truncate">{suggestion.sublabel}</p>
          )}
        </div>
        {suggestion.riskLevel && <RiskBadge level={suggestion.riskLevel} />}
      </button>
    )
  }

  // Calculate group offsets for global keyboard index
  const vendorOffset = 0
  const institutionOffset = vendorOffset + vendorSuggestions.length
  const contractOffset = institutionOffset + institutionSuggestions.length
  const caseOffset = contractOffset + contractSuggestions.length

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-label="Search contracts, vendors, institutions"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-background-card text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {value && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background-elevated"
            >
              <X className="h-3.5 w-3.5 text-text-muted" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted animate-spin" />
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          aria-live="polite"
          aria-atomic="false"
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-background-card shadow-lg z-50 overflow-hidden animate-slide-up max-h-[420px] overflow-y-auto"
        >
          {/* Loading */}
          {isLoading && debouncedValue.length >= 2 && (
            <div className="px-3 py-3 text-sm text-text-muted flex items-center gap-2" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          )}

          {/* Grouped results */}
          {!isLoading && suggestions.length > 0 && (
            <div className="pb-1">
              {vendorSuggestions.length > 0 && (
                <div>
                  <GroupHeader label="Vendors" />
                  {vendorSuggestions.map((s, i) => renderEntityRow(s, vendorOffset + i))}
                </div>
              )}
              {institutionSuggestions.length > 0 && (
                <div>
                  <GroupHeader label="Institutions" />
                  {institutionSuggestions.map((s, i) => renderEntityRow(s, institutionOffset + i))}
                </div>
              )}
              {contractSuggestions.length > 0 && (
                <div>
                  <GroupHeader label="Contracts" />
                  {contractSuggestions.map((s, i) => renderEntityRow(s, contractOffset + i))}
                </div>
              )}
              {caseSuggestions.length > 0 && (
                <div>
                  <GroupHeader label="Cases" />
                  {caseSuggestions.map((s, i) => renderEntityRow(s, caseOffset + i))}
                </div>
              )}
            </div>
          )}

          {/* Recent searches */}
          {showRecent && (
            <div className="py-1">
              <GroupHeader label="Recent" />
              {recentSearches.map((search, i) => (
                <button
                  key={`recent-${i}`}
                  id={`search-option-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => handleSuggestionClick({ type: 'recent', label: search })}
                  className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                    i === activeIndex ? 'bg-accent/10' : 'hover:bg-background-elevated'
                  }`}
                >
                  <Clock className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span className="text-sm">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular searches */}
          {showPopular && (
            <div className="py-1">
              <GroupHeader label="Popular" />
              {POPULAR_SEARCHES.map((search, i) => (
                <button
                  key={`popular-${i}`}
                  id={`search-option-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => handleSuggestionClick({ type: 'popular', label: search })}
                  className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                    i === activeIndex ? 'bg-accent/10' : 'hover:bg-background-elevated'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span className="text-sm">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && debouncedValue.length >= 2 && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-text-muted">No results for "{debouncedValue}"</p>
              <p className="text-xs text-text-muted mt-1">
                Try a vendor name, RFC, institution, or case
              </p>
            </div>
          )}

          {/* Min chars hint */}
          {value && value.length < 2 && (
            <div className="px-3 py-2 text-xs text-text-muted">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default SmartSearch
