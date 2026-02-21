/**
 * EntityProfileDrawer — right-side sliding panel showing a comprehensive
 * profile for any vendor or institution.
 *
 * Opened via EntityDrawerContext.open(id, type).
 * NetworkMiniGraph is lazy-loaded so the ECharts bundle only loads on demand.
 */

import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { X, ExternalLink, Search, FileText, AlertTriangle } from 'lucide-react'
import { RiskBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { vendorApi, institutionApi } from '@/api/client'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'

// Lazy-load the heavy ECharts graph component so the bundle only pays for it
// when the drawer is actually opened.
const NetworkMiniGraph = lazy(() => import('@/components/NetworkMiniGraph'))

// ---------------------------------------------------------------------------
// Types for internal timeline data
// ---------------------------------------------------------------------------

interface RiskTimelinePoint {
  year: number
  avg_risk: number
}

interface AiSummaryResponse {
  summary?: string
  insights?: string[]
}

interface AsfCase {
  case_id?: string
  title?: string
  case_name?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskColor(score: number | null | undefined): string {
  if (score == null) return RISK_COLORS.low
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

// ---------------------------------------------------------------------------
// Risk Trajectory Sparkline
// ---------------------------------------------------------------------------

function RiskSparkline({
  points,
  latestScore,
}: {
  points: RiskTimelinePoint[]
  latestScore: number | null | undefined
}) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-text-muted">
        No trajectory data
      </div>
    )
  }

  const lineColor = riskColor(latestScore)

  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as RiskTimelinePoint
            return (
              <div className="rounded border border-border bg-background-card px-2 py-1 text-xs">
                <span className="text-text-muted">{d.year}: </span>
                <span style={{ color: lineColor }}>
                  {(d.avg_risk * 100).toFixed(0)}%
                </span>
              </div>
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="avg_risk"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, r: 2, strokeWidth: 0 }}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border/50 pb-1 mb-2">
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vendor drawer content
// ---------------------------------------------------------------------------

