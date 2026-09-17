/**
 * MobileBottomNav — iOS/Android-style bottom navigation bar for mobile screens.
 * Renders only on < md breakpoint. 4 primary destinations + "More" to open the sidebar.
 *
 * PARALLAX D1 § Change 4 (2026-09-17):
 *  - El Mapa (`/`) is in. It is the homepage and the platform's front door, and
 *    it has been mobile-native since 2026-06-23. The Network came out: a force
 *    graph is the least usable surface on a 390px screen.
 *  - `/` no longer lights up the Dashboard tab. Each tab claims only its route.
 *  - Labels are no longer clamped to 56px, so "Dashboard" and "Vigilancia" read
 *    whole instead of clipping mid-word.
 *  - The landmark label is `nav.quickNavigation`, distinct from the sidebar's
 *    "Main navigation" (it used to borrow the INVESTIGAR section heading).
 */

import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Shield, BarChart3, Map, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onMenuClick: () => void
  /** True while the mobile drawer is open — takes the bar out of the tab order. */
  inert?: boolean
}

export function MobileBottomNav({ onMenuClick, inert }: Props) {
  const location = useLocation()
  const { t } = useTranslation('nav')

  const NAV_ITEMS = [
    { label: t('explore'),        href: '/',          icon: Map },
    { label: t('dashboard'),      href: '/dashboard', icon: LayoutDashboard },
    { label: t('ariaQueueShort'), href: '/aria',      icon: Shield },
    { label: t('sectors'),        href: '/sectors',   icon: BarChart3 },
  ]

  return (
    <nav
      inert={inert || undefined}
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-background-card/95 backdrop-blur-md md:hidden"
      aria-label={t('quickNavigation')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        // Exact match for the two roots (/ and /dashboard); prefix match for
        // the drill-in routes (/sectors/:id, /aria/...).
        const isActive =
          href === '/'
            ? location.pathname === '/'
            : location.pathname === href || location.pathname.startsWith(href + '/')
        return (
          <NavLink
            key={href}
            to={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[12px] font-medium transition-colors touch-manipulation',
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
            <span className="truncate px-1 text-center">{label}</span>
          </NavLink>
        )
      })}

      {/* More — opens full sidebar overlay */}
      <button
        onClick={onMenuClick}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[12px] font-medium text-text-muted active:text-text-primary transition-colors touch-manipulation"
        aria-label={t('openMenu')}
      >
        <Menu className="h-5 w-5 text-text-muted" aria-hidden="true" />
        <span className="truncate px-1">{t('mobileMore')}</span>
      </button>
    </nav>
  )
}
