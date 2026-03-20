/**
 * CapturaHeatmap — Institutional Capture Heatmap
 *
 * Replaces the old Money Flow page. Shows a heatmap of institution-vendor
 * concentration: rows = top institutions, columns = top vendors, cells = value.
 * High concentration = "captura institucional" (institutional capture).
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { analysisApi } from '@/api/client'
import { cn, formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { ArrowUpRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeatmapCell {
  institution: string
  institutionId: number
  vendor: string
  vendorId: number
  value: number
  contracts: number
  pctOfInstitution: number // vendor's share of institution total
  avgRisk: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate a name to maxLen chars */
function truncName(name: string, maxLen = 24): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 1) + '\u2026'
}

/** Risk-based color for a capture percentage: white -> amber -> red */
function captureColor(pct: number): string {
  if (pct >= 0.5) return 'rgba(220,38,38,0.85)' // red-600
  if (pct >= 0.3) return 'rgba(234,88,12,0.75)' // orange-600
  if (pct >= 0.15) return 'rgba(234,179,8,0.55)' // yellow-500
  if (pct >= 0.05) return 'rgba(234,179,8,0.25)' // light amber
  return 'rgba(255,255,255,0.05)'
}

function captureTextColor(pct: number): string {
  if (pct >= 0.3) return 'text-white'
  if (pct >= 0.05) return 'text-white/80'
  return 'text-white/40'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CapturaHeatmap() {
  const { t } = useTranslation('captura')

  // Filters
  const [sectorId, setSectorId] = useState<number | undefined>(undefined)
  const [yearRange, setYearRange] = useState<string>('all')

  // Determine year param for API
  const yearParam = useMemo(() => {
    if (yearRange === '2023') return 2023
    if (yearRange === '2018') return 2018
    return undefined
  }, [yearRange])

  // Fetch money flow data
  const { data: flowData, isLoading, error } = useQuery({
    queryKey: ['money-flow-captura', sectorId, yearParam],
    queryFn: () => analysisApi.getMoneyFlow(yearParam, sectorId),
    staleTime: 10 * 60 * 1000,
  })

  // Build heatmap matrix
  const { cells, institutions, vendors, highCaptureCount } = useMemo(() => {
    if (!flowData?.flows?.length) {
      return { cells: [] as HeatmapCell[], institutions: [] as string[], vendors: [] as string[], highCaptureCount: 0 }
    }

    const flows = flowData.flows

    // Compute institution totals
    const instTotals = new Map<string, number>()
    for (const f of flows) {
      const key = f.source_name
      instTotals.set(key, (instTotals.get(key) || 0) + f.value)
    }

    // Top 10 institutions by total value
    const topInstitutions = [...instTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name)
    const topInstSet = new Set(topInstitutions)

    // Filter flows to top institutions
    const filteredFlows = flows.filter((f) => topInstSet.has(f.source_name))

    // Top 8 vendors across those flows
    const vendorTotals = new Map<string, number>()
    for (const f of filteredFlows) {
      vendorTotals.set(f.target_name, (vendorTotals.get(f.target_name) || 0) + f.value)
    }
    const topVendors = [...vendorTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name)
    const topVendorSet = new Set(topVendors)

    // Build cells
    const cellMap = new Map<string, HeatmapCell>()
    for (const f of filteredFlows) {
      if (!topVendorSet.has(f.target_name)) continue
      const key = `${f.source_name}||${f.target_name}`
      const existing = cellMap.get(key)
      if (existing) {
        existing.value += f.value
        existing.contracts += f.contracts
      } else {
        cellMap.set(key, {
          institution: f.source_name,
          institutionId: f.source_id,
          vendor: f.target_name,
          vendorId: f.target_id,
          value: f.value,
          contracts: f.contracts,
          pctOfInstitution: 0,
          avgRisk: f.avg_risk,
        })
      }
    }

    // Compute pctOfInstitution
    let highCapture = 0
    for (const cell of cellMap.values()) {
      const instTotal = instTotals.get(cell.institution) || 1
      cell.pctOfInstitution = cell.value / instTotal
      if (cell.pctOfInstitution > 0.3) highCapture++
    }

    return {
      cells: [...cellMap.values()],
      institutions: topInstitutions,
      vendors: topVendors,
      highCaptureCount: highCapture,
    }
  }, [flowData])

  // Lookup cell for a given institution+vendor
  const cellLookup = useMemo(() => {
    const map = new Map<string, HeatmapCell>()
    for (const c of cells) {
      map.set(`${c.institution}||${c.vendor}`, c)
    }
    return map
  }, [cells])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Editorial header — "TERRITORIOS OCUPADOS" */}
      <div className="border-b border-border pb-6 mb-8">
        <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
          Captura Institucional &middot; {t('trackingLabel', 'An\u00e1lisis de Concentraci\u00f3n')}
        </div>
        <h1 style={{ fontFamily: 'var(--font-family-serif)' }} className="text-4xl font-bold text-text-primary mb-2">
          Territorios Ocupados
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          Mapa de captura institucional: cu\u00e1ndo un proveedor controla el presupuesto de contrataci\u00f3n
          de una instituci\u00f3n. Guerrero SDUYOP: <strong className="text-risk-critical">96.4%</strong> de
          sus contratos van a un solo proveedor &mdash; $2.55B MXN.
        </p>
      </div>

      {/* Source pill + stats row */}
      {flowData && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted/60"
        >
          <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
            COMPRANET &middot; {formatNumber(flowData.total_contracts)} {t('sourcePill')}
          </span>
          <span>{t('stats.capturedInstitutions')}: {institutions.length}</span>
          <span>{t('stats.dominantVendors')}: {vendors.length}</span>
          {highCaptureCount > 0 && (
            <span className="text-red-400">
              {t('stats.highCaptureFlows')}: {highCaptureCount}
            </span>
          )}
        </motion.div>
      )}

      {/* "CASO EXTREMO" callout */}
      <div className="border border-risk-critical/30 bg-risk-critical/5 rounded p-4">
        <div className="text-[10px] uppercase tracking-wide text-risk-critical font-semibold mb-2">
          Caso Extremo Documentado
        </div>
        <p className="text-sm text-text-primary">
          <strong>GUERRERO &mdash; SDUYOP</strong>: 96.4% de su presupuesto de obra p\u00fablica
          adjudicado a CONSTRUCTORA ARHNOS. Monto: $2.55B MXN.
          Esto equivale a la captura total de una instituci\u00f3n p\u00fablica.
        </p>
      </div>

      {/* Filters — "FILTRAR TERRITORIO" */}
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-2">
          Filtrar Territorio
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={sectorId ?? ''}
            onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-surface-card border border-white/10 rounded-md px-3 py-1.5 text-sm text-text-primary"
            aria-label={t('filters.bySector')}
          >
            <option value="">{t('filters.allSectors')}</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={yearRange}
            onChange={(e) => setYearRange(e.target.value)}
            className="bg-surface-card border border-white/10 rounded-md px-3 py-1.5 text-sm text-text-primary"
            aria-label="Year range"
          >
            <option value="all">{t('filters.allYears')}</option>
            <option value="2018">{t('filters.period2018')}</option>
            <option value="2023">{t('filters.period2023')}</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 90 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="bg-surface-card border border-red-500/20 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">{t('errorTitle')}</h3>
          <p className="text-text-muted text-sm">{t('errorMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('errorHint')}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && institutions.length === 0 && (
        <div className="bg-surface-card border border-white/10 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">{t('emptyTitle')}</h3>
          <p className="text-text-muted text-sm">{t('emptyMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('emptyHint')}</p>
        </div>
      )}

      {/* Heatmap */}
      {!isLoading && !error && institutions.length > 0 && vendors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-surface-card border border-white/10 rounded-xl p-4 md:p-6 overflow-x-auto"
        >
          {/* Section label */}
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-4">
            Mapa de Concentraci\u00f3n
          </div>

          {/* Legend — editorial labels */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-[10px] text-text-muted/60">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(220,38,38,0.85)' }} />
              Captura Total (&gt;50%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(234,88,12,0.75)' }} />
              Alto Riesgo (30-50%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(234,179,8,0.55)' }} />
              Moderado (15-30%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)' }} />
              Bajo (&lt;15%)
            </span>
          </div>

          {/* CSS Grid heatmap */}
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `200px repeat(${vendors.length}, minmax(100px, 1fr))`,
            }}
            role="table"
            aria-label="Territorios Ocupados"
          >
            {/* Header row: empty corner + vendor names */}
            <div role="columnheader" className="text-[10px] text-text-muted/40 font-medium" />
            {vendors.map((v) => (
              <div
                key={v}
                role="columnheader"
                className="text-[10px] text-text-muted/60 font-medium px-1 pb-2 truncate"
                style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: '120px' }}
                title={v}
              >
                {truncName(v, 28)}
              </div>
            ))}

            {/* Data rows */}
            {institutions.map((inst) => (
              <>
                {/* Row header: institution name */}
                <div
                  key={`label-${inst}`}
                  role="rowheader"
                  className="text-[11px] text-text-primary/80 font-medium truncate flex items-center pr-2"
                  title={inst}
                >
                  {truncName(inst, 28)}
                </div>

                {/* Cells */}
                {vendors.map((v) => {
                  const cell = cellLookup.get(`${inst}||${v}`)
                  const pct = cell?.pctOfInstitution ?? 0
                  return (
                    <div
                      key={`${inst}||${v}`}
                      role="cell"
                      className={cn(
                        'relative rounded-sm min-h-[48px] flex flex-col items-center justify-center cursor-default transition-all hover:ring-1 hover:ring-white/30 group',
                        captureTextColor(pct),
                      )}
                      style={{ background: captureColor(pct) }}
                      title={
                        cell
                          ? `${inst} \u2192 ${v}\n${formatCompactMXN(cell.value)} (${(pct * 100).toFixed(1)}% ${t('heatmap.pctBudget')})\n${formatNumber(cell.contracts)} ${t('heatmap.contracts')}`
                          : `${inst} \u2192 ${v}\n\u2014`
                      }
                    >
                      {cell && pct > 0.01 ? (
                        <>
                          <span className="text-[11px] font-semibold leading-tight">
                            {formatPercent(pct, 0)}
                          </span>
                          <span className="text-[9px] opacity-60 leading-tight">
                            {formatCompactMXN(cell.value)}
                          </span>
                        </>
                      ) : cell ? (
                        <span className="text-[9px] opacity-30">&lt;1%</span>
                      ) : null}

                      {/* Hover: link to vendor */}
                      {cell && (
                        <Link
                          to={`/vendors/${cell.vendorId}`}
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/40 rounded-sm transition-opacity"
                          aria-label={`View vendor ${v}`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                        </Link>
                      )}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </motion.div>
      )}

      {/* Methodology footer */}
      <div className="bg-surface-card/50 border border-white/5 rounded-xl p-5 text-xs text-text-muted/50 space-y-1">
        <h4 className="font-serif text-text-muted/70 text-sm">{t('methodology.title')}</h4>
        <p>{t('methodology.content')}</p>
      </div>
    </div>
  )
}
