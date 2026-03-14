import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Network,
  Crosshair,
  Library,
  Briefcase,
  X,
  History,
  Zap,
  Info,
  FlaskConical,
  MapPin,
  Code2,
  MessageSquarePlus,
  StickyNote,
  Shield,
  ClipboardCheck,
  DollarSign,
  Search,
  Eye,
} from 'lucide-react'
import { RubliLogoMark } from '@/components/ui/RubliLogoMark'
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

// 4 sections — ops-center layout
const NAV_SECTIONS: NavSectionDef[] = [
  {
    sectionKey: 'sections.overview',
    items: [
      { i18nKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { i18nKey: 'executive', href: '/executive-summary', icon: FileText },
      { i18nKey: 'reportCard', href: '/report-card', icon: ClipboardCheck },
    ],
  },
  {
    sectionKey: 'sections.investigation',
    items: [
      { i18nKey: 'ariaQueue', href: '/aria', icon: Shield, badgeSource: 'aria-t1' },
      { i18nKey: 'caseLibrary', href: '/cases', icon: Library, badgeSource: 'cases' },
      { i18nKey: 'workspace', href: '/workspace', icon: Briefcase, badgeSource: 'watchlist' },
      { i18nKey: 'investigation', href: '/investigation', icon: Crosshair },
    ],
  },
  {
    sectionKey: 'sections.analysis',
    items: [
      { i18nKey: 'administrations', href: '/administrations', icon: History },
      { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
      { i18nKey: 'explore', href: '/explore', icon: Search },
      { i18nKey: 'contracts', href: '/contracts', icon: FileText },
      { i18nKey: 'network', href: '/network', icon: Network },
      { i18nKey: 'moneyFlow', href: '/money-flow', icon: DollarSign },
      { i18nKey: 'procurementIntelligence', href: '/procurement-intelligence', icon: Zap },
      { i18nKey: 'mexicoMap', href: '/map', icon: MapPin },
    ],
  },
  {
    sectionKey: 'sections.platform',
    items: [
      { i18nKey: 'methodology', href: '/methodology', icon: BookOpen },
      { i18nKey: 'limitations', href: '/limitations', icon: Info },
      { i18nKey: 'model', href: '/model', icon: FlaskConical },
      { i18nKey: 'annotations', href: '/annotations', icon: StickyNote },
      { i18nKey: 'apiExplorer', href: '/api-explorer', icon: Code2 },
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
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted/50 font-mono select-none">
            {title}
          </span>
          <div className="flex-1 h-px bg-border/20" />
        </div>
      )}
      {collapsed && <div className="mb-1 mx-auto w-4 h-px bg-border/30" />}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { t } = useTranslation('nav')

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
    retry: 0,
  })
  const watchlistCount = alerts?.length ?? 0

  // Case Library count (1h cache)
  const { data: caseStats } = useQuery({
    queryKey: ['case-library-count'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
  const caseCount = caseStats?.total_cases ?? 0

  // ARIA T1 count (5 min stale)
  const { data: ariaStats } = useQuery({
    queryKey: ['aria-stats-sidebar'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
  const ariaT1Count = ariaStats?.tier1_count ?? 0

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
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col border-r border-border/50 bg-sidebar z-50',
        'transition-all duration-200 ease-out',
        // Mobile: overlay -- hidden off-screen, revealed when open
        'w-64 -translate-x-full',
        mobileOpen && 'translate-x-0',
        // Desktop: always visible, width controlled by collapsed state
        'md:translate-x-0',
        collapsed ? 'md:w-14' : 'md:w-56',
      )}
    >
      {/* Brand header */}
      <div className="flex h-14 items-center border-b border-border/30 px-3">
        <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
          <div className="relative flex-shrink-0">
            <RubliLogoMark size={22} className="text-accent" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-signal-live shadow-[0_0_6px_var(--color-signal-live)] animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-[0.15em] uppercase text-text-primary font-mono">
                  RUBLI
                </span>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded border border-signal-live/30 bg-signal-live/10 text-signal-live leading-none tracking-wider uppercase">
                  LIVE
                </span>
              </div>
              <span className="text-[10px] tracking-[0.12em] uppercase text-text-muted/60 font-mono">
                INTEL PLATFORM
              </span>
            </div>
          )}
        </div>
        {/* Mobile close button */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 md:hidden"
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
                const item: NavItem = { title, href: itemDef.href, icon: itemDef.icon }
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
        </nav>
      </ScrollArea>

      {/* System status panel */}
      <div className="px-2 py-2 border-t border-border/20">
        {!isCollapsed ? (
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-live shadow-[0_0_4px_var(--color-signal-live)] flex-shrink-0" />
              <span className="text-[10px] font-mono text-text-muted/60 tracking-wide">
                3.1M contracts indexed
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-3 w-3 text-text-muted/40 flex-shrink-0" />
              <span className="text-[10px] font-mono text-text-muted/40 tracking-wide">
                v6.1 · AUC 0.849
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="h-1.5 w-1.5 rounded-full bg-signal-live shadow-[0_0_4px_var(--color-signal-live)]" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p className="text-xs font-mono">3.1M indexed · v6.1</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Report an issue button */}
      <div className="px-2 pb-1">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setReportOpen(true)}
                className="w-full flex justify-center items-center rounded-md py-1.5 text-text-muted hover:text-text-primary hover:bg-sidebar-hover transition-colors"
                aria-label="Report an issue"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="text-xs">Report an issue</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => setReportOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-text-muted hover:text-text-primary hover:bg-sidebar-hover transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Report an issue</span>
          </button>
        )}
      </div>

      {/* Bottom bar -- language toggle + collapse button */}
      <div className="border-t border-border/30 p-2">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-0.5">
            {!isCollapsed && <LanguageToggle />}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                'h-7 w-7 text-text-muted hover:text-text-primary hidden md:flex',
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
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        isActive
          ? 'border-l-2 border-amber-500 bg-amber-500/[0.08] text-amber-300'
          : 'border-l-2 border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
        collapsed && 'justify-center px-0 border-l-0',
        isActive && collapsed && 'bg-amber-500/[0.08]'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon -- show badge dot in collapsed mode */}
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-amber-400' : 'text-text-muted group-hover:text-text-secondary'
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
          className="ml-auto flex h-4 min-w-[1.25rem] items-center justify-center rounded bg-surface-alt/60 text-[10px] font-mono text-text-muted px-1 border border-border/30"
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
        <TooltipContent side="right" sideOffset={8} className="bg-amber-950/90 border-amber-500/20 text-amber-200">
          <p className="text-xs font-mono">{item.title}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
