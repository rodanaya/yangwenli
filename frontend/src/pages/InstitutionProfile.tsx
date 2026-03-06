import { useState, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
  formatPercentSafe,
  formatDate,
  toTitleCase,
  cn,
} from '@/lib/utils'
import { institutionApi, caseLibraryApi, api } from '@/api/client'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { NarrativeCard } from '@/components/NarrativeCard'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import { AddToWatchlistButton } from '@/components/AddToWatchlistButton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { RiskFeedbackButton } from '@/components/RiskFeedbackButton'
import { buildInstitutionNarrative } from '@/lib/narratives'
import { InstitutionLogoBanner } from '@/components/InstitutionBadge'
import { getInstitutionGroup } from '@/lib/institution-groups'
import { WaterfallRiskChart } from '@/components/WaterfallRiskChart'
import { RedThreadPanel } from '@/components/RedThreadPanel'
import { PercentileBadge } from '@/components/PercentileBadge'
import { GenerateReportButton } from '@/components/GenerateReportButton'
import type { ContractListItem, InstitutionVendorItem } from '@/api/types'
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  Network,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Brain,
  ChevronRight,
} from 'lucide-react'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '@/lib/animations'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Bar,
  Line,
} from '@/components/charts'

// ─── Risk level palette ───────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
  unknown: '#64748b',
}

