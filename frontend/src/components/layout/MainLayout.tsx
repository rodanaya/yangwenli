import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AppBanner } from './AppBanner'
import { WelcomeModal } from '@/components/WelcomeModal'
import { pageVariants } from '@/lib/animations'

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle grid background — intelligence aesthetic */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" aria-hidden="true" />

      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
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

        {/* Page content */}
        <main id="main-content" className="flex-1 px-3 sm:px-5 py-5" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
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

        {/* Footer — minimal status bar */}
        <footer className="border-t border-border/30 px-5 py-2.5">
          <div className="flex items-center justify-between text-xs text-text-muted font-mono tracking-wide">
            <span>RUBLI // PROCUREMENT INTELLIGENCE</span>
            <span>3.1M CONTRACTS // 2002-2025</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
