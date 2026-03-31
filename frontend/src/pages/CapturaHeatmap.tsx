/**
 * CapturaHeatmap — Institutional Capture Heatmap
 *
 * Answers ONE question clearly: "Which government institutions are most
 * dependent on a single vendor?"
 *
 * Layout:
 *   1. Editorial header + "What is institutional capture?" explainer
 *   2. Top 5 most captured institutions (data-driven, ranked by dominant vendor share)
 *   3. Filters
 *   4. Full heatmap (desktop) / ranked list (mobile)
 *   5. Methodology note
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { analysisApi } from '@/api/client'
import { cn, formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { ArrowUpRight, Info } from 'lucide-react'

// ---------------------------------------------------------------------------
// Hook: detect mobile viewport (below md = 768px)
// ---------------------------------------------------------------------------
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

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
  pctOfInstitution: number
  avgRisk: number | null
}

// Top capture summary: one row per institution showing its most dominant vendor
interface TopCaptureRow {
  institution: string
  institutionId: number
  topVendor: string
  topVendorId: number
  pct: number
  value: number
  contracts: number
  hhi: number  // Herfindahl-Hirschman Index (0-1) for this institution
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncName(name: string, maxLen = 24): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 1) + '\u2026'
}

/** Risk-based background color for a capture percentage */
function captureColor(pct: number): string {
  if (pct >= 0.5) return 'rgba(220,38,38,0.85)'
  if (pct >= 0.3) return 'rgba(234,88,12,0.75)'
  if (pct >= 0.15) return 'rgba(234,179,8,0.55)'
  if (pct >= 0.05) return 'rgba(234,179,8,0.25)'
  return 'rgba(255,255,255,0.05)'
}

