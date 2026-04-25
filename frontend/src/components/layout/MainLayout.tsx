import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AppBanner } from './AppBanner'
import { MobileBottomNav } from './MobileBottomNav'
import { pageVariants } from '@/lib/animations'

const SIDEBAR_COLLAPSED_KEY = 'rubli_sidebar_collapsed'

export function MainLayout() {
  // Hydrate from localStorage; otherwise auto-collapse below 1280px.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored === '0') return false
      if (stored === '1') return true
    } catch {
      /* localStorage unavailable (SSR / private mode) — fall through */
    }
    return window.innerWidth < 1280
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Persist user preference whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      /* localStorage unavailable */
    }
  }, [sidebarCollapsed])

  // Auto-collapse sidebar below 1280px breakpoint (only if user hasn't
  // explicitly chosen a state — keep manual choice on viewport resize).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const handler = (e: MediaQueryListEvent) => {
      try {
        const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (stored !== null) return // user has a preference; respect it
      } catch { /* noop */ }
      setSidebarCollapsed(!e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const location = useLocation()
  const { t } = useTranslation('common')

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle grid background — intelligence aesthetic */}
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-[0.10]" aria-hidden="true" />

      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>

      {/* Mobile backdrop — tapping closes the sidebar */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div
        className={cn(
          'relative flex min-h-screen flex-col transition-all duration-300',
          // Mobile: no left padding (sidebar is overlay)
          'pl-0',
          // Desktop: left padding based on sidebar width
          sidebarCollapsed ? 'md:pl-14' : 'md:pl-56'
        )}
      >
        {/* Header */}
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Version announcement banner */}
        <AppBanner />

        {/* Page content — extra bottom padding on mobile so bottom nav doesn't cover content */}
        <main id="main-content" className="flex-1 px-3 sm:px-5 py-5 pb-20 md:pb-5" tabIndex={-1}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer — editorial colophon */}
        <footer className="border-t border-border px-5 py-3 pb-20 md:pb-3 mt-4">
          <div className="hidden md:flex items-center justify-between text-[10px] text-text-muted font-mono tracking-[0.14em] uppercase mb-2">
            <span>{t('footerBrand')} <span className="text-text-muted mx-1 opacity-60">·</span> {t('footerTagline')}</span>
            <span className="text-text-muted">{t('footerStats')}</span>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed max-w-3xl tracking-wide">
            {t('aboutData')}
          </p>
        </footer>
      </div>

      {/* Mobile bottom navigation — fixed, only on < md */}
      <MobileBottomNav onMenuClick={() => setMobileSidebarOpen(true)} />
    </div>
  )
}
