import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, Database, Shield, Menu, LogOut, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { analysisApi } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'

const CommandPalette = lazy(() =>
  import('@/components/CommandPalette').then((m) => ({ default: m.CommandPalette }))
)

// Route path → nav i18n key mapping
const ROUTE_I18N_KEYS: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/explore': 'explore',
  '/money-flow': 'captureHeatmap',
  '/administrations': 'administrations',
  '/price-analysis': 'priceAnalysis',
  '/contracts': 'contracts',
  '/network': 'network',
  '/workspace': 'workspace',
  '/investigation': 'investigation',
  '/sectors': 'sectors',
  '/model': 'model',
  '/methodology': 'methodology',
  '/settings': 'settings',
  '/categories': 'categories',
  '/cases': 'caseLibrary',
  '/journalists': 'journalists',
  '/aria': 'ariaQueue',
  '/report-card': 'reportCard',
  '/year-in-review': 'yearInReview',
  '/thread': 'journalists',
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation('nav')
  const { t: tc } = useTranslation('common')
  const { user, logout } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [paletteEverOpened, setPaletteEverOpened] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

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
        setPaletteEverOpened(true)
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

  // Editorial masthead date — "TUE · APR 17 · 2026"
  const editorialDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase().replace(/,/g, ' ·')

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b border-border bg-background/85 px-4 md:px-5 backdrop-blur-xl">
      {/* Left — Hamburger (mobile) + Editorial dateline + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 text-sm">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 flex-shrink-0 md:hidden -ml-2"
          onClick={onMenuClick}
          aria-label={tc('header.openMenu')}
        >
          <Menu className="h-4 w-4 text-text-muted" />
        </Button>
        {/* Editorial dateline — Economist/NYT masthead feel */}
        <span
          className="hidden lg:inline-block text-[9.5px] tracking-[0.18em] text-text-muted font-mono select-none"
          aria-hidden="true"
        >
          {editorialDate}
        </span>
        <div className="hidden lg:block h-3 w-px bg-border" aria-hidden="true" />
        <div className="flex items-center gap-1.5 min-w-0">
          {currentPath !== '/' && (
            <>
              <span className="text-text-muted hidden sm:inline text-[10px] font-mono tracking-[0.1em] uppercase">{parentPath}</span>
              <span className="text-text-muted/60 hidden sm:inline">/</span>
            </>
          )}
          <span className="font-semibold text-text-primary truncate tracking-tight">{title}</span>
        </div>
      </div>

      {/* Right — Status indicators + actions */}
      <div className="flex items-center gap-1">
        {/* Search trigger — opens centered CommandPalette modal */}
        {/* Desktop: pill-shaped fake input with hint text */}
        <button
          onClick={() => { setPaletteEverOpened(true); setSearchOpen(true); }}
          className="hidden lg:flex items-center gap-2 h-7 px-2.5 rounded-md border border-border/50 bg-background-elevated/50 text-text-muted hover:border-border hover:bg-background-elevated transition-colors text-xs max-w-[200px] w-[200px] focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={`${tc('search')} (Ctrl+K)`}
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
              className="h-9 w-9 lg:hidden"
              onClick={() => { setPaletteEverOpened(true); setSearchOpen(true); }}
              aria-label={`${tc('search')} (Ctrl+K)`}
            >
              <Search className="h-3.5 w-3.5 text-text-muted" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tc('search')} <kbd className="ml-1 text-xs px-1 py-0.5 rounded bg-background-elevated border border-border text-text-muted">Ctrl+K</kbd></p>
          </TooltipContent>
        </Tooltip>

        {paletteEverOpened && (
          <Suspense fallback={null}>
            <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
          </Suspense>
        )}

        {/* Divider */}
        <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block" />

        {/* Alerts indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative"
              onClick={() => navigate('/methodology')}
              aria-label={tc('header.alertsLabel', { count: alertCount })}
            >
              <Shield className="h-3.5 w-3.5 text-text-muted" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-risk-critical text-xs font-bold text-text-primary">
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
                className="hidden sm:flex items-center gap-1.5 h-6 px-2 rounded-sm text-[10px] font-mono tracking-[0.1em] text-text-secondary bg-background-elevated border border-border hover:border-border-hover hover:text-text-primary transition-colors"
                onClick={() => navigate('/settings?tab=quality')}
              >
                <Database className="h-3 w-3 text-text-muted" />
                <span className="text-text-muted">DQ</span>
                <span className="text-[color:var(--color-accent)] font-bold">{qualityGrade}</span>
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
            <div className="hidden sm:flex items-center gap-1.5 h-7 px-1.5 text-[10px] text-text-muted tracking-[0.1em] uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-accent)] opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
              </span>
              <span className="font-mono">{tc('header.live')}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tc('header.connectedToDb')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block" />

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          {user ? (
            <>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-1.5 h-7 px-2 rounded-sm text-[10px] font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
                aria-label={tc('header.userMenu')}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-accent-glow)] text-[color:var(--color-accent)] text-[9px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-sm border border-border bg-background-card shadow-xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
                    <p className="text-[10px] text-text-muted truncate font-mono">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/workspace') }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    {tc('header.myInvestigations')}
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-[color:var(--color-risk-critical)] hover:bg-background-elevated transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {tc('header.signOut')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-sm text-[10px] font-mono tracking-[0.08em] uppercase text-text-muted hover:text-text-primary hover:bg-background-elevated border border-border hover:border-border-hover transition-colors"
            >
              {tc('header.signIn')}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

// Map of parent route → entity type label for numeric-ID child routes
const ENTITY_TYPE_LABELS: Record<string, string> = {
  vendors: 'Vendor Profile',
  institutions: 'Institution Profile',
  sectors: 'Sector Profile',
  categories: 'Category',
  cases: 'Case Detail',
  investigation: 'Investigation',
}

function getBreadcrumbTitle(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return 'Dashboard'

  const lastPart = parts[parts.length - 1]
  if (/^\d+$/.test(lastPart)) {
    const parentSegment = parts.length >= 2 ? parts[parts.length - 2] : ''
    const entityLabel = ENTITY_TYPE_LABELS[parentSegment]
    if (entityLabel) return entityLabel
    const parentRoute = parts.slice(0, -1).join('/')
    const parentKey = ROUTE_I18N_KEYS[`/${parentRoute}`]
    if (parentKey) return `#${lastPart}`
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
