/**
 * Smart Search Component
 * Enhanced search with typeahead suggestions and category prefixes
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Building2, Users, FileText, Loader2, Clock, TrendingUp } from 'lucide-react'
import { vendorApi, institutionApi } from '@/api/client'
import { useDebouncedValue } from '@/hooks/useDebouncedSearch'

interface SearchSuggestion {
  type: 'vendor' | 'institution' | 'recent' | 'popular'
  id?: number
  label: string
  sublabel?: string
}

interface SmartSearchProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (suggestion: SearchSuggestion) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

// Recent searches (stored in localStorage)
const RECENT_SEARCHES_KEY = 'yang-wenli-recent-searches'
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

// Popular searches (could be from API)
const POPULAR_SEARCHES = [
  'PEMEX',
  'CFE',
  'IMSS',
  'Salud',
  'Infraestructura',
]

export const SmartSearch = memo(function SmartSearch({
  value,
  onChange,
  onSelect,
  placeholder = 'Search contracts, vendors, institutions...',
  className = '',
  autoFocus = false,
}: SmartSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = 'smart-search-listbox'

  const debouncedValue = useDebouncedValue(value, 300)

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Fetch vendor suggestions
  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'search', debouncedValue],
    queryFn: () => vendorApi.search(debouncedValue, 5),
    enabled: debouncedValue.length >= 2 && !debouncedValue.startsWith('institution:'),
  })

  // Fetch institution suggestions
  const { data: institutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions', 'search', debouncedValue],
    queryFn: () => institutionApi.search(debouncedValue, 5),
    enabled: debouncedValue.length >= 2 && !debouncedValue.startsWith('vendor:'),
  })

  const isLoading = vendorsLoading || institutionsLoading

  // Build suggestions list
  const suggestions: SearchSuggestion[] = []

  // Add vendor suggestions
  if (vendors?.data) {
    vendors.data.slice(0, 3).forEach((v) => {
      suggestions.push({
        type: 'vendor',
        id: v.id,
        label: v.name,
        sublabel: v.rfc || `${v.total_contracts} contracts`,
      })
    })
  }

  // Add institution suggestions
  if (institutions?.data) {
    institutions.data.slice(0, 3).forEach((i) => {
      suggestions.push({
        type: 'institution',
        id: i.id,
        label: i.name,
        sublabel: i.institution_type || '',
      })
    })
  }

  // Show recent searches when input is empty
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

  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.type === 'recent' || suggestion.type === 'popular') {
        onChange(suggestion.label)
        addRecentSearch(suggestion.label)
      } else {
        onSelect?.(suggestion)
        onChange('')
      }
      setIsOpen(false)
      inputRef.current?.blur()
    },
    [onChange, onSelect]
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

  // Build all selectable items for keyboard navigation
  const allItems = (() => {
    const items: SearchSuggestion[] = []
    if (suggestions.length > 0) {
      items.push(...suggestions)
    } else if (showRecent) {
      items.push(...recentSearches.map((s) => ({ type: 'recent' as const, label: s })))
    } else if (showPopular) {
      items.push(...POPULAR_SEARCHES.map((s) => ({ type: 'popular' as const, label: s })))
    }
    return items
  })()

  // Keyboard navigation
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

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedValue])

  const getIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'vendor':
        return <Users className="h-4 w-4 text-text-muted" />
      case 'institution':
        return <Building2 className="h-4 w-4 text-text-muted" />
      case 'recent':
        return <Clock className="h-4 w-4 text-text-muted" />
      case 'popular':
        return <TrendingUp className="h-4 w-4 text-text-muted" />
      default:
        return <FileText className="h-4 w-4 text-text-muted" />
    }
  }

  const showDropdown =
    isOpen && (suggestions.length > 0 || showRecent || showPopular || isLoading)

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
          {value && (
            <button
              type="button"
              onClick={handleClear}
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
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-background-card shadow-lg z-50 overflow-hidden animate-slide-up"
        >
          {/* Loading state */}
          {isLoading && debouncedValue.length >= 2 && (
            <div className="px-3 py-2 text-sm text-text-muted flex items-center gap-2" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching...
            </div>
          )}

          {/* Suggestions */}
          {!isLoading && suggestions.length > 0 && (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id || index}`}
                  id={`search-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                    index === activeIndex ? 'bg-accent/10' : 'hover:bg-background-elevated'
                  }`}
                >
                  {getIcon(suggestion.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{suggestion.label}</p>
                    {suggestion.sublabel && (
                      <p className="text-xs text-text-muted truncate">{suggestion.sublabel}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wide">
                    {suggestion.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Recent searches */}
          {showRecent && (
            <div className="py-1">
              <p className="px-3 py-1 text-xs text-text-muted font-medium" id="recent-searches-label">Recent searches</p>
              {recentSearches.map((search, index) => {
                const optionIndex = index
                return (
                  <button
                    key={`recent-${index}`}
                    id={`search-option-${optionIndex}`}
                    type="button"
                    role="option"
                    aria-selected={optionIndex === activeIndex}
                    onClick={() =>
                      handleSuggestionClick({ type: 'recent', label: search })
                    }
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                      optionIndex === activeIndex ? 'bg-accent/10' : 'hover:bg-background-elevated'
                    }`}
                  >
                    <Clock className="h-4 w-4 text-text-muted" />
                    <span className="text-sm">{search}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Popular searches */}
          {showPopular && (
            <div className="py-1">
              <p className="px-3 py-1 text-xs text-text-muted font-medium" id="popular-searches-label">Popular searches</p>
              {POPULAR_SEARCHES.map((search, index) => {
                const optionIndex = index
                return (
                  <button
                    key={`popular-${index}`}
                    id={`search-option-${optionIndex}`}
                    type="button"
                    role="option"
                    aria-selected={optionIndex === activeIndex}
                    onClick={() =>
                      handleSuggestionClick({ type: 'popular', label: search })
                    }
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                      optionIndex === activeIndex ? 'bg-accent/10' : 'hover:bg-background-elevated'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 text-text-muted" />
                    <span className="text-sm">{search}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* No results */}
          {!isLoading && debouncedValue.length >= 2 && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-text-muted">No results found for "{debouncedValue}"</p>
              <p className="text-xs text-text-muted mt-1">
                Try searching by vendor name, RFC, or institution
              </p>
            </div>
          )}

          {/* Search tip */}
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
