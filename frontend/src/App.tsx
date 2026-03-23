import { lazy } from 'react'
import { NotFound } from './pages/NotFound'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/react-router'
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
const Intro = lazy(() => import('@/pages/Intro'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Contracts = lazy(() => import('@/pages/Contracts'))
const Explore = lazy(() => import('@/pages/explore'))
const Methodology = lazy(() => import('@/pages/Methodology'))
const VendorProfile = lazy(() => import('@/pages/VendorProfile'))
const InstitutionProfile = lazy(() => import('@/pages/InstitutionProfile'))
const Sectors = lazy(() => import('@/pages/Sectors'))
const SectorProfile = lazy(() => import('@/pages/SectorProfile'))
const Settings = lazy(() => import('@/pages/Settings'))
const RedesKnownDossier = lazy(() => import('@/pages/RedesKnownDossier'))
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
const CapturaHeatmap = lazy(() => import('@/pages/CapturaHeatmap'))
// Workspace is the new name for Watchlist
const Workspace = lazy(() => import('@/pages/Watchlist'))
// StateExpenditure removed — redirects to /map
const YearInReview = lazy(() => import('@/pages/YearInReview'))
const VendorCompare = lazy(() => import('@/pages/VendorCompare'))
const ApiExplorer = lazy(() => import('@/pages/ApiExplorer'))
const InstitutionHeatmap = lazy(() => import('@/pages/InstitutionHeatmap'))
const InstitutionCompare = lazy(() => import('@/pages/InstitutionCompare'))
const MexicoMap = lazy(() => import('@/pages/MexicoMap'))
const Annotations = lazy(() => import('@/pages/Annotations'))
const AriaQueue = lazy(() => import('@/pages/AriaQueue'))
const ReportCard = lazy(() => import('@/pages/ReportCard'))
const Journalists = lazy(() => import('@/pages/Journalists'))
const RedThread = lazy(() => import('@/pages/RedThread'))
const StoryNarrative = lazy(() => import('@/pages/StoryNarrative'))
const Telescope = lazy(() => import('@/pages/Telescope'))
const Seismograph = lazy(() => import('@/pages/Seismograph'))

// First-visit routing: redirect "/" to Intro for new users, Dashboard for returning users
function FirstVisitRedirect() {
  const seen = localStorage.getItem('rubli_seen_intro')
  if (!seen) return <Navigate to="/intro" replace />
  return <Navigate to="/dashboard" replace />
}

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
          <NuqsAdapter>
          <Routes>
            {/* Intro page — full-screen, no sidebar */}
            <Route
              path="intro"
              element={
                <SuspenseBoundary fallback={<DashboardSkeleton />}>
                  <Intro />
                </SuspenseBoundary>
              }
            />
            {/* Legacy /landing redirect */}
            <Route path="landing" element={<Navigate to="/intro" replace />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<FirstVisitRedirect />} />
              <Route
                path="report-card"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <ReportCard />
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
              <Route
                path="dashboard"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <Dashboard />
                  </SuspenseBoundary>
                }
              />
              <Route path="executive" element={<Navigate to="/executive-summary" replace />} />
              <Route
                path="explore"
                element={
                  <SuspenseBoundary fallback={<CardGridSkeleton />}>
                    <Explore />
                  </SuspenseBoundary>
                }
              />
              <Route path="patterns" element={<Navigate to="/administrations" replace />} />
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
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <RedesKnownDossier />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="workspace"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Workspace />
                  </SuspenseBoundary>
                }
              />
              <Route path="watchlist" element={<Navigate to="/workspace" replace />} />
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
                path="aria"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <AriaQueue />
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
              <Route path="state-expenditure" element={<Navigate to="/map" replace />} />
              <Route path="state-expenditure/:code" element={<Navigate to="/map" replace />} />
              <Route
                path="year-in-review"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <YearInReview />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="year-in-review/:year"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <YearInReview />
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
              <Route
                path="money-flow"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <CapturaHeatmap />
                  </SuspenseBoundary>
                }
              />
              <Route path="red-flags" element={<Navigate to="/procurement-intelligence" replace />} />
              <Route path="detective-patterns" element={<Navigate to="/administrations" replace />} />
              <Route path="spending-categories" element={<Navigate to="/categories" replace />} />
              <Route path="institution-health" element={<Navigate to="/institutions/health" replace />} />

              <Route
                path="vendors/compare"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <VendorCompare />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="api-explorer"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <ApiExplorer />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="heatmap"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <InstitutionHeatmap />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="map"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <MexicoMap />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="journalists"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Journalists />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="annotations"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Annotations />
                  </SuspenseBoundary>
                }
              />

              {/* Story narratives — investigative journalism pieces */}
              <Route
                path="stories/:slug"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <StoryNarrative />
                  </SuspenseBoundary>
                }
              />

              <Route
                path="institutions/compare"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <InstitutionCompare />
                  </SuspenseBoundary>
                }
              />

              <Route
                path="telescope"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Telescope />
                  </SuspenseBoundary>
                }
              />

              <Route
                path="seismograph"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Seismograph />
                  </SuspenseBoundary>
                }
              />

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

              {/* Route aliases — common plural/alternate spellings */}
              <Route path="investigations" element={<Navigate to="/investigation" replace />} />
              <Route path="for-journalists" element={<Navigate to="/journalists" replace />} />
              <Route path="cases-library" element={<Navigate to="/cases" replace />} />

              {/* Red Thread — scroll-driven investigation narrative */}
              <Route
                path="thread/:vendorId"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <RedThread />
                  </SuspenseBoundary>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <EntityProfileDrawer />
          </NuqsAdapter>
          </BrowserRouter>
          </EntityDrawerProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
