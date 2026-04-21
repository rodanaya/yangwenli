import { useState, useMemo, useRef, useEffect } from 'react'
import { SimpleTabs, TabPanel } from '@/components/ui/SimpleTabs'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatVendorName } from '@/lib/vendor/formatName'
import { institutionApi, caseLibraryApi, api, scorecardApi } from '@/api/client'
import { GradeBadge10, InstitutionScorecardCard } from '@/components/ui/ScorecardWidgets'
import type { InstitutionScorecardData } from '@/components/ui/ScorecardWidgets'
import { RISK_COLORS, getRiskLevelFromScore, RISK_THRESHOLDS } from '@/lib/constants'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { FuentePill } from '@/components/ui/FuentePill'
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
  GitCompare,
  Calendar,
  UserCheck,
  BarChart3,
  Clock,
  Globe,
} from 'lucide-react'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Line,
  ReferenceLine,
} from '@/components/charts'
import { DotStrip } from '@/components/charts/DotStrip'

// SimpleTabs and TabPanel imported from @/components/ui/SimpleTabs

// ---- Risk level palette ----
const LEVEL_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
  unknown: '#64748b',
}

// LEVEL_LABELS is now built dynamically via t() in the component

// ---- Officials types ----
interface OfficialProfile {
  official_name: string
  total_contracts: number
  first_contract_year: number
  last_contract_year: number
  single_bid_pct: number
  direct_award_pct: number
  avg_risk_score: number
  vendor_diversity: number
  hhi_vendors: number
  interpretation: string
}

interface OfficialsResponse {
  institution_id: number
  officials: OfficialProfile[]
  note: string
  data_available: boolean
}

// getInstitutionTypeLabel is defined inside the component to access t()

// buildEditorialLedeText is defined inside the component to access t()


// ---- Main component ----