function VendorDrawerContent({ vendorId }: { vendorId: number }) {
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['entity-drawer-vendor', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    staleTime: 5 * 60 * 1000,
  })

  // Risk timeline — direct fetch, endpoint may return 404; we swallow errors gracefully
  const { data: timelineData } = useQuery({
    queryKey: ['entity-drawer-vendor-timeline', vendorId],
    queryFn: async (): Promise<RiskTimelinePoint[]> => {
      const res = await fetch(`/api/v1/vendors/${vendorId}/risk-timeline`)
      if (!res.ok) return []
      const json = (await res.json()) as { data?: RiskTimelinePoint[] } | RiskTimelinePoint[]
      if (Array.isArray(json)) return json
      return json.data ?? []
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  // AI summary — optional, gracefully fails
  const { data: aiData } = useQuery({
    queryKey: ['entity-drawer-vendor-ai', vendorId],
    queryFn: async (): Promise<AiSummaryResponse> => {
      const res = await fetch(`/api/v1/vendors/${vendorId}/ai-summary`)
      if (!res.ok) return {}
      return (await res.json()) as AiSummaryResponse
    },
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  // ASF cases — may not exist in all installs, fail silently
  const { data: asfData } = useQuery({
    queryKey: ['entity-drawer-vendor-asf', vendorId],
    queryFn: async (): Promise<AsfCase[]> => {
      const res = await fetch(`/api/v1/vendors/${vendorId}/asf-cases`)
      if (!res.ok) return []
      const json = (await res.json()) as { data?: AsfCase[] } | AsfCase[]
      if (Array.isArray(json)) return json
      return json.data ?? []
    },
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  const timelinePoints: RiskTimelinePoint[] = timelineData ?? []
  const asfCases: AsfCase[] = asfData ?? []
  const aiSummary = aiData?.summary
  const aiInsights = aiData?.insights ?? []

  const avgScore = vendor?.avg_risk_score ?? null
  const vendorName = vendor ? toTitleCase(vendor.name) : ''
  const newsUrl = vendor
    ? `https://news.google.com/search?q=${encodeURIComponent(vendor.name + ' Mexico contrato')}`
    : '#'
  const investigationUrl = vendor
    ? `/investigation?vendor=${encodeURIComponent(vendor.name)}`
    : '/investigation'
  const contractsUrl = vendor
    ? `/contracts?search=${encodeURIComponent(vendor.name)}`
    : '/contracts'

  return (
    <div className="space-y-4">
      {/* Identity header */}
      {vendorLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-24 mt-2" />
        </div>
      ) : vendor ? (
        <div className="space-y-1">
          <p className="text-xs text-text-muted uppercase tracking-wider">Vendor</p>
          <h3 className="text-sm font-bold text-text-primary leading-snug">{vendorName}</h3>
          {vendor.rfc && (
            <p className="text-xs text-text-muted font-mono">RFC: {vendor.rfc}</p>
          )}
          {avgScore != null && (
            <div className="flex items-center gap-2 mt-1.5">
              <RiskBadge score={avgScore} className="text-xs" />
              <span className="text-xs text-text-muted">
                AI Risk Score: {(avgScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* Stats pills */}
      {vendorLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : vendor ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded bg-background-elevated p-2.5">
            <p className="text-xs text-text-muted mb-0.5">Contracts</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatNumber(vendor.total_contracts)}
            </p>
          </div>
          <div className="rounded bg-background-elevated p-2.5">
            <p className="text-xs text-text-muted mb-0.5">Total Value</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatCompactMXN(vendor.total_value_mxn)}
            </p>
          </div>
        </div>
      ) : null}

      {/* AI Intelligence */}
      {(aiSummary || aiInsights.length > 0) && (
        <div>
          <SectionHeader>AI Intelligence</SectionHeader>
          {aiSummary && (
            <p className="text-xs text-text-secondary leading-relaxed mb-2">{aiSummary}</p>
          )}
          {aiInsights.length > 0 ? (
            <ul className="space-y-1">
              {aiInsights.slice(0, 4).map((insight, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-risk-high" />
                  {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted italic">
              No significant risk indicators detected.
            </p>
          )}
        </div>
      )}

      {/* Relationship Network */}
      <div>
        <SectionHeader>Relationship Network</SectionHeader>
        <Suspense
          fallback={
            <div
              className="flex items-center justify-center rounded"
              style={{ height: 220, backgroundColor: '#0d1117' }}
            >
              <Skeleton
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: '#2d3748' }}
              />
            </div>
          }
        >
          <NetworkMiniGraph entityId={vendorId} entityType="vendor" />
        </Suspense>
      </div>

      {/* Risk Trajectory */}
      {timelinePoints.length > 0 && (
        <div>
          <SectionHeader>Risk Trajectory</SectionHeader>
          <RiskSparkline points={timelinePoints} latestScore={avgScore} />
          <div className="flex items-center justify-between text-xs text-text-muted mt-0.5">
            <span>{timelinePoints[0]?.year}</span>
            <span>{timelinePoints[timelinePoints.length - 1]?.year}</span>
          </div>
        </div>
      )}

      {/* ASF Findings */}
      <div>
        <SectionHeader>ASF Findings</SectionHeader>
        {asfCases.length > 0 ? (
          <ul className="space-y-1">
            {asfCases.slice(0, 5).map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                <FileText className="h-3 w-3 shrink-0 mt-0.5 text-text-muted" />
                {c.title ?? c.case_name ?? `Case ${c.case_id ?? i + 1}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-muted italic">No ASF findings on record.</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <a
          href={investigationUrl}
          className="flex flex-col items-center gap-1 rounded border border-border p-2 text-center hover:border-accent hover:text-accent transition-colors text-text-muted"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-xs leading-tight">Open Investigation</span>
        </a>
        <a
          href={contractsUrl}
          className="flex flex-col items-center gap-1 rounded border border-border p-2 text-center hover:border-accent hover:text-accent transition-colors text-text-muted"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="text-xs leading-tight">View Contracts</span>
        </a>
        <a
          href={newsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 rounded border border-border p-2 text-center hover:border-accent hover:text-accent transition-colors text-text-muted"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs leading-tight">Search News</span>
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Institution drawer content
// ---------------------------------------------------------------------------

function InstitutionDrawerContent({ institutionId }: { institutionId: number }) {
  const { data: institution, isLoading } = useQuery({
    queryKey: ['entity-drawer-institution', institutionId],
    queryFn: () => institutionApi.getById(institutionId),
    staleTime: 5 * 60 * 1000,
  })

  // Risk timeline
  const { data: timelineData } = useQuery({
    queryKey: ['entity-drawer-institution-timeline', institutionId],
    queryFn: async (): Promise<RiskTimelinePoint[]> => {
      const res = await fetch(`/api/v1/institutions/${institutionId}/risk-timeline`)
      if (!res.ok) return []
      const json = (await res.json()) as { data?: RiskTimelinePoint[] } | RiskTimelinePoint[]
      if (Array.isArray(json)) return json
      return json.data ?? []
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  const timelinePoints: RiskTimelinePoint[] = timelineData ?? []

  const avgScore = institution?.avg_risk_score ?? null
  const instName = institution ? toTitleCase(institution.name) : ''
  const newsUrl = institution
    ? `https://news.google.com/search?q=${encodeURIComponent(institution.name + ' Mexico contrato')}`
    : '#'
  const investigationUrl = institution
    ? `/investigation?institution=${encodeURIComponent(institution.name)}`
    : '/investigation'
  const contractsUrl = institution
    ? `/contracts?search=${encodeURIComponent(institution.name)}`
    : '/contracts'

  return (
    <div className="space-y-4">
      {/* Identity header */}
      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-24 mt-2" />
        </div>
      ) : institution ? (
        <div className="space-y-1">
          <p className="text-xs text-text-muted uppercase tracking-wider">Institution</p>
          <h3 className="text-sm font-bold text-text-primary leading-snug">{instName}</h3>
          {institution.siglas && (
            <p className="text-xs text-text-muted">{institution.siglas}</p>
          )}
          {avgScore != null && (
            <div className="flex items-center gap-2 mt-1.5">
              <RiskBadge score={avgScore} className="text-xs" />
              <span className="text-xs text-text-muted">
                Avg Risk: {(avgScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : institution ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded bg-background-elevated p-2.5">
            <p className="text-xs text-text-muted mb-0.5">Contracts</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatNumber(institution.total_contracts ?? 0)}
            </p>
          </div>
          <div className="rounded bg-background-elevated p-2.5">
            <p className="text-xs text-text-muted mb-0.5">Total Spend</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatCompactMXN(institution.total_amount_mxn ?? 0)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Relationship Network */}
      <div>
        <SectionHeader>Relationship Network</SectionHeader>
        <Suspense
          fallback={
            <div
              className="flex items-center justify-center rounded"
              style={{ height: 220, backgroundColor: '#0d1117' }}
            >
              <Skeleton
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: '#2d3748' }}
              />
            </div>
          }
        >
          <NetworkMiniGraph entityId={institutionId} entityType="institution" />
        </Suspense>
      </div>

      {/* Risk Trajectory */}
      {timelinePoints.length > 0 && (
        <div>
          <SectionHeader>Risk Trajectory</SectionHeader>
          <RiskSparkline points={timelinePoints} latestScore={avgScore} />
          <div className="flex items-center justify-between text-xs text-text-muted mt-0.5">
            <span>{timelinePoints[0]?.year}</span>
            <span>{timelinePoints[timelinePoints.length - 1]?.year}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <a
          href={investigationUrl}
          className="flex flex-col items-center gap-1 rounded border border-border p-2 text-center hover:border-accent hover:text-accent transition-colors text-text-muted"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-xs leading-tight">Open Investigation</span>
        </a>
        <a
          href={contractsUrl}
          className="flex flex-col items-center gap-1 rounded border border-border p-2 text-center hover:border-accent hover:text-accent transition-colors text-text-muted"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="text-xs leading-tight">View Contracts</span>
        </a>
        <a
          href={newsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 rounded border border-border p-2 text-center hover:border-accent hover:text-accent transition-colors text-text-muted"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs leading-tight">Search News</span>
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------

export function EntityProfileDrawer() {
  const { state, close } = useEntityDrawer()
  const isOpen = state.entityId !== null && state.entityType !== null

  return (
    <>
      {/* Backdrop — closes drawer on click */}
      <div
        role="presentation"
        onClick={close}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Entity profile"
        className="fixed top-0 right-0 h-full z-50 bg-background-card border-l border-border shadow-2xl flex flex-col"
        style={{
          width: 420,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
              {state.entityType === 'vendor' ? 'Vendor Profile' : 'Institution Profile'}
            </span>
          </div>
          <button
            onClick={close}
            className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
            aria-label="Close profile drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isOpen && state.entityId !== null && state.entityType !== null && (
            state.entityType === 'vendor' ? (
              <VendorDrawerContent vendorId={state.entityId} />
            ) : (
              <InstitutionDrawerContent institutionId={state.entityId} />
            )
          )}
        </div>
      </aside>
    </>
  )
}

export default EntityProfileDrawer
