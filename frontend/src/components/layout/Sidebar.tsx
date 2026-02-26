import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  ScrollText,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Network,
  Building2,
  Crosshair,
  Shield,
  Layers,
  Landmark,
  Eye,
  TrendingUp,
  Library,
} from 'lucide-react'
import { RubliLogoMark } from '@/components/ui/RubliLogoMark'
import { LanguageToggle } from '@/components/LanguageToggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
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

const NAV_SECTIONS: NavSectionDef[] = [
  {
    sectionKey: 'sections.theStory',
    items: [
      { i18nKey: 'executive', href: '/executive-summary', icon: ScrollText },
      { i18nKey: 'dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    sectionKey: 'sections.theMoney',
    items: [
      { i18nKey: 'procurementIntelligence', href: '/procurement-intelligence', icon: TrendingUp },
      { i18nKey: 'sectors', href: '/sectors', icon: BarChart3 },
      { i18nKey: 'categories', href: '/categories', icon: Layers },
    ],
  },
  {
    sectionKey: 'sections.whoAndHow',
    items: [
      { i18nKey: 'institutions', href: '/institutions/health', icon: Building2 },
      { i18nKey: 'network', href: '/network', icon: Network },
      { i18nKey: 'administrations', href: '/administrations', icon: Landmark },
    ],
  },
  {
    sectionKey: 'sections.investigateSection',
    items: [
      { i18nKey: 'investigation', href: '/investigation', icon: Crosshair },
      { i18nKey: 'caseLibrary', href: '/cases', icon: Library },
      { i18nKey: 'contracts', href: '/contracts', icon: FileText },
      { i18nKey: 'watchlist', href: '/watchlist', icon: Eye },
    ],
  },
  {
    sectionKey: 'sections.understandSection',
    items: [
      { i18nKey: 'groundTruth', href: '/ground-truth', icon: Shield },
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

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const { t } = useTranslation('nav')

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-sidebar transition-all duration-300',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center border-b border-border/30 px-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative flex-shrink-0">
            <RubliLogoMark size={20} className="text-accent" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-signal-live shadow-[0_0_6px_var(--color-signal-live)]" />
          </div>
          {!collapsed && (
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
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-3">
          {NAV_SECTIONS.map((section) => (
            <NavSection key={section.sectionKey} title={t(section.sectionKey)} collapsed={collapsed}>
              {section.items.map((itemDef) => {
                const title = t(itemDef.i18nKey)
                const item: NavItem = { title, href: itemDef.href, icon: itemDef.icon }
                const isActive =
                  itemDef.href === '/'
                    ? location.pathname === '/'
                    : itemDef.href === '/sectors'
                    ? location.pathname === '/sectors' || location.pathname.startsWith('/sectors/')
                    : itemDef.href === '/institutions/health'
                    ? location.pathname.startsWith('/institutions')
                    : location.pathname === itemDef.href || location.pathname.startsWith(itemDef.href + '/')
                return (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={isActive}
                  />
                )
              })}
            </NavSection>
          ))}
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