export function InstitutionProfile() {
  const { t } = useTranslation('institutions')
  const { id } = useParams<{ id: string }>()

  // ---- Localized label maps ----
  const LEVEL_LABELS: Record<string, string> = {
    critical: t('profile.riskLevels.critical'),
    high: t('profile.riskLevels.high'),
    medium: t('profile.riskLevels.medium'),
    low: t('profile.riskLevels.low'),
    unknown: t('profile.riskLevels.unknown'),
  }

  const INSTITUTION_TYPE_KEY_MAP: Record<string, string> = {
    secretaria: 'secretaria',
    organo_desconcentrado: 'organoDesconcentrado',
    entidad_paraestatal: 'entidadParaestatal',
    empresa_productiva: 'empresaProductiva',
    organo_autonomo: 'organoAutonomo',
    poder_judicial: 'poderJudicial',
    poder_legislativo: 'poderLegislativo',
  }

  function getInstitutionTypeLabel(type: string | null | undefined): string {
    if (!type) return t('profile.institutionTypeLabels.default')
    const key = INSTITUTION_TYPE_KEY_MAP[type]
    if (key) return t(`profile.institutionTypeLabels.${key}`)
    return type.replace(/_/g, ' ')
  }

  function buildEditorialLedeText(inst: {
    name: string
    avg_risk_score?: number | null
    direct_award_pct?: number | null
    direct_award_rate?: number | null
    total_contracts?: number | null
    total_amount_mxn?: number | null
    vendor_count?: number | null
  }, topVendorName?: string, topVendorPct?: number): string {
    const score = inst.avg_risk_score ?? 0
    const daPct = inst.direct_award_pct ?? inst.direct_award_rate ?? 0
    const instName = toTitleCase(inst.name)

    if (score >= RISK_THRESHOLDS.high && daPct > 60 && topVendorName && topVendorPct && topVendorPct > 15) {
      return `${instName} ${t('profile.editorialLedeCapture', { daPct: daPct.toFixed(0), topVendor: formatVendorName(topVendorName, 40), topVendorPct: topVendorPct.toFixed(1), totalContracts: (inst.total_contracts ?? 0).toLocaleString(), score: (score * 100).toFixed(1) })}`
    }

    if (score >= RISK_THRESHOLDS.medium) {
      return `${instName} ${t('profile.editorialLedeMedium', { score: (score * 100).toFixed(1), totalContracts: (inst.total_contracts ?? 0).toLocaleString(), daPct: daPct.toFixed(0) })}`
    }

    return `${instName} ${t('profile.editorialLedeLow', { score: (score * 100).toFixed(1), totalContracts: (inst.total_contracts ?? 0).toLocaleString(), daPct: daPct.toFixed(0) })}`
  }
  const institutionId = Number(id)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const riskTimelineChartRef = useRef<HTMLDivElement>(null)
  const vendorLoyaltyChartRef = useRef<HTMLDivElement>(null)
  const spendingChartRef = useRef<HTMLDivElement>(null)

  // Sort state for officials table
  const [officialSortKey, setOfficialSortKey] = useState<keyof OfficialProfile>('total_contracts')
  const [officialSortDesc, setOfficialSortDesc] = useState(true)

  const { data: institution, isLoading: institutionLoading, isPending: institutionPending, error: institutionError } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: !!(institutionId && Number.isFinite(institutionId)),
    staleTime: 5 * 60 * 1000,
    retry: false,
    gcTime: 10 * 60 * 1000,
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
    enabled: !!institutionId && activeTab === 'risk',
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
    enabled: !!institutionId && activeTab === 'vendors',
    staleTime: 10 * 60 * 1000,
  })

  const { data: peerComparison, isLoading: peerLoading, error: peerError } = useQuery({
    queryKey: ['institution', institutionId, 'peer-comparison'],
    queryFn: () => institutionApi.getPeerComparison(institutionId),
    enabled: !!institutionId && activeTab === 'risk',
    staleTime: 10 * 60 * 1000,
  })

  const { data: asfData, isLoading: asfLoading, error: asfDataError } = useQuery({
    queryKey: ['institution-asf-findings', institutionId],
    queryFn: () => institutionApi.getASFFindings(institutionId),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: !!institutionId,
  })

  const { data: sectorCases, error: sectorCasesError } = useQuery({
    queryKey: ['cases', 'by-sector', institution?.sector_id],
    queryFn: () => caseLibraryApi.getBySector(institution!.sector_id!),
    enabled: !!institution?.sector_id,
    staleTime: 10 * 60 * 1000,
  })

  const { data: groundTruthStatus, error: groundTruthStatusError } = useQuery({
    queryKey: ['institution', institutionId, 'ground-truth-status'],
    queryFn: () => institutionApi.getGroundTruthStatus(institutionId),
    enabled: !!institutionId,
    staleTime: 30 * 60 * 1000,
  })

  const { data: waterfallData, isLoading: waterfallLoading, error: waterfallDataError } = useQuery({
    queryKey: ['institution-risk-waterfall', institutionId],
    queryFn: async () => {
      const { data } = await api.get(`/institutions/${institutionId}/risk-waterfall`)
      return data
    },
    enabled: !!institutionId && activeTab === 'risk',
    staleTime: 30 * 60 * 1000,
  })

  const { data: topCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['institution', institutionId, 'top-categories'],
    queryFn: () => institutionApi.getTopCategories(institutionId, { limit: 8 }),
    enabled: !!institutionId && activeTab === 'vendors',
    staleTime: 30 * 60 * 1000,
  })

  const { data: scorecard } = useQuery<InstitutionScorecardData>({
    queryKey: ['institution', institutionId, 'scorecard'],
    queryFn: () => scorecardApi.getInstitution(institutionId),
    enabled: !!institutionId,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  // Officials data -- only fetched when Officials tab is active
  const { data: officialsData, isLoading: officialsLoading, error: officialsError } = useQuery<OfficialsResponse>({
    queryKey: ['institution', institutionId, 'officials'],
    queryFn: () => institutionApi.getOfficials(institutionId) as Promise<OfficialsResponse>,
    enabled: !!institutionId && activeTab === 'officials',
    staleTime: 30 * 60 * 1000,
  })

  // ---- Derived values ----

  const riskScore = institution?.risk_baseline ?? institution?.avg_risk_score ?? 0
  const riskLevel = getRiskLevelFromScore(riskScore)
  const riskColor = RISK_COLORS[riskLevel] ?? '#64748b'

  const timelineTrend = useMemo(() => {
    const pts = riskTimeline?.timeline ?? []
    if (pts.length < 4) return null
    const last3 = pts.slice(-3).map((p) => p.avg_risk_score ?? 0)
    const prev3 = pts.slice(-6, -3).map((p) => p.avg_risk_score ?? 0)
    if (!prev3.length) return null
    const avgLast = last3.reduce((a, b) => a + b, 0) / last3.length
    const avgPrev = prev3.reduce((a, b) => a + b, 0) / prev3.length
    const delta = avgLast - avgPrev
    if (Math.abs(delta) < 0.01) return { direction: 'stable' as const, delta }
    return { direction: (delta > 0 ? 'up' : 'down') as 'up' | 'down', delta }
  }, [riskTimeline])

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

  const redThreadItems = useMemo(() => {
    const items: Array<{
      type: 'co_bidder' | 'investigation_case' | 'sanctions' | 'scandal' | 'high_risk_vendor' | 'asf_finding'
      label: string
      count?: number
      href: string
      riskLevel?: 'critical' | 'high' | 'medium' | 'low'
    }> = []

    const highRiskVendors = vendors?.data?.filter(
      (v) => v.avg_risk_score != null && v.avg_risk_score >= 0.3
    )
    if (highRiskVendors && highRiskVendors.length > 0) {
      items.push({
        type: 'high_risk_vendor',
        label: `${highRiskVendors.length} proveedor${highRiskVendors.length > 1 ? 'es' : ''} de alto riesgo`,
        count: highRiskVendors.length,
        href: '#vendors',
        riskLevel: highRiskVendors.some((v) => (v.avg_risk_score ?? 0) >= 0.5) ? 'critical' : 'high',
      })
    }

    if (sectorCases && sectorCases.length > 0) {
      items.push({
        type: 'scandal',
        label: `${sectorCases.length} escandalo${sectorCases.length > 1 ? 's' : ''} documentado${sectorCases.length > 1 ? 's' : ''} en el sector`,
        count: sectorCases.length,
        href: `/cases`,
      })
    }

    if (asfData && asfData.findings.length > 0) {
      items.push({
        type: 'asf_finding',
        label: `${asfData.findings.length} ano${asfData.findings.length > 1 ? 's' : ''} con hallazgos ASF`,
        count: asfData.findings.length,
        href: '#asf',
        riskLevel: 'high',
      })
    }

    if (peerComparison?.metrics) {
      const concMetric = peerComparison.metrics.find((m) => m.metric === 'vendor_concentration' || m.metric === 'hhi')
      if (concMetric && concMetric.percentile > 75) {
        items.push({
          type: 'investigation_case',
          label: `P${concMetric.percentile} concentracion vs pares`,
          href: '#concentration',
          riskLevel: concMetric.percentile > 90 ? 'critical' : 'high',
        })
      }
    }

    return items
  }, [vendors, sectorCases, asfData, peerComparison])

  // Sorted officials
  const sortedOfficials = useMemo(() => {
    if (!officialsData?.officials) return []
    const sorted = [...officialsData.officials]
    sorted.sort((a, b) => {
      const aVal = a[officialSortKey]
      const bVal = b[officialSortKey]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return officialSortDesc ? bVal - aVal : aVal - bVal
      }
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      return officialSortDesc ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr)
    })
    return sorted
  }, [officialsData, officialSortKey, officialSortDesc])

  // HHI trend badge
  const hhiTrendBadge = useMemo(() => {
    const history = institution?.supplier_diversity?.history
    if (!history || history.length < 3) return null
    const last3 = history.slice(-3)
    const slope = (last3[last3.length - 1].hhi - last3[0].hhi) / (last3.length - 1)
    if (slope > 50) return { label: 'Concentrando', color: '#dc2626' }
    if (slope < -50) return { label: 'Diversificando', color: '#16a34a' }
    return { label: 'Estable', color: '#eab308' }
  }, [institution?.supplier_diversity?.history])

  // ---- Loading / error states ----
  // Guard: if institutionId is invalid, skip straight to error state
  const isValidId = Number.isFinite(institutionId) && institutionId > 0
  const [loadTimedOut, setLoadTimedOut] = useState(false)
  const isCurrentlyLoading = isValidId && (institutionLoading || (institutionPending && !institutionError))
  useEffect(() => {
    if (!isCurrentlyLoading) { setLoadTimedOut(false); return }
    const timer = setTimeout(() => setLoadTimedOut(true), 10000)
    return () => clearTimeout(timer)
  }, [isCurrentlyLoading])

  // Use isPending (no data yet) OR isLoading (first fetch in progress) to cover
  // all initial-mount scenarios in TanStack Query v5.  Only show skeleton when
  // the query is actually enabled (valid ID) — otherwise fall through to error.
  if (isCurrentlyLoading && !loadTimedOut) return <InstitutionProfileSkeleton />

  if (institutionError || !institution) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-elevated border border-border/40 mb-4">
          <Building2 className="h-8 w-8 text-text-muted" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{t('profile.notFound')}</h2>
        <p className="text-sm text-text-muted mb-6 max-w-sm">
          {institutionError
            ? t('profile.loadError', { message: (institutionError as Error).message ?? 'Error desconocido' })
            : <>{t('profile.notFoundDesc', { id: String(institutionId || id) })}</>
          }
        </p>
        <Link to="/institutions/health">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('profile.backToInstitutions')}
          </Button>
        </Link>
      </div>
    )
  }

  const totalContracts = institution.total_contracts ?? riskProfile?.total_contracts ?? 0
  const totalValue = institution.total_amount_mxn ?? riskProfile?.total_value ?? 0
  const highRiskPct = institution.high_risk_percentage ?? institution.high_risk_pct
  const _vendorCount = institution.vendor_count ?? vendors?.total ?? 0
  void _vendorCount
  const daPct = institution.direct_award_pct ?? institution.direct_award_rate ?? 0
  const topVendor = vendors?.data?.[0]
  const topVendorPct = topVendor && totalValue > 0
    ? (topVendor.total_value_mxn / totalValue) * 100
    : 0
  const sectorName = institution.sector_id
    ? (['', 'Salud', 'Educacion', 'Infraestructura', 'Energia', 'Defensa', 'Tecnologia', 'Hacienda', 'Gobernacion', 'Agricultura', 'Ambiente', 'Trabajo', 'Otros'][institution.sector_id] ?? '')
    : ''

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ---- BREADCRUMB NAV ---- */}
      <nav className="flex items-center gap-2 text-xs text-text-muted" aria-label="Breadcrumb">
        <Link to="/institutions/health" className="hover:text-accent transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          {t('profile.breadcrumb')}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-secondary truncate max-w-[300px]">{toTitleCase(institution.name)}</span>
      </nav>

      {/* ---- EDITORIAL HERO ---- */}
      <header>
        {/* Dateline strip — newspaper masthead grammar */}
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-zinc-300">RUBLI</span>
          </span>
          <span className="text-zinc-700">·</span>
          <span>Institución</span>
          {institution.siglas ? (
            <>
              <span className="text-zinc-700">·</span>
              <span className="font-mono tabular-nums text-zinc-300">{institution.siglas}</span>
            </>
          ) : null}
          <span className="text-zinc-700">·</span>
          <span className="font-mono tabular-nums">v0.6.5</span>
          <span className="text-zinc-700">·</span>
          <span className="font-mono tabular-nums">2002–2025</span>
        </div>
        {/* Kicker */}
        <p className="text-kicker text-kicker--investigation mb-3">
          {t('profile.breadcrumb', 'Institution Profile')}
        </p>
        {/* Institution type badge + sector */}
        <div className="flex items-center gap-2 mb-3">
          {institution.institution_type && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider border"
              style={{
                color: riskColor,
                borderColor: `${riskColor}40`,
                backgroundColor: `${riskColor}10`,
              }}
            >
              <Building2 className="h-3 w-3" />
              {getInstitutionTypeLabel(institution.institution_type)}
            </span>
          )}
          {institution.siglas && (
            <span className="text-xs font-mono font-bold text-accent">{institution.siglas}</span>
          )}
          {scorecard && (
            <div title={`Integridad: ${scorecard.grade_label} (${scorecard.total_score.toFixed(0)}/100)`}>
              <GradeBadge10 grade={scorecard.grade} size="sm" />
            </div>
          )}
          {groundTruthStatusError ? null : groundTruthStatus?.is_ground_truth_related ? (
            <Badge variant="critical" className="text-xs px-1.5 py-0 h-4">
              {t('profile.documentedCase', { caseName: groundTruthStatus.case_name })}
            </Badge>
          ) : null}
        </div>

        {/* Large serif name — editorial masthead */}
        <h1
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-[1.05] tracking-[-0.01em] mb-1"
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          {toTitleCase(institution.name)}
        </h1>

        <InstitutionLogoBanner name={institution.name} height={28} className="mt-2 mb-3" enableWiki />

        {(() => {
          const group = getInstitutionGroup(institution.name)
          return group ? (
            <p className="text-sm text-text-muted mb-2">
              {t('profile.partOf')}{' '}
              <span className="font-medium" style={{ color: group.color }}>{group.name}</span>
            </p>
          ) : null
        })()}

        {/* Action bar — primary actions (explore) + utility (save/export/feedback) */}
        <div className="flex items-center gap-3 flex-wrap mt-5 pb-4 border-b border-border">
          <RiskBadge score={riskScore} className="text-sm px-2.5 py-1" />
          {/* Primary exploration actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setNetworkOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 transition-colors font-medium"
            >
              <Network className="h-3.5 w-3.5" />
              {t('profile.networkButton')}
            </button>
            <Link to={`/contracts?institution_id=${institutionId}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border/40 bg-background-elevated text-text-secondary hover:text-text-primary transition-colors">
                <FileText className="h-3.5 w-3.5" />
                {t('profile.allContractsButton')}
              </button>
            </Link>
            <Link to={`/institutions/compare?a=${institutionId}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border/40 bg-background-elevated text-text-secondary hover:text-text-primary transition-colors">
                <GitCompare className="h-3.5 w-3.5" />
                {t('profile.compareButton')}
              </button>
            </Link>
          </div>
          {/* Divider */}
          <span className="hidden sm:block h-5 w-px bg-border/60" aria-hidden="true" />
          {/* Utility actions */}
          <div className="flex items-center gap-2 flex-wrap">
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
            <RiskFeedbackButton
              entityType="institution"
              entityId={institutionId}
            />
          </div>
        </div>
      </header>

      <NetworkGraphModal
        open={networkOpen}
        onOpenChange={setNetworkOpen}
        centerType="institution"
        centerId={institutionId}
        centerName={toTitleCase(institution.name)}
      />

      <EditorialPageShell
        kicker="PERFIL INSTITUCIONAL · MÉXICO"
        headline={toTitleCase(institution.name)}
        paragraph={
          <>
            This institution's procurement record spans 2002&ndash;2025 across {formatNumber(totalContracts)} contracts.
            {' '}{getInstitutionTypeLabel(institution.institution_type)}
            {sectorName ? ` / ${t('profile.sectorLabel')} ${sectorName}` : ''}.
            {' '}Patterns below reveal vendor concentration, direct-award rates, and risk signals
            measured against documented corruption signatures.
          </>
        }
        stats={[
          {
            value: formatNumber(totalContracts),
            label: t('profile.hallazgoLabels.contractsAnalyzed'),
            sub: '2002-2025, COMPRANET',
          },
          {
            value: formatCompactMXN(totalValue),
            label: t('profile.hallazgoLabels.totalAccumulatedSpend'),
            color: 'var(--color-accent)',
            sub: formatCompactUSD(totalValue),
          },
          {
            value: `${(riskScore * 100).toFixed(1)}%`,
            label: t('profile.hallazgoLabels.avgRiskIndex'),
            color: riskLevel === 'critical' ? 'var(--color-risk-critical)' :
                   riskLevel === 'high' ? 'var(--color-risk-high)' :
                   riskLevel === 'medium' ? 'var(--color-risk-medium)' :
                   'var(--color-risk-low)',
            sub: 'OECD: 2-15%',
          },
          {
            value: `${daPct.toFixed(0)}%`,
            label: t('profile.hallazgoLabels.directAward'),
            color: daPct > 80 ? 'var(--color-risk-critical)' : daPct > 60 ? 'var(--color-risk-high)' : undefined,
            sub: 'OECD max: 25%',
          },
        ]}
        meta={<>RUBLI · v0.6.5</>}
        severity="medium"
      >

      {/* ---- HIDDEN HEADLINE (kept for backward i18n / a11y links) ---- */}
      <div className="sr-only">
        <EditorialHeadline
          section={t('profile.editorialSection')}
          headline={toTitleCase(institution.name)}
          subtitle={`${getInstitutionTypeLabel(institution.institution_type)}${sectorName ? ` / ${t('profile.sectorLabel')} ${sectorName}` : ''}`}
        />
      </div>

      {/* ---- INVESTIGATION LEDE ---- */}
      <div
        className="rounded-lg p-5 leading-relaxed text-[15px] text-text-secondary mb-6"
        style={{
          fontFamily: "var(--font-family-serif)",
          borderLeft: `3px solid ${riskColor}`,
          backgroundColor: `${riskColor}08`,
        }}
      >
        <p>{buildEditorialLedeText(institution, topVendor?.vendor_name, topVendorPct)}</p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <FuentePill source="COMPRANET" count={totalContracts} verified />
          {asfData && asfData.findings.length > 0 && (
            <FuentePill source="ASF" count={asfData.findings.length} countLabel="auditorias" />
          )}
        </div>
      </div>

      {/* ---- IMPACTO HUMANO (for high-risk institutions) ---- */}
      {riskScore >= RISK_THRESHOLDS.medium && totalValue > 100_000_000 && (
        <div className="mb-6">
          <ImpactoHumano amountMxn={totalValue * (highRiskPct ?? riskScore * 100) / 100} />
        </div>
      )}

      {/* ---- GROUND TRUTH WARNING BANNER ---- */}
      {groundTruthStatus?.is_ground_truth_related && (
        <div
          className="flex items-start gap-3 rounded-lg border border-risk-critical/40 bg-risk-critical/5 px-4 py-3"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4 text-risk-critical flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-risk-critical uppercase tracking-wider font-mono mb-0.5">
              {t('profile.groundTruth.bannerLabel')}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t('profile.groundTruth.bannerText')}{' '}
              <span className="font-semibold text-risk-critical">
                {groundTruthStatus.case_name}
              </span>
              {groundTruthStatus.case_type && (
                <> ({groundTruthStatus.case_type.replace(/_/g, ' ')})</>
              )}
              {groundTruthStatus.contract_count != null && groundTruthStatus.contract_count > 0 && (
                <> — {formatNumber(groundTruthStatus.contract_count)} {t('profile.groundTruth.contractsFlagged')}</>
              )}.
            </p>
          </div>
        </div>
      )}

      {/* ---- TABBED CONTENT ---- */}
      <Act number="I" label="EVIDENCIA · EXPEDIENTE INSTITUCIONAL">
      <SimpleTabs
        defaultTab="overview"
        onTabChange={setActiveTab}
        tabs={[
          { key: 'overview', label: t('profile.tabs.overview'), icon: BarChart3 },
          { key: 'risk', label: t('profile.tabs.risk'), icon: Shield },
          { key: 'vendors', label: t('profile.tabs.vendors'), icon: Users },
          { key: 'officials', label: t('profile.tabs.officials'), icon: UserCheck },
          { key: 'history', label: t('profile.tabs.history'), icon: Clock },
          { key: 'external', label: t('profile.tabs.external'), icon: Globe },
        ]}
      >

        {/* ========= TAB 1: PANORAMA (OVERVIEW) ========= */}
        <TabPanel tabKey="overview">
          <div className="space-y-6">
            {/* AI Intelligence Brief */}
            <div>
              <div className="flex items-center gap-2 px-1 mb-2">
                <Brain className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
                  {t('profile.overview.intelligenceBrief')}
                </span>
              </div>
              <NarrativeCard
                paragraphs={buildInstitutionNarrative(institution, vendors?.data ?? null)}
                compact
              />
            </div>

            {/* Red Thread Panel */}
            {redThreadItems.length > 0 && (
              <RedThreadPanel
                items={redThreadItems}
                entityName={toTitleCase(institution.name)}
              />
            )}

            {/* Risk Distribution + Details sidebar */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-5">
                {/* Risk Distribution */}
                <div className="card-elevated">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                      <Shield className="h-3.5 w-3.5 text-accent" />
                      {t('profile.overview.riskDistribution')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {riskProfileLoading ? (
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6" />)}
                      </div>
                    ) : riskProfileError ? (
                      <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingRisk')}</p>
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
                                <span className="text-xs font-bold font-mono" style={{ color: r.color }}>{r.pct.toFixed(0)}%</span>
                              </div>
                            </div>
                            {(() => {
                              const N = 22, DR = 2, DG = 5.5
                              const filled = Math.max(1, Math.round((r.pct / 100) * N))
                              return (
                                <svg viewBox={`0 0 ${N * DG} 6`} className="w-full" style={{ height: 6 }} preserveAspectRatio="none" aria-hidden="true">
                                  {Array.from({ length: N }).map((_, k) => (
                                    <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                                      fill={k < filled ? r.color : '#2d2926'}
                                      stroke={k < filled ? undefined : '#3d3734'}
                                      strokeWidth={k < filled ? 0 : 0.5}
                                      fillOpacity={k < filled ? 0.85 : 1}
                                    />
                                  ))}
                                </svg>
                              )
                            })()}
                          </div>
                        ))}
                        {riskProfile?.effective_risk != null && (
                          <div className="mt-3 pt-3 border-t border-border/30 flex justify-between text-xs">
                            <span className="text-text-muted">{t('profile.effectiveRiskLabel')}</span>
                            <span className="font-bold font-mono" style={{ color: riskColor }}>{formatPercentSafe(riskProfile.effective_risk, true)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">{t('profile.noRiskData')}</p>
                    )}
                  </CardContent>
                </div>

                {/* Procurement Integrity Score */}
                {scorecard && (
                  <div className="card-elevated">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                        <Shield className="h-3.5 w-3.5 text-accent" />
                        {t('profile.integrityScoreLabel')}
                        <GradeBadge10 grade={scorecard.grade} size="sm" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <InstitutionScorecardCard sc={scorecard} />
                    </CardContent>
                  </div>
                )}

                {/* Institution Details */}
                <div className="card-elevated">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                      <Building2 className="h-3.5 w-3.5 text-accent" />
                      {t('profile.overview.institutionDetails')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-2">
                    <DetailRow label={t('profile.overview.detailType')} value={getInstitutionTypeLabel(institution.institution_type)} />
                    <DetailRow label={t('profile.overview.detailSize')} value={institution.size_tier} />
                    <DetailRow label={t('profile.overview.detailAutonomy')} value={institution.autonomy_level} />
                    <DetailRow label={t('profile.overview.detailScope')} value={institution.geographic_scope} />
                    <DetailRow label={t('profile.overview.detailDataQuality')} value={institution.data_quality_grade} />
                    {institution.avg_contract_value != null && (
                      <DetailRow label={t('profile.overview.detailAvgContract')} value={formatCompactMXN(institution.avg_contract_value)} />
                    )}
                    {riskProfile != null && (
                      <>
                        <div className="pt-1 border-t border-border/30" />
                        <DetailRow label={t('profile.overview.detailBaseRisk')} value={formatPercentSafe(riskProfile.risk_baseline, true)} valueColor={riskColor} />
                        <DetailRow label={t('profile.overview.detailSizeAdjustment')} value={`${riskProfile.size_risk_adjustment >= 0 ? '+' : ''}${(riskProfile.size_risk_adjustment * 100).toFixed(0)}pp`} />
                        <DetailRow label={t('profile.overview.detailAutonomyRisk')} value={formatPercentSafe(riskProfile.autonomy_risk_baseline, true)} />
                      </>
                    )}
                  </CardContent>
                </div>
              </div>

              {/* Right side -- top vendors + most suspicious contract */}
              <div className="lg:col-span-2 space-y-5">
                {/* Top Vendors */}
                <div className="card-elevated">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                      <Users className="h-3.5 w-3.5 text-accent" />
                      {t('profile.overview.topVendors')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {vendorsLoading ? (
                      <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                    ) : vendorsError ? (
                      <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingVendors')}</p>
                    ) : vendors?.data?.length ? (
                      <VendorRankedList vendors={vendors.data.slice(0, 10)} totalValue={totalValue} />
                    ) : (
                      <p className="text-sm text-text-muted">{t('profile.noVendorData')}</p>
                    )}
                  </CardContent>
                </div>

                {/* Most Suspicious Contract */}
                {(() => {
                  const topContract = highRiskContracts?.data?.[0]
                  if (!topContract) return null
                  const contractRiskScore = topContract.risk_score ?? 0
                  const contractRiskLevel = getRiskLevelFromScore(contractRiskScore)
                  const contractColor = RISK_COLORS[contractRiskLevel] ?? '#64748b'
                  return (
                    <div
                      className="card-elevated border-l-4 cursor-pointer hover:bg-background-elevated/20 transition-colors"
                      style={{ borderLeftColor: contractColor }}
                      onClick={() => { setSelectedContractId(topContract.id); setIsDetailOpen(true) }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${t('profile.overview.mostSuspiciousContract')}: ${(topContract as any).description ?? (topContract as any).procedure_number ?? topContract.title}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedContractId(topContract.id); setIsDetailOpen(true) } }}
                    >
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase font-mono" style={{ color: contractColor }}>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t('profile.overview.mostSuspiciousContract')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4 space-y-2">
                        <p className="text-sm font-semibold text-text-primary leading-tight line-clamp-2">
                          {topContract.title ?? `Contrato #${topContract.id}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                          <span className="font-bold" style={{ color: contractColor }}>{t('profile.overview.riskLabel')} {(contractRiskScore * 100).toFixed(1)}%</span>
                          {topContract.amount_mxn != null && <span className="text-text-secondary">{formatCompactMXN(topContract.amount_mxn)}</span>}
                          {topContract.vendor_name && <span className="text-text-muted truncate max-w-[200px]" title={topContract.vendor_name}>{topContract.vendor_name}</span>}
                          {topContract.contract_year && <span className="text-text-muted">{topContract.contract_year}</span>}
                          {topContract.is_direct_award && <span className="text-risk-high">{t('profile.overview.directAward')}</span>}
                          {topContract.is_single_bid && <span className="text-risk-critical">{t('profile.overview.singleBidder')}</span>}
                        </div>
                        <p className="text-[10px] text-text-muted/60 italic">{t('profile.overview.clickForDetails')}</p>
                      </CardContent>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </TabPanel>

        {/* ========= TAB 2: RIESGO ========= */}
        <TabPanel tabKey="risk">
          <div className="space-y-5">
            {/* Risk Trajectory */}
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                    <TrendingUp className="h-3.5 w-3.5 text-accent" />
                    {t('profile.risk.trajectory')}
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
                      {timelineTrend.direction === 'up' ? t('profile.risk.trendUp') :
                       timelineTrend.direction === 'down' ? t('profile.risk.trendDown') : t('profile.risk.trendStable')}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {timelineLoading ? (
                  <Skeleton className="h-40" />
                ) : timelineError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingTimeline')}</p>
                ) : (riskTimeline?.timeline?.length ?? 0) > 1 ? (
                  <div className="relative" ref={riskTimelineChartRef}>
                    <ChartDownloadButton
                      targetRef={riskTimelineChartRef}
                      filename={`institution-${institutionId}-risk-timeline`}
                      className="absolute top-0 right-0 z-10"
                    />
                    <RiskTimelineChart data={riskTimeline!.timeline} riskColor={riskColor} />
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-text-muted">
                    Datos insuficientes
                  </div>
                )}
              </CardContent>
            </div>

            {/* Risk Factor Breakdown (Waterfall) */}
            {(waterfallDataError || waterfallLoading || waterfallData?.features?.length > 0) && (
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <Shield className="h-3.5 w-3.5 text-accent" />
                  Desglose de factores de riesgo
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {waterfallDataError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingRisk')}</p>
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
            </div>
            )}

            {/* Peer Comparison */}
            {(peerLoading || peerComparison) && (
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <Users className="h-3.5 w-3.5 text-accent" />
                  Comparacion con pares
                  {peerComparison && (
                    <span className="ml-auto text-[10px] font-normal text-text-muted normal-case">
                      vs {peerComparison.peer_count} instituciones similares
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
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingPeers')}</p>
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
                            <span className="text-xs font-mono font-bold" style={{ color: markerColor }}>P{pct}</span>
                          </div>
                          {(() => {
                            const N = 40, DR = 2.5, DG = 6
                            const totalW = N * DG
                            const p25Idx = Math.round((m.peer_p25 / 100) * N)
                            const p75Idx = Math.round((m.peer_p75 / 100) * N)
                            const markerIdx = Math.round((pct / 100) * N)
                            const medianX = (m.peer_median / 100) * totalW
                            return (
                              <svg viewBox={`0 0 ${totalW} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none" aria-hidden="true">
                                {/* Track dots */}
                                {Array.from({ length: N }).map((_, k) => {
                                  const inPeerRange = k >= p25Idx && k < p75Idx
                                  return (
                                    <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                                      fill={inPeerRange ? '#a1a1aa' : '#2d2926'}
                                      stroke={inPeerRange ? undefined : '#3d3734'}
                                      strokeWidth={inPeerRange ? 0 : 0.5}
                                      fillOpacity={inPeerRange ? 0.25 : 0.6}
                                    />
                                  )
                                })}
                                {/* Peer median line */}
                                <line x1={medianX} y1={0} x2={medianX} y2={10} stroke="#a1a1aa" strokeWidth={0.8} strokeOpacity={0.6} />
                                {/* This institution marker */}
                                <circle cx={markerIdx * DG + DR} cy={5} r={DR + 1.2}
                                  fill={markerColor}
                                  stroke="#000"
                                  strokeWidth={0.5}
                                />
                              </svg>
                            )
                          })()}
                          <div className="flex justify-between mt-0.5 text-[10px] text-text-muted/60 font-mono">
                            <span>min</span><span>mediana</span><span>max</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">Pares insuficientes para comparar</p>
                )}
              </CardContent>
            </div>
            )}

            {/* Direct Award Rate vs Benchmark */}
            {(() => {
              const directAwardPct = institution.direct_award_pct ?? institution.direct_award_rate
              const singleBidPct = institution.single_bid_pct
              if (directAwardPct == null && singleBidPct == null) return null
              const NATIONAL_DA_BENCHMARK = 74
              const NATIONAL_SB_BENCHMARK = 12
              const daDiff = directAwardPct != null ? directAwardPct - NATIONAL_DA_BENCHMARK : null
              const sbDiff = singleBidPct != null ? singleBidPct - NATIONAL_SB_BENCHMARK : null
              return (
                <div className="card-elevated">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                      <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                      {t('benchmarks.procurementMethod')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-3">
                    {directAwardPct != null && (
                      <BenchmarkBar label={t('benchmarks.directAwardLabel')} value={directAwardPct} benchmark={NATIONAL_DA_BENCHMARK} diff={daDiff} highThreshold={10} />
                    )}
                    {singleBidPct != null && (
                      <BenchmarkBar label={t('benchmarks.singleBidLabel')} value={singleBidPct} benchmark={NATIONAL_SB_BENCHMARK} diff={sbDiff} highThreshold={5} />
                    )}
                    <p className="text-[10px] text-text-muted/60 pt-1 border-t border-border/20">
                      {t('benchmarks.benchmarkNote')}
                    </p>
                  </CardContent>
                </div>
              )
            })()}
          </div>
        </TabPanel>

        {/* ========= TAB 3: PROVEEDORES ========= */}
        <TabPanel tabKey="vendors">
          <div className="space-y-5">
            {/* Vendor Concentration Treemap */}
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <BarChart3 className="h-3.5 w-3.5 text-accent" />
                  Concentracion de proveedores
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {vendorsLoading ? (
                  <Skeleton className="h-64" />
                ) : vendorsError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingVendors')}</p>
                ) : vendors?.data?.length ? (
                  <VendorTreemapLazy vendors={vendors.data} totalInstitutionValue={totalValue} />
                ) : (
                  <p className="text-xs text-text-muted">{t('profile.noVendorData')}</p>
                )}
              </CardContent>
            </div>

            {/* Vendor Loyalty Heatmap */}
            {(loyaltyLoading || (vendorLoyalty?.vendors?.length ?? 0) > 0) && (
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  Lealtad de proveedores — relaciones de largo plazo
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {loyaltyLoading ? (
                  <Skeleton className="h-32" />
                ) : loyaltyError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingLoyalty')}</p>
                ) : vendorLoyalty && vendorLoyalty.vendors.length > 0 ? (
                  <div className="relative overflow-x-auto" ref={vendorLoyaltyChartRef}>
                    <ChartDownloadButton targetRef={vendorLoyaltyChartRef} filename={`institution-${institutionId}-vendor-loyalty`} className="absolute top-0 right-0 z-10" />
                    <VendorLoyaltyHeatmap vendorLoyalty={vendorLoyalty} />
                    <p className="mt-2 text-[10px] text-text-muted/50 italic">Celdas = numero de contratos; color = riesgo promedio</p>
                  </div>
                ) : null}
              </CardContent>
            </div>
            )}

            {/* Longest-Tenured Vendors */}
            {institution.longest_tenured_vendors && institution.longest_tenured_vendors.length > 0 && (
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
                  {t('profile.longestTenuredVendors', 'Long-tenured Vendors')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <LongestTenuredGantt vendors={institution.longest_tenured_vendors} />
              </CardContent>
            </div>
            )}

            {/* HHI Trend Chart */}
            {institution.supplier_diversity && institution.supplier_diversity.history.length > 0 && (
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <BarChart3 className="h-3.5 w-3.5 text-accent" />
                  {t('profile.supplierDiversity', 'Supplier Diversity (HHI)')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-2">
                    {institution.supplier_diversity.concentration_level.toUpperCase()}
                  </Badge>
                  {hhiTrendBadge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ color: hhiTrendBadge.color, backgroundColor: `${hhiTrendBadge.color}15` }}>
                      {hhiTrendBadge.label}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <HHITrendChart history={institution.supplier_diversity.history} />
              </CardContent>
            </div>
            )}

            {/* EFOS/SFP cross-ref note */}
            <div className="px-3 py-2 rounded border border-border/30 bg-background-elevated/30">
              <p className="text-[10px] text-text-muted leading-relaxed">
                Cruce con EFOS (SAT Art. 69-B) y sanciones SFP disponible en perfiles de proveedores.
                Haga clic en cualquier proveedor para verificar su estatus en registros externos.
              </p>
            </div>

            {/* Top Procurement Categories */}
            {(categoriesLoading || (topCategories?.data?.length ?? 0) > 0) && (
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  Principales categorias de contratacion
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {categoriesLoading ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
                ) : (topCategories?.data ?? []).length === 0 ? (
                  <p className="text-sm text-text-muted">{t('profile.noCategoryData')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {(topCategories?.data ?? []).map((cat: { category_id: number; name_en: string; name_es: string; code: string; contract_count: number; total_value_mxn: number; avg_risk_score: number; direct_award_pct: number }) => {
                      const level = getRiskLevelFromScore(cat.avg_risk_score)
                      const riskCol = RISK_COLORS[level] ?? '#64748b'
                      return (
                        <div key={cat.category_id} className="flex items-center gap-2 text-xs py-1 border-b border-border/10 last:border-0">
                          <span className="font-mono text-text-muted w-10 shrink-0">{cat.code}</span>
                          <span className="flex-1 text-text-primary truncate" title={cat.name_es || cat.name_en}>{cat.name_es || cat.name_en}</span>
                          <span className="text-text-secondary shrink-0">{formatCompactMXN(cat.total_value_mxn)}</span>
                          <span className="w-12 text-right shrink-0" style={{ color: riskCol }}>{(cat.avg_risk_score * 100).toFixed(0)}%</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </div>
            )}
          </div>
        </TabPanel>

        {/* ========= TAB 4: FUNCIONARIOS ========= */}
        <TabPanel tabKey="officials">
          <div className="space-y-4">
            <p className="text-[11px] text-text-muted italic leading-relaxed max-w-2xl">
              Basado en Coviello &amp; Gagliarducci (2017) — la permanencia de funcionarios correlaciona con tasas de licitante unico.
              Datos disponibles para contratos 2018+ (COMPRANET Estructura C/D).
            </p>

            {officialsLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : officialsError ? (
              <div className="card-elevated p-6 text-center">
                <p className="text-xs text-rose-400/80">{t('profile.errorLoadingOfficials')}</p>
              </div>
            ) : !officialsData?.data_available || sortedOfficials.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <UserCheck className="h-8 w-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">{t('profile.noOfficialsData')}</p>
                {officialsData?.note && (
                  <p className="text-[10px] text-text-muted/60 mt-2 max-w-md mx-auto">{officialsData.note}</p>
                )}
              </div>
            ) : (
              <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" aria-label="Institution officials and contract activity">
                    <thead>
                      <tr className="border-b border-border/50">
                        {([
                          { key: 'official_name' as const, label: 'Funcionario', align: 'left' },
                          { key: 'first_contract_year' as const, label: 'Periodo', align: 'center' },
                          { key: 'total_contracts' as const, label: 'Contratos', align: 'right' },
                          { key: 'single_bid_pct' as const, label: '% Licitante Unico', align: 'right' },
                          { key: 'direct_award_pct' as const, label: '% Adj. Directa', align: 'right' },
                          { key: 'vendor_diversity' as const, label: 'Proveedores', align: 'right' },
                          { key: 'avg_risk_score' as const, label: 'Riesgo Prom.', align: 'right' },
                        ]).map((col) => (
                          <th
                            key={col.key}
                            className={cn(
                              'px-3 py-2 font-semibold text-text-muted uppercase tracking-wider cursor-pointer hover:text-accent transition-colors whitespace-nowrap',
                              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                            )}
                            onClick={() => {
                              if (officialSortKey === col.key) {
                                setOfficialSortDesc(!officialSortDesc)
                              } else {
                                setOfficialSortKey(col.key)
                                setOfficialSortDesc(true)
                              }
                            }}
                          >
                            {col.label}
                            {officialSortKey === col.key && (
                              <span className="ml-1">{officialSortDesc ? '\u25BC' : '\u25B2'}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOfficials.map((off, idx) => {
                        const isRedRow = off.single_bid_pct > 50 || off.vendor_diversity <= 3
                        const riskLvl = getRiskLevelFromScore(off.avg_risk_score)
                        const rClr = RISK_COLORS[riskLvl] ?? '#64748b'
                        return (
                          <tr
                            key={`${off.official_name}-${idx}`}
                            className={cn(
                              'border-b border-border/20 transition-colors',
                              isRedRow ? 'bg-risk-critical/5' : 'hover:bg-background-elevated/30'
                            )}
                          >
                            <td className="px-3 py-2 font-medium text-text-primary max-w-[200px] truncate" title={off.official_name}>
                              {toTitleCase(off.official_name)}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-text-muted">
                              {off.first_contract_year}--{off.last_contract_year}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{formatNumber(off.total_contracts)}</td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: off.single_bid_pct > 40 ? '#dc2626' : undefined }}>
                              {off.single_bid_pct.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono" style={{ color: off.direct_award_pct > 80 ? '#dc2626' : undefined }}>
                              {off.direct_award_pct.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{off.vendor_diversity}</td>
                            <td className="px-3 py-2 text-right">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono" style={{ color: rClr, backgroundColor: `${rClr}15` }}>
                                {(off.avg_risk_score * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {officialsData.note && (
                  <p className="px-3 py-2 text-[10px] text-text-muted/60 border-t border-border/20">{officialsData.note}</p>
                )}
              </div>
            )}
          </div>
        </TabPanel>

        {/* ========= TAB 5: HISTORIAL ========= */}
        <TabPanel tabKey="history">
          <div className="space-y-5">
            {/* Spending Over Time */}
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <DollarSign className="h-3.5 w-3.5 text-accent" />
                  Evolucion del gasto
                  {riskTimeline?.timeline?.length && riskTimeline.timeline.length > 1 && (
                    <span className="ml-auto text-[10px] font-normal text-text-muted normal-case">
                      {riskTimeline.timeline[0].year}--{riskTimeline.timeline[riskTimeline.timeline.length - 1].year}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {timelineLoading ? (
                  <Skeleton className="h-56" />
                ) : timelineError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingTimeline')}</p>
                ) : (riskTimeline?.timeline?.length ?? 0) > 1 ? (
                  <div className="relative" ref={spendingChartRef}>
                    <ChartDownloadButton targetRef={spendingChartRef} filename={`institution-${institutionId}-spending`} className="absolute top-0 right-0 z-10" />
                    <SpendingOverTimeChart data={riskTimeline!.timeline} />
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-text-muted">Datos insuficientes</div>
                )}
              </CardContent>
            </div>

            {/* High-Risk Contracts */}
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                    <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
                    Contratos de mayor riesgo
                  </CardTitle>
                  <Link to={`/contracts?institution_id=${institutionId}&sort_by=risk_score&sort_order=desc`} className="text-xs text-accent hover:underline flex items-center gap-1">
                    Ver todos <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-1">
                {highRiskContractsError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingContracts')}</p>
                ) : highRiskLoading ? (
                  <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : highRiskContracts?.data?.length ? (
                  <div className="divide-y divide-border/30">
                    {highRiskContracts.data.slice(0, 8).map((contract) => (
                      <ContractRow key={contract.id} contract={contract} onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }} />
                    ))}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-text-muted">{t('profile.noContractsFound')}</p>
                )}
              </CardContent>
            </div>

            {/* Recent Contracts */}
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                    <FileText className="h-3.5 w-3.5 text-accent" />
                    Contratos recientes
                  </CardTitle>
                  <Link to={`/contracts?institution_id=${institutionId}`} className="text-xs text-accent hover:underline flex items-center gap-1">
                    Ver todos <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-1">
                {recentLoading ? (
                  <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : contractsError ? (
                  <p className="text-xs text-rose-400/80 p-4 text-center">{t('profile.errorLoadingContracts')}</p>
                ) : recentContracts?.data?.length ? (
                  <ScrollArea className="max-h-[280px]">
                    <div className="divide-y divide-border/30">
                      {recentContracts.data.map((contract) => (
                        <ContractRow key={contract.id} contract={contract} onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }} />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="p-4 text-sm text-text-muted">{t('profile.noContractsFound')}</p>
                )}
              </CardContent>
            </div>
          </div>
        </TabPanel>

        {/* ========= TAB 6: EXTERNO ========= */}
        <TabPanel tabKey="external">
          <div className="space-y-5">
            {/* ASF Audit Findings */}
            <div className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Hallazgos de auditoria ASF
                </CardTitle>
              </CardHeader>
              <CardContent>
                {asfDataError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingAudit')}</p>
                ) : asfLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-8" />
                  </div>
                ) : !asfData || asfData.findings.length === 0 ? (
                  <p className="text-sm text-text-muted">{t('profile.noAuditFindings')}</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-semibold">{formatCompactMXN(asfData.total_amount_mxn)}</div>
                        <div className="text-xs text-text-muted">Total cuestionado</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{asfData.years_audited}</div>
                        <div className="text-xs text-text-muted">Anos auditados</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {asfData.findings[asfData.findings.length - 1]?.recovery_rate != null
                            ? `${((asfData.findings[asfData.findings.length - 1].recovery_rate ?? 0) * 100).toFixed(0)}%`
                            : 'N/A'}
                        </div>
                        <div className="text-xs text-text-muted">Tasa de solventacion</div>
                      </div>
                    </div>
                    <div role="img" aria-label="Chart showing audit findings and recovery rate over time">
                    <ResponsiveContainer width="100%" height={160}>
                      <ComposedChart data={asfData.findings} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tickFormatter={(v: number) => `${(v / 1e9).toFixed(1)}B`} tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                        <RechartsTooltip
                          formatter={(value: any, name: any) => {
                            const num = value as number
                            if (name === 'amount_mxn') return [formatCompactMXN(num), 'Monto']
                            return [num, name === 'observations_total' ? 'Observaciones' : 'Solventadas']
                          }}
                        />
                        <Line yAxisId="right" type="monotone" dataKey="observations_total" stroke="#f59e0b" dot={false} name="observations_total" />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </div>
                    <div className="mt-3">
                      <DotStrip
                        data={(asfData.findings ?? []).map((f) => ({
                          label: String(f.year),
                          value: (f.amount_mxn as number) ?? 0,
                          color: '#a78bfa',
                        }))}
                        formatVal={(v) => formatCompactMXN(v)}
                        dots={40}
                      />
                      <p className="text-[10px] text-text-muted font-mono mt-1">Monto observado por año</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>

            {/* Ground Truth Link */}
            {groundTruthStatus?.is_ground_truth_related && (
              <div className="card-elevated border-l-4 border-l-risk-critical">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-risk-critical" />
                    <h3 className="text-sm font-bold text-risk-critical">Caso de corrupcion documentado</h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Esta institucion esta vinculada a <span className="font-semibold">{groundTruthStatus.case_name}</span>
                    {groundTruthStatus.case_type && <> ({groundTruthStatus.case_type.replace(/_/g, ' ')})</>}.
                    {groundTruthStatus.contract_count != null && groundTruthStatus.contract_count > 0 && (
                      <> {formatNumber(groundTruthStatus.contract_count)} contratos senalados.</>
                    )}
                  </p>
                  <Link to="/cases" className="text-xs text-accent hover:underline mt-2 inline-flex items-center gap-1">
                    Ver biblioteca de casos <ExternalLink className="h-3 w-3" />
                  </Link>
                </CardContent>
              </div>
            )}

            {/* Known Scandals in sector */}
            {(sectorCasesError || (sectorCases && sectorCases.length > 0)) && (
              <div className="card-elevated">
                <CardContent className="pt-5 pb-4">
                  {sectorCasesError ? (
                    <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingScandals')}</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-risk-high opacity-70" />
                        <h2 className="text-sm font-bold text-text-primary">Escandalos documentados en el sector</h2>
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
                              {c.name_es || c.name_en}
                            </span>
                            <ChevronRight className="h-3 w-3 text-text-muted flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </div>
            )}

            {/* Cross-Registry Timeline */}
            <div className="card-elevated">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
                  Linea de tiempo cruzada
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <CrossRegistryTimeline
                  timeline={riskTimeline?.timeline ?? []}
                  asfFindings={(asfData?.findings ?? []).map(f => ({ year: f.year, amount_mxn: f.amount_mxn ?? undefined, observations_total: f.observations_total ?? undefined }))}
                />
              </CardContent>
            </div>

            {/* Cross-registry note */}
            <div className="px-3 py-2 rounded border border-border/30 bg-background-elevated/30">
              <p className="text-[10px] text-text-muted leading-relaxed">
                Registros externos: SAT EFOS (Art. 69-B), sanciones SFP, registro RUPC, hallazgos ASF.
                Consulte perfiles de proveedores individuales para estatus EFOS/SFP.
              </p>
            </div>
          </div>
        </TabPanel>

      </SimpleTabs>
      </Act>
      </EditorialPageShell>

      <ContractDetailModal
        contractId={selectedContractId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  )
}

// ---- Sub-components ----

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

function BenchmarkBar({ label, value, benchmark, diff, highThreshold }: {
  label: string; value: number; benchmark: number; diff: number | null; highThreshold: number
}) {
  const barColor = diff != null && diff > highThreshold ? '#dc2626' : diff != null && diff > 0 ? '#ea580c' : '#16a34a'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono" style={{ color: barColor }}>{value.toFixed(1)}%</span>
          {diff != null && (
            <span className={cn('text-[10px] font-mono', diff > 0 ? 'text-risk-high' : 'text-risk-low')}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}pp vs prom.
            </span>
          )}
        </div>
      </div>
      {(() => {
        const N = 30, DR = 2.5, DG = 6
        const filled = Math.max(1, Math.round((Math.min(100, value) / 100) * N))
        const benchIdx = Math.round((benchmark / 100) * N)
        const benchX = benchIdx * DG + DR
        return (
          <svg viewBox={`0 0 ${N * DG} 8`} className="w-full" style={{ height: 8 }} preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: N }).map((_, k) => (
              <circle key={k} cx={k * DG + DR} cy={4} r={DR}
                fill={k < filled ? barColor : '#2d2926'}
                stroke={k < filled ? undefined : '#3d3734'}
                strokeWidth={k < filled ? 0 : 0.5}
                fillOpacity={k < filled ? 0.85 : 1}
              />
            ))}
            <line x1={benchX} y1={0} x2={benchX} y2={8} stroke="#a1a1aa" strokeWidth={0.8} strokeOpacity={0.7} />
          </svg>
        )
      })()}
      <div className="flex justify-between mt-0.5 text-[10px] text-text-muted/60">
        <span>0%</span><span>Prom. {benchmark}%</span><span>100%</span>
      </div>
    </div>
  )
}

// ---- Risk Timeline Chart ----

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
    <div className="h-40" role="img" aria-label="Area chart showing contract value trend over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`riskGrad-${riskColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={riskColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={32} />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                const risk = payload[0]?.value
                const contracts = payload[0]?.payload?.contracts
                const value = payload[0]?.payload?.value
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg space-y-1">
                    <p className="font-bold text-text-primary">{label}</p>
                    <p style={{ color: riskColor }}>Riesgo: {risk != null ? `${risk}%` : '--'}</p>
                    <p className="text-text-muted">{formatNumber(contracts)} contratos</p>
                    <p className="text-text-muted">{formatCompactMXN(value)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area type="monotone" dataKey="risk" stroke={riskColor} strokeWidth={2}
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

// ---- Spending Over Time ComposedChart ----

function SpendingOverTimeChart({ data }: {
  data: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
}) {
  const { t } = useTranslation('institutions')
  const chartData = data.map((pt) => ({
    year: pt.year,
    valueBillions: pt.total_value / 1e9,
    contracts: pt.contract_count,
    riskPct: pt.avg_risk_score != null ? pt.avg_risk_score * 100 : 0,
  }))

  function barColor(riskPct: number): string {
    if (riskPct >= 60) return RISK_COLORS.critical
    if (riskPct >= 40) return RISK_COLORS.high
    if (riskPct >= 25) return RISK_COLORS.medium
    return RISK_COLORS.low
  }

  return (
    <div className="h-56" role="img" aria-label="Chart showing contract value and risk score trends over time">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}B`} width={40} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                const valB = payload.find((p) => p.dataKey === 'valueBillions')?.value as number | undefined
                const ct = payload.find((p) => p.dataKey === 'contracts')?.value as number | undefined
                const risk = payload[0]?.payload?.riskPct
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg space-y-1">
                    <p className="font-bold text-text-primary">{label}</p>
                    {valB != null && <p className="text-text-secondary">Gasto: {formatCompactMXN(valB * 1e9)}</p>}
                    {ct != null && <p className="text-text-muted">Contratos: {formatNumber(ct)}</p>}
                    {risk != null && <p className="text-text-muted">Riesgo promedio: {risk.toFixed(1)}%</p>}
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceLine yAxisId="left" x={2018} stroke="#8b5cf6" strokeDasharray="4 4" opacity={0.5} label={{ value: 'AMLO', position: 'top', fontSize: 9, fill: '#8b5cf6' }} />
          <ReferenceLine yAxisId="left" x={2020} stroke="#dc2626" strokeDasharray="4 4" opacity={0.5} label={{ value: 'COVID', position: 'top', fontSize: 9, fill: '#dc2626' }} />
          <Line yAxisId="right" type="monotone" dataKey="contracts" stroke="var(--color-accent-data)" strokeWidth={2} dot={{ r: 2 }} name={t('columns.contracts')} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-3">
        <DotStrip
          data={chartData.map((entry) => ({
            label: String(entry.year),
            value: entry.valueBillions,
            color: barColor(entry.riskPct),
          }))}
          formatVal={(v) => `${v.toFixed(1)}B`}
          dots={40}
        />
        <p className="text-[10px] text-text-muted font-mono mt-1">Gasto (B MXN) por año</p>
      </div>
    </div>
  )
}

// ---- Vendor Ranked List ----

function VendorRankedList({ vendors, totalValue }: { vendors: InstitutionVendorItem[]; totalValue: number }) {
  const { t } = useTranslation('institutions')
  const maxValue = vendors[0]?.total_value_mxn ?? 1
  return (
    <div className="space-y-1">
      {vendors.map((v, i) => {
        const pct = totalValue > 0 ? (v.total_value_mxn / totalValue) * 100 : 0
        const barW = (v.total_value_mxn / maxValue) * 100
        const riskLvl = v.avg_risk_score != null ? getRiskLevelFromScore(v.avg_risk_score) : null
        const riskClr = riskLvl ? RISK_COLORS[riskLvl] : null
        return (
          <Link key={v.vendor_id} to={`/vendors/${v.vendor_id}`} className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-background-elevated/50 transition-colors">
            <span className="text-xs font-mono text-text-muted w-4 text-right flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors">{formatVendorName(v.vendor_name, 40)}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-text-muted">{formatCompactMXN(v.total_value_mxn)}</span>
                  <span className="text-xs font-mono text-text-muted w-8 text-right">{pct.toFixed(0)}%</span>
                  {riskClr && v.avg_risk_score != null && (
                    <span className="text-xs font-bold font-mono w-8 text-right" style={{ color: riskClr }}>{(v.avg_risk_score * 100).toFixed(0)}%</span>
                  )}
                  <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              {(() => {
                const N = 30, DR = 2, DG = 5
                const filled = Math.max(1, Math.round((barW / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 5`} className="w-full" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={2.5} r={DR}
                        fill={k < filled ? '#22d3ee' : '#2d2926'}
                        stroke={k < filled ? undefined : '#3d3734'}
                        strokeWidth={k < filled ? 0 : 0.5}
                        fillOpacity={k < filled ? 0.7 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
            </div>
          </Link>
        )
      })}
      <div className="pt-2 text-xs text-text-muted text-right font-mono">
        {vendors.length > 0 && <span>{t('vendors.topShown', { count: vendors.length })}</span>}
      </div>
    </div>
  )
}

// ---- Vendor Loyalty Heatmap ----

function VendorLoyaltyHeatmap({ vendorLoyalty }: {
  vendorLoyalty: {
    vendors: Array<{
      vendor_id: number; vendor_name: string
      years: Array<{ year: number; contract_count: number; avg_risk: number | null }>
    }>
    year_range: number[]
  }
}) {
  const { t } = useTranslation('institutions')
  const allYears = vendorLoyalty.year_range ?? []
  const displayYears = allYears.slice(-8)
  const topVendors = vendorLoyalty.vendors.slice(0, 8)
  return (
    <table className="w-full border-separate" style={{ borderSpacing: 2 }} aria-label="Vendor loyalty over time">
      <thead>
        <tr>
          <th className="text-left text-[10px] text-text-muted font-normal pb-1 pr-2 min-w-[100px]">Proveedor</th>
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
                  {v.vendor_name.length > 16 ? v.vendor_name.slice(0, 16) + '\u2026' : v.vendor_name}
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
                      title={count > 0 ? t('profile.contractsRiskTooltip', { count, risk: (risk * 100).toFixed(0) }) : t('profile.noContractsTooltip')}
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
}

// ---- Longest-Tenured Vendors Gantt ----

function LongestTenuredGantt({ vendors }: {
  vendors: Array<{
    vendor_id: number; vendor_name: string
    first_contract_year: number; last_contract_year: number
    tenure_years: number; total_contracts: number
    avg_risk_score?: number
  }>
}) {
  const navigate = useNavigate()
  const allYears = vendors.flatMap((v) => [v.first_contract_year, v.last_contract_year])
  const minYear = Math.min(...allYears)
  const maxYear = Math.max(...allYears)
  const range = maxYear - minYear || 1

  function riskGradientColor(score: number): string {
    if (score >= 0.6) return RISK_COLORS.critical
    if (score >= 0.4) return RISK_COLORS.high
    if (score >= 0.25) return RISK_COLORS.medium
    return RISK_COLORS.low
  }

  return (
    <div className="space-y-1.5">
      {/* Year axis */}
      <div className="flex items-center pl-[140px]">
        <div className="flex-1 flex justify-between text-[9px] text-text-muted/60 font-mono">
          <span>{minYear}</span>
          <span>{Math.round((minYear + maxYear) / 2)}</span>
          <span>{maxYear}</span>
        </div>
      </div>

      {vendors.map((v) => {
        const leftPct = ((v.first_contract_year - minYear) / range) * 100
        const widthPct = Math.max(2, ((v.last_contract_year - v.first_contract_year) / range) * 100)
        const riskScore = v.avg_risk_score ?? 0
        const barColor = riskGradientColor(riskScore)
        const isWarning = v.tenure_years > 10 && riskScore > 0.3

        return (
          <div
            key={v.vendor_id}
            className="flex items-center gap-2 group cursor-pointer"
            onClick={() => navigate(`/vendors/${v.vendor_id}`)}
          >
            <div className="w-[140px] flex-shrink-0 truncate text-[10px] text-text-secondary group-hover:text-accent transition-colors pr-2 text-right" title={v.vendor_name}>
              {v.vendor_name.length > 20 ? v.vendor_name.slice(0, 18) + '\u2026' : v.vendor_name}
            </div>
            <div className="flex-1 relative">
              {(() => {
                const N = 40, DR = 2.5, DG = 6
                const totalW = N * DG
                const startIdx = Math.round((leftPct / 100) * N)
                const endIdx = Math.min(N, startIdx + Math.max(1, Math.round((widthPct / 100) * N)))
                return (
                  <div className="relative">
                    <svg viewBox={`0 0 ${totalW} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none" aria-hidden="true">
                      {Array.from({ length: N }).map((_, k) => {
                        const inSpan = k >= startIdx && k < endIdx
                        return (
                          <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                            fill={inSpan ? barColor : '#2d2926'}
                            stroke={inSpan ? undefined : '#3d3734'}
                            strokeWidth={inSpan ? 0 : 0.5}
                            fillOpacity={inSpan ? 0.85 : 1}
                          />
                        )
                      })}
                    </svg>
                    <span className="absolute top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold pointer-events-none flex items-center gap-1"
                      style={{ left: `${Math.min(leftPct + widthPct + 1, 85)}%`, color: barColor }}>
                      {v.tenure_years}a / {v.total_contracts}c
                      {isWarning && <AlertTriangle className="h-2.5 w-2.5 text-risk-critical" />}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>
        )
      })}
      <p className="text-[10px] text-text-muted/50 italic mt-2">
        Color de barra = riesgo promedio (verde a rojo). Icono de alerta = permanencia {'>'}10 anos Y riesgo {'>'}30%.
      </p>
    </div>
  )
}

// ---- HHI Trend Chart ----

function HHITrendChart({ history }: {
  history: Array<{ year: number; hhi: number; unique_vendors: number }>
}) {
  const chartData = history.map((pt) => ({
    year: pt.year,
    hhi: pt.hhi,
    vendors: pt.unique_vendors,
  }))

  return (
    <div className="h-48" role="img" aria-label="Chart showing vendor concentration and market share trends over time">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="hhiAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                const hhi = payload.find((p) => p.dataKey === 'hhi')?.value as number | undefined
                const vendors = payload.find((p) => p.dataKey === 'vendors')?.value as number | undefined
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg space-y-1">
                    <p className="font-bold text-text-primary">{label}</p>
                    {hhi != null && <p className="text-text-secondary">HHI: {hhi.toFixed(0)}</p>}
                    {vendors != null && <p className="text-text-muted">Proveedores: {vendors}</p>}
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceLine yAxisId="left" y={2500} stroke="#dc2626" strokeDasharray="4 4" opacity={0.5} label={{ value: 'Mercado concentrado', position: 'right', fontSize: 9, fill: '#dc2626' }} />
          <Area yAxisId="left" type="monotone" dataKey="hhi" stroke="#eab308" strokeWidth={2} fill="url(#hhiAreaGrad)" dot={{ r: 2, fill: '#eab308' }} />
          <Line yAxisId="right" type="monotone" dataKey="vendors" stroke="var(--color-accent-data)" strokeWidth={2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---- Cross-Registry Timeline ----

function CrossRegistryTimeline({ timeline, asfFindings }: {
  timeline: Array<{ year: number; contract_count: number; total_value: number }>
  asfFindings: Array<{ year: number; amount_mxn?: number; observations_total?: number }>
}) {
  const { t } = useTranslation('institutions')
  if (timeline.length === 0 && asfFindings.length === 0) {
    return <p className="text-xs text-text-muted py-4 text-center">{t('profile.noExternalEvents')}</p>
  }

  const allYears = new Set<number>()
  timeline.forEach((t) => allYears.add(t.year))
  asfFindings.forEach((a) => allYears.add(a.year))
  const sortedYears = Array.from(allYears).sort((a, b) => a - b)

  const timelineMap = new Map(timeline.map((t) => [t.year, t]))
  const asfMap = new Map(asfFindings.map((a) => [a.year, a]))

  const chartData = sortedYears.map((yr) => ({
    year: yr,
    contracts: timelineMap.get(yr)?.contract_count ?? 0,
    asfObs: asfMap.get(yr)?.observations_total ?? 0,
  }))

  return (
    <div className="h-40" role="img" aria-label="Chart showing audit observations and risk score over time">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                const ct = payload.find((p) => p.dataKey === 'contracts')?.value as number | undefined
                const asf = payload.find((p) => p.dataKey === 'asfObs')?.value as number | undefined
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg space-y-1">
                    <p className="font-bold text-text-primary">{label}</p>
                    {ct != null && ct > 0 && <p style={{ color: 'var(--color-accent-data)' }}>Contratos: {ct}</p>}
                    {asf != null && asf > 0 && <p style={{ color: '#f59e0b' }}>ASF observaciones: {asf}</p>}
                  </div>
                )
              }
              return null
            }}
          />
          <Line yAxisId="right" type="monotone" dataKey="asfObs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="ASF Observations" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-3">
        <DotStrip
          data={chartData.map((entry: { year: number | string; contracts: number }) => ({
            label: String(entry.year),
            value: entry.contracts ?? 0,
            color: 'var(--color-accent-data)',
          }))}
          formatVal={(v) => Number(v).toLocaleString()}
          dots={40}
        />
        <p className="text-[10px] text-text-muted font-mono mt-1">Contratos por año</p>
      </div>
    </div>
  )
}

// ---- Treemap Lazy Wrapper ----

function VendorTreemapLazy({ vendors, totalInstitutionValue }: {
  vendors: InstitutionVendorItem[]
  totalInstitutionValue?: number
}) {
  const { t } = useTranslation('institutions')
  const [TreemapComp, setTreemapComp] = useState<React.ComponentType<any> | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('@/components/charts/VendorConcentrationTreemap')
      .then((mod) => { if (!cancelled) setTreemapComp(() => mod.VendorConcentrationTreemap) })
      .catch(() => { if (!cancelled) setLoadError(true) })
    return () => { cancelled = true }
  }, [])

  if (loadError) {
    return <p className="text-xs text-rose-400/80 py-4 text-center">{t('profile.errorLoadingConcentration')}</p>
  }

  if (!TreemapComp) {
    return <Skeleton className="h-64" />
  }

  return <TreemapComp vendors={vendors} totalInstitutionValue={totalInstitutionValue} />
}

// ---- Contract Row ----

function ContractRow({ contract, onView }: { contract: ContractListItem; onView?: (id: number) => void }) {
  const { t } = useTranslation('institutions')
  return (
    <div
      className="flex items-center justify-between px-3 py-2 hover:bg-background-elevated/40 transition-colors cursor-pointer"
      onClick={() => onView?.(contract.id)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate max-w-[260px] text-text-primary">{contract.title || t('profile.untitled')}</p>
          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
            <span>{contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year}</span>
            {contract.vendor_name && (
              <>
                <span>·</span>
                <span className="truncate max-w-[120px]">{formatVendorName(contract.vendor_name, 24)}</span>
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

// ---- Skeleton ----

function InstitutionProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="h-px bg-border" />
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-24" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  )
}

export default InstitutionProfile
