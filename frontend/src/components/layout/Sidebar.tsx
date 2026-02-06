import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  BarChart3,
  AlertTriangle,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Network,
  Eye,
  Columns,
  Calendar,
  Database,
  DollarSign,
  Radio,
} from 'lucide-react'
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
  badge?: string | number
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Contracts', href: '/contracts', icon: FileText },
  { title: 'Vendors', href: '/vendors', icon: Users },
  { title: 'Institutions', href: '/institutions', icon: Building2 },
  { title: 'Sectors', href: '/sectors', icon: BarChart3 },
]

const analysisNavItems: NavItem[] = [
  { title: 'Risk Analysis', href: '/analysis/risk', icon: AlertTriangle },
  { title: 'Price Analysis', href: '/analysis/price', icon: DollarSign },
  { title: 'Data Quality', href: '/data-quality', icon: Database },
  { title: 'Export Data', href: '/export', icon: Download },
]

const investigationNavItems: NavItem[] = [
  { title: 'Network Graph', href: '/network', icon: Network },
  { title: 'Watchlist', href: '/watchlist', icon: Eye },
  { title: 'Comparison', href: '/comparison', icon: Columns },
  { title: 'Timeline', href: '/timeline', icon: Calendar },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

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
            <Radio className="h-5 w-5 text-accent" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-signal-live shadow-[0_0_6px_var(--color-signal-live)]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-text-primary font-[var(--font-family-mono)]">
                YANG WEN-LI
              </span>
              <span className="text-[9px] tracking-[0.15em] uppercase text-accent/70">
                INTEL PLATFORM
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-5 px-2">
          {/* Main navigation */}
          <NavSection title="RECON" collapsed={collapsed}>
            {mainNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.href}
              />
            ))}
          </NavSection>

          {/* Analysis section */}
          <NavSection title="ANALYSIS" collapsed={collapsed}>
            {analysisNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname.startsWith(item.href)}
              />
            ))}
          </NavSection>

          {/* Investigation section */}
          <NavSection title="INVESTIGATION" collapsed={collapsed}>
            {investigationNavItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.href}
              />
            ))}
          </NavSection>
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-border/30 p-2">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <SidebarNavItem
              item={{ title: 'Settings', href: '/settings', icon: Settings }}
              collapsed={collapsed}
              isActive={location.pathname === '/settings'}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              'h-7 w-7 text-text-muted hover:text-text-primary',
              collapsed && 'mx-auto'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
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
          <span className="text-[9px] font-semibold tracking-[0.2em] text-text-muted/60 font-[var(--font-family-mono)]">
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
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150',
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
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded px-1 text-[9px] font-bold tracking-wide uppercase bg-accent/15 text-accent">
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
