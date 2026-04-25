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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { analysisApi } from '@/api/client'
import { cn, formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { ArrowUpRight, Info } from 'lucide-react'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

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
  return name.slice(0, maxLen - 1) + '…'
}

/** Risk-based background color for a capture percentage */
function captureColor(pct: number): string {
  // color-mix lets us reuse the canonical risk hues at varying alpha so the
  // heatmap stays in sync with the rest of the platform palette. Was 5 raw
  // rgba() constants — including rgba(255,255,255,0.05) which read as a
  // ghostly bright tile on the cream broadsheet.
  if (pct >= 0.5)
    return 'color-mix(in srgb, var(--color-risk-critical) 85%, transparent)'
  if (pct >= 0.3)
    return 'color-mix(in srgb, var(--color-sector-infraestructura) 75%, transparent)'
  if (pct >= 0.15)
    return 'color-mix(in srgb, var(--color-risk-high) 55%, transparent)'
  if (pct >= 0.05)
    return 'color-mix(in srgb, var(--color-risk-high) 25%, transparent)'
  return 'var(--color-background-elevated)'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Explainer callout: what is institutional capture */
function WhatIsCaptureBox({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-blue-500/20 bg-blue-500/5 rounded-sm p-4">
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
                { key: 'total' as const, bg: 'rgba(220,38,38,0.85)' },
                { key: 'high' as const, bg: 'rgba(234,88,12,0.75)' },
                { key: 'moderate' as const, bg: 'rgba(234,179,8,0.55)' },
                { key: 'low' as const, bg: 'rgba(255,255,255,0.12)' },
              ]
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

/** "Why it matters" expandable accordion */
function WhyItMattersBox({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-amber-500/20 bg-amber-500/5 rounded-sm p-4 mb-4">
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="why-it-matters-body"
      >
        <Info className="w-4 h-4 text-risk-high shrink-0" aria-hidden="true" />
        <span className="text-[11px] uppercase tracking-wide text-risk-high font-semibold">
          {t('whyItMatters.label')}
        </span>
        <span className="ml-auto text-risk-high/60 text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div id="why-it-matters-body" className="mt-3 space-y-2">
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('whyItMatters.intro')}
          </p>
          <ul className="space-y-1.5">
            {(['prices', 'corruption', 'fragility', 'opacity'] as const).map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-risk-high mt-0.5">•</span>
                <span>{t(`whyItMatters.${key}`)}</span>
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
            className="bg-surface-card border border-border rounded-sm px-4 py-3 flex items-start gap-4"
          >
            {/* Rank number */}
            <span
              className="text-2xl font-bold text-text-muted/20 w-8 text-right font-mono tabular-nums shrink-0 mt-0.5"
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
                className="text-[11px] text-text-muted/70 font-medium leading-snug"
                title={row.institution}
              >
                {row.institution}
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
                className="text-lg font-bold font-mono tabular-nums leading-tight"
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-risk-critical/15 text-risk-critical border border-red-500/30">
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
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-background-card text-text-muted/50 border border-border">
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
      className="border border-red-500/30 bg-red-500/5 rounded-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      role="region"
      aria-label={t('hero.worstCapture')}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.25em] uppercase text-risk-critical/70 font-semibold mb-1">
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
          className="text-3xl sm:text-4xl font-bold font-mono tabular-nums leading-none"
          style={{ color: 'var(--color-risk-critical)', fontFamily: 'var(--font-family-serif)' }}
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
// CaptureBarChart — replaces the unreadable rotated-header grid heatmap
// Shows each institution as a horizontal bar row: dominant vendor share
// ---------------------------------------------------------------------------

function CaptureBarChart({
  rows,
  t,
}: {
  rows: TopCaptureRow[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (rows.length === 0) return null
  return (
    <div role="list" aria-label={t('topCaptured.label')} className="space-y-1.5">
      {rows.map((row, idx) => {
        const pct = row.pct * 100
        const barColor =
          pct >= 50 ? '#dc2626'
          : pct >= 30 ? '#ea580c'
          : pct >= 15 ? '#eab308'
          : '#94a3b8'
        const textColor =
          pct >= 50 ? '#f87171'
          : pct >= 30 ? '#fb923c'
          : pct >= 15 ? '#fbbf24'
          : '#94a3b8'
        const riskLabel =
          pct >= 50 ? t('riskLabels.total')
          : pct >= 30 ? t('riskLabels.high')
          : pct >= 15 ? t('riskLabels.moderate')
          : t('riskLabels.low')

        return (
          <div
            key={row.institutionId}
            role="listitem"
            className="bg-surface-card border border-border rounded-sm px-4 py-3 hover:border-border transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Rank */}
              <span
                className="text-lg font-bold text-text-muted/20 w-6 shrink-0 font-mono tabular-nums leading-tight pt-0.5"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {idx + 1}
              </span>

              {/* Institution + vendor + bar */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Institution name — full, not truncated */}
                <div className="text-sm font-semibold text-text-primary leading-snug">
                  {row.institution}
                </div>

                {/* Dominant vendor */}
                <div className="flex items-center gap-1.5 text-xs text-text-muted/60">
                  <span>{t('topCaptured.topVendor')}:</span>
                  <Link
                    to={`/vendors/${row.topVendorId}`}
                    className="font-medium text-text-primary hover:text-primary transition-colors truncate"
                    title={row.topVendor}
                  >
                    {row.topVendor}
                    <ArrowUpRight className="inline ml-0.5 w-3 h-3 opacity-40" aria-hidden="true" />
                  </Link>
                </div>

                {/* Horizontal bar */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const N = 30, DR = 2.5, DG = 6
                    const filled = Math.max(1, Math.round((Math.min(100, pct) / 100) * N))
                    return (
                      <svg viewBox={`0 0 ${N * DG} 7`} className="flex-1" style={{ height: 7 }} preserveAspectRatio="none" aria-hidden="true">
                        {Array.from({ length: N }).map((_, k) => (
                          <circle key={k} cx={k * DG + DR} cy={3.5} r={DR}
                            fill={k < filled ? barColor : 'var(--color-background-elevated)'}
                            stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                            strokeWidth={k < filled ? 0 : 0.5}
                            fillOpacity={k < filled ? 0.85 : 1}
                          />
                        ))}
                      </svg>
                    )
                  })()}
                  <span
                    className="text-sm font-bold font-mono tabular-nums shrink-0 w-14 text-right"
                    style={{ color: textColor }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[10px] text-text-muted/40">
                  <span>{formatCompactMXN(row.value)}</span>
                  <span>&middot;</span>
                  <span>{formatNumber(row.contracts)} {t('topCaptured.contracts')}</span>
                  <span>&middot;</span>
                  <span style={{ color: textColor }}>{riskLabel}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
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
      .slice(0, 10)

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

  const severeCount = topCaptured.filter(r => r.pct >= 0.5).length
  const heroPct = topCaptured.length > 0 ? topCaptured[0].pct : 0
  const valueAtRisk = topCaptured.slice(0, 10).reduce((s, r) => s + r.value, 0)

  return (
    <div className="max-w-7xl mx-auto">
    <EditorialPageShell
      kicker="INSTITUTIONAL CAPTURE · CONCENTRATION ANALYSIS"
      headline={<>Some institutions never diversify. <em>That's by design.</em></>}
      paragraph="Institutional capture occurs when a single vendor dominates one agency's contracts over years — a structural red flag invisible in contract-by-contract analysis."
      severity="critical"
      loading={isLoading}
      stats={[
        {
          value: topCaptured.length > 0 ? severeCount : '—',
          label: 'severe captures (≥50%)',
          color: '#f87171',
        },
        {
          value: valueAtRisk > 0 ? formatCompactMXN(valueAtRisk) : '—',
          label: 'value under capture',
          color: '#fb923c',
        },
        {
          value: heroPct > 0 ? `${(heroPct * 100).toFixed(1)}%` : '—',
          label: topCaptured[0] ? `peak: ${truncName(topCaptured[0].institution, 22)}` : 'peak concentration',
          color: '#fbbf24',
        },
        {
          value: institutions.length > 0 ? formatNumber(institutions.length) : '—',
          label: 'institutions analyzed',
          color: '#a78bfa',
        },
      ]}
    >
      <Act number="I" label="THE CAPTURE FIELD">
    <div className="space-y-6">

      {/* ===== Editorial header ===== */}
      <div className="border-b border-border pb-6 mb-8">
        <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
          {t('trackingLabel')}
        </div>
        <h1
          style={{ fontFamily: 'var(--font-family-serif)' }}
          className="text-2xl font-bold text-text-primary mb-2"
        >
          {t('titleV2')}
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          {t('subtitle')}
        </p>
      </div>

      {/* ===== Editorial lede: WHY this matters ===== */}
      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-5 mb-6">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-risk-high mb-2">
          {t('editorialLede.overline')}
        </p>
        <p className="text-sm text-text-secondary leading-relaxed mb-3">
          {t('editorialLede.body')}
        </p>
        {!isLoading && topCaptured.length > 0 && (
          <p className="text-sm font-medium text-accent-hover">
            {t('editorialLede.statLine', {
              count: topCaptured.filter(r => r.pct >= 0.5).length,
            })}
          </p>
        )}
      </div>

      {/* ===== 3-stat strip ===== */}
      {!isLoading && !error && topCaptured.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Stat 1: severe capture count */}
          <div className="border-l-2 border-red-500 pl-4 py-1">
            <div className="text-2xl font-mono font-bold text-risk-critical">
              {topCaptured.filter(r => r.pct >= 0.5).length}
            </div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5">
              {t('statStrip.severeCaptureLabel')}
            </div>
          </div>
          {/* Stat 2: value at risk */}
          <div className="border-l-2 border-orange-500 pl-4 py-1">
            <div className="text-2xl font-mono font-bold text-orange-400">
              {formatCompactMXN(topCaptured.slice(0, 10).reduce((s, r) => s + r.value, 0))}
            </div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5">
              {t('statStrip.valueAtRiskLabel')}
            </div>
          </div>
          {/* Stat 3: highest concentration */}
          {topCaptured[0] && (
            <div className="border-l-2 border-amber-500 pl-4 py-1">
              <div className="text-2xl font-mono font-bold text-risk-high">
                {(topCaptured[0].pct * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5 truncate" title={`${topCaptured[0].institution} → ${topCaptured[0].topVendor}`}>
                {t('statStrip.highestLabel')}: {truncName(topCaptured[0].institution, 20)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== "What is institutional capture?" explainer ===== */}
      <WhatIsCaptureBox t={t} />

      {/* ===== "Por que importa?" expandable section ===== */}
      <WhyItMattersBox t={t} />

      {/* ===== Source pill + stats row ===== */}
      {flowData && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted/60"
        >
          <span className="bg-background-card px-3 py-1 rounded-sm border border-border">
            COMPRANET &middot; {formatNumber(flowData.total_contracts)} {t('sourcePill')}
          </span>
          <span>
            {t('stats.capturedInstitutions')}: {institutions.length}
          </span>
          <span>
            {t('stats.dominantVendors')}: {vendors.length}
          </span>
          {highCaptureCount > 0 && (
            <span className="text-risk-critical">
              {t('stats.highCaptureFlows')}: {highCaptureCount}
            </span>
          )}
        </motion.div>
      )}

      {/* ===== Filters ===== */}
      <div className="space-y-3 rounded-sm border border-border bg-surface-card/40 p-4">
        {/* Current filter state indicator */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-text-muted/60 uppercase tracking-wide">{t('filters.currentView')}:</span>
          <span className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 text-primary px-2.5 py-0.5 rounded-sm font-medium">
            {sectorId ? SECTORS.find((s) => s.id === sectorId)?.name : t('filters.allSectors')}
          </span>
          <span className="text-text-muted/40">·</span>
          <span className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 text-primary px-2.5 py-0.5 rounded-sm font-medium">
            {yearRange === 'all'
              ? t('filters.allYears')
              : yearRange === '2018'
                ? t('filters.period2018')
                : t('filters.period2023')}
          </span>
          {(sectorId !== undefined || yearRange !== 'all' || minCapture !== 0) && (
            <button
              onClick={() => {
                setSectorId(undefined)
                setYearRange('all')
                setMinCapture(0)
              }}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-risk-high hover:text-accent-hover font-medium border border-amber-500/30 px-2.5 py-0.5 rounded-sm hover:bg-risk-high/10 transition-colors"
            >
              ↺ {t('filters.resetAll')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="captura-sector-select" className="text-[10px] tracking-[0.15em] uppercase text-text-muted/60 font-semibold">
              {t('filters.sectorLabel')}
            </label>
            <select
              id="captura-sector-select"
              value={sectorId ?? ''}
              onChange={(e) =>
                setSectorId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="bg-surface-card border border-border hover:border-border focus:border-primary focus:outline-none rounded-sm px-4 py-2 text-sm text-text-primary transition-colors min-w-[180px]"
            >
              <option value="">{t('filters.allSectors')}</option>
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="captura-year-select" className="text-[10px] tracking-[0.15em] uppercase text-text-muted/60 font-semibold">
              {t('filters.yearLabel')}
            </label>
            <select
              id="captura-year-select"
              value={yearRange}
              onChange={(e) => setYearRange(e.target.value)}
              className="bg-surface-card border border-border hover:border-border focus:border-primary focus:outline-none rounded-sm px-4 py-2 text-sm text-text-primary transition-colors min-w-[150px]"
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
                  'px-3 py-1 rounded-sm text-xs font-medium border transition-colors',
                  minCapture === value
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-surface-card border-border text-text-muted/70 hover:border-border hover:text-text-primary'
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
        <div className="bg-surface-card border border-red-500/20 rounded-sm p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-sm bg-risk-critical/10 flex items-center justify-center flex-shrink-0">
              <Info className="h-5 w-5 text-risk-critical" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-text-primary mb-1">
                {t('errorTitle')}
              </h3>
              <p className="text-text-muted text-sm mb-1">{t('errorMessage')}</p>
              <p className="text-xs text-text-muted/70">{t('errorHint')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Empty state — clean, user-facing ===== */}
      {!isLoading && !error && institutions.length === 0 && (
        <div className="space-y-5">
          <div className="bg-surface-card border border-amber-500/20 rounded-sm p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-sm bg-risk-high/10 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-risk-high" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-risk-high mb-1">
                  {t('emptyState.overline')}
                </p>
                <h3 className="font-serif text-lg text-text-primary mb-2">
                  {t('emptyState.title')}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  {t('emptyState.hint')}
                </p>
                <button
                  onClick={() => {
                    setSectorId(undefined)
                    setYearRange('all')
                    setMinCapture(0)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-risk-high hover:text-accent-hover font-medium border border-amber-500/30 px-3 py-1.5 rounded-sm hover:bg-risk-high/10 transition-colors"
                >
                  ↺ {t('emptyState.resetButton')}
                </button>
              </div>
            </div>
          </div>
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
                  className="bg-surface-card border border-border rounded-sm px-4 py-3 flex items-center gap-3"
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
                      className="text-sm font-semibold font-mono tabular-nums"
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

      {/* ===== Capture Bar Chart: dominant vendor share per institution ===== */}
      {!isLoading && !error && topCaptured.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          aria-labelledby="capture-chart-heading"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                id="capture-chart-heading"
                className="text-[10px] tracking-[0.2em] uppercase text-text-muted/50 mb-0.5"
              >
                {t('heatmap.sectionLabel')}
              </div>
              <p className="text-[11px] text-text-muted/40">
                {t('topCaptured.sublabel')}
              </p>
            </div>
            {highCaptureCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-risk-critical">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="font-mono tabular-nums">
                  {highCaptureCount} {t('stats.highCaptureFlows')}
                </span>
              </div>
            )}
          </div>

          {/* Color legend -- descriptive labels */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-[10px] text-text-muted/50">
            {(
              [
                { color: '#dc2626', label: '≥50%', desc: t('legendDescriptive.severe') },
                { color: '#ea580c', label: '30–50%', desc: t('legendDescriptive.high') },
                { color: '#eab308', label: '15–30%', desc: t('legendDescriptive.moderate') },
                { color: '#94a3b8', label: '<15%', desc: t('legendDescriptive.competitive') },
              ] as const
            ).map(({ color, label, desc }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                <span className="font-mono">{label}</span>
                <span className="text-text-muted/30">{desc}</span>
              </span>
            ))}
          </div>

          <CaptureBarChart rows={topCaptured} t={t} />
        </motion.section>
      )}

      {/* ===== Methodology footer ===== */}
      <div className="bg-surface-card/50 border border-border rounded-sm p-5 text-xs text-text-muted/50 space-y-1">
        <h4 className="font-serif text-text-muted/70 text-sm">{t('methodology.title')}</h4>
        <p>{t('methodology.content')}</p>
      </div>
    </div>
      </Act>
    </EditorialPageShell>
    </div>
  )
}
