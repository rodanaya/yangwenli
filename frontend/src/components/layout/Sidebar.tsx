import { useEffect } from 'react'
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
  Layers,
  Library,
  Briefcase,
  X,
} from 'lucide-react'
import { RubliLogoMark } from '@/components/ui/RubliLogoMark'
import { LanguageToggle } from '@/components/LanguageToggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { watchlistApi } from '@/api/client'

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

interface NavSectionDef {
  sectionKey: string
  items: { i18nKey: string; href: string; icon: React.ElementType }[]
}

// 3 groups as per Section 4.1 IA redesign
const NAV_SECTIONS: NavSectionDef[] = [
  {
    sectionKey: 'sections.overview',
    items: [
      { i18nKey: 'dashboard', href: '/', icon: LayoutDashboard },
      { i18nKey: 'explore', href: '/explore', icon: Layers },
      { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
    ],
  },
  {
    sectionKey: 'sections.investigate',
    items: [
      { i18nKey: 'investigation', href: '/investigation', icon: Crosshair },
      { i18nKey: 'network', href: '/network', icon: Network },
      { i18nKey: 'contracts', href: '/contracts', icon: FileText },
      { i18nKey: 'caseLibrary', href: '/cases', icon: Library },
    ],
  },
  {
    sectionKey: 'sections.myWorkspace',
    items: [
      { i18nKey: 'workspace', href: '/workspace', icon: Briefcase },
    ],
  },
]

// After-divider items (Methodology + Settings)
const NAV_BOTTOM: { i18nKey: string; href: string; icon: React.ElementType }[] = [
  { i18nKey: 'methodology', href: '/methodology', icon: BookOpen },
  { i18nKey: 'settings', href: '/settings', icon: Settings },
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
          <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted/50 font-mono">
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

  // 4.3C Alert System — poll for triggered watchlist alerts every 5 minutes
  const { data: alerts } = useQuery({
    queryKey: ['watchlist-alerts-check'],
    queryFn: () => watchlistApi.checkAlerts(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
  const alertCount = alerts?.length ?? 0

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300 z-50',
        // Mobile: overlay — hidden off-screen, revealed when open
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
            <RubliLogoMark size={20} className="text-accent" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-signal-live shadow-[0_0_6px_var(--color-signal-live)]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-wider uppercase text-text-primary font-mono">
                RUBLI
              </span>
              <span className="text-[10px] tracking-wider uppercase text-accent font-mono">
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
                const isActive =
                  itemDef.href === '/'
                    ? location.pathname === '/' || location.pathname === '/dashboard'
                    : itemDef.href === '/sectors'
                    ? location.pathname === '/sectors' || location.pathname.startsWith('/sectors/')
                    : itemDef.href === '/workspace'
                    ? location.pathname === '/workspace' || location.pathname === '/watchlist' || location.pathname.startsWith('/workspace/')
                    : itemDef.href === '/cases'
                    ? location.pathname === '/cases' || location.pathname.startsWith('/cases/')
                    : itemDef.href === '/investigation'
                    ? location.pathname === '/investigation' || location.pathname.startsWith('/investigation/')
                    : location.pathname === itemDef.href || location.pathname.startsWith(itemDef.href + '/')
                // Show alert badge on the Workspace nav item (4.3C Alert System)
                const badge = itemDef.href === '/workspace' && alertCount > 0 ? alertCount : 0
                return (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={isCollapsed}
                    isActive={isActive}
                    badge={badge}
                  />
                )
              })}
            </NavSection>
          ))}
        </nav>
      </ScrollArea>

      {/* Divider + secondary nav (Methodology, Settings) */}
      <div className="px-2 py-2 border-t border-border/20">
        <div className="space-y-0.5">
          {NAV_BOTTOM.map((itemDef) => {
            const title = t(itemDef.i18nKey)
            const item: NavItem = { title, href: itemDef.href, icon: itemDef.icon }
            const isActive =
              location.pathname === itemDef.href || location.pathname.startsWith(itemDef.href + '/')
            return (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={isCollapsed}
                isActive={isActive}
              />
            )
          })}
        </div>
      </div>

      {/* Bottom bar — language toggle + collapse button */}
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
    </aside>
  )
}

function SidebarNavItem({
  item,
  collapsed,
  isActive,
  badge = 0,
}: {
  item: NavItem
  collapsed: boolean
  isActive: boolean
  badge?: number
}) {
  const Icon = item.icon

  const linkContent = (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        isActive
          ? 'text-accent bg-accent/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-hover',
        collapsed && 'justify-center px-0'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r bg-accent shadow-[0_0_6px_var(--color-accent-glow)]" />
      )}
      {/* Icon — show badge dot in collapsed mode */}
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'
          )}
          aria-hidden="true"
        />
        {badge > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />
        )}
      </span>
      {!collapsed && <span className="truncate">{item.title}</span>}
      {/* Alert badge — only visible in expanded mode */}
      {badge > 0 && !collapsed && (
        <span
          className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white px-1"
          aria-label={`${badge} alert${badge !== 1 ? 's' : ''}`}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p className="text-xs">{item.title}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
