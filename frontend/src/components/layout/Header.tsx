import { useState, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Moon, Sun, X, Database, Activity, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SmartSearch } from '@/components/SmartSearch'
import { useTheme } from '@/hooks/useTheme'
import { analysisApi } from '@/api/client'
import { cn } from '@/lib/utils'

// Breadcrumb mapping
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/explore': 'Explore',
  '/patterns': 'Patterns',
  '/contracts': 'Contracts',
  '/network': 'Network',
  '/watchlist': 'Watchlist',
  '/sectors': 'Sectors',
  '/methodology': 'Methodology',
  '/settings': 'Settings',
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)

  // Fetch anomaly count for notifications — non-blocking, cached aggressively
  const { data: anomalies } = useQuery({
    queryKey: ['analysis', 'anomalies', 'high'],
    queryFn: () => analysisApi.getAnomalies('high'),
    staleTime: 30 * 60 * 1000,  // 30 min — alerts don't change often
    gcTime: 60 * 60 * 1000,
    retry: 0,  // Don't retry — header shouldn't cause extra API pressure
    refetchOnWindowFocus: false,
    refetchOnMount: false,  // Don't refetch on every page navigation
  })

  // Fetch data quality score for indicator — non-blocking, cached aggressively
  const { data: dataQuality } = useQuery({
    queryKey: ['data-quality'],
    queryFn: () => analysisApi.getDataQuality(),
    staleTime: 60 * 60 * 1000,  // 1 hour — quality metrics are very stable
    gcTime: 120 * 60 * 1000,
    retry: 0,  // Don't retry — this endpoint is expensive
    refetchOnWindowFocus: false,
    refetchOnMount: false,  // Don't refetch on every page navigation
  })

  const alertCount = anomalies?.total || 0
  const qualityScore = dataQuality?.overall_score
  const qualityGrade = qualityScore
    ? qualityScore >= 90
      ? 'A'
      : qualityScore >= 75
        ? 'B'
        : qualityScore >= 60
          ? 'C'
          : qualityScore >= 40
            ? 'D'
            : 'F'
    : null

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  const currentPath = location.pathname
  const title = ROUTE_TITLES[currentPath] || getBreadcrumbTitle(currentPath)
  const parentPath = getParentPath(currentPath)

  const handleSearchSelect = useCallback(
    (suggestion: { type: string; id?: number; label: string }) => {
      if (suggestion.type === 'vendor' && suggestion.id) {
        navigate(`/vendors/${suggestion.id}`)
      } else if (suggestion.type === 'institution' && suggestion.id) {
        navigate(`/institutions/${suggestion.id}`)
      } else {
        navigate(`/contracts?search=${encodeURIComponent(suggestion.label)}`)
      }
      setSearchOpen(false)
    },
    [navigate]
  )

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border/40 bg-background/80 px-4 md:px-5 backdrop-blur-md">
      {/* Left — Breadcrumb path */}
      <div className="flex items-center gap-1.5 min-w-0 text-[13px]">
        {currentPath !== '/' && (
          <>
            <span className="text-text-muted/50 hidden sm:inline">{parentPath}</span>
            <span className="text-text-muted/30 hidden sm:inline">/</span>
          </>
        )}
        <span className="font-semibold text-text-primary truncate">{title}</span>
      </div>

      {/* Right — Status indicators + actions */}
      <div className="flex items-center gap-1">
        {/* Search trigger */}
        {searchOpen ? (
          <div className="flex items-center gap-1.5 animate-slide-in-right">
            <SmartSearch
              value=""
              onChange={() => {}}
              onSelect={handleSearchSelect}
              className="w-full max-w-56"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search (Ctrl+K)"
              >
                <Search className="h-3.5 w-3.5 text-text-muted" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Search <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded bg-background-elevated border border-border text-text-muted">Ctrl+K</kbd></p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Divider */}
        <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block" />

        {/* Alerts indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 relative"
              onClick={() => navigate('/methodology')}
              aria-label={`${alertCount} high-risk alerts`}
            >
              <Shield className="h-3.5 w-3.5 text-text-muted" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-risk-critical text-[8px] font-bold text-white">
                  {alertCount > 9 ? '!' : alertCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{alertCount > 0 ? `${alertCount} high-risk alerts` : 'No active alerts'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Data quality grade */}
        {qualityGrade && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'hidden sm:flex items-center gap-1 h-7 px-1.5 rounded text-[10px] font-bold tracking-wide',
                  'transition-colors hover:bg-sidebar-hover',
                  qualityGrade === 'A' ? 'text-risk-low' :
                  qualityGrade === 'B' ? 'text-accent' :
                  qualityGrade === 'C' ? 'text-risk-medium' :
                  'text-risk-high'
                )}
                onClick={() => navigate('/settings?tab=quality')}
              >
                <Database className="h-3 w-3" />
                <span>{qualityGrade}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Data Quality: Grade {qualityGrade} ({qualityScore?.toFixed(1)}%)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Live signal */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden sm:flex items-center gap-1 h-7 px-1.5 text-[10px] text-text-muted">
              <Activity className="h-3 w-3 text-signal-live" />
              <span className="font-[var(--font-family-mono)]">LIVE</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Connected to database</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block" />

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-text-muted" /> : <Moon className="h-3.5 w-3.5 text-text-muted" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Toggle theme</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}

function getBreadcrumbTitle(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return 'Dashboard'

  const lastPart = parts[parts.length - 1]
  if (/^\d+$/.test(lastPart)) {
    const parentRoute = parts.slice(0, -1).join('/')
    const parentTitle = ROUTE_TITLES[`/${parentRoute}`]
    if (parentTitle) {
      return `${parentTitle.replace(/s$/, '')} #${lastPart}`
    }
  }

  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1)
}

function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return 'Home'
  return parts
    .slice(0, -1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' / ')
}
