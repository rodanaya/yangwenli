import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AppBanner } from './AppBanner'
import { MobileBottomNav } from './MobileBottomNav'
import { WelcomeModal } from '@/components/WelcomeModal'
import { pageVariants } from '@/lib/animations'

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.innerWidth < 1280
  )
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Auto-collapse sidebar below 1280px breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const handler = (e: MediaQueryListEvent) => setSidebarCollapsed(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const location = useLocation()
  const { t } = useTranslation('common')

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle grid background — intelligence aesthetic */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" aria-hidden="true" />

      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>

      {/* First-visit onboarding */}
      <WelcomeModal />

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

        {/* Footer — hidden on mobile (bottom nav replaces it) */}
        <footer className="hidden md:block border-t border-border/30 px-5 py-2.5">
          <div className="flex items-center justify-between text-xs text-text-muted font-mono tracking-wide">
            <span>{t('footerBrand')} • {t('footerTagline')}</span>
            <span>{t('footerStats')}</span>
          </div>
          <details className="mt-1.5">
            <summary className="text-[10px] text-text-muted/70 cursor-pointer hover:text-text-muted transition-colors select-none list-none font-mono">
              ▸ {t('aboutDataToggle')}
            </summary>
            <p className="mt-1 text-[10px] text-text-muted/70 leading-relaxed max-w-3xl">
              {t('aboutData')}
            </p>
          </details>
        </footer>
      </div>

      {/* Mobile bottom navigation — fixed, only on < md */}
      <MobileBottomNav onMenuClick={() => setMobileSidebarOpen(true)} />
    </div>
  )
}
