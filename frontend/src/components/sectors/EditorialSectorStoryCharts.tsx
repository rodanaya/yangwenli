/**
 * EditorialSectorStoryCharts — self-fetching wrappers for story narrative pipeline
 *
 * n-P1 (2026-05-04): Registers 5 sector chart components into the InlineCharts
 * / StoryNarrative chart registry. Each wrapper below fetches its own data via
 * sectorApi.getAll() or categoriesApi.getSummary() — story chapters only need
 * to specify chartConfig.type; no data payload is required.
 *
 * Registered types:
 *   editorial-treemap   → SectorTreemapStory   (wraps SectorTreemap)
 *   editorial-beeswarm  → RiskSpendBeeswarmStory (wraps RiskSpendBeeswarm)
 *   editorial-swimlane  → CategorySwimlaneStory  (wraps CategorySectorSwimlane)
 *   editorial-dumbbell  → CategoryDumbbellStory  (wraps CategoryCaptureDumbbell)
 *
 * Note: CompetitionSlopeChart (editorial-slope) already self-fetches and is
 * registered directly — no wrapper needed.
 *
 * Plan: docs/DASHBOARD_OBSERVATORY_NEWSROOM_PLAN.md PART C.3
 */

import { useQuery } from '@tanstack/react-query'
import { sectorApi, categoriesApi } from '@/api/client'
import { SectorTreemap } from './SectorTreemap'
import { RiskSpendBeeswarm } from './RiskSpendBeeswarm'
import { CategorySectorSwimlane } from './CategorySectorSwimlane'
import { CategoryCaptureDumbbell } from './CategoryCaptureDumbbell'

// ---------------------------------------------------------------------------
// Shared skeleton — matches the ChartCard border/bg rhythm from InlineCharts
// ---------------------------------------------------------------------------
function ChartLoadingShell() {
  return (
    <div
      className="w-full bg-background-card my-8"
      style={{
        borderLeft: '3px solid #a06820',
        borderTop: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        borderRadius: 2,
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="status"
      aria-label="Cargando gráfico…"
    >
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
      >
        Cargando…
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// editorial-treemap → SectorTreemap
// ---------------------------------------------------------------------------
export function SectorTreemapStory() {
  const { data, isLoading } = useQuery({
    queryKey: ['sectors', 'list'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
  if (isLoading || !data?.data?.length) return <ChartLoadingShell />
  return <SectorTreemap sectors={data.data} />
}

// ---------------------------------------------------------------------------
// editorial-beeswarm → RiskSpendBeeswarm
// ---------------------------------------------------------------------------
export function RiskSpendBeeswarmStory() {
  const { data, isLoading } = useQuery({
    queryKey: ['sectors', 'list'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
  if (isLoading || !data?.data?.length) return <ChartLoadingShell />
  return <RiskSpendBeeswarm sectors={data.data} />
}

// ---------------------------------------------------------------------------
// editorial-swimlane → CategorySectorSwimlane
// ---------------------------------------------------------------------------
export function CategorySwimlaneStory() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })
  const categories = (data as { data?: unknown[] } | undefined)?.data ?? []
  if (isLoading || !categories.length) return <ChartLoadingShell />
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CategorySectorSwimlane categories={categories as any} />
}

// ---------------------------------------------------------------------------
// editorial-dumbbell → CategoryCaptureDumbbell
// ---------------------------------------------------------------------------
export function CategoryDumbbellStory() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })
  const categories = (data as { data?: unknown[] } | undefined)?.data ?? []
  if (isLoading || !categories.length) return <ChartLoadingShell />
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CategoryCaptureDumbbell categories={categories as any} />
}