const LEVEL_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unknown: 'Unknown',
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InstitutionProfile() {
  const { id } = useParams<{ id: string }>()
  const institutionId = Number(id)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)
  const riskTimelineChartRef = useRef<HTMLDivElement>(null)
  const vendorLoyaltyChartRef = useRef<HTMLDivElement>(null)

  const { data: institution, isLoading: institutionLoading, error: institutionError } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: riskProfile, isLoading: riskProfileLoading, error: riskProfileError } = useQuery({
    queryKey: ['institution', institutionId, 'risk-profile'],
    queryFn: () => institutionApi.getRiskProfile(institutionId),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: riskTimeline, isLoading: timelineLoading, error: timelineError } = useQuery({
    queryKey: ['institution', institutionId, 'risk-timeline'],
    queryFn: () => institutionApi.getRiskTimeline(institutionId),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: vendors, isLoading: vendorsLoading, error: vendorsError } = useQuery({
    queryKey: ['institution', institutionId, 'vendors'],
    queryFn: () => institutionApi.getVendors(institutionId, 15),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: recentContracts, isLoading: recentLoading, error: contractsError } = useQuery({
    queryKey: ['institution', institutionId, 'contracts', 'recent'],
    queryFn: () => institutionApi.getContracts(institutionId, { per_page: 10 }),
    enabled: !!institutionId,
    staleTime: 2 * 60 * 1000,
  })

  const { data: highRiskContracts, isLoading: highRiskLoading, error: highRiskContractsError } = useQuery({
    queryKey: ['institution', institutionId, 'contracts', 'high-risk'],
    queryFn: () => institutionApi.getContracts(institutionId, {
      per_page: 10,
      sort_by: 'risk_score',
      sort_order: 'desc',
    }),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendorLoyalty, isLoading: loyaltyLoading, error: loyaltyError } = useQuery({
    queryKey: ['institution', institutionId, 'vendor-loyalty'],
    queryFn: () => institutionApi.getVendorLoyalty(institutionId, 10),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: peerComparison, isLoading: peerLoading, error: peerError } = useQuery({
    queryKey: ['institution', institutionId, 'peer-comparison'],
    queryFn: () => institutionApi.getPeerComparison(institutionId),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: asfData, isLoading: asfLoading, error: asfDataError } = useQuery({
    queryKey: ['institution-asf-findings', institutionId],
    queryFn: () => institutionApi.getASFFindings(institutionId),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: !!institutionId,
  })

  // Known scandals for this institution's sector
  const { data: sectorCases, error: sectorCasesError } = useQuery({
    queryKey: ['cases', 'by-sector', institution?.sector_id],
    queryFn: () => caseLibraryApi.getBySector(institution!.sector_id!),
    enabled: !!institution?.sector_id,
    staleTime: 10 * 60 * 1000,
  })

  // Ground truth status: does this institution have contracts from known-bad vendors?
  const { data: groundTruthStatus, error: groundTruthStatusError } = useQuery({
    queryKey: ['institution', institutionId, 'ground-truth-status'],
    queryFn: () => institutionApi.getGroundTruthStatus(institutionId),
    enabled: !!institutionId,
    staleTime: 30 * 60 * 1000,
  })

  // Waterfall risk breakdown
  const { data: waterfallData, isLoading: waterfallLoading, error: waterfallDataError } = useQuery({
    queryKey: ['institution-risk-waterfall', institutionId],
    queryFn: async () => {
      const { data } = await api.get(`/institutions/${institutionId}/risk-waterfall`)
      return data
    },
    enabled: !!institutionId,
    staleTime: 30 * 60 * 1000,
  })

  // Top procurement categories (partida codes)
  const { data: topCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['institution', institutionId, 'top-categories'],
    queryFn: () => institutionApi.getTopCategories(institutionId, { limit: 8 }),
    enabled: !!institutionId,
    staleTime: 30 * 60 * 1000,
  })

  // ── Derived values ──────────────────────────────────────────────────────────

  const riskScore = institution?.risk_baseline ?? institution?.avg_risk_score ?? 0
  const riskLevel = getRiskLevelFromScore(riskScore)
  const riskColor = RISK_COLORS[riskLevel] ?? '#64748b'

  // Timeline trend: compare last 3 years to previous 3 years
  const timelineTrend = useMemo(() => {
    const pts = riskTimeline?.timeline ?? []
    if (pts.length < 4) return null
    const last3 = pts.slice(-3).map((p) => p.avg_risk_score ?? 0)
    const prev3 = pts.slice(-6, -3).map((p) => p.avg_risk_score ?? 0)
    if (!prev3.length) return null
    const avgLast = last3.reduce((a, b) => a + b, 0) / last3.length
    const avgPrev = prev3.reduce((a, b) => a + b, 0) / prev3.length
    const delta = avgLast - avgPrev
    if (Math.abs(delta) < 0.01) return { direction: 'stable', delta }
    return { direction: delta > 0 ? 'up' : 'down', delta }
  }, [riskTimeline])

  // Risk distribution from profile
  const riskDistribution = useMemo(() => {
    const byLevel = (riskProfile?.contracts_by_risk_level ?? {}) as Record<string, number>
    const total = Object.values(byLevel).reduce((s: number, n: number) => s + n, 0)
    if (total === 0) return []
    return (['critical', 'high', 'medium', 'low'] as const)
      .filter((lvl) => (byLevel[lvl] ?? 0) > 0)
      .map((lvl) => ({
        level: lvl,
        count: byLevel[lvl] ?? 0,
        pct: ((byLevel[lvl] ?? 0) / (total as number)) * 100,
        color: LEVEL_COLORS[lvl],
        label: LEVEL_LABELS[lvl],
      }))
  }, [riskProfile])

  // Red thread items for investigation leads
  const redThreadItems = useMemo(() => {
    const items: Array<{
      type: 'co_bidder' | 'investigation_case' | 'sanctions' | 'scandal' | 'high_risk_vendor' | 'asf_finding'
      label: string
      count?: number
      href: string
      riskLevel?: 'critical' | 'high' | 'medium' | 'low'
    }> = []

    // High-risk vendors
    const highRiskVendors = vendors?.data?.filter(
      (v) => v.avg_risk_score != null && v.avg_risk_score >= 0.3
    )
    if (highRiskVendors && highRiskVendors.length > 0) {
      items.push({
        type: 'high_risk_vendor',
        label: `${highRiskVendors.length} high-risk vendor${highRiskVendors.length > 1 ? 's' : ''}`,
        count: highRiskVendors.length,
        href: '#vendors',
        riskLevel: highRiskVendors.some((v) => (v.avg_risk_score ?? 0) >= 0.5) ? 'critical' : 'high',
      })
    }

    // Known scandals in sector
    if (sectorCases && sectorCases.length > 0) {
      items.push({
        type: 'scandal',
        label: `${sectorCases.length} documented scandal${sectorCases.length > 1 ? 's' : ''} in sector`,
        count: sectorCases.length,
        href: `/cases`,
      })
    }

    // ASF findings
    if (asfData && asfData.findings.length > 0) {
      items.push({
        type: 'asf_finding',
        label: `${asfData.findings.length} ASF audit year${asfData.findings.length > 1 ? 's' : ''} with findings`,
        count: asfData.findings.length,
        href: '#asf',
        riskLevel: 'high',
      })
    }

    // Vendor concentration (from peer comparison if available)
    if (peerComparison?.metrics) {
      const concMetric = peerComparison.metrics.find((m) => m.metric === 'vendor_concentration' || m.metric === 'hhi')
      if (concMetric && concMetric.percentile > 75) {
        items.push({
          type: 'investigation_case',
          label: `P${concMetric.percentile} concentration vs peers`,
          href: '#concentration',
          riskLevel: concMetric.percentile > 90 ? 'critical' : 'high',
        })
      }
    }

    return items
  }, [vendors, sectorCases, asfData, peerComparison])

  // ── Loading / error states ──────────────────────────────────────────────────

  if (institutionLoading) return <InstitutionProfileSkeleton />

  if (institutionError || !institution) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-elevated border border-border/40 mb-4">
          <Building2 className="h-8 w-8 text-text-muted" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Institution Not Found</h2>
        <p className="text-sm text-text-muted mb-6 max-w-sm">
          The institution with ID <span className="font-mono text-accent">{institutionId}</span> could not be found.
          It may have been removed or the ID is incorrect.
        </p>
        <Link to="/institutions/health">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Institutions
          </Button>
        </Link>
      </div>
    )
  }

  const totalContracts = institution.total_contracts ?? riskProfile?.total_contracts ?? 0
  const totalValue = institution.total_amount_mxn ?? riskProfile?.total_value ?? 0
  const highRiskPct = institution.high_risk_percentage ?? institution.high_risk_pct
  const vendorCount = institution.vendor_count ?? vendors?.total ?? 0

  return (
    <div className="space-y-5">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <motion.div
        className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-background-card p-4"
        style={{ borderLeftWidth: '4px', borderLeftColor: riskColor }}
        variants={slideUp}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/institutions/health">
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${riskColor}18`, color: riskColor }}
          >
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <InstitutionLogoBanner name={institution.name} height={32} className="mb-2" />
            <h1 className="text-lg font-bold leading-tight truncate">{toTitleCase(institution.name)}</h1>
            {(() => {
              const _group = getInstitutionGroup(institution.name)
              return _group ? (
                <p className="text-xs text-text-muted mt-0.5">
                  Part of{' '}
                  <span className="font-medium" style={{ color: _group.color }}>{_group.name}</span>
                </p>
              ) : null
            })()}
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {institution.siglas && (
                <span className="text-xs font-mono font-bold text-accent">{institution.siglas}</span>
              )}
              {institution.institution_type && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                  {institution.institution_type.replace(/_/g, ' ')}
                </Badge>
              )}
              {groundTruthStatusError ? (
                <span className="text-xs text-rose-400/80">Failed to load ML status.</span>
              ) : groundTruthStatus?.is_ground_truth_related ? (
                <Badge variant="critical" className="text-xs px-1.5 py-0 h-4">
                  ML-Linked: {groundTruthStatus.case_name}
                </Badge>
              ) : null}
              {institution.geographic_scope && (
                <span className="text-xs text-text-muted">{institution.geographic_scope}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setNetworkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 transition-colors font-medium"
          >
            <Network className="h-3.5 w-3.5" />
            View Network
          </button>
          <Link to={`/contracts?institution_id=${institutionId}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border/40 bg-background-elevated text-text-secondary hover:text-text-primary transition-colors">
              <FileText className="h-3.5 w-3.5" />
              All Contracts
            </button>
          </Link>
          <GenerateReportButton
            reportType="institution"
            entityId={institutionId}
            entityName={toTitleCase(institution.name)}
          />
          <AddToWatchlistButton
            itemType="institution"
            itemId={institutionId}
            itemName={toTitleCase(institution.name)}
          />
          <AddToDossierButton
            entityType="institution"
            entityId={institutionId}
            entityName={toTitleCase(institution.name)}
          />
          <RiskBadge score={riskScore} className="text-sm px-2.5 py-1" />
          <RiskFeedbackButton
            entityType="institution"
            entityId={institutionId}
          />
        </div>
      </motion.div>

      <NetworkGraphModal
        open={networkOpen}
        onOpenChange={setNetworkOpen}
        centerType="institution"
        centerId={institutionId}
        centerName={toTitleCase(institution.name)}
      />

      {/* ── GROUND TRUTH WARNING BANNER ─────────────────────────────────── */}
      {groundTruthStatus?.is_ground_truth_related && (
        <div
          className="flex items-start gap-3 rounded-lg border border-risk-critical/40 bg-risk-critical/5 px-4 py-3"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4 text-risk-critical flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-risk-critical uppercase tracking-wider font-mono mb-0.5">
              Documented Corruption Case Linked
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              This institution has contracts from vendors identified in{' '}
              <span className="font-semibold text-risk-critical">
                {groundTruthStatus.case_name}
              </span>
              {groundTruthStatus.case_type && (
                <> ({groundTruthStatus.case_type.replace(/_/g, ' ')})</>
              )}
              {groundTruthStatus.contract_count != null && groundTruthStatus.contract_count > 0 && (
                <> — {formatNumber(groundTruthStatus.contract_count)} flagged contract{groundTruthStatus.contract_count !== 1 ? 's' : ''}</>
              )}.
              Risk scores for these contracts are based on documented ground truth from this case.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI STRIP ──────────────────────────────────────────────────────── */}
      {(() => {
        // Build a map of metric -> percentile from peer comparison
        const peerPercentiles = new Map<string, number>()
        peerComparison?.metrics?.forEach((m) => {
          peerPercentiles.set(m.metric, m.percentile)
        })

        // Risk rank among peers: P90 = top 10% riskiest (worst), P10 = bottom 10% (best)
        const riskPercentile = peerPercentiles.get('avg_risk_score')
        const riskRankLabel = riskPercentile != null
          ? riskPercentile >= 90 ? 'Top 10% riskiest'
          : riskPercentile >= 75 ? 'Top 25% riskiest'
          : riskPercentile >= 50 ? 'Above median risk'
          : riskPercentile >= 25 ? 'Below median risk'
          : 'Bottom 25% risk'
          : null
        const riskRankColor = riskPercentile != null
          ? riskPercentile >= 75 ? 'text-risk-critical'
          : riskPercentile >= 50 ? 'text-risk-high'
          : 'text-risk-low'
          : 'text-text-muted'

        return (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem}>
              <KpiChip
                label="Total Contracts"
                value={formatNumber(totalContracts)}
                icon={FileText}
                iconColor="text-accent"
                badge={peerPercentiles.has('contract_count')
                  ? <PercentileBadge percentile={peerPercentiles.get('contract_count')!} metric="Contracts" />
                  : undefined}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <KpiChip
                label="Total Spending"
                value={formatCompactMXN(totalValue)}
                sub={formatCompactUSD(totalValue)}
                icon={DollarSign}
                iconColor="text-accent"
                badge={peerPercentiles.has('total_value')
                  ? <PercentileBadge percentile={peerPercentiles.get('total_value')!} metric="Spending" />
                  : undefined}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <KpiChip
                label="High-Risk %"
                value={highRiskPct != null ? formatPercentSafe(highRiskPct, false) : '—'}
                icon={AlertTriangle}
                iconColor={(highRiskPct ?? 0) > 20 ? 'text-risk-critical' : (highRiskPct ?? 0) > 10 ? 'text-risk-high' : 'text-text-muted'}
                highlight={(highRiskPct ?? 0) > 20}
                badge={peerPercentiles.has('high_risk_pct')
                  ? <PercentileBadge percentile={peerPercentiles.get('high_risk_pct')!} metric="High-Risk %" />
                  : undefined}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <KpiChip
                label="Risk Baseline"
                value={formatPercentSafe(riskScore, true)}
                icon={Shield}
                iconColor={riskColor}
                style={{ color: riskColor }}
                badge={peerPercentiles.has('avg_risk_score')
                  ? <PercentileBadge percentile={peerPercentiles.get('avg_risk_score')!} metric="Risk" />
                  : undefined}
              />
            </motion.div>
            {/* Risk rank among all institutions */}
            <motion.div variants={staggerItem}>
              <KpiChip
                label="Risk Rank"
                value={riskPercentile != null ? `P${riskPercentile}` : peerLoading ? '…' : '—'}
                sub={riskRankLabel ?? undefined}
                icon={TrendingUp}
                iconColor={riskRankColor}
                style={riskPercentile != null ? { color: `var(--color-${riskPercentile >= 75 ? 'risk-critical' : riskPercentile >= 50 ? 'risk-high' : 'risk-low'})` } : undefined}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <KpiChip
                label="Unique Vendors"
                value={formatNumber(vendorCount)}
                icon={Users}
                iconColor="text-text-muted"
                badge={peerPercentiles.has('vendor_count')
                  ? <PercentileBadge percentile={peerPercentiles.get('vendor_count')!} metric="Vendors" />
                  : undefined}
              />
            </motion.div>
          </motion.div>
        )
      })()}

      {/* ── AI INTELLIGENCE BRIEF ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        <Brain className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
          AI Intelligence Brief
        </span>
      </div>
      <NarrativeCard
        paragraphs={buildInstitutionNarrative(institution, vendors?.data ?? null)}
        compact
      />

      {/* ── RED THREAD PANEL ──────────────────────────────────────────────── */}
      {redThreadItems.length > 0 && (
        <RedThreadPanel
          items={redThreadItems}
          entityName={toTitleCase(institution.name)}
        />
      )}

      {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* LEFT COLUMN */}
        <div className="space-y-4">

          {/* Risk Distribution */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Shield className="h-3.5 w-3.5 text-accent" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {riskProfileLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6" />)}
                </div>
              ) : riskProfileError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load risk data.</p>
              ) : riskDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {riskDistribution.map((r) => (
                    <div key={r.level}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="text-xs text-text-secondary">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-text-muted">{formatNumber(r.count)}</span>
                          <span className="text-xs font-bold font-mono" style={{ color: r.color }}>
                            {r.pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-background-elevated overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                        />
                      </div>
                    </div>
                  ))}
                  {riskProfile?.effective_risk != null && (
                    <div className="mt-3 pt-3 border-t border-border/30 flex justify-between text-xs">
                      <span className="text-text-muted">Effective Risk Score</span>
                      <span className="font-bold font-mono" style={{ color: riskColor }}>
                        {formatPercentSafe(riskProfile.effective_risk, true)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-muted">No risk data available</p>
              )}
            </CardContent>
          </Card>

          {/* Risk Factor Breakdown (Waterfall) */}
          {(waterfallDataError || waterfallLoading || waterfallData?.features?.length > 0) && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Shield className="h-3.5 w-3.5 text-accent" />
                Risk Factor Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {waterfallDataError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load risk breakdown.</p>
              ) : waterfallLoading ? (
                <Skeleton className="h-48" />
              ) : waterfallData?.features?.length > 0 ? (
                <WaterfallRiskChart
                  features={waterfallData.features}
                  baseScore={waterfallData.base_score}
                  finalScore={waterfallData.final_score}
                />
              ) : null}
            </CardContent>
          </Card>
          )}

          {/* Institution Details */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Building2 className="h-3.5 w-3.5 text-accent" />
                Institution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              <DetailRow label="Type" value={institution.institution_type?.replace(/_/g, ' ')} />
              <DetailRow label="Size Tier" value={institution.size_tier} />
              <DetailRow label="Autonomy" value={institution.autonomy_level} />
              <DetailRow label="Scope" value={institution.geographic_scope} />
              <DetailRow label="Data Quality" value={institution.data_quality_grade} />
              {institution.avg_contract_value != null && (
                <DetailRow label="Avg Contract" value={formatCompactMXN(institution.avg_contract_value)} />
              )}
              {riskProfile != null && (
                <>
                  <div className="pt-1 border-t border-border/30" />
                  <DetailRow label="Risk Baseline" value={formatPercentSafe(riskProfile.risk_baseline, true)} valueColor={riskColor} />
                  <DetailRow label="Size Adjustment" value={`${riskProfile.size_risk_adjustment >= 0 ? '+' : ''}${(riskProfile.size_risk_adjustment * 100).toFixed(0)}pp`} />
                  <DetailRow label="Autonomy Risk" value={formatPercentSafe(riskProfile.autonomy_risk_baseline, true)} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Peer Comparison */}
          {(peerLoading || peerComparison) && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Users className="h-3.5 w-3.5 text-accent" />
                Peer Comparison
                {peerComparison && (
                  <span className="ml-auto text-[10px] font-normal text-text-muted normal-case">
                    vs {peerComparison.peer_count} peers
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {peerLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="space-y-1"><div className="h-3 w-24 bg-background-elevated rounded" /><div className="h-2 bg-background-elevated rounded" /></div>)}
                </div>
              ) : peerError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load peer data.</p>
              ) : peerComparison?.metrics?.length ? (
                <div className="space-y-3.5">
                  {peerComparison.metrics.map((m) => {
                    const pct = m.percentile
                    const isWorse = pct > 75
                    const isBetter = pct < 25
                    const markerColor = isWorse ? '#dc2626' : isBetter ? '#16a34a' : '#eab308'
                    return (
                      <div key={m.metric}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-text-secondary">{m.label}</span>
                          <span className="text-xs font-mono font-bold" style={{ color: markerColor }}>
                            P{pct}
                          </span>
                        </div>
                        {/* Strip: full width = peer range, shaded band = p25-p75, marker = this institution */}
                        <div className="relative h-2 rounded-full bg-background-elevated overflow-visible">
                          {/* IQR band */}
                          <div
                            className="absolute top-0 h-full rounded-full bg-text-muted/20"
                            style={{
                              left: `${m.peer_p25}%`,
                              width: `${m.peer_p75 - m.peer_p25}%`,
                            }}
                          />
                          {/* Median line */}
                          <div
                            className="absolute top-0 h-full w-px bg-text-muted/50"
                            style={{ left: `${m.peer_median}%` }}
                          />
                          {/* This institution marker */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-3 w-1.5 rounded-sm"
                            style={{ left: `${pct}%`, backgroundColor: markerColor }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5 text-[10px] text-text-muted/60 font-mono">
                          <span>min</span>
                          <span>median</span>
                          <span>max</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Insufficient peers for comparison</p>
              )}
            </CardContent>
          </Card>
          )}

          {/* Direct Award Rate vs Benchmark */}
          {(() => {
            const directAwardPct = institution.direct_award_pct ?? institution.direct_award_rate
            const singleBidPct = institution.single_bid_pct
            if (directAwardPct == null && singleBidPct == null) return null
            // National average benchmark ~74% for direct award (from COMPRANET data)
            const NATIONAL_DA_BENCHMARK = 74
            const NATIONAL_SB_BENCHMARK = 12
            const daDiff = directAwardPct != null ? directAwardPct - NATIONAL_DA_BENCHMARK : null
            const sbDiff = singleBidPct != null ? singleBidPct - NATIONAL_SB_BENCHMARK : null
            return (
              <Card className="border-border/40">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                    <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                    Procurement Method vs National Avg
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-3">
                  {directAwardPct != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-secondary">Direct Award Rate</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-mono" style={{ color: daDiff != null && daDiff > 10 ? '#dc2626' : daDiff != null && daDiff > 0 ? '#ea580c' : '#16a34a' }}>
                            {directAwardPct.toFixed(1)}%
                          </span>
                          {daDiff != null && (
                            <span className={cn('text-[10px] font-mono', daDiff > 0 ? 'text-risk-high' : 'text-risk-low')}>
                              {daDiff > 0 ? '+' : ''}{daDiff.toFixed(1)}pp vs avg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-2 bg-background-elevated rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, directAwardPct)}%`,
                            backgroundColor: daDiff != null && daDiff > 10 ? '#dc2626' : daDiff != null && daDiff > 0 ? '#ea580c' : '#16a34a',
                          }}
                        />
                        {/* Benchmark marker */}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-text-muted/60"
                          style={{ left: `${NATIONAL_DA_BENCHMARK}%` }}
                          title={`National avg: ${NATIONAL_DA_BENCHMARK}%`}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5 text-[10px] text-text-muted/60">
                        <span>0%</span>
                        <span>Avg {NATIONAL_DA_BENCHMARK}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                  {singleBidPct != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-secondary">Single Bid Rate</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-mono" style={{ color: sbDiff != null && sbDiff > 5 ? '#dc2626' : sbDiff != null && sbDiff > 0 ? '#ea580c' : '#16a34a' }}>
                            {singleBidPct.toFixed(1)}%
                          </span>
                          {sbDiff != null && (
                            <span className={cn('text-[10px] font-mono', sbDiff > 0 ? 'text-risk-high' : 'text-risk-low')}>
                              {sbDiff > 0 ? '+' : ''}{sbDiff.toFixed(1)}pp vs avg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-2 bg-background-elevated rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, singleBidPct)}%`,
                            backgroundColor: sbDiff != null && sbDiff > 5 ? '#dc2626' : sbDiff != null && sbDiff > 0 ? '#ea580c' : '#16a34a',
                          }}
                        />
                        <div
                          className="absolute top-0 h-full w-0.5 bg-text-muted/60"
                          style={{ left: `${NATIONAL_SB_BENCHMARK}%` }}
                          title={`National avg: ${NATIONAL_SB_BENCHMARK}%`}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5 text-[10px] text-text-muted/60">
                        <span>0%</span>
                        <span>Avg {NATIONAL_SB_BENCHMARK}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-text-muted/60 pt-1 border-t border-border/20">
                    Vertical line = national average across all institutions. Higher than average direct awards or single bids increase corruption risk.
                  </p>
                </CardContent>
              </Card>
            )
          })()}

        </div>

        {/* RIGHT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Risk Trajectory */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  Risk Trajectory — Year over Year
                </CardTitle>
                {timelineTrend && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full',
                    timelineTrend.direction === 'up' ? 'bg-risk-critical/10 text-risk-critical' :
                    timelineTrend.direction === 'down' ? 'bg-green-500/10 text-green-500' :
                    'bg-text-muted/10 text-text-muted'
                  )}>
                    {timelineTrend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> :
                     timelineTrend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> :
                     <Minus className="h-3 w-3" />}
                    {timelineTrend.direction === 'up' ? 'Worsening' :
                     timelineTrend.direction === 'down' ? 'Improving' : 'Stable'}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {timelineLoading ? (
                <Skeleton className="h-40" />
              ) : timelineError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load risk timeline.</p>
              ) : (riskTimeline?.timeline?.length ?? 0) > 1 ? (
                <div className="relative" ref={riskTimelineChartRef}>
                  <ChartDownloadButton
                    targetRef={riskTimelineChartRef}
                    filename={`institution-${institutionId}-risk-timeline`}
                    className="absolute top-0 right-0 z-10"
                  />
                  <RiskTimelineChart
                    data={riskTimeline!.timeline}
                    riskColor={riskColor}
                  />
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-text-muted">
                  Insufficient timeline data
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Vendors */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Users className="h-3.5 w-3.5 text-accent" />
                Top Vendors by Spending
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {vendorsLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : vendorsError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load vendor data.</p>
              ) : vendors?.data?.length ? (
                <VendorRankedList
                  vendors={vendors.data.slice(0, 10)}
                  totalValue={totalValue}
                />
              ) : (
                <p className="text-sm text-text-muted">No vendor data available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Procurement Categories */}
          {(categoriesLoading || (topCategories?.data?.length ?? 0) > 0) && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <FileText className="h-3.5 w-3.5 text-accent" />
                Top Procurement Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {categoriesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7" />)}
                </div>
              ) : (topCategories?.data ?? []).length === 0 ? (
                <p className="text-sm text-text-muted">No category data available</p>
              ) : (
                <div className="space-y-1.5">
                  {(topCategories?.data ?? []).map((cat: { category_id: number; name_en: string; name_es: string; code: string; contract_count: number; total_value_mxn: number; avg_risk_score: number; direct_award_pct: number }) => {
                    const level = getRiskLevelFromScore(cat.avg_risk_score)
                    const riskCol = RISK_COLORS[level] ?? '#64748b'
                    return (
                      <div key={cat.category_id} className="flex items-center gap-2 text-xs py-1 border-b border-border/10 last:border-0">
                        <span className="font-mono text-text-muted w-10 shrink-0">{cat.code}</span>
                        <span className="flex-1 text-text-primary truncate" title={cat.name_en}>{cat.name_en}</span>
                        <span className="text-text-secondary shrink-0">{formatCompactMXN(cat.total_value_mxn)}</span>
                        <span className="w-12 text-right shrink-0" style={{ color: riskCol }}>
                          {(cat.avg_risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Vendor Loyalty Heatmap */}
          {(loyaltyLoading || (vendorLoyalty?.vendors?.length ?? 0) > 0) && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                Vendor Loyalty — Long-term Relationships
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {loyaltyLoading ? (
                <Skeleton className="h-32" />
              ) : loyaltyError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load loyalty data.</p>
              ) : vendorLoyalty && vendorLoyalty.vendors.length > 0 ? (
                <div className="relative overflow-x-auto" ref={vendorLoyaltyChartRef}>
                  <ChartDownloadButton
                    targetRef={vendorLoyaltyChartRef}
                    filename={`institution-${institutionId}-vendor-loyalty`}
                    className="absolute top-0 right-0 z-10"
                  />
                  {/* Show last 8 years as columns */}
                  {(() => {
                    const allYears = vendorLoyalty.year_range ?? []
                    const displayYears = allYears.slice(-8)
                    const topVendors = vendorLoyalty.vendors.slice(0, 8)
                    return (
                      <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
                        <thead>
                          <tr>
                            <th className="text-left text-[10px] text-text-muted font-normal pb-1 pr-2 min-w-[100px]">Vendor</th>
                            {displayYears.map((yr) => (
                              <th key={yr} className="text-center text-[10px] text-text-muted font-mono font-normal pb-1 min-w-[28px]">{yr}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {topVendors.map((v) => {
                            const yearMap = new Map(v.years.map((y) => [y.year, y]))
                            return (
                              <tr key={v.vendor_id}>
                                <td className="pr-2 py-0.5">
                                  <Link to={`/vendors/${v.vendor_id}`} className="text-[10px] text-text-secondary hover:text-accent truncate block max-w-[100px]" title={v.vendor_name}>
                                    {v.vendor_name.length > 16 ? v.vendor_name.slice(0, 16) + '…' : v.vendor_name}
                                  </Link>
                                </td>
                                {displayYears.map((yr) => {
                                  const cell = yearMap.get(yr)
                                  const risk = cell?.avg_risk ?? 0
                                  const count = cell?.contract_count ?? 0
                                  const intensity = Math.min(1, risk / 0.5)
                                  const r = Math.round(74 + (248 - 74) * intensity)
                                  const g = Math.round(222 + (113 - 222) * intensity)
                                  const b = Math.round(128 + (113 - 128) * intensity)
                                  const color = `rgb(${r},${g},${b})`
                                  return (
                                    <td key={yr} className="p-0">
                                      <div
                                        className="h-6 w-full rounded flex items-center justify-center text-[9px] font-mono"
                                        style={{
                                          backgroundColor: count > 0 ? `${color}30` : 'transparent',
                                          border: count > 0 ? `1px solid ${color}50` : '1px solid transparent',
                                          color: count > 0 ? color : 'transparent',
                                        }}
                                        title={count > 0 ? `${count} contracts · risk ${(risk * 100).toFixed(0)}%` : 'No contracts'}
                                      >
                                        {count > 0 ? count : ''}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )
                  })()}
                  <p className="mt-2 text-[10px] text-text-muted/50 italic">Cells show contract count · color = avg risk score</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          )}

          {/* Most Suspicious Contract — spotlight card */}
          {(() => {
            const topContract = highRiskContracts?.data?.[0]
            if (!topContract) return null
            const contractRiskScore = topContract.risk_score ?? 0
            const contractRiskLevel = getRiskLevelFromScore(contractRiskScore)
            const contractColor = RISK_COLORS[contractRiskLevel] ?? '#64748b'
            return (
              <Card
                className="border-l-4 cursor-pointer hover:bg-background-elevated/20 transition-colors"
                style={{ borderLeftColor: contractColor }}
                onClick={() => { setSelectedContractId(topContract.id); setIsDetailOpen(true) }}
                role="button"
                tabIndex={0}
                aria-label={`Most suspicious contract: ${(topContract as any).description ?? (topContract as any).procedure_number ?? topContract.title}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedContractId(topContract.id); setIsDetailOpen(true) } }}
              >
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase font-mono" style={{ color: contractColor }}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Most Suspicious Contract
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  <p className="text-sm font-semibold text-text-primary leading-tight line-clamp-2">
                    {topContract.title ?? `Contract #${topContract.id}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span className="font-bold" style={{ color: contractColor }}>
                      Risk: {(contractRiskScore * 100).toFixed(1)}%
                    </span>
                    {topContract.amount_mxn != null && (
                      <span className="text-text-secondary">{formatCompactMXN(topContract.amount_mxn)}</span>
                    )}
                    {topContract.vendor_name && (
                      <span className="text-text-muted truncate max-w-[200px]" title={topContract.vendor_name}>
                        {topContract.vendor_name}
                      </span>
                    )}
                    {topContract.contract_year && (
                      <span className="text-text-muted">{topContract.contract_year}</span>
                    )}
                    {topContract.is_direct_award && (
                      <span className="text-risk-high">Direct Award</span>
                    )}
                    {topContract.is_single_bid && (
                      <span className="text-risk-critical">Single Bid</span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted/60 italic">Click to view full contract details</p>
                </CardContent>
              </Card>
            )
          })()}

          {/* High-Risk Contracts */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
                  Highest Risk Contracts
                </CardTitle>
                <Link
                  to={`/contracts?institution_id=${institutionId}&sort_by=risk_score&sort_order=desc`}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  View all
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              {highRiskContractsError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load high-risk contracts.</p>
              ) : highRiskLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : highRiskContracts?.data?.length ? (
                <div className="divide-y divide-border/30">
                  {highRiskContracts.data.slice(0, 8).map((contract) => (
                    <ContractRow
                      key={contract.id}
                      contract={contract}
                      onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }}
                    />
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-text-muted">No contracts found</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Contracts */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  Recent Contracts
                </CardTitle>
                <Link
                  to={`/contracts?institution_id=${institutionId}`}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  View all
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              {recentLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : contractsError ? (
                <p className="text-xs text-rose-400/80 p-4 text-center">Failed to load contracts.</p>
              ) : recentContracts?.data?.length ? (
                <ScrollArea className="max-h-[280px]">
                  <div className="divide-y divide-border/30">
                    {recentContracts.data.map((contract) => (
                      <ContractRow
                        key={contract.id}
                        contract={contract}
                        onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="p-4 text-sm text-text-muted">No contracts found</p>
              )}
            </CardContent>
          </Card>

          {/* ASF Audit Findings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                ASF Audit Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asfDataError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load ASF findings.</p>
              ) : asfLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-8" />
                </div>
              ) : !asfData || asfData.findings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ASF audit findings on record</p>
              ) : (
                <div className="space-y-4">
                  {/* KPI strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold">{formatCompactMXN(asfData.total_amount_mxn)}</div>
                      <div className="text-xs text-muted-foreground">Total Questioned</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{asfData.years_audited}</div>
                      <div className="text-xs text-muted-foreground">Years Audited</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {asfData.findings[asfData.findings.length - 1]?.recovery_rate != null
                          ? `${((asfData.findings[asfData.findings.length - 1].recovery_rate ?? 0) * 100).toFixed(0)}%`
                          : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Solved Rate</div>
                    </div>
                  </div>
                  {/* Bar + line chart */}
                  <ResponsiveContainer width="100%" height={160}>
                    <ComposedChart data={asfData.findings} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tickFormatter={(v: number) => `${(v / 1e9).toFixed(1)}B`} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        formatter={(value: any, name: any) => {
                          const num = value as number
                          if (name === 'amount_mxn') return [formatCompactMXN(num), 'Amount']
                          return [num, name === 'observations_total' ? 'Observations' : 'Solved']
                        }}
                      />
                      <Bar yAxisId="left" dataKey="amount_mxn" fill="hsl(var(--muted))" opacity={0.8} name="amount_mxn" />
                      <Line yAxisId="right" type="monotone" dataKey="observations_total" stroke="#f59e0b" dot={false} name="observations_total" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Known Scandals in this sector */}
      {(sectorCasesError || (sectorCases && sectorCases.length > 0)) && (
        <Card>
          <CardContent className="pt-5 pb-4">
            {sectorCasesError ? (
              <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load sector scandals.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-risk-high opacity-70" />
                  <h2 className="text-sm font-bold text-text-primary">Known Scandals in Sector</h2>
                  <span className="text-xs text-text-muted">({sectorCases!.length})</span>
                </div>
                <div className="space-y-1.5">
                  {sectorCases!.slice(0, 5).map((c) => (
                    <Link
                      key={c.slug}
                      to={`/cases/${c.slug}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-background-elevated/30 transition-colors group"
                    >
                      <span className="text-xs font-medium text-text-secondary group-hover:text-accent transition-colors truncate">
                        {c.name_en || c.name_es}
                      </span>
                      <ChevronRight className="h-3 w-3 text-text-muted flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <ContractDetailModal
        contractId={selectedContractId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiChip({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  highlight,
  style,
  badge,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor: string
  highlight?: boolean
  style?: React.CSSProperties
  badge?: React.ReactNode
}) {
  return (
    <div className={cn(
      'rounded-lg border bg-background-card p-3 space-y-0.5',
      highlight ? 'border-risk-critical/30' : 'border-border/40'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <div className="flex items-center gap-1">
          {badge}
          <Icon className={cn('h-3.5 w-3.5', iconColor)} />
        </div>
      </div>
      <p className="text-lg font-black tabular-nums font-mono text-text-primary leading-none" style={style}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted font-mono">{sub}</p>}
    </div>
  )
}

function DetailRow({ label, value, valueColor }: { label: string; value?: string | null; valueColor?: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary capitalize" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  )
}

// ─── Risk Timeline Chart ───────────────────────────────────────────────────────

function RiskTimelineChart({
  data,
  riskColor,
}: {
  data: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  riskColor: string
}) {
  const chartData = data.map((pt) => ({
    year: pt.year,
    risk: pt.avg_risk_score != null ? Math.round(pt.avg_risk_score * 1000) / 10 : null,
    contracts: pt.contract_count,
    value: pt.total_value,
  }))

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`riskGrad-${riskColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={riskColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={32}
          />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                const risk = payload[0]?.value
                const contracts = payload[0]?.payload?.contracts
                const value = payload[0]?.payload?.value
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg space-y-1">
                    <p className="font-bold text-text-primary">{label}</p>
                    <p style={{ color: riskColor }}>Risk: {risk != null ? `${risk}%` : '—'}</p>
                    <p className="text-text-muted">{formatNumber(contracts)} contracts</p>
                    <p className="text-text-muted">{formatCompactMXN(value)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="risk"
            stroke={riskColor}
            strokeWidth={2}
            fill={`url(#riskGrad-${riskColor.replace('#', '')})`}
            dot={{ fill: riskColor, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Vendor Ranked List ────────────────────────────────────────────────────────

function VendorRankedList({
  vendors,
  totalValue,
}: {
  vendors: InstitutionVendorItem[]
  totalValue: number
}) {
  const maxValue = vendors[0]?.total_value_mxn ?? 1
  return (
    <div className="space-y-1">
      {vendors.map((v, i) => {
        const pct = totalValue > 0 ? (v.total_value_mxn / totalValue) * 100 : 0
        const barW = (v.total_value_mxn / maxValue) * 100
        const riskLvl = v.avg_risk_score != null ? getRiskLevelFromScore(v.avg_risk_score) : null
        const riskClr = riskLvl ? RISK_COLORS[riskLvl] : null
        return (
          <Link
            key={v.vendor_id}
            to={`/vendors/${v.vendor_id}`}
            className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-background-elevated/50 transition-colors"
          >
            <span className="text-xs font-mono text-text-muted w-4 text-right flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                  {toTitleCase(v.vendor_name)}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-text-muted">{formatCompactMXN(v.total_value_mxn)}</span>
                  <span className="text-xs font-mono text-text-muted w-8 text-right">{pct.toFixed(0)}%</span>
                  {riskClr && v.avg_risk_score != null && (
                    <span
                      className="text-xs font-bold font-mono w-8 text-right"
                      style={{ color: riskClr }}
                    >
                      {(v.avg_risk_score * 100).toFixed(0)}%
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="h-1 rounded-full bg-background-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/40 group-hover:bg-accent/60 transition-colors"
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          </Link>
        )
      })}
      <div className="pt-2 text-xs text-text-muted text-right font-mono">
        {vendors.length > 0 && (
          <span>
            Top {vendors.length} of {formatNumber(vendors.length)} shown
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Contract Row ──────────────────────────────────────────────────────────────

function ContractRow({ contract, onView }: { contract: ContractListItem; onView?: (id: number) => void }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 hover:bg-background-elevated/40 transition-colors cursor-pointer"
      onClick={() => onView?.(contract.id)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate max-w-[260px] text-text-primary">{contract.title || 'Untitled'}</p>
          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
            <span>{contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year}</span>
            {contract.vendor_name && (
              <>
                <span>·</span>
                <span className="truncate max-w-[120px]">{toTitleCase(contract.vendor_name)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
        <div className="text-right">
          <p className="text-xs font-mono font-medium tabular-nums text-text-primary">{formatCompactMXN(contract.amount_mxn)}</p>
          <p className="text-xs font-mono text-text-muted tabular-nums">{formatCompactUSD(contract.amount_mxn)}</p>
        </div>
        {contract.risk_score != null && (
          <RiskBadge score={contract.risk_score} className="text-xs px-1.5 py-0" />
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InstitutionProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[72px]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
      <Skeleton className="h-16" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  )
}

export default InstitutionProfile
