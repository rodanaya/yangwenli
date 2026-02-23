import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  Eye,
  Landmark,
  Building2,
  DollarSign,
  Crosshair,
  ScrollText,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { LOGHIcon } from '@/components/LOGHIcon'
import { LanguageToggle } from '@/components/LanguageToggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItemDef {
  i18nKey: string
  href: string
  icon: React.ElementType
  badge?: string | number
}

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string | number
}

// THE STORY — entry point, overview
const storyNavDefs: NavItemDef[] = [
  { i18nKey: 'executive', href: '/', icon: ScrollText },
  { i18nKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
]

// THE MONEY — where funds flow
const moneyNavDefs: NavItemDef[] = [
  { i18nKey: 'categories', href: '/categories', icon: ShoppingCart },
  { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
  { i18nKey: 'procurementIntelligence', href: '/procurement-intelligence', icon: TrendingUp },
]

// WHO & HOW — actors and mechanisms
const whoNavDefs: NavItemDef[] = [
  { i18nKey: 'institutions', href: '/institutions/health', icon: Building2 },
  { i18nKey: 'administrations', href: '/administrations', icon: Landmark },
  { i18nKey: 'pricing', href: '/price-analysis', icon: DollarSign },
]

// INVESTIGATE — active investigation tools
const investigateNavDefs: NavItemDef[] = [
  { i18nKey: 'investigation', href: '/investigation', icon: Crosshair },
  { i18nKey: 'contracts', href: '/contracts', icon: FileText },
  { i18nKey: 'network', href: '/network', icon: Network },
  { i18nKey: 'watchlist', href: '/watchlist', icon: Eye },
]

// UNDERSTAND — methodology and settings
const understandNavDefs: NavItemDef[] = [
  { i18nKey: 'methodology', href: '/methodology', icon: BookOpen },
  { i18nKey: 'settings', href: '/settings', icon: Settings },
]

function useNavItems(defs: NavItemDef[]): NavItem[] {
  const { t } = useTranslation('nav')
  return defs.map((d) => ({ title: t(d.i18nKey), href: d.href, icon: d.icon, badge: d.badge }))
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const { t } = useTranslation('nav')

  const storyNavItems = useNavItems(storyNavDefs)
  const moneyNavItems = useNavItems(moneyNavDefs)
  const whoNavItems = useNavItems(whoNavDefs)
  const investigateNavItems = useNavItems(investigateNavDefs)
  const understandNavItems = useNavItems(understandNavDefs)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-sidebar transition-all duration-300',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand — Intelligence signal, no logo badge */}
      <div className="flex h-14 items-center border-b border-border/30 px-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative flex-shrink-0">
            <LOGHIcon size={20} className="text-accent" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-signal-live shadow-[0_0_6px_var(--color-signal-live)]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-wider uppercase text-text-primary font-mono">
                RUBLI
              </span>
              <span className="text-xs tracking-wider uppercase text-accent">
                INTEL PLATFORM
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-5 px-2">
          {/* THE STORY */}
          <NavSection title={t('sections.theStory')} collapsed={collapsed}>
            {storyNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.href}
              />
            ))}
          </NavSection>

          {/* THE MONEY */}
          <NavSection title={t('sections.theMoney')} collapsed={collapsed}>
            {moneyNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={
                  item.href === '/sectors'
                    ? location.pathname === '/sectors' || location.pathname.startsWith('/sectors/')
                    : location.pathname === item.href
                }
              />
            ))}
          </NavSection>

          {/* WHO & HOW */}
          <NavSection title={t('sections.whoAndHow')} collapsed={collapsed}>
            {whoNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
              />
            ))}
          </NavSection>

          {/* INVESTIGATE */}
          <NavSection title={t('sections.investigateSection')} collapsed={collapsed}>
            {investigateNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
              />
            ))}
          </NavSection>

          {/* UNDERSTAND */}
          <NavSection title={t('sections.understandSection')} collapsed={collapsed}>
            {understandNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
              />
            ))}
          </NavSection>
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-border/30 p-2">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-0.5">
            {!collapsed && <LanguageToggle />}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                'h-7 w-7 text-text-muted hover:text-text-primary',
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

function NavSection({ title, collapsed, children }: { title: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div>
      {!collapsed && (
        <div className="mb-1.5 px-2 flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-text-secondary font-mono">
            {title}
          </span>
          <div className="flex-1 h-px bg-border/30" />
        </div>
      )}
      {collapsed && <div className="mb-1 mx-auto w-4 h-px bg-border/40" />}
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  )
}

function SidebarNavItem({ item, collapsed, isActive }: { item: NavItem; collapsed: boolean; isActive: boolean }) {
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
      {/* Active indicator — left accent bar */}
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r bg-accent shadow-[0_0_6px_var(--color-accent-glow)]" />
      )}
      <Icon className={cn(
        'h-4 w-4 flex-shrink-0 transition-colors',
        isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'
      )} aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.title}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded px-1 text-xs font-bold tracking-wide uppercase bg-accent/15 text-accent">
          {item.badge}
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
