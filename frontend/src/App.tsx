import { lazy } from 'react'
import { NotFound } from './pages/NotFound'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { EntityDrawerProvider } from '@/contexts/EntityDrawerContext'
import { EntityProfileDrawer } from '@/components/EntityProfileDrawer'

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Contracts = lazy(() => import('@/pages/Contracts'))
const Explore = lazy(() => import('@/pages/explore'))
const Methodology = lazy(() => import('@/pages/Methodology'))
const VendorProfile = lazy(() => import('@/pages/VendorProfile'))
const InstitutionProfile = lazy(() => import('@/pages/InstitutionProfile'))
const Sectors = lazy(() => import('@/pages/Sectors'))
const SectorProfile = lazy(() => import('@/pages/SectorProfile'))
const Settings = lazy(() => import('@/pages/Settings'))
const NetworkGraph = lazy(() => import('@/pages/NetworkGraph'))
const Watchlist = lazy(() => import('@/pages/Watchlist'))
const DetectivePatterns = lazy(() => import('@/pages/DetectivePatterns'))
const Administrations = lazy(() => import('@/pages/Administrations'))
const ProcurementIntelligence = lazy(() => import('@/pages/ProcurementIntelligence'))
const GroundTruth = lazy(() => import('@/pages/GroundTruth'))
const InstitutionHealth = lazy(() => import('@/pages/InstitutionHealth'))
const PriceIntelligence = lazy(() => import('@/pages/PriceIntelligence'))
const ModelTransparency = lazy(() => import('@/pages/ModelTransparency'))
const Investigation = lazy(() => import('@/pages/Investigation'))
const InvestigationCaseDetail = lazy(() => import('@/pages/InvestigationCaseDetail'))
const ExecutiveSummary = lazy(() => import('@/pages/ExecutiveSummary'))
const SpendingCategories = lazy(() => import('@/pages/SpendingCategories'))
const Limitations = lazy(() => import('@/pages/Limitations'))
const CaseLibrary = lazy(() => import('@/pages/CaseLibrary'))
const CaseDetail = lazy(() => import('@/pages/CaseDetail'))

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
          <EntityDrawerProvider>
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
                path="executive-summary"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <ExecutiveSummary />
                  </SuspenseBoundary>
                }
              />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="executive" element={<Navigate to="/executive-summary" replace />} />
              <Route
                path="explore"
                element={
                  <SuspenseBoundary fallback={<CardGridSkeleton />}>
                    <Explore />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="patterns"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <DetectivePatterns />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="administrations"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Administrations />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="procurement-intelligence"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <ProcurementIntelligence />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="categories"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <SpendingCategories />
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
                path="investigation/:caseId"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <InvestigationCaseDetail />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="investigation"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Investigation />
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
                path="methodology"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Methodology />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="limitations"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Limitations />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="cases"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <CaseLibrary />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="cases/:slug"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <CaseDetail />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="ground-truth"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <GroundTruth />
                  </SuspenseBoundary>
                }
              />
              <Route path="temporal" element={<Navigate to="/administrations" replace />} />
              <Route
                path="institutions/health"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <InstitutionHealth />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="price-analysis"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <PriceIntelligence />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="model"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <ModelTransparency />
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
                path="institutions/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <InstitutionProfile />
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

              {/* Redirects from merged/renamed pages */}
              <Route path="money-flow" element={<Navigate to="/procurement-intelligence" replace />} />
              <Route path="red-flags" element={<Navigate to="/procurement-intelligence" replace />} />
              <Route path="detective-patterns" element={<Navigate to="/administrations" replace />} />
              <Route path="spending-categories" element={<Navigate to="/categories" replace />} />
              <Route path="institution-health" element={<Navigate to="/institutions/health" replace />} />

              {/* Redirects from old routes */}
              <Route path="vendors" element={<Navigate to="/explore?tab=vendors" replace />} />
              <Route path="institutions" element={<Navigate to="/explore?tab=institutions" replace />} />
              <Route path="analysis/risk" element={<Navigate to="/methodology" replace />} />
              <Route path="analysis/price" element={<Navigate to="/patterns" replace />} />
              <Route path="analysis/detective" element={<Navigate to="/patterns" replace />} />
              <Route path="timeline" element={<Navigate to="/explore?tab=trends" replace />} />
              <Route path="comparison" element={<Navigate to="/sectors" replace />} />
              <Route path="data-quality" element={<Navigate to="/settings?tab=quality" replace />} />
              <Route path="export" element={<Navigate to="/settings?tab=export" replace />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <EntityProfileDrawer />
          </BrowserRouter>
          </EntityDrawerProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
