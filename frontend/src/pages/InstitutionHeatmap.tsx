/**
 * InstitutionHeatmap — institution × sector risk matrix
 * Route: /heatmap
 *
 * Fetches the top 20 institutions by contract count, then fetches CRI scatter
 * data (which includes per-sector risk scores) and cross-references to build a
 * 20×12 risk matrix. Renders the existing <Heatmap> ECharts component.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Heatmap } from '@/components/charts/Heatmap'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { analysisApi, institutionApi } from '@/api/client'
import type { InstitutionHealthItem } from '@/api/types'
import { SECTORS } from '@/lib/constants'
import { toTitleCase, formatNumber, cn } from '@/lib/utils'
import { AlertCircle, Grid3X3, Info } from 'lucide-react'

// ============================================================================
// Helper: truncate institution name for display
// ============================================================================
function shortName(name: string): string {
  const n = toTitleCase(name)
  return n.length > 32 ? n.slice(0, 30) + '…' : n
}

// ============================================================================
// Build heatmap matrix from institutions + scatter data
//
// Strategy:
//   1. Fetch top 20 institutions from institution-rankings (sorted by contracts).
//   2. Fetch getCriScatter with no sector filter to get per-institution, per-sector
//      data (institution_id, sector_code, avg_risk).
//   3. Build a map: institutionId → sectorNameEN → avg_risk.
//   4. For institutions that appear in both, populate cells.
//   5. For institutions that appear only in rankings (not in scatter per-sector),
//      fill all cells with their overall avg_risk_score as a fallback.
// ============================================================================
interface ScatterRow {
  id: number
  name: string
  sector_id: number
  sector_code: string
  avg_risk: number
  total_contracts: number
}

function buildMatrix(
  institutions: InstitutionHealthItem[],
  scatterRows: ScatterRow[],
  sectorCols: string[]
): { rows: string[]; data: Array<{ row: string; col: string; value: number | null }> } {
  // Build lookup: institution_id → sector.code → avg_risk
  const lookup = new Map<number, Map<string, number>>()
  for (const row of scatterRows) {
    if (!lookup.has(row.id)) {
      lookup.set(row.id, new Map())
    }
    const sector = SECTORS.find((s) => s.id === row.sector_id || s.code === row.sector_code)
    if (sector) {
      lookup.get(row.id)!.set(sector.code, row.avg_risk)
    }
  }

  const top20 = institutions.slice(0, 20)
  const rows = top20.map((inst) => shortName(inst.institution_name))

  const data: Array<{ row: string; col: string; value: number | null }> = []
  for (const inst of top20) {
    const rowLabel = shortName(inst.institution_name)
    const sectorMap = lookup.get(inst.institution_id)

    for (let i = 0; i < SECTORS.length; i++) {
      const sectorCode = SECTORS[i].code
      const col = sectorCols[i]
      const value = sectorMap?.get(sectorCode) ?? null
      data.push({ row: rowLabel, col, value })
    }
  }

  return { rows, data }
}

// ============================================================================
// Loading skeleton
// ============================================================================
function HeatmapSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-[480px] w-full rounded-lg mt-4" />
    </div>
  )
}

// ============================================================================
// Main page
// ============================================================================
export default function InstitutionHeatmap() {
  const navigate = useNavigate()
  const { t } = useTranslation('institutions')
  const { t: ts } = useTranslation('sectors')

  // Fetch top 20 institutions by contract count
  const {
    data: rankingsData,
    isLoading: loadingRankings,
    error: rankingsError,
  } = useQuery({
    queryKey: ['institution-rankings-heatmap'],
    queryFn: () => analysisApi.getInstitutionRankings('contracts', 50, 50),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch per-institution per-sector risk data from CRI scatter
  // This endpoint returns rows with {id, sector_id, sector_code, avg_risk, total_contracts, ...}
  const {
    data: scatterData,
    isLoading: loadingScatter,
    error: scatterError,
  } = useQuery({
    queryKey: ['institution-cri-scatter-heatmap'],
    queryFn: () => institutionApi.getCriScatter({ min_contracts: 10, limit: 200 }),
    staleTime: 10 * 60 * 1000,
  })

  const isLoading = loadingRankings || loadingScatter
  const hasError = rankingsError || scatterError

  // Translated sector column names (depend on active language)
  const sectorCols = useMemo(() => SECTORS.map((s) => ts(s.code)), [ts])
  // Map translated name → sector id (rebuilt when language changes)
  const sectorNameToId = useMemo(
    () => Object.fromEntries(SECTORS.map((s) => [ts(s.code), s.id])),
    [ts]
  )

  const { rows, heatmapData, institutionIds } = useMemo(() => {
    if (!rankingsData?.data) {
      return { rows: [], heatmapData: [], institutionIds: new Map<string, number>() }
    }
    const institutions = rankingsData.data.slice(0, 20)
    const scatterRows: ScatterRow[] = (scatterData?.data ?? []) as ScatterRow[]
    const { rows: r, data: d } = buildMatrix(institutions, scatterRows, sectorCols)

    // Build reverse lookup: shortName → institution_id
    const idMap = new Map<string, number>()
    for (const inst of institutions) {
      idMap.set(shortName(inst.institution_name), inst.institution_id)
    }

    // Filter out null-value cells so heatmap shows empty/gray for missing sector data
    const filteredData = d.filter((item): item is { row: string; col: string; value: number } => item.value !== null)

    return { rows: r, heatmapData: filteredData, institutionIds: idMap }
  }, [rankingsData, scatterData, sectorCols])

  const handleCellClick = (row: string, col: string, _value: number) => {
    const instId = institutionIds.get(row)
    const sectorId = sectorNameToId[col]
    if (instId && sectorId) {
      navigate(`/contracts?institution_id=${instId}&sector_id=${sectorId}`)
    } else if (instId) {
      navigate(`/institutions/${instId}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent/60 mb-1.5">
          {t('heatmapPage.eyebrow')}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <Grid3X3 className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-text-primary">
            {t('heatmapPage.title')}
          </h1>
        </div>
        <p className="text-sm text-text-muted max-w-2xl">
          {t('heatmapPage.description')}
        </p>
        <div className="flex items-start gap-2 mt-3 text-xs text-text-muted bg-background-card border border-border/50 rounded-md px-3 py-2 max-w-lg">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-accent/60" aria-hidden="true" />
          <span>{t('heatmapPage.clickHint')}</span>
        </div>
      </div>

      {/* Error state */}
      {hasError && !isLoading && (
        <div
          className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2 mb-6"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">{t('heatmapPage.errorTitle')}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {t('heatmapPage.errorDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <HeatmapSkeleton />
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      {!isLoading && !hasError && rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{t('heatmapPage.matrixTitle')}</span>
              {rankingsData && (
                <span className="text-xs font-normal text-text-muted">
                  {t('heatmapPage.matrixSubtitle', { n: rows.length, m: sectorCols.length })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap
              data={heatmapData}
              rows={rows}
              columns={sectorCols}
              height={Math.max(400, rows.length * 28 + 80)}
              valueFormatter={(v) => (v > 0 ? (v * 100).toFixed(0) + '%' : '—')}
              onCellClick={handleCellClick}
            />
            <p className="text-[10px] text-text-muted text-center mt-2">
              {t('heatmapPage.footnote')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !hasError && rows.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Grid3X3 className="h-10 w-10 mx-auto text-text-muted/30 mb-4" aria-hidden="true" />
            <p className="text-sm text-text-muted">{t('heatmapPage.empty')}</p>
          </CardContent>
        </Card>
      )}

      {/* Institution legend */}
      {!isLoading && rows.length > 0 && rankingsData?.data && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
            {t('heatmapPage.legendTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {rankingsData.data.slice(0, 20).map((inst, i) => (
              <button
                key={inst.institution_id}
                onClick={() => navigate(`/institutions/${inst.institution_id}`)}
                className={cn(
                  'flex items-center gap-2 text-left rounded-md border border-border/40 px-2.5 py-1.5',
                  'hover:bg-sidebar-hover/40 hover:border-accent/30 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent'
                )}
                aria-label={`View institution: ${inst.institution_name}`}
              >
                <span className="text-[10px] font-mono text-text-muted/50 w-5 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs text-text-secondary truncate">
                  {shortName(inst.institution_name)}
                </span>
                <span className="ml-auto text-[10px] font-mono text-text-muted/60 flex-shrink-0">
                  {formatNumber(inst.total_contracts)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
