import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main content area */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300',
          sidebarCollapsed ? 'pl-16' : 'pl-56'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Yang Wen-li Procurement Analysis Platform</span>
            <span>Data: 3.1M contracts (2002-2025)</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
