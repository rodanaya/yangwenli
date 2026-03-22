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
  Info,
  FlaskConical,
  MessageSquarePlus,
  Shield,
  ClipboardCheck,
  DollarSign,
  Newspaper,
  Activity,
  Telescope,
  LayoutGrid,
  TrendingUp,
  CalendarDays,
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

// 5 sections -- editorial layout
const NAV_SECTIONS: NavSectionDef[] = [
  {
    sectionKey: 'sections.portada',
    items: [
      { i18nKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { i18nKey: 'reportCard', href: '/report-card', icon: ClipboardCheck, isHero: true, heroColor: '#c41e3a' },
      { i18nKey: 'executive', href: '/executive-summary', icon: FileText },
      { i18nKey: 'journalists', href: '/journalists', icon: Newspaper },
    ],
  },
  {
    sectionKey: 'sections.investigar',
    items: [
      { i18nKey: 'ariaQueue', href: '/aria', icon: Shield, badgeSource: 'aria-t1' },
      { i18nKey: 'caseLibrary', href: '/cases', icon: Library, badgeSource: 'cases' },
      { i18nKey: 'investigation', href: '/investigation', icon: Crosshair },
      { i18nKey: 'workspace', href: '/workspace', icon: Briefcase, badgeSource: 'watchlist' },
    ],
  },
  {
    sectionKey: 'sections.datos',
    items: [
      { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
      { i18nKey: 'contracts', href: '/contracts', icon: FileText },
      { i18nKey: 'administrations', href: '/administrations', icon: History },
      { i18nKey: 'network', href: '/network', icon: Network },
      { i18nKey: 'moneyFlow', href: '/money-flow', icon: DollarSign },
    ],
  },
  {
    sectionKey: 'sections.visual',
    items: [
      { i18nKey: 'seismograph', href: '/seismograph', icon: Activity },
      { i18nKey: 'telescope', href: '/telescope', icon: Telescope },
      { i18nKey: 'institutionHeatmap', href: '/heatmap', icon: LayoutGrid },
      { i18nKey: 'priceIntelligence', href: '/price-analysis', icon: TrendingUp },
      { i18nKey: 'yearInReview', href: '/year-in-review', icon: CalendarDays },
    ],
  },
  {
    sectionKey: 'sections.plataforma',
    items: [
      { i18nKey: 'model', href: '/model', icon: FlaskConical, isHero: true, heroColor: '#2563eb' },
      { i18nKey: 'methodology', href: '/methodology', icon: BookOpen },
      { i18nKey: 'limitations', href: '/limitations', icon: Info },
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
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-stone-500 font-mono select-none">
            {title}
          </span>
          <div className="flex-1 h-px bg-stone-800" />
        </div>
      )}
      {collapsed && <div className="mb-1 mx-auto w-4 h-px bg-stone-800" />}
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
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col border-r border-stone-800 bg-[#1a1714] z-50',
        'transition-all duration-200 ease-out',
        // Mobile: overlay -- hidden off-screen, revealed when open
        'w-64 -translate-x-full',
        mobileOpen && 'translate-x-0',
        // Desktop: always visible, width controlled by collapsed state
        'md:translate-x-0',
        collapsed ? 'md:w-14' : 'md:w-56',
      )}
    >
      {/* Logo — Bauhaus half-circle mark */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="relative flex-shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            {/* Bauhaus: full circle outline */}
            <circle cx="16" cy="16" r="13" stroke="#c41e3a" strokeWidth="2"/>
            {/* Left half — solid fill */}
            <path d="M 16 3 A 13 13 0 0 0 16 29 Z" fill="#c41e3a"/>
          </svg>
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-lg tracking-tight leading-none">RUBLI</span>
              <span className="text-[9px] font-bold text-[#c41e3a] bg-[#c41e3a]/15 px-1.5 py-0.5 rounded tracking-widest uppercase leading-none">2.0</span>
            </div>
            <p className="text-[10px] text-white/35 mt-0.5 truncate tracking-wide">{t('tagline')}</p>
          </div>
        )}
        {/* Mobile close button */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 md:hidden text-stone-300 hover:text-white hover:bg-[#2a2420] ml-auto"
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
        </nav>
      </ScrollArea>

      {/* System status panel */}
      <div className="px-2 py-2 border-t border-border">
        {!isCollapsed ? (
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981] flex-shrink-0" />
              <span className="text-[10px] font-mono text-stone-500 tracking-wide">
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

      {/* Report an issue button */}
      <div className="px-2 pb-1">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setReportOpen(true)}
                className="w-full flex justify-center items-center rounded-md py-1.5 text-stone-400 hover:text-white hover:bg-[#2a2420] transition-colors"
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
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-stone-400 hover:text-white hover:bg-[#2a2420] transition-colors"
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
            {!isCollapsed && <LanguageToggle />}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                'h-7 w-7 text-stone-400 hover:text-white hover:bg-[#2a2420] hidden md:flex',
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
  const isHero = item.isHero
  const heroColor = item.heroColor

  const linkContent = (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500',
        isActive
          ? 'bg-[#342e2a] text-white'
          : 'text-stone-300 hover:text-white hover:bg-[#2a2420]',
        isHero && !isActive && 'font-semibold',
        isHero && isActive && 'font-semibold',
        !isHero && 'font-medium',
        collapsed && 'justify-center px-0',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Hero left indicator bar */}
      {isHero && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
          style={{ backgroundColor: heroColor }}
          aria-hidden="true"
        />
      )}

      {/* Icon -- show badge dot in collapsed mode */}
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-200',
            isHero && !isActive && 'text-stone-200',
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
          className="ml-auto flex h-4 min-w-[1.25rem] items-center justify-center rounded bg-stone-800 text-[10px] font-mono text-stone-400 px-1 border border-stone-700"
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
        <TooltipContent side="right" sideOffset={8} className="bg-[#1a1714] border-stone-700 text-stone-200">
          <p className="text-xs font-mono">{item.title}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
