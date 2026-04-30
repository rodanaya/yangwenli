import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Library,
  X,
  MessageSquarePlus,
  Shield,
  History,
  Building2,
  Network,
  GitCompareArrows,
  TrendingUp,
  Newspaper,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { LanguageToggle } from '@/components/LanguageToggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { watchlistApi, caseLibraryApi, ariaApi } from '@/api/client'
// ReportIssueDialog is lazy — only loads when user clicks the issue button
const ReportIssueDialog = lazy(() =>
  import('@/components/ReportIssueDialog').then((m) => ({ default: m.ReportIssueDialog }))
)

export interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

interface NavItemDef {
  i18nKey: string
  href: string
  icon: React.ElementType
  badgeSource?: 'aria-t1' | 'watchlist' | 'cases'
}

interface NavSectionDef {
  sectionKey: string
  items: NavItemDef[]
}

// v3.0 LOCKED sidebar — 4 sections / 12 items.
// Removed entries that pointed at broken or duplicate destinations
// (Brief Ejecutivo duplicated /, Patrones had no route, Categorías only
// redirected). Per docs/PROJECT_LOCKED_V3.md — every nav entry must lead
// to a working page. No exceptions.
const NAV_SECTIONS: NavSectionDef[] = [
  {
    sectionKey: 'sections.discover',
    items: [
      { i18nKey: 'dashboard', href: '/', icon: LayoutDashboard },
      { i18nKey: 'atlas', href: '/atlas', icon: Sparkles },
      { i18nKey: 'newsroom', href: '/journalists', icon: Newspaper },
    ],
  },
  {
    sectionKey: 'sections.investigate',
    items: [
      { i18nKey: 'ariaQueue', href: '/aria', icon: Shield, badgeSource: 'aria-t1' },
      { i18nKey: 'workspace', href: '/workspace', icon: Briefcase, badgeSource: 'watchlist' },
      { i18nKey: 'caseLibrary', href: '/cases', icon: Library, badgeSource: 'cases' },
    ],
  },
  {
    sectionKey: 'sections.explore',
    items: [
      { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
      { i18nKey: 'institutionLeague', href: '/institutions', icon: Building2 },
      { i18nKey: 'network', href: '/network', icon: Network },
    ],
  },
  {
    sectionKey: 'sections.analysis',
    items: [
      { i18nKey: 'capture', href: '/captura', icon: TrendingUp },
      { i18nKey: 'administrations', href: '/administrations', icon: History },
      { i18nKey: 'intersection', href: '/intersection', icon: GitCompareArrows },
    ],
  },
  {
    sectionKey: 'sections.platform',
    items: [
      { i18nKey: 'methodology', href: '/methodology', icon: BookOpen },
    ],
  },
]

function NavSection({
  title,
  collapsed,
  children,
}: {
  title: string
  collapsed: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      {!collapsed && (
        <div className="mb-2 mt-1 px-2.5 flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-[color:var(--color-text-on-dark-muted)] select-none font-mono">
            {title}
          </span>
          <span className="flex-1 h-px bg-border" aria-hidden="true" />
        </div>
      )}
      {collapsed && <div className="mb-1.5 mx-auto w-4 h-px bg-border" />}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { t, i18n } = useTranslation('nav')
  const { t: tc } = useTranslation('common')

  // Close mobile sidebar on any navigation
  useEffect(() => {
    if (mobileOpen) onMobileClose?.()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // On mobile: use mobileOpen for collapse decision (always show full sidebar when open)
  const isCollapsed = collapsed && !mobileOpen

  // Watchlist alert count (5 min stale)
  const { data: alerts } = useQuery({
    queryKey: ['watchlist-alerts-check'],
    queryFn: () => watchlistApi.checkAlerts(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
  })
  const watchlistCount = alerts?.length ?? 0

  // Case Library count (1h cache)
  const { data: caseStats } = useQuery({
    queryKey: ['case-library-count'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
  })
  const caseCount = caseStats?.total_cases ?? 0

  // ARIA T1 count (5 min stale)
  const { data: ariaStats } = useQuery({
    queryKey: ['aria-stats-sidebar'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
  })
  const ariaT1Count = ariaStats?.latest_run?.tier1_count ?? 0

  const [reportOpen, setReportOpen] = useState(false)

  function getBadgeCount(source?: NavItemDef['badgeSource']): number {
    if (!source) return 0
    switch (source) {
      case 'aria-t1': return ariaT1Count
      case 'watchlist': return watchlistCount
      case 'cases': return caseCount
      default: return 0
    }
  }

  function getBadgeStyle(source?: NavItemDef['badgeSource']): 'alert' | 'count' {
    if (source === 'watchlist') return 'alert'
    return 'count'
  }

  return (
    <>
    <aside
      className={cn(
        // Mobile: auto-height drawer. Sidebar sizes to its actual content
        // instead of stretching to 100vh. Below the natural bottom, the
        // dimmed page backdrop shows through — the pattern every good
        // mobile drawer uses (Gmail, YouTube, Stripe). This eliminates
        // the "half-empty dark zone" that user flagged three times.
        // If content ever exceeds viewport, overflow-y-auto kicks in.
        // Desktop: full viewport height with flex-col anchoring footer.
        'fixed left-0 top-0 flex flex-col border-r border-border bg-[color:var(--color-sidebar)] z-50',
        'max-h-screen overflow-y-auto md:h-screen md:overflow-y-visible',
        'transition-all duration-200 ease-out',
        // Mobile: overlay -- hidden off-screen, revealed when open
        'w-64 -translate-x-full',
        mobileOpen && 'translate-x-0',
        // Desktop: always visible, width controlled by collapsed state
        'md:translate-x-0',
        collapsed ? 'md:w-14' : 'md:w-56',
      )}
    >
      {/* Logo — signal spike mark */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="relative flex-shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            {/* Baseline — warm dark, flanking the spike */}
            <line x1="2" y1="23" x2="11" y2="23" stroke="#2e2926" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="21" y1="23" x2="30" y2="23" stroke="#2e2926" strokeWidth="1.4" strokeLinecap="round"/>
            {/* Atmospheric glow at peak */}
            <circle cx="16" cy="5" r="8" fill="#dc2626" opacity="0.10"/>
            <circle cx="16" cy="5" r="5" fill="#dc2626" opacity="0.10"/>
            {/* The spike — the detection signal */}
            <polyline
              points="11,23 16,5 21,23"
              stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="miter"
            />
            {/* Peak: outer dot */}
            <circle cx="16" cy="5" r="2.4" fill="#dc2626"/>
            {/* Peak: specular highlight */}
            <circle cx="15.2" cy="4.3" r="0.9" fill="#fda4af" opacity="0.85"/>
          </svg>
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[color:var(--color-text-on-dark-primary)] font-bold text-lg tracking-[-0.02em] leading-none" style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)' }}>RUBLI</span>
              <span className="text-[color:var(--color-text-on-dark-muted)] font-mono text-[9px] leading-none tracking-[0.05em]">v0.6.5</span>
            </div>
            <p className="text-[9px] text-[color:var(--color-text-on-dark-muted)] mt-1 truncate tracking-[0.14em] uppercase font-mono">{t('tagline')}</p>
          </div>
        )}
        {/* Mobile close button */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 md:hidden text-[color:var(--color-text-on-dark-secondary)] hover:text-[color:var(--color-text-on-dark-primary)] hover:bg-[color:var(--color-sidebar-hover)] ml-auto"
            onClick={onMobileClose}
            aria-label={t('closeMenu')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main navigation.
          On mobile, ScrollArea does NOT flex-grow — nav, intel strip, and
          footer pack at natural heights, and the drawer's auto-height
          shrinks to fit. On desktop, flex-1 expands into viewport height
          so the footer anchors at the bottom of a tall window. */}
      <ScrollArea className="py-3 md:flex-1">
        <nav className="px-2 space-y-3" aria-label={t('mainNavigation')}>
          {NAV_SECTIONS.map((section) => (
            <NavSection key={section.sectionKey} title={t(section.sectionKey)} collapsed={isCollapsed}>
              {section.items.map((itemDef) => {
                const title = t(itemDef.i18nKey)
                const item: NavItem = {
                  title,
                  href: itemDef.href,
                  icon: itemDef.icon,
                }
                const isActive = getIsActive(itemDef.href, location.pathname)
                const badge = getBadgeCount(itemDef.badgeSource)
                const badgeStyle = getBadgeStyle(itemDef.badgeSource)
                return (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={isCollapsed}
                    isActive={isActive}
                    badge={badgeStyle === 'alert' && badge > 0 ? badge : 0}
                    countBadge={badgeStyle === 'count' && badge > 0 ? badge : 0}
                  />
                )
              })}
            </NavSection>
          ))}
          {/* API Explorer link removed — pointed at /api/v1/docs which 404s.
              Per docs/PROJECT_LOCKED_V3.md "every nav entry must lead to
              a working page". */}

        </nav>
      </ScrollArea>

      {/* Editorial intel strip removed — duplicated the "Risk Queue 320"
          nav item directly above it AND broke when the mobile drawer
          opened with collapsed=true (the !isCollapsed gate evaluated false
          there because isCollapsed = collapsed && !mobileOpen). The nav
          item already shows the live count + links to /aria. Marketing-
          style promo card belongs on a landing surface, not the sidebar. */}

      {/* System status panel */}
      <div className="px-2 py-2 border-t border-border">
        {!isCollapsed ? (
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)] flex-shrink-0" />
              <span className="text-[10px] font-mono text-[color:var(--color-text-on-dark-muted)] tracking-wide">
                {t('contractsIndexed')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p className="text-xs font-mono">{t('contractsIndexedShort')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Legal footer links — only visible in expanded mode */}
      {!isCollapsed && (
        <div className="px-3 pb-1 flex items-center gap-3">
          <a
            href="/privacy"
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
          >
            {tc('legal.privacy')}
          </a>
          <span className="text-text-disabled text-[10px]" aria-hidden="true">·</span>
          <a
            href="/terms"
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
          >
            {tc('legal.terms')}
          </a>
        </div>
      )}

      {/* Report an issue button */}
      <div className="px-2 pb-1">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setReportOpen(true)}
                className="w-full flex justify-center items-center rounded-sm py-1.5 text-[color:var(--color-text-on-dark-muted)] hover:text-[color:var(--color-text-on-dark-primary)] hover:bg-[color:var(--color-sidebar-hover)] transition-colors"
                aria-label={t('reportIssue')}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="text-xs">{t('reportIssue')}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => setReportOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm font-medium text-[color:var(--color-text-on-dark-muted)] hover:text-[color:var(--color-text-on-dark-primary)] hover:bg-[color:var(--color-sidebar-hover)] transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{t('reportIssue')}</span>
          </button>
        )}
      </div>

      {/* Bottom bar -- language toggle + collapse button */}
      <div className="border-t border-border p-2">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-0.5">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
                    className="h-7 w-7 flex items-center justify-center rounded-sm text-[color:var(--color-text-on-dark-muted)] hover:text-[color:var(--color-text-on-dark-primary)] hover:bg-[color:var(--color-sidebar-hover)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-accent)]"
                    aria-label={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                  >
                    <span className="text-[10px] font-bold font-mono">
                      {i18n.language === 'es' ? 'EN' : 'ES'}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p className="text-xs">{i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <LanguageToggle />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                'h-7 w-7 text-[color:var(--color-text-on-dark-muted)] hover:text-[color:var(--color-text-on-dark-primary)] hover:bg-[color:var(--color-sidebar-hover)] hidden md:flex',
                collapsed && 'mx-auto'
              )}
              aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
      {reportOpen && (
        <Suspense fallback={null}>
          <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
        </Suspense>
      )}
    </aside>
    </>
  )
}

/** Determine if a nav item is active based on current pathname */
function getIsActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/' || pathname === '/dashboard'
  }
  if (href === '/sectors') {
    return pathname === '/sectors' || pathname.startsWith('/sectors/')
  }
  if (href === '/workspace') {
    return pathname === '/workspace' || pathname === '/watchlist' || pathname.startsWith('/workspace/')
  }
  if (href === '/cases') {
    return pathname === '/cases' || pathname.startsWith('/cases/')
  }
  if (href === '/investigation') {
    return pathname === '/investigation' || pathname.startsWith('/investigation/')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

function SidebarNavItem({
  item,
  collapsed,
  isActive,
  badge = 0,
  countBadge = 0,
}: {
  item: NavItem
  collapsed: boolean
  isActive: boolean
  badge?: number
  countBadge?: number
}) {
  const Icon = item.icon

  const linkContent = (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm font-medium transition-all duration-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-accent)]',
        isActive
          ? 'border-l-[3px] border-[color:var(--color-accent)] bg-[color:var(--color-accent-glow)] text-text-primary pl-[calc(0.625rem-3px)] font-semibold'
          : 'text-text-secondary hover:text-text-primary hover:bg-[color:var(--color-sidebar-hover)]',
        collapsed && 'justify-center px-0',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon -- show badge dot in collapsed mode */}
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary',
          )}
          aria-hidden="true"
        />
        {badge > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[color:var(--color-accent)]" aria-hidden="true" />
        )}
        {countBadge > 0 && collapsed && badge === 0 && (
          <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-text-on-dark-muted)]" aria-hidden="true" />
        )}
      </span>
      {!collapsed && <span className="truncate">{item.title}</span>}
      {/* Alert badge -- only visible in expanded mode */}
      {badge > 0 && !collapsed && (
        <span
          className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[10px] font-bold text-[color:var(--color-sidebar)] px-1"
          aria-label={`${badge} alert${badge !== 1 ? 's' : ''}`}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {/* Count badge -- subdued, shows total items */}
      {countBadge > 0 && !collapsed && badge === 0 && (
        <span
          className="ml-auto flex h-4 min-w-[1.25rem] items-center justify-center rounded-sm bg-[color:var(--color-sidebar-hover)] text-[10px] font-mono text-text-muted px-1 border border-border"
          aria-label={`${countBadge} items`}
        >
          {countBadge > 999 ? `${Math.round(countBadge / 1000)}k` : countBadge}
        </span>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="bg-[color:var(--color-text-primary)] border-[color:var(--color-text-primary)] text-[color:var(--color-bg-base)]">
          <p className="text-xs font-mono">{item.title}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
