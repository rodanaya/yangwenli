import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle grid background — intelligence aesthetic */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" aria-hidden="true" />

      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main content area */}
      <div
        className={cn(
          'relative flex min-h-screen flex-col transition-all duration-300',
          sidebarCollapsed ? 'pl-14' : 'pl-56'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main id="main-content" className="flex-1 px-5 py-5" tabIndex={-1}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Footer — minimal status bar */}
        <footer className="border-t border-border/30 px-5 py-2.5">
          <div className="flex items-center justify-between text-[10px] text-text-muted/50 font-[var(--font-family-mono)] tracking-wide">
            <span>YANG WEN-LI // PROCUREMENT INTELLIGENCE</span>
            <span>3.1M CONTRACTS // 2002-2025</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
