/**
 * ExplorePage — Shell with tabs for Vendors, Institutions, and Trends.
 * Each tab is lazy-loaded for code splitting.
 */

import { lazy, Suspense, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TABS, type TabId } from './shared'

// Lazy-load each tab for code splitting
const VendorsTab = lazy(() => import('./VendorsTab'))
const InstitutionsTab = lazy(() => import('./InstitutionsTab'))
const TrendsTab = lazy(() => import('./TrendsTab'))

function TabFallback() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="space-y-1">
        {[...Array(12)].map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    </div>
  )
}

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabId) || 'vendors'

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams({ tab }, { replace: true })
    },
    [setSearchParams]
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Compass className="h-4.5 w-4.5 text-accent" />
          Explore
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Browse vendors, institutions, and procurement trends
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border/50 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-accent border-accent'
                : 'text-text-muted border-transparent hover:text-text-primary'
            )}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <tab.icon className="h-4 w-4 inline mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content — lazy-loaded */}
      <Suspense fallback={<TabFallback />}>
        {activeTab === 'vendors' && <VendorsTab />}
        {activeTab === 'institutions' && <InstitutionsTab />}
        {activeTab === 'trends' && <TrendsTab />}
      </Suspense>
    </div>
  )
}

export default ExplorePage
