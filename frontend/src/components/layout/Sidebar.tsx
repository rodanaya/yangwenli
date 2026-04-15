import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Library,
  Briefcase,
  X,
  MessageSquarePlus,
  Shield,
  FolderSearch,
  History,
  CalendarDays,
  Building2,
  GitMerge,
  TrendingUp,
  Layers,
  Network,
  Activity,
  Search,
  Newspaper,

} from 'lucide-react'
import { LanguageToggle } from '@/components/LanguageToggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { watchlistApi, caseLibraryApi, ariaApi } from '@/api/client'
import { ReportIssueDialog } from '@/components/ReportIssueDialog'

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
  isHero?: boolean
  heroColor?: string
}

interface NavItemDef {
  i18nKey: string
  href: string
  icon: React.ElementType
  badgeSource?: 'aria-t1' | 'watchlist' | 'cases'
  isHero?: boolean
  heroColor?: string
}

interface NavSectionDef {
  sectionKey: string
  items: NavItemDef[]
}

const NAV_SECTIONS: NavSectionDef[] = [
  {
    // Summaries & overviews — most common entry points
    sectionKey: 'sections.overview',
    items: [
      { i18nKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { i18nKey: 'yearInReview', href: '/year-in-review', icon: CalendarDays },
    ],
  },
  {
    // Active investigation bureau — journalist-facing
    sectionKey: 'sections.investigate',
    items: [
      { i18nKey: 'ariaQueue', href: '/aria', icon: Shield, isHero: true, heroColor: '#d4922a', badgeSource: 'aria-t1' },
      { i18nKey: 'theArchive', href: '/investigation', icon: FolderSearch },
      { i18nKey: 'caseLibrary', href: '/cases', icon: Library, badgeSource: 'cases' },
      { i18nKey: 'journalists', href: '/journalists', icon: Newspaper },
      { i18nKey: 'collusion', href: '/collusion', icon: GitMerge },
      { i18nKey: 'network', href: '/network', icon: Network },
      { i18nKey: 'workspace', href: '/workspace', icon: Briefcase, badgeSource: 'watchlist' },
    ],
  },
  {
    // Editorial analysis — data-driven stories
    sectionKey: 'sections.analysis',
    items: [
      { i18nKey: 'categories', href: '/categories', icon: Layers, isHero: true, heroColor: '#8b5cf6' },
      { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
      { i18nKey: 'priceAnalysis', href: '/price-analysis', icon: TrendingUp },
      { i18nKey: 'administrations', href: '/administrations', icon: History },
      { i18nKey: 'institutionLeague', href: '/institutions', icon: Building2 },
    ],
  },
  {
    // Raw data & exploration
    sectionKey: 'sections.data',
    items: [
      { i18nKey: 'explore', href: '/explore', icon: Search },
    ],
  },
  {
    // Platform meta — methodology & settings
    sectionKey: 'sections.platform',
    items: [
      { i18nKey: 'methodology', href: '/methodology', icon: BookOpen },
      { i18nKey: 'settings', href: '/settings', icon: Settings },
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
        <div className="mb-1.5 px-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-white/28 font-mono select-none">
            {title}
          </span>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>
      )}
      {collapsed && <div className="mb-1 mx-auto w-4 h-px bg-white/[0.08]" />}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { t, i18n } = useTranslation('nav')

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
        'fixed left-0 top-0 h-screen flex flex-col border-r border-border/40 bg-sidebar z-50',
        'transition-all duration-200 ease-out',
        // Mobile: overlay -- hidden off-screen, revealed when open
        'w-64 -translate-x-full',
        mobileOpen && 'translate-x-0',
        // Desktop: always visible, width controlled by collapsed state
        'md:translate-x-0',
        collapsed ? 'md:w-14' : 'md:w-56',
      )}
    >
      {/* Logo — heliocentric intelligence mark */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="relative flex-shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <ellipse cx="16" cy="16" rx="13.5" ry="4.2" stroke="#5a6280" strokeWidth="0.4" opacity="0.35" transform="rotate(-20 16 16)" fill="none"/>
            <ellipse cx="16" cy="16" rx="8.5" ry="2.7" stroke="#4d9ef5" strokeWidth="0.45" opacity="0.4" transform="rotate(-20 16 16)" fill="none"/>
            <ellipse cx="16" cy="16" rx="4.8" ry="1.5" stroke="#d4922a" strokeWidth="0.4" opacity="0.55" transform="rotate(-20 16 16)" fill="none"/>
            <circle cx="16" cy="16" r="5" fill="#d4922a" opacity="0.05"/>
            <circle cx="16" cy="16" r="3.5" fill="#d4922a" opacity="0.10"/>
            <circle cx="16" cy="16" r="2.4" fill="#b07c1e"/>
            <circle cx="16" cy="16" r="1.7" fill="#d4922a"/>
            <circle cx="16" cy="16" r="1.0" fill="#f0b840"/>
            <circle cx="15.5" cy="15.5" r="0.45" fill="#fff8e0" opacity="0.65"/>
            <circle cx="28.5" cy="11.5" r="1.1" fill="#6d7fa8" opacity="0.8"/>
            <circle cx="8.0" cy="18.9" r="0.85" fill="#4d9ef5" opacity="0.75"/>
            <circle cx="20.2" cy="15.3" r="0.6" fill="#f97316" opacity="0.85"/>
          </svg>
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-lg tracking-tight leading-none">RUBLI</span>
              <span className="text-[9px] font-bold font-mono text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded tracking-[0.08em] uppercase leading-none">v0.6.5</span>
            </div>
            <p className="text-[10px] text-white/35 mt-0.5 truncate tracking-wide">{t('tagline')}</p>
          </div>
        )}
        {/* Mobile close button */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 md:hidden text-white/70 hover:text-white hover:bg-sidebar-hover ml-auto"
            onClick={onMobileClose}
            aria-label={t('closeMenu')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-3" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <NavSection key={section.sectionKey} title={t(section.sectionKey)} collapsed={isCollapsed}>
              {section.items.map((itemDef) => {
                const title = t(itemDef.i18nKey)
                const item: NavItem = {
                  title,
                  href: itemDef.href,
                  icon: itemDef.icon,
                  isHero: itemDef.isHero,
                  heroColor: itemDef.heroColor,
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
          {/* API Explorer — external link, opens in new tab */}
          {!isCollapsed && (
            <div className="px-2 pt-1">
              <a
                href="/api/v1/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.025] transition-all duration-100"
              >
                <Activity className="h-4 w-4 flex-shrink-0 text-white/30 group-hover:text-white/70" aria-hidden="true" />
                <span className="truncate">{t('apiExplorer')}</span>
                <svg className="ml-auto h-3 w-3 opacity-40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* System status panel */}
      <div className="px-2 py-2 border-t border-border">
        {!isCollapsed ? (
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981] flex-shrink-0" />
              <span className="text-[10px] font-mono text-white/30 tracking-wide">
                {t('contractsIndexed')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]" />
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
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
          >
            Privacy
          </a>
          <span className="text-white/15 text-[10px]" aria-hidden="true">·</span>
          <a
            href="/terms"
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
          >
            Terms
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
                className="w-full flex justify-center items-center rounded-md py-1.5 text-white/40 hover:text-white hover:bg-sidebar-hover transition-colors"
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
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-white/40 hover:text-white hover:bg-sidebar-hover transition-colors"
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
                    className="h-7 w-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-sidebar-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
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
                'h-7 w-7 text-white/40 hover:text-white hover:bg-sidebar-hover hidden md:flex',
                collapsed && 'mx-auto'
              )}
              aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
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
  const isHero = item.isHero
  const heroColor = item.heroColor

  const linkContent = (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500',
        isActive
          ? 'bg-white/[0.06] text-white ring-1 ring-inset ring-white/[0.08]'
          : 'text-white/60 hover:text-white hover:bg-white/[0.03]',
        isHero && !isActive && 'font-semibold',
        isHero && isActive && 'font-semibold',
        !isHero && 'font-medium',
        collapsed && 'justify-center px-0',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active item — 2px left accent bar */}
      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full"
          style={{ backgroundColor: isHero && heroColor ? heroColor : 'var(--color-accent)' }}
          aria-hidden="true"
        />
      )}
      {/* Hero left indicator bar (inactive heroes only) */}
      {isHero && !isActive && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full opacity-60"
          style={{ backgroundColor: heroColor }}
          aria-hidden="true"
        />
      )}

      {/* Icon -- show badge dot in collapsed mode */}
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80',
            isHero && !isActive && 'text-white/70',
          )}
          aria-hidden="true"
        />
        {badge > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />
        )}
        {countBadge > 0 && collapsed && badge === 0 && (
          <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-amber-500/60" aria-hidden="true" />
        )}
      </span>
      {!collapsed && <span className="truncate">{item.title}</span>}
      {/* Alert badge -- only visible in expanded mode */}
      {badge > 0 && !collapsed && (
        <span
          className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white px-1"
          aria-label={`${badge} alert${badge !== 1 ? 's' : ''}`}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {/* Count badge -- subdued, shows total items */}
      {countBadge > 0 && !collapsed && badge === 0 && (
        <span
          className="ml-auto flex h-4 min-w-[1.25rem] items-center justify-center rounded bg-white/[0.07] text-[10px] font-mono text-white/40 px-1 border border-white/[0.10]"
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
        <TooltipContent side="right" sideOffset={8} className="bg-sidebar border-border/60 text-white/80">
          <p className="text-xs font-mono">{item.title}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
