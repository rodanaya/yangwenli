import { lazy, Suspense } from 'react'
import { NotFound } from './pages/NotFound'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider, QueryCache, keepPreviousData } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast'
import { MainLayout } from '@/components/layout/MainLayout'
import { SuspenseBoundary } from '@/components/SuspenseBoundary'
import {
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

// Preserves ?s=&i=&v= query params when the sidebar navigates to /spatial
function SpatialRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/explore${search}`} replace />
}

// Lazy load all page components for code splitting
const Contracts = lazy(() => import('@/pages/Contracts'))
const ContractDetail = lazy(() => import('@/pages/ContractDetail'))
const ExploreLegacy = lazy(() => import('@/pages/explore'))
const Methodology = lazy(() => import('@/pages/Methodology'))
const VendorProfile = lazy(() => import('@/pages/VendorProfile'))
const VendorDossier = lazy(() => import('@/pages/VendorDossier'))
// InstitutionProfile import removed M5 2026-05-18: route replaced by InstitutionThread.
// File preserved on disk at pages/InstitutionProfile.tsx for reference.
// const InstitutionProfile = lazy(() => import('@/pages/InstitutionProfile'))
const InstitutionThread = lazy(() => import('@/pages/InstitutionThread'))
const InstitutionDossier = lazy(() => import('@/pages/InstitutionDossier'))
// 2026-05-09: spatial-nav rebuild — the Star Fox map. Lives at /explore
// while it iterates; will be promoted to / when stable.
// File is named SpatialMap.tsx (not Explore.tsx) to avoid a Windows
// case-insensitive clash with the legacy `pages/explore.tsx` page.
// See docs/SPATIAL_NAV_PLAN.md for the zoom hierarchy.
const SpatialMap = lazy(() => import('@/pages/SpatialMap'))
// 2026-05-11 Gap 2: /vendors/:id and /institutions/:id now redirect to
// the /explore deep link. The legacy dossier components survive at
// /print/vendors/:id and /print/institutions/:id for the printable
// surface. See docs/SCAFFOLDING_OF_THE_UNIVERSE.md Gap 2.
// Both DeepLinkRedirect components retired 2026-05-25/26 (DESIGNUS rounds 6+7):
// /vendors/:id → VendorDossier · /institutions/:id → InstitutionDossier.
const Sectors = lazy(() => import('@/pages/Sectors'))
const SectorProfile = lazy(() => import('@/pages/SectorProfile'))
const SectorDossier = lazy(() => import('@/pages/SectorDossier'))
const Settings = lazy(() => import('@/pages/Settings'))
const RedesKnownDossier = lazy(() => import('@/pages/RedesKnownDossier'))
const Administrations = lazy(() => import('@/pages/Administrations'))
// PriceIntelligence — orphan removed 2026-05-07 (Audit Fix M); /price-analysis
// route now redirects to /sectors. Component file preserved for v1.1 if a
// real consumer surfaces.
// v1.0 launch cuts — components retained on disk for v1.1, no longer imported.
// See docs/RUBLI_v1.0_LAUNCH_PLAN.md for the cut list.
//   ModelTransparency        → /methodology
//   Investigation/Case       → /aria
//   CapturaHeatmap           → /captura
//   YearInReview             → /
//   VendorCompare            → /sectors
//   InstitutionCompare       → /institutions
//   CorruptionClusters       → /atlas
//   ProcurementCalendar      → /
const Executive = lazy(() => import('@/pages/Executive'))
const Atlas = lazy(() => import('@/pages/Atlas'))
const CategoriesIndex = lazy(() => import('@/pages/CategoriesIndex'))
const CategoryProfile = lazy(() => import('@/pages/CategoryProfile'))
const CaseLibrary = lazy(() => import('@/pages/CaseLibrary'))
const CaseDetail = lazy(() => import('@/pages/CaseDetail'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const AriaQueue = lazy(() => import('@/pages/AriaQueue'))
const Relationships = lazy(() => import('@/pages/Relationships'))
const Intersection = lazy(() => import('@/pages/Intersection'))
const Journalists = lazy(() => import('@/pages/Journalists'))
const RedThread = lazy(() => import('@/pages/RedThread'))
const StoryNarrative = lazy(() => import('@/pages/StoryNarrative'))
const InstitutionLeague = lazy(() => import('@/pages/InstitutionLeague'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
const ChartCatalog = lazy(() => import('@/pages/_dev/ChartCatalog'))
const Patterns = lazy(() => import('@/pages/Patterns'))
const PatternDossier = lazy(() => import('@/pages/PatternDossier'))
const PatternConstellation = lazy(() => import('@/pages/PatternConstellation'))
const AtlasStoryPlayer = lazy(() => import('@/pages/AtlasStoryPlayer'))

// Redirect /sector/:id → /sectors/:id (singular alias)
function SectorRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/sectors/${id}`} replace />
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
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status != null && status >= 400 && status < 500) return false
        return failureCount < 2
      },
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
            {/* Retired: /intro and /landing now redirect to the front page (/) */}
            <Route path="intro" element={<Navigate to="/" replace />} />
            <Route path="landing" element={<Navigate to="/" replace />} />
            {/* Internal — visual canon for canonical chart primitives. Not in main nav. */}
            <Route
              path="_dev/charts"
              element={
                <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                  <ChartCatalog />
                </SuspenseBoundary>
              }
            />
            <Route path="/" element={<MainLayout />}>
              {/* 2026-05-10 Phase 7: Spatial Map IS the homepage.
                  The Star-Fox-style /explore drill experience replaces the
                  static Executive briefing as the front door. Executive
                  moved to /dashboard so external links keep working via
                  the redirects below. Spatial-nav rebuild plan:
                  docs/SPATIAL_NAV_PLAN.md. */}
              <Route
                index
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <SpatialMap />
                  </SuspenseBoundary>
                }
              />
              {/* Executive briefing kept available at /dashboard. */}
              <Route
                path="dashboard"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Executive />
                  </SuspenseBoundary>
                }
              />
              {/* Legacy aliases — all funnel into /dashboard. */}
              <Route path="executive" element={<Navigate to="/dashboard" replace />} />
              <Route path="executive-summary" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="report-card"
                element={<Navigate to="/institutions?tab=reporte" replace />}
              />
              {/* Institution URL aliases — various guessed routes all land on /institutions */}
              <Route path="institution-ranking" element={<Navigate to="/institutions" replace />} />
              <Route path="league" element={<Navigate to="/institutions" replace />} />
              <Route path="institution-league" element={<Navigate to="/institutions" replace />} />
              {/* Legacy /explore page (CardGrid catalog) — moved to /explore/legacy
                  to free /explore for the spatial-nav rebuild. */}
              <Route
                path="explore/legacy"
                element={
                  <SuspenseBoundary fallback={<CardGridSkeleton />}>
                    <ExploreLegacy />
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
              {/* /categories — standalone landmark index page (SITE_IA.md) */}
              <Route
                path="categories"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <CategoriesIndex />
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
              {/* /workspace dropped in v1.0 — RUBLI is a publication, not a workbench */}
              <Route path="workspace" element={<Navigate to="/atlas" replace />} />
              <Route path="watchlist" element={<Navigate to="/atlas" replace />} />
              {/* v1.0 launch cut — Investigation surfaces overlap with /aria.
                  Component files preserved for v1.1. See docs/RUBLI_v1.0_LAUNCH_PLAN.md. */}
              <Route path="investigation/:caseId" element={<Navigate to="/aria" replace />} />
              <Route path="investigation" element={<Navigate to="/aria" replace />} />
              <Route path="cola" element={<Navigate to="/aria" replace />} />
              <Route
                path="aria"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <AriaQueue />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="patterns"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Patterns />
                  </SuspenseBoundary>
                }
              />
              {/* UX-2: isolated full-screen constellation — MUST precede patterns/:code */}
              <Route
                path="patterns/:code/constellation"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <PatternConstellation />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="patterns/:code"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <PatternDossier />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="captura"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Relationships />
                  </SuspenseBoundary>
                }
              />
              {/* Legacy aliases → canonical /captura */}
              <Route path="relationships" element={<Navigate to="/captura" replace />} />
              <Route
                path="intersection"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Intersection />
                  </SuspenseBoundary>
                }
              />
              <Route path="capture" element={<Navigate to="/captura" replace />} />
              {/* v1.0 launch cut — CorruptionClusters subsumed by /atlas. */}
              <Route path="clusters" element={<Navigate to="/atlas" replace />} />
              {/* UX-3: dedicated story player — MUST precede atlas (shares /atlas prefix) */}
              <Route
                path="atlas/stories/:slug"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <AtlasStoryPlayer />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="atlas"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Atlas />
                  </SuspenseBoundary>
                }
              />
              {/* Public name is now "El Observatorio" / "The Observatory".
                  Both new spellings redirect to the canonical /atlas route
                  so shared URLs and the rubli_atlas_visited_v1 flag keep
                  working unchanged. */}
              <Route path="observatorio" element={<Navigate to="/atlas" replace />} />
              <Route path="observatory"  element={<Navigate to="/atlas" replace />} />
              <Route path="spatial" element={<SpatialRedirect />} />
              <Route
                path="sectors"
                element={
                  <SuspenseBoundary fallback={<SectorsSkeleton />}>
                    <Sectors />
                  </SuspenseBoundary>
                }
              />
              {/* 2026-05-26 DESIGNUS round 8: /sectors/:id is the canonical
                  unified sector dossier (SectorDossier). Replaces the legacy
                  SectorProfile 4-tab card-grid. /print/sectors/:id reserved
                  for future printable surface (SectorProfile preserved on
                  disk for reference). */}
              <Route
                path="sectors/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <SectorDossier />
                  </SuspenseBoundary>
                }
              />
              <Route
                path="print/sectors/:id"
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
              {/* v1.0 launch cut — YearInReview not core to journalism MVP. */}
              <Route path="year-in-review" element={<Navigate to="/" replace />} />
              <Route path="year-in-review/:year" element={<Navigate to="/" replace />} />
              <Route path="institutions/health" element={<Navigate to="/institutions" replace />} />
              <Route path="institutions/scorecards" element={<Navigate to="/institutions?tab=fichas" replace />} />
              <Route path="institutions/fichas" element={<Navigate to="/institutions?tab=fichas" replace />} />
              <Route path="price-intelligence" element={<Navigate to="/price-analysis" replace />} />
              <Route path="model-transparency" element={<Navigate to="/model" replace />} />
              {/* v1.0 launch cut — PriceIntelligence is fully built but
                  has zero inbound links anywhere in the codebase (per audit
                  Issue #003 in chart inventory). Redirected to /sectors;
                  component preserved for v1.1 if a real consumer surfaces. */}
              <Route path="price-analysis" element={<Navigate to="/sectors" replace />} />
              {/* v1.0 launch cut — ModelTransparency subsumed by /methodology. */}
              <Route path="model" element={<Navigate to="/methodology" replace />} />
              {/* 2026-05-11 Gap 2: /vendors/:id and /institutions/:id
                  now resolve into the spatial universe. The redirect
                  component fetches the entity, computes the parent
                  sector + institution, and Navigate-replaces to
                  /explore?s=…&i=…&v=…. Legacy dossier survives at
                  /print/vendors/:id for printable / fallback use.
                  Pass ?print=1 to bypass the redirect.
                  See docs/SCAFFOLDING_OF_THE_UNIVERSE.md Gap 2. */}
              {/* 2026-05-25 DESIGNUS round 6 final: /vendors/:id is the
                  canonical unified dossier (VendorDossier). Replaces the
                  Gap 2 redirect-into-/explore behavior. /explore stays the
                  entry instrument; the dossier is the destination.
                  Legacy /print/vendors/:id still renders VendorProfile. */}
              <Route
                path="vendors/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <VendorDossier />
                  </SuspenseBoundary>
                }
              />
              {/* 2026-05-26 DESIGNUS round 7: /institutions/:id is the
                  canonical unified institution dossier (InstitutionDossier).
                  Replaces the Gap 2 redirect-into-/explore behavior. The
                  legacy /print/institutions/:id still renders InstitutionThread. */}
              <Route
                path="institutions/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <InstitutionDossier />
                  </SuspenseBoundary>
                }
              />
              {/* Legacy dossier routes — printable surface. Pre-2026-05-11
                  these lived at /vendors/:id and /institutions/:id. */}
              <Route
                path="print/vendors/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <VendorProfile />
                  </SuspenseBoundary>
                }
              />
              {/* M5 2026-05-18: InstitutionThread promoted to canonical dossier.
                  InstitutionProfile (2,312-line card grid) retired from this
                  route; file preserved on disk for reference only. */}
              <Route
                path="print/institutions/:id"
                element={
                  <SuspenseBoundary fallback={<DetailPageSkeleton />}>
                    <InstitutionThread />
                  </SuspenseBoundary>
                }
              />
              {/* thread-draft route removed — InstitutionThread now lives at
                  print/institutions/:id (canonical). Old draft URL no longer needed. */}
              <Route
                path="explore"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <SpatialMap />
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
              {/* v1.0 launch cut — CapturaHeatmap duplicate of /captura. */}
              <Route path="money-flow" element={<Navigate to="/captura" replace />} />
              {/* Plural/singular + recent-rename aliases kept for external links */}
              <Route path="networks" element={<Navigate to="/network" replace />} />
              <Route path="institution-health" element={<Navigate to="/institutions" replace />} />

              {/* v1.0 launch cuts — vendor compare + procurement calendar deferred to v1.1. */}
              <Route path="vendors/compare" element={<Navigate to="/sectors" replace />} />
              <Route path="procurement-calendar" element={<Navigate to="/" replace />} />
              <Route
                path="journalists"
                element={
                  <SuspenseBoundary fallback={<GenericPageSkeleton />}>
                    <Journalists />
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

              {/* English-slug aliases for Observatory story titles → canonical Spanish slugs */}
              <Route path="stories/the-pharmaceutical-cartel" element={<Navigate to="/stories/el-monopolio-invisible" replace />} />
              <Route path="stories/the-intermediary-industry" element={<Navigate to="/stories/la-industria-del-intermediario" replace />} />
              <Route path="stories/the-covid-year" element={<Navigate to="/stories/el-ano-de-la-emergencia" replace />} />
              <Route path="stories/the-ghost-army" element={<Navigate to="/stories/el-ejercito-fantasma" replace />} />
              <Route path="stories/the-big-price" element={<Navigate to="/stories/el-gran-precio" replace />} />
              <Route path="stories/the-invisible-monopoly" element={<Navigate to="/stories/el-monopolio-invisible" replace />} />
              <Route path="stories/the-illusion-of-competition" element={<Navigate to="/stories/la-ilusion-competitiva" replace />} />
              <Route path="stories/institutional-capture" element={<Navigate to="/stories/captura-institucional" replace />} />
              <Route path="stories/the-tide-of-awards" element={<Navigate to="/stories/marea-de-adjudicaciones" replace />} />
              <Route path="stories/the-decade-of-risk" element={<Navigate to="/stories/el-sexenio-del-riesgo" replace />} />
              <Route path="stories/the-300k-threshold" element={<Navigate to="/stories/el-umbral-de-los-300k" replace />} />

              {/* v1.0 launch cut — InstitutionCompare deferred to v1.1. */}
              <Route path="institutions/compare" element={<Navigate to="/institutions" replace />} />

              {/* Route aliases — singular/plural spelling variants */}
              <Route path="sector" element={<Navigate to="/sectors" replace />} />
              <Route path="sector/:id" element={<SectorRedirect />} />
              <Route path="scandals" element={<Navigate to="/cases" replace />} />

              {/* Retired: /collusion merged into /network. */}
              <Route path="collusion" element={<Navigate to="/network" replace />} />

              <Route
                path="scorecards"
                element={<Navigate to="/institutions?tab=fichas" replace />}
              />

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

              {/* Route aliases — common plural/alternate spellings */}
              <Route path="investigations" element={<Navigate to="/investigation" replace />} />
              <Route path="for-journalists" element={<Navigate to="/journalists" replace />} />
              <Route path="newsroom" element={<Navigate to="/journalists" replace />} />
              <Route path="stories" element={<Navigate to="/journalists" replace />} />
              <Route path="metodologia" element={<Navigate to="/methodology" replace />} />
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

              {/* Retired: /states merged into /administrations. */}
              <Route path="states" element={<Navigate to="/administrations" replace />} />

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
