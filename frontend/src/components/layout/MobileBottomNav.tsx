/**
 * MobileBottomNav — iOS/Android-style bottom navigation bar for mobile screens.
 * Renders only on < md breakpoint. 5 primary destinations + "More" to open the sidebar.
 */

import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Shield, BarChart3, Network, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onMenuClick: () => void
}

const NAV_ITEMS = [
  { label: 'Home',    href: '/',      icon: LayoutDashboard },
  { label: 'ARIA',   href: '/aria',  icon: Shield },
  { label: 'Sectors', href: '/sectors', icon: BarChart3 },
  { label: 'Network', href: '/network', icon: Network },
]

export function MobileBottomNav({ onMenuClick }: Props) {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border/50 bg-sidebar/95 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === '/'
            ? location.pathname === '/' || location.pathname === '/dashboard'
            : location.pathname === href || location.pathname.startsWith(href + '/')
        return (
          <NavLink
            key={href}
            to={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors',
              isActive
                ? 'text-accent'
                : 'text-text-muted active:text-text-primary'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn('h-5 w-5', isActive ? 'text-accent' : 'text-text-muted')}
              aria-hidden="true"
            />
            {label}
          </NavLink>
        )
      })}

      {/* More — opens full sidebar overlay */}
      <button
        onClick={onMenuClick}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium text-text-muted active:text-text-primary transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5 text-text-muted" aria-hidden="true" />
        More
      </button>
    </nav>
  )
}
