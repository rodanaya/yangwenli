import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, Moon, Sun, Database, Activity, Shield, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CommandPalette } from '@/components/CommandPalette'
import { useTheme } from '@/hooks/useTheme'
import { analysisApi } from '@/api/client'
import { cn } from '@/lib/utils'

// Route path → nav i18n key mapping
const ROUTE_I18N_KEYS: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/executive': 'executive',
  '/explore': 'explore',
  '/patterns': 'patterns',
  '/money-flow': 'captureHeatmap',
  '/temporal': 'temporal',
  '/administrations': 'administrations',
  '/institutions/health': 'institutions',
  '/price-analysis': 'priceAnalysis',
  '/contracts': 'contracts',
  '/network': 'network',
  '/executive-summary': 'executiveSummary',
  '/watchlist': 'watchlist',
  '/workspace': 'workspace',
  '/investigation': 'investigation',
  '/sectors': 'sectors',
  '/ground-truth': 'groundTruth',
  '/model': 'model',
  '/methodology': 'methodology',
  '/settings': 'settings',
  '/categories': 'categories',
  '/cases': 'caseLibrary',
  '/procurement-intelligence': 'procurementIntelligence',
  '/journalists': 'journalists',
  '/aria': 'ariaQueue',
  '/report-card': 'reportCard',
  '/glossary': 'methodology',
  '/limitations': 'limitations',
  '/seismograph': 'seismograph',
  '/telescope': 'telescope',
  '/heatmap': 'heatmap',
  '/year-in-review': 'yearInReview',
  '/thread': 'journalists',
  '/vendor-compare': 'contracts',
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation('nav')
  const { t: tc } = useTranslation('common')
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
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  const currentPath = location.pathname
  const i18nKey = ROUTE_I18N_KEYS[currentPath]
  const title = i18nKey ? t(i18nKey) : getBreadcrumbTitle(currentPath)
  const parentPath = getParentPath(currentPath)

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b border-border/60 bg-background/85 px-4 md:px-5 backdrop-blur-xl">
      {/* Left — Hamburger (mobile) + Breadcrumb path */}
      <div className="flex items-center gap-1.5 min-w-0 text-sm">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0 md:hidden mr-1"
          onClick={onMenuClick}
          aria-label={tc('header.openMenu')}
        >
          <Menu className="h-4 w-4 text-text-muted" />
        </Button>
        {currentPath !== '/' && (
          <>
            <span className="text-text-muted hidden sm:inline">{parentPath}</span>
            <span className="text-text-muted hidden sm:inline">/</span>
          </>
        )}
        <span className="font-semibold text-text-primary truncate">{title}</span>
      </div>

      {/* Right — Status indicators + actions */}
      <div className="flex items-center gap-1">
        {/* Search trigger — opens centered CommandPalette modal */}
        {/* Desktop: pill-shaped fake input with hint text */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden lg:flex items-center gap-2 h-7 px-2.5 rounded-md border border-border/50 bg-background-elevated/50 text-text-muted hover:border-border hover:bg-background-elevated transition-colors text-xs max-w-[200px] w-[200px] focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Open search (Ctrl+K)"
        >
          <Search className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left truncate">{tc('header.searchPlaceholder')}</span>
          <kbd className="flex-shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-background border border-border/60 text-text-muted leading-none tracking-tight">⌘K</kbd>
        </button>
        {/* Mobile: icon-only button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 lg:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-text-muted" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tc('search')} <kbd className="ml-1 text-xs px-1 py-0.5 rounded bg-background-elevated border border-border text-text-muted">Ctrl+K</kbd></p>
          </TooltipContent>
        </Tooltip>

        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

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
              aria-label={tc('header.alertsLabel', { count: alertCount })}
            >
              <Shield className="h-3.5 w-3.5 text-text-muted" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-risk-critical text-xs font-bold text-white">
                  {alertCount > 9 ? '!' : alertCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{alertCount > 0 ? tc('header.alertsLabel', { count: alertCount }) : tc('header.noAlerts')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Data quality grade */}
        {qualityGrade && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'hidden sm:flex items-center gap-1.5 h-6 px-2 rounded-md text-[10px] font-mono font-bold tracking-[0.08em] uppercase',
                  'border transition-colors',
                  qualityGrade === 'A' ? 'text-risk-low border-risk-low/30 bg-risk-low/[0.06] hover:bg-risk-low/10' :
                  qualityGrade === 'B' ? 'text-accent border-accent/30 bg-accent/[0.06] hover:bg-accent/10' :
                  qualityGrade === 'C' ? 'text-risk-medium border-risk-medium/30 bg-risk-medium/[0.06] hover:bg-risk-medium/10' :
                  'text-risk-high border-risk-high/30 bg-risk-high/[0.06] hover:bg-risk-high/10'
                )}
                onClick={() => navigate('/settings?tab=quality')}
              >
                <Database className="h-3 w-3" />
                <span>DQ&nbsp;{qualityGrade}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tc('header.dataQuality', { grade: qualityGrade, score: qualityScore?.toFixed(1) })}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Live signal */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden sm:flex items-center gap-1 h-7 px-1.5 text-xs text-text-muted">
              <Activity className="h-3 w-3 text-signal-live" />
              <span className="font-mono">{tc('header.live')}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tc('header.connectedToDb')}</p>
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
              aria-label={theme === 'dark' ? tc('header.switchToLight') : tc('header.switchToDark')}
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-text-muted" /> : <Moon className="h-3.5 w-3.5 text-text-muted" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tc('header.toggleTheme')}</p>
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
    const parentKey = ROUTE_I18N_KEYS[`/${parentRoute}`]
    if (parentKey) {
      return `#${lastPart}`
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
