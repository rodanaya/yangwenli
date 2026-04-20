import { lazy, Suspense } from 'react'
import { NotFound } from './pages/NotFound'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider, QueryCache, keepPreviousData } from '@tanstack/react-query'
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
const EntityProfileDrawer = lazy(() =>
  import('@/components/EntityProfileDrawer').then(m => ({ default: m.EntityProfileDrawer }))
)

// Lazy load all page components for code splitting
const Intro = lazy(() => import('@/pages/Intro'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Contracts = lazy(() => import('@/pages/Contracts'))
const ContractDetail = lazy(() => import('@/pages/ContractDetail'))
const Explore = lazy(() => import('@/pages/explore'))
const Methodology = lazy(() => import('@/pages/Methodology'))
const VendorProfile = lazy(() => import('@/pages/VendorProfile'))
const InstitutionProfile = lazy(() => import('@/pages/InstitutionProfile'))
const Sectors = lazy(() => import('@/pages/Sectors'))
const SectorProfile = lazy(() => import('@/pages/SectorProfile'))
const Settings = lazy(() => import('@/pages/Settings'))
const RedesKnownDossier = lazy(() => import('@/pages/RedesKnownDossier'))
const Administrations = lazy(() => import('@/pages/Administrations'))
// GroundTruth redirects to /model (exposes internal DB names to users)
// InstitutionHealth redirects to /institutions (merged as tab)
const PriceIntelligence = lazy(() => import('@/pages/PriceIntelligence'))
const ModelTransparency = lazy(() => import('@/pages/ModelTransparency'))
const Investigation = lazy(() => import('@/pages/Investigation'))
const InvestigationCaseDetail = lazy(() => import('@/pages/InvestigationCaseDetail'))
// Executive — editorial 1-pager for decision-makers (redesigned 2026-04-20)
const Executive = lazy(() => import('@/pages/Executive'))
const SpendingCategories = lazy(() => import('@/pages/SpendingCategories'))
const CategoryProfile = lazy(() => import('@/pages/CategoryProfile'))
// Limitations removed — /limitations redirects to /methodology
const CaseLibrary = lazy(() => import('@/pages/CaseLibrary'))
const CaseDetail = lazy(() => import('@/pages/CaseDetail'))
const CapturaHeatmap = lazy(() => import('@/pages/CapturaHeatmap'))
// Workspace is the new name for Watchlist
const Workspace = lazy(() => import('@/pages/Watchlist'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
// StateExpenditure removed — redirects to /map
const YearInReview = lazy(() => import('@/pages/YearInReview'))
const VendorCompare = lazy(() => import('@/pages/VendorCompare'))
const InstitutionCompare = lazy(() => import('@/pages/InstitutionCompare'))
// MexicoMap removed — /map redirects to /administrations
// Annotations removed — /annotations redirects to /workspace
const AriaQueue = lazy(() => import('@/pages/AriaQueue'))
const CorruptionClusters = lazy(() => import('@/pages/CorruptionClusters'))
// ReportCard and InstitutionScorecards are now lazy-loaded inside InstitutionLeague tabs
const Journalists = lazy(() => import('@/pages/Journalists'))
const RedThread = lazy(() => import('@/pages/RedThread'))
const StoryNarrative = lazy(() => import('@/pages/StoryNarrative'))
// Telescope removed — /telescope redirects to /sectors
const InstitutionLeague = lazy(() => import('@/pages/InstitutionLeague'))
const CollusionExplorer = lazy(() => import('@/pages/CollusionExplorer'))
const StateExplorer = lazy(() => import('@/pages/StateExplorer'))
const ProcurementCalendar = lazy(() => import('@/pages/ProcurementCalendar'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
// PoliticalCycle redirects to /administrations (same API, administrations is superset)

// Redirect /sector/:id → /sectors/:id (singular alias)
function SectorRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/sectors/${id}`} replace />
}

// First-visit routing: redirect "/" to Intro for new users, ARIA for returning users
function FirstVisitRedirect() {
  const seen = localStorage.getItem('rubli_seen_intro')
  if (!seen) return <Navigate to="/intro" replace />
  return <Navigate to="/aria" replace />
}

// Enhanced QueryClient configuration for better caching and UX
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Global error handler — logs all query failures to console.
    // Individual components can add their own error UI on top.
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[QueryClient]', msg);
    },
  }),
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
          <AuthProvider>
          <EntityDrawerProvider>
          <BrowserRouter>
          <NuqsAdapter>
          <Routes>
            {/* Public auth pages — full-screen, no sidebar */}
            <Route
              path="login"
              element={
                <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                  <LoginPage />
                </SuspenseBoundary>
              }
            />
            <Route
              path="register"
              element={
                <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                  <RegisterPage />
                </SuspenseBoundary>
              }
            />
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
                element={<Navigate to="/institutions?tab=reporte" replace />}
              />
              {/* Institution URL aliases — various guessed routes all land on /institutions */}
              <Route path="institution-ranking" element={<Navigate to="/institutions" replace />} />
              <Route path="league" element={<Navigate to="/institutions" replace />} />
              <Route path="institution-league" element={<Navigate to="/institutions" replace />} />
              <Route path="executive-summary" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  <SuspenseBoundary fallback={<DashboardSkeleton />}>
                    <Dashboard />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="executive"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Executive />
                  </SuspenseBoundary>
                }
              />
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
              <Route path="procurement-intelligence" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="categories"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <SpendingCategories />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="categories/:id"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <CategoryProfile />
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
                path="contracts/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <ContractDetail />
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
                path="clusters"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <CorruptionClusters />
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
              <Route path="limitations" element={<Navigate to="/methodology" replace />} />
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
              <Route path="ground-truth" element={<Navigate to="/model" replace />} />
              <Route path="state-expenditure" element={<Navigate to="/administrations" replace />} />
              <Route path="state-expenditure/:code" element={<Navigate to="/administrations" replace />} />
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
              <Route path="institutions/health" element={<Navigate to="/institutions" replace />} />
              <Route path="institutions/scorecards" element={<Navigate to="/institutions?tab=fichas" replace />} />
              <Route path="institutions/fichas" element={<Navigate to="/institutions?tab=fichas" replace />} />
              <Route path="price-intelligence" element={<Navigate to="/price-analysis" replace />} />
              <Route path="model-transparency" element={<Navigate to="/model" replace />} />
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
              <Route path="red-flags" element={<Navigate to="/dashboard" replace />} />
              <Route path="detective-patterns" element={<Navigate to="/administrations" replace />} />
              <Route path="spending-categories" element={<Navigate to="/categories" replace />} />
              <Route path="institution-health" element={<Navigate to="/institutions" replace />} />
              {/* Fix broken inbound links from docs/tours/external sources */}
              <Route path="networks" element={<Navigate to="/network" replace />} />
              <Route path="co-bidding" element={<Navigate to="/collusion" replace />} />
              <Route path="spending" element={<Navigate to="/categories" replace />} />

              <Route
                path="vendors/compare"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <VendorCompare />
                  </SuspenseBoundary>
                }
              />
              <Route path="api-explorer" element={<Navigate to="/settings" replace />} />
              <Route path="heatmap" element={<Navigate to="/money-flow" replace />} />
              <Route
                path="procurement-calendar"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <ProcurementCalendar />
                  </SuspenseBoundary>
                }
              />
              <Route path="map" element={<Navigate to="/administrations" replace />} />
              <Route
                path="journalists"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Journalists />
                  </SuspenseBoundary>
                }
              />
              <Route path="annotations" element={<Navigate to="/workspace" replace />} />

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

              {/* Route aliases — singular/plural spelling variants */}
              <Route path="sector" element={<Navigate to="/sectors" replace />} />
              <Route path="sector/:id" element={<SectorRedirect />} />
              <Route path="telescope" element={<Navigate to="/sectors" replace />} />

              <Route path="seismograph" element={<Navigate to="/administrations" replace />} />

              <Route path="scandals" element={<Navigate to="/cases" replace />} />

              <Route
                path="collusion"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <CollusionExplorer />
                  </SuspenseBoundary>
                }
              />

              <Route
                path="scorecards"
                element={<Navigate to="/institutions?tab=fichas" replace />}
              />

              <Route path="political-cycle" element={<Navigate to="/administrations" replace />} />

              {/* Redirects from old routes */}
              <Route path="vendors" element={<Navigate to="/explore?tab=vendors" replace />} />
              <Route
                path="institutions"
                element={
                  <SuspenseBoundary fallback={<TablePageSkeleton />}>
                    <InstitutionLeague />
                  </SuspenseBoundary>
                }
              />
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
              {/* Default to top T1 ARIA vendor: GRUPO FARMACOS ESPECIALIZADOS (id=29277, IPS=0.870, risk=0.983) */}
              <Route path="thread" element={<Navigate to="/thread/29277" replace />} />
              <Route
                path="thread/:vendorId"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <RedThread />
                  </SuspenseBoundary>
                }
              />

              <Route
                path="states"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <StateExplorer />
                  </SuspenseBoundary>
                }
              />

              <Route
                path="privacy"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Privacy />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="terms"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Terms />
                  </SuspenseBoundary>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Suspense fallback={null}>
            <EntityProfileDrawer />
          </Suspense>
          </NuqsAdapter>
          </BrowserRouter>
          </EntityDrawerProvider>
          </AuthProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
