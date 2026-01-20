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
  { title: 'Export Data', href: '/export', icon: Download },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm">
            YW
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">Yang Wen-li</span>
              <span className="text-[10px] text-text-muted">Procurement Analysis</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-2">
          {/* Main navigation */}
          <div>
            {!collapsed && (
              <h3 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Navigation
              </h3>
            )}
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} isActive={location.pathname === item.href} />
              ))}
            </div>
          </div>

          {/* Analysis section */}
          <div>
            {!collapsed && (
              <h3 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Analysis
              </h3>
            )}
            <div className="space-y-1">
              {analysisNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  isActive={location.pathname.startsWith(item.href)}
                />
              ))}
            </div>
          </div>
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-border p-2">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <NavItem
              item={{ title: 'Settings', href: '/settings', icon: Settings }}
              collapsed={collapsed}
              isActive={location.pathname === '/settings'}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('h-8 w-8', collapsed && 'mx-auto')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ item, collapsed, isActive }: { item: NavItem; collapsed: boolean; isActive: boolean }) {
  const Icon = item.icon

  const linkContent = (
    <NavLink
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-active text-text-primary'
          : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span>{item.title}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-medium text-white">
          {item.badge}
        </span>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.title}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