function captureTextColor(pct: number): string {
  if (pct >= 0.3) return 'text-white'
  if (pct >= 0.05) return 'text-white/80'
  return 'text-white/40'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Explainer callout: what is institutional capture */
function WhatIsCaptureBox({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-4">
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="capture-explainer-body"
      >
        <Info className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
        <span className="text-[11px] uppercase tracking-wide text-blue-400 font-semibold">
          {t('whatIsCapture.label')}
        </span>
        <span className="ml-auto text-blue-400/60 text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div id="capture-explainer-body" className="mt-3 space-y-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('whatIsCapture.body')}
          </p>
          <ul className="space-y-1.5">
            {(
              [
                { key: 'total', bg: 'rgba(220,38,38,0.85)' },
                { key: 'high', bg: 'rgba(234,88,12,0.75)' },
                { key: 'moderate', bg: 'rgba(234,179,8,0.55)' },
                { key: 'low', bg: 'rgba(255,255,255,0.12)' },
              ] as const
            ).map(({ key, bg }) => (
              <li key={key} className="flex items-center gap-2 text-xs text-text-muted/80">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ background: bg }}
                  aria-hidden="true"
                />
                {t(`whatIsCapture.thresholds.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Top-5 most-captured institutions as ranked cards */
function TopCapturedList({
  rows,
  t,
}: {
  rows: TopCaptureRow[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted/60 py-4">{t('topCaptured.noData')}</p>
  }

  return (
    <ol className="space-y-2" aria-label={t('topCaptured.label')}>
      {rows.map((row, idx) => {
        const bg = captureColor(row.pct)
        const riskKey =
          row.pct >= 0.5 ? 'riskLabels.total'
          : row.pct >= 0.3 ? 'riskLabels.high'
          : row.pct >= 0.15 ? 'riskLabels.moderate'
          : 'riskLabels.low'

        return (
          <li
            key={`${row.institutionId}-${row.topVendorId}`}
            className="bg-surface-card border border-white/10 rounded-lg px-4 py-3 flex items-start gap-4"
          >
            {/* Rank number */}
            <span
              className="text-2xl font-bold text-text-muted/20 w-8 text-right tabular-nums shrink-0 mt-0.5"
              style={{ fontFamily: 'var(--font-family-serif)' }}
              aria-label={`Rank ${idx + 1}`}
            >
              {idx + 1}
            </span>

            {/* Color bar representing severity */}
            <div
              className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
              style={{ background: bg, minHeight: '2.5rem' }}
              aria-hidden="true"
            />

            {/* Institution + vendor info */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <div
                className="text-[11px] text-text-muted/60 truncate"
                title={row.institution}
              >
                {truncName(row.institution, 48)}
              </div>
              <div className="text-xs text-text-muted/50">
                {t('topCaptured.topVendor')}:{' '}
                <Link
                  to={`/vendors/${row.topVendorId}`}
                  className="font-semibold text-text-primary hover:text-primary transition-colors"
                  title={row.topVendor}
                  aria-label={`${t('topCaptured.viewVendor')}: ${row.topVendor}`}
                >
                  {truncName(row.topVendor, 36)}
                  <ArrowUpRight className="inline ml-0.5 w-3 h-3 opacity-50" aria-hidden="true" />
                </Link>
              </div>
              <div className="text-[10px] text-text-muted/40">
                {formatCompactMXN(row.value)} &middot; {formatNumber(row.contracts)} {t('topCaptured.contracts')}
              </div>
            </div>

            {/* Capture percentage + label */}
            <div className="text-right shrink-0">
              <div
                className="text-lg font-bold tabular-nums leading-tight"
                style={{ color: row.pct >= 0.5 ? '#f87171' : row.pct >= 0.3 ? '#fb923c' : row.pct >= 0.15 ? '#fbbf24' : '#94a3b8' }}
              >
                {formatPercent(row.pct, 1)}
              </div>
              <div className="text-[10px] text-text-muted/50">{t(riskKey)}</div>
              <div className="text-[9px] text-text-muted/30">{t('topCaptured.share')}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** HHI badge: color-coded by concentration level */
function HhiBadge({ hhi, t }: { hhi: number; t: ReturnType<typeof useTranslation>['t'] }) {
  if (hhi > 0.25) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        {t('hhi.highCapture')}
      </span>
    )
  }
  if (hhi > 0.15) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
        {t('hhi.moderate')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-text-muted/50 border border-white/10">
      {t('hhi.low')}
    </span>
  )
}

/** Hero narrative callout: "Top capture: vendor controls X% of institution" */
function HeroCaptureCallout({
  row,
  t,
}: {
  row: TopCaptureRow
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div
      className="border border-red-500/30 bg-red-500/5 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      role="region"
      aria-label={t('hero.worstCapture')}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.25em] uppercase text-red-400/70 font-semibold mb-1">
          {t('hero.worstCapture')}
        </div>
        <div className="text-sm text-text-primary font-medium truncate" title={row.institution}>
          {truncName(row.institution, 52)}
        </div>
        <div className="text-xs text-text-muted/60 mt-0.5">
          {t('topCaptured.topVendor')}:{' '}
          <Link
            to={`/vendors/${row.topVendorId}`}
            className="font-semibold text-text-primary hover:text-primary transition-colors"
            title={row.topVendor}
          >
            {truncName(row.topVendor, 40)}
            <ArrowUpRight className="inline ml-0.5 w-3 h-3 opacity-50" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="text-4xl font-bold tabular-nums leading-none"
          style={{ color: '#f87171', fontFamily: 'var(--font-family-serif)' }}
          aria-label={`${(row.pct * 100).toFixed(1)}%`}
        >
          {formatPercent(row.pct, 1)}
        </div>
        <div className="text-[11px] text-text-muted/50 mt-1">{t('topCaptured.share')}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CapturaHeatmap() {
  const { t } = useTranslation('captura')
  const isMobile = useIsMobile()

  const [sectorId, setSectorId] = useState<number | undefined>(undefined)
  const [yearRange, setYearRange] = useState<string>('all')
  const [minCapture, setMinCapture] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'value' | 'count'>('value')

  const yearParam = useMemo(() => {
    if (yearRange === '2023') return 2023
    if (yearRange === '2018') return 2018
    return undefined
  }, [yearRange])

  const { data: flowData, isLoading, error } = useQuery({
    queryKey: ['money-flow-captura', sectorId, yearParam],
    queryFn: () => analysisApi.getMoneyFlow(yearParam, sectorId),
    staleTime: 10 * 60 * 1000,
  })

  // Build heatmap matrix + derive top-5 capture ranking
  const { cells, institutions, vendors, highCaptureCount, topCaptured } = useMemo(() => {
    const empty = {
      cells: [] as HeatmapCell[],
      institutions: [] as string[],
      vendors: [] as string[],
      highCaptureCount: 0,
      topCaptured: [] as TopCaptureRow[],
    }
    if (!flowData?.flows?.length) return empty

    const flows = flowData.flows

    // Institution totals — built from ALL flows so percentages are correct
    // (the API returns only top-50 flows by value; summing only those 50 as the
    //  denominator would produce inflated percentages when the real total is larger)
    const instTotals = new Map<string, number>()
    const instIds = new Map<string, number>()
    for (const f of flows) {
      instTotals.set(f.source_name, (instTotals.get(f.source_name) || 0) + f.value)
      instIds.set(f.source_name, f.source_id)
    }

    // Top 10 institutions by value
    const topInstitutions = [...instTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name)
    const topInstSet = new Set(topInstitutions)

    const filteredFlows = flows.filter((f) => topInstSet.has(f.source_name))

    // Top 8 vendors
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

    // For top-captured ranking: find each institution's DOMINANT vendor
    // (across ALL flows, not just top-8 vendors)
    const instVendorMap = new Map<
      string,
      { vendorName: string; vendorId: number; value: number; contracts: number }
    >()
    for (const f of flows) {
      if (!topInstSet.has(f.source_name)) continue
      const instTotal = instTotals.get(f.source_name) || 1
      const existing = instVendorMap.get(`${f.source_name}||${f.target_name}`)
      if (!existing) {
        instVendorMap.set(`${f.source_name}||${f.target_name}`, {
          vendorName: f.target_name,
          vendorId: f.target_id,
          value: f.value,
          contracts: f.contracts,
        })
      } else {
        existing.value += f.value
        existing.contracts += f.contracts
      }
      void instTotal
    }

    // Per institution, find the vendor with the highest share
    const bestVendorPerInst = new Map<
      string,
      { vendorName: string; vendorId: number; value: number; contracts: number; pct: number }
    >()
    for (const [key, vendor] of instVendorMap) {
      const instName = key.split('||')[0]
      const instTotal = instTotals.get(instName) || 1
      const pct = vendor.value / instTotal
      const existing = bestVendorPerInst.get(instName)
      if (!existing || pct > existing.pct) {
        bestVendorPerInst.set(instName, { ...vendor, pct })
      }
    }

    // Compute HHI per institution: Σ(share_i²) across all vendors of that institution
    // Higher HHI means more concentrated / captured
    const hhiByInst = new Map<string, number>()
    // Group vendor shares per institution
    const instVendorShares = new Map<string, number[]>()
    for (const [key, vendor] of instVendorMap) {
      const instName = key.split('||')[0]
      const instTotal = instTotals.get(instName) || 1
      const share = vendor.value / instTotal
      if (!instVendorShares.has(instName)) instVendorShares.set(instName, [])
      instVendorShares.get(instName)!.push(share)
    }
    for (const [instName, shares] of instVendorShares) {
      const hhi = shares.reduce((sum, s) => sum + s * s, 0)
      hhiByInst.set(instName, hhi)
    }

    // Build top-5 ranking sorted by dominant vendor share
    const topCapturedRows: TopCaptureRow[] = [...bestVendorPerInst.entries()]
      .map(([instName, vendor]) => ({
        institution: instName,
        institutionId: instIds.get(instName) ?? 0,
        topVendor: vendor.vendorName,
        topVendorId: vendor.vendorId,
        pct: vendor.pct,
        value: vendor.value,
        contracts: vendor.contracts,
        hhi: hhiByInst.get(instName) ?? 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)

    return {
      cells: [...cellMap.values()],
      institutions: topInstitutions,
      vendors: topVendors,
      highCaptureCount: highCapture,
      topCaptured: topCapturedRows,
    }
  }, [flowData])

  // Apply minCapture filter to top-captured rows
  const filteredTopCaptured = useMemo(
    () => topCaptured.filter((r) => r.pct >= minCapture / 100),
    [topCaptured, minCapture]
  )

  // Hero row: highest-capture institution (always from unfiltered topCaptured)
  const heroRow = topCaptured.length > 0 ? topCaptured[0] : null

  const cellLookup = useMemo(() => {
    const map = new Map<string, HeatmapCell>()
    for (const c of cells) map.set(`${c.institution}||${c.vendor}`, c)
    return map
  }, [cells])

  const mobileRankedPairs = useMemo(
    () =>
      [...cells]
        .filter((c) => c.pctOfInstitution > 0 && c.pctOfInstitution >= minCapture / 100)
        .sort((a, b) => b.pctOfInstitution - a.pctOfInstitution)
        .slice(0, 20),
    [cells, minCapture]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ===== Editorial header ===== */}
      <div className="border-b border-border pb-6 mb-8">
        <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
          {t('trackingLabel')}
        </div>
        <h1
          style={{ fontFamily: 'var(--font-family-serif)' }}
          className="text-2xl font-bold text-text-primary mb-2"
        >
          {t('title')}
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          {t('subtitle')}
        </p>
      </div>

      {/* ===== "What is institutional capture?" explainer ===== */}
      <WhatIsCaptureBox t={t} />

      {/* ===== Source pill + stats row ===== */}
      {flowData && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted/60"
        >
          <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
            COMPRANET &middot; {formatNumber(flowData.total_contracts)} {t('sourcePill')}
          </span>
          <span>
            {t('stats.capturedInstitutions')}: {institutions.length}
          </span>
          <span>
            {t('stats.dominantVendors')}: {vendors.length}
          </span>
          {highCaptureCount > 0 && (
            <span className="text-red-400">
              {t('stats.highCaptureFlows')}: {highCaptureCount}
            </span>
          )}
        </motion.div>
      )}

      {/* ===== Filters ===== */}
      <div className="space-y-3">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-2">
            {t('filters.bySector')}
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={sectorId ?? ''}
              onChange={(e) =>
                setSectorId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="bg-surface-card border border-white/10 rounded-md px-3 py-1.5 text-sm text-text-primary"
              aria-label={t('filters.bySector')}
            >
              <option value="">{t('filters.allSectors')}</option>
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={yearRange}
              onChange={(e) => setYearRange(e.target.value)}
              className="bg-surface-card border border-white/10 rounded-md px-3 py-1.5 text-sm text-text-primary"
              aria-label={t('filters.allYears')}
            >
              <option value="all">{t('filters.allYears')}</option>
              <option value="2018">{t('filters.period2018')}</option>
              <option value="2023">{t('filters.period2023')}</option>
            </select>
          </div>
        </div>

        {/* Capture threshold filter pills */}
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-2">
            {t('filters.captureThreshold')}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('filters.captureThreshold')}>
            {([
              { value: 0, label: t('filters.allCapture') },
              { value: 15, label: t('filters.capture15') },
              { value: 30, label: t('filters.capture30') },
              { value: 50, label: t('filters.capture50') },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMinCapture(value)}
                aria-pressed={minCapture === value}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  minCapture === value
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-surface-card border-white/10 text-text-muted/70 hover:border-white/30 hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* View mode toggle */}
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-2">
            {t('filters.displayMode')}
          </div>
          <div className="flex gap-2" role="group" aria-label={t('filters.displayMode')}>
            {([
              { mode: 'value' as const, label: t('filters.byValue') },
              { mode: 'count' as const, label: t('filters.byCount') },
            ]).map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  viewMode === mode
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-surface-card border-white/10 text-text-muted/70 hover:border-white/30 hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Loading skeleton ===== */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <div className="grid grid-cols-9 gap-1 mt-4">
            {Array.from({ length: 90 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
      )}

      {/* ===== Error ===== */}
      {error && !isLoading && (
        <div className="bg-surface-card border border-red-500/20 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">
            {t('errorTitle')}
          </h3>
          <p className="text-text-muted text-sm">{t('errorMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('errorHint')}</p>
        </div>
      )}

      {/* ===== Empty state ===== */}
      {!isLoading && !error && institutions.length === 0 && (
        <div className="bg-surface-card border border-white/10 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">
            {t('emptyTitle')}
          </h3>
          <p className="text-text-muted text-sm">{t('emptyMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('emptyHint')}</p>
        </div>
      )}

      {/* ===== Hero Narrative Callout: worst single capture ===== */}
      {!isLoading && !error && heroRow && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <HeroCaptureCallout row={heroRow} t={t} />
        </motion.div>
      )}

      {/* ===== Top 5 most-captured institutions ===== */}
      {!isLoading && !error && topCaptured.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          aria-labelledby="top-captured-heading"
        >
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-1">
            {t('topCaptured.label')}
          </div>
          <p className="text-[11px] text-text-muted/40 mb-3">
            {t('topCaptured.sublabel')}
          </p>
          <h2 id="top-captured-heading" className="sr-only">
            {t('topCaptured.label')}
          </h2>
          {/* HHI badge strip for the top row */}
          {topCaptured.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 items-center">
              <span className="text-[10px] text-text-muted/40">{t('hhi.label')}:</span>
              {topCaptured.slice(0, 3).map((row) => (
                <span key={row.institutionId} className="flex items-center gap-1.5 text-[10px] text-text-muted/50">
                  <span className="truncate max-w-[120px]" title={row.institution}>
                    {truncName(row.institution, 18)}
                  </span>
                  <HhiBadge hhi={row.hhi} t={t} />
                </span>
              ))}
            </div>
          )}
          <TopCapturedList rows={filteredTopCaptured} t={t} />
          {filteredTopCaptured.length === 0 && minCapture > 0 && (
            <p className="text-sm text-text-muted/50 py-2">
              {t('filters.noResults', { pct: minCapture })}
            </p>
          )}
        </motion.section>
      )}

      {/* ===== Mobile: ranked list ===== */}
      {!isLoading && !error && isMobile && mobileRankedPairs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-2"
        >
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-3">
            {t('heatmap.mobileLabel')}
          </div>
          <ol className="space-y-2" aria-label={t('heatmap.mobileLabel')}>
            {mobileRankedPairs.map((cell, idx) => {
              const riskKey =
                cell.pctOfInstitution >= 0.5 ? 'riskLabels.total'
                : cell.pctOfInstitution >= 0.3 ? 'riskLabels.high'
                : cell.pctOfInstitution >= 0.15 ? 'riskLabels.moderate'
                : 'riskLabels.low'

              return (
                <li
                  key={`${cell.institution}||${cell.vendor}`}
                  className="bg-surface-card border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-[13px] font-mono text-text-muted/50 w-5 shrink-0 text-right">
                    {idx + 1}
                  </span>
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ background: captureColor(cell.pctOfInstitution) }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[11px] text-text-muted/60 truncate mb-0.5"
                      title={cell.institution}
                    >
                      {truncName(cell.institution, 32)}
                    </div>
                    <Link
                      to={`/vendors/${cell.vendorId}`}
                      className="text-sm font-medium text-text-primary hover:text-primary truncate block"
                      title={cell.vendor}
                    >
                      {truncName(cell.vendor, 32)}
                      <ArrowUpRight className="inline ml-1 w-3 h-3 opacity-50" aria-hidden="true" />
                    </Link>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="text-sm font-semibold tabular-nums"
                      style={{
                        color:
                          cell.pctOfInstitution >= 0.5 ? '#f87171'
                          : cell.pctOfInstitution >= 0.3 ? '#fb923c'
                          : cell.pctOfInstitution >= 0.15 ? '#fbbf24'
                          : '#94a3b8',
                      }}
                    >
                      {formatPercent(cell.pctOfInstitution, 1)}
                    </div>
                    <div className="text-[10px] text-text-muted/50">{t(riskKey)}</div>
                    <div className="text-[10px] text-text-muted/40">
                      {formatCompactMXN(cell.value)}
                    </div>
                    <div className="text-[10px] text-text-muted/40">
                      {formatNumber(cell.contracts)} {t('heatmap.contracts')}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </motion.div>
      )}

      {/* ===== Heatmap (desktop only) ===== */}
      {!isLoading && !error && institutions.length > 0 && vendors.length > 0 && !isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-surface-card border border-white/10 rounded-xl p-4 md:p-6 overflow-x-auto"
        >
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-4">
            {t('heatmap.sectionLabel')}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-[10px] text-text-muted/60">
            {(
              [
                { key: 'legend.total', bg: 'rgba(220,38,38,0.85)' },
                { key: 'legend.high', bg: 'rgba(234,88,12,0.75)' },
                { key: 'legend.moderate', bg: 'rgba(234,179,8,0.55)' },
                { key: 'legend.low', bg: 'rgba(255,255,255,0.05)' },
              ] as const
            ).map(({ key, bg }) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: bg }} aria-hidden="true" />
                {t(key)}
              </span>
            ))}
          </div>

          {/* CSS Grid heatmap */}
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `200px repeat(${vendors.length}, minmax(100px, 1fr))`,
            }}
            role="table"
            aria-label={t('title')}
          >
            {/* Header row */}
            <div role="columnheader" className="text-[10px] text-text-muted/40 font-medium" />
            {vendors.map((v) => (
              <div
                key={v}
                role="columnheader"
                className="text-[10px] text-text-muted/60 font-medium px-1 pb-2 truncate"
                style={{
                  writingMode: 'vertical-lr',
                  transform: 'rotate(180deg)',
                  height: '120px',
                }}
                title={v}
              >
                {truncName(v, 28)}
              </div>
            ))}

            {/* Data rows */}
            {institutions.map((inst) => (
              <React.Fragment key={inst}>
                <div
                  role="rowheader"
                  className="text-[11px] text-text-primary/80 font-medium truncate flex items-center pr-2"
                  title={inst}
                >
                  {truncName(inst, 28)}
                </div>
                {vendors.map((v) => {
                  const cell = cellLookup.get(`${inst}||${v}`)
                  const pct = cell?.pctOfInstitution ?? 0
                  return (
                    <div
                      key={`${inst}||${v}`}
                      role="cell"
                      className={cn(
                        'relative rounded-sm min-h-[48px] flex flex-col items-center justify-center cursor-default transition-all hover:ring-1 hover:ring-white/30 group',
                        captureTextColor(pct)
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
                            {viewMode === 'count'
                              ? `${formatNumber(cell.contracts)} contr.`
                              : formatCompactMXN(cell.value)}
                          </span>
                        </>
                      ) : cell ? (
                        <span className="text-[9px] opacity-30">&lt;1%</span>
                      ) : null}

                      {cell && (
                        <Link
                          to={`/vendors/${cell.vendorId}`}
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/40 rounded-sm transition-opacity"
                          aria-label={`${t('topCaptured.viewVendor')}: ${v}`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== Methodology footer ===== */}
      <div className="bg-surface-card/50 border border-white/5 rounded-xl p-5 text-xs text-text-muted/50 space-y-1">
        <h4 className="font-serif text-text-muted/70 text-sm">{t('methodology.title')}</h4>
        <p>{t('methodology.content')}</p>
      </div>
    </div>
  )
}
