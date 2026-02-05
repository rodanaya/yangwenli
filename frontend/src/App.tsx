import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast'
import { MainLayout } from '@/components/layout/MainLayout'
import { SuspenseBoundary } from '@/components/SuspenseBoundary'
import {
  DashboardSkeleton,
  TablePageSkeleton,
  CardGridSkeleton,
  DetailPageSkeleton,
  SectorsSkeleton,
  GenericPageSkeleton,
} from '@/components/LoadingSkeleton'

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Contracts = lazy(() => import('@/pages/Contracts'))
const Vendors = lazy(() => import('@/pages/Vendors'))
const VendorProfile = lazy(() => import('@/pages/VendorProfile'))
const Institutions = lazy(() => import('@/pages/Institutions'))
const InstitutionProfile = lazy(() => import('@/pages/InstitutionProfile'))
const Sectors = lazy(() => import('@/pages/Sectors'))
const SectorProfile = lazy(() => import('@/pages/SectorProfile'))
const RiskAnalysis = lazy(() => import('@/pages/RiskAnalysis'))
const Export = lazy(() => import('@/pages/Export'))
const Settings = lazy(() => import('@/pages/Settings'))
const NetworkGraph = lazy(() => import('@/pages/NetworkGraph'))
const Watchlist = lazy(() => import('@/pages/Watchlist'))
const Comparison = lazy(() => import('@/pages/Comparison'))
const Timeline = lazy(() => import('@/pages/Timeline'))
const DataQuality = lazy(() => import('@/pages/DataQuality'))
const PriceAnalysis = lazy(() => import('@/pages/PriceAnalysis'))

// Enhanced QueryClient configuration for better caching and UX
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache after unmount
      retry: 2,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData, // Keep previous data while fetching
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider delayDuration={300}>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route
                index
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <Dashboard />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="contracts"
                element={
                  <SuspenseBoundary fallback={<TablePageSkeleton />}>
                    <Contracts />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="vendors"
                element={
                  <SuspenseBoundary fallback={<CardGridSkeleton />}>
                    <Vendors />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="vendors/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <VendorProfile />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="institutions"
                element={
                  <SuspenseBoundary fallback={<CardGridSkeleton />}>
                    <Institutions />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="institutions/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <InstitutionProfile />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="sectors"
                element={
                  <SuspenseBoundary fallback={<SectorsSkeleton />}>
                    <Sectors />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="sectors/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <SectorProfile />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="analysis/risk"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <RiskAnalysis />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="analysis/price"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <PriceAnalysis />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="export"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Export />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="settings"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Settings />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="network"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <NetworkGraph />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="watchlist"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Watchlist />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="comparison"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <Comparison />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="timeline"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <Timeline />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="data-quality"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <DataQuality />
                  </SuspenseBoundary>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-4xl font-bold text-text-primary mb-2">404</h1>
      <p className="text-text-muted">Page not found</p>
    </div>
  )
}

export default App
