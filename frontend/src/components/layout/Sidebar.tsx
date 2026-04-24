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
  ChevronLeft,
  ChevronRight,
  Library,
  X,
  MessageSquarePlus,
  Shield,
  History,
  Building2,
  Network,
  Activity,
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

// 7-item editorial sidebar per architect audit. Previous 19-item nav collapsed
// based on redundancy matrix (direct_award % appeared on 24 of 41 pages;
// investigate section had 8 doorways into the same queue). Minor destinations
// reachable via: Dashboard KPI links, CommandPalette (Cmd+K), in-page drill.
const NAV_SECTIONS: NavSectionDef[] = [
  {
    sectionKey: 'sections.overview',
    items: [
      { i18nKey: 'dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    sectionKey: 'sections.investigate',
    items: [
      { i18nKey: 'ariaQueue', href: '/aria', icon: Shield, badgeSource: 'aria-t1' },
      { i18nKey: 'caseLibrary', href: '/cases', icon: Library, badgeSource: 'cases' },
      { i18nKey: 'network', href: '/network', icon: Network },
    ],
  },
  {
    sectionKey: 'sections.analysis',
    items: [
      { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
      { i18nKey: 'institutionLeague', href: '/institutions', icon: Building2 },
      { i18nKey: 'administrations', href: '/administrations', icon: History },
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
          <span className="flex-1 h-px bg-white/5" aria-hidden="true" />
        </div>
      )}
      {collapsed && <div className="mb-1.5 mx-auto w-4 h-px bg-white/10" />}
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
        'fixed left-0 top-0 h-screen flex flex-col border-r border-white/5 bg-[color:var(--color-sidebar)] z-50',
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
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
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

      {/* Main navigation */}
      <ScrollArea className="flex-1 py-3">
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
          {/* API Explorer — external link, opens in new tab */}
          {!isCollapsed && (
            <div className="px-2 pt-1">
              <a
                href="/api/v1/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm font-medium text-[color:var(--color-text-on-dark-muted)] hover:text-[color:var(--color-text-on-dark-primary)] hover:bg-white/[0.025] transition-all duration-100"
              >
                <Activity className="h-4 w-4 flex-shrink-0 text-[color:var(--color-text-on-dark-muted)] group-hover:text-[color:var(--color-text-on-dark-secondary)]" aria-hidden="true" />
                <span className="truncate">{t('apiExplorer')}</span>
                <svg className="ml-auto h-3 w-3 opacity-40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          )}

          {/* Editorial intel strip — fills the lower portion of the sidebar
              (previously just empty dark space on mobile/tall viewports, which
              user-flagged as "still black"). Uses existing aria-stats query
              — no new requests. Turns dead scroll area into a live signal. */}
          {!isCollapsed && ariaT1Count > 0 && (
            <div className="mt-8 mx-2 px-3 py-3 rounded-sm border border-white/8 bg-white/[0.015]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-red-400/80">
                  {i18n.language === 'es' ? 'Vivo · Cola T1' : 'Live · T1 Queue'}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-[color:var(--color-text-on-dark-secondary)] mb-2">
                {i18n.language === 'es'
                  ? <><span className="font-mono tabular-nums font-bold text-[color:var(--color-text-on-dark-primary)]">{ariaT1Count}</span> proveedores activan todas las señales de corrupción del modelo.</>
                  : <><span className="font-mono tabular-nums font-bold text-[color:var(--color-text-on-dark-primary)]">{ariaT1Count}</span> vendors trip every corruption signal the model tracks.</>
                }
              </p>
              <a
                href="/aria"
                className="text-[10px] font-mono tracking-[0.12em] uppercase text-red-400/90 hover:text-red-300 transition-colors inline-flex items-center gap-1"
              >
                {i18n.language === 'es' ? 'Abrir cola' : 'Open queue'}
                <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* System status panel */}
      <div className="px-2 py-2 border-t border-white/5">
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
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
          >
            {tc('legal.privacy')}
          </a>
          <span className="text-white/15 text-[10px]" aria-hidden="true">·</span>
          <a
            href="/terms"
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
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
      <div className="border-t border-white/5 p-2">
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

  const linkContent = (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm font-medium transition-all duration-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-accent)]',
        isActive
          ? 'border-l-[3px] border-[color:var(--color-accent)] bg-[color:var(--color-accent-glow)] text-[color:var(--color-text-on-dark-primary)] pl-[calc(0.625rem-3px)]'
          : 'text-[color:var(--color-text-on-dark-secondary)] hover:text-[color:var(--color-text-on-dark-primary)] hover:bg-white/[0.03]',
        collapsed && 'justify-center px-0',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon -- show badge dot in collapsed mode */}
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-[color:var(--color-text-on-dark-primary)]' : 'text-[color:var(--color-text-on-dark-muted)] group-hover:text-[color:var(--color-text-on-dark-secondary)]',
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
          className="ml-auto flex h-4 min-w-[1.25rem] items-center justify-center rounded-sm bg-[color:var(--color-sidebar-hover)] text-[10px] font-mono text-[color:var(--color-text-on-dark-muted)] px-1 border border-white/5"
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
        <TooltipContent side="right" sideOffset={8} className="bg-[color:var(--color-sidebar)] border-white/10 text-[color:var(--color-text-on-dark-secondary)]">
          <p className="text-xs font-mono">{item.title}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
