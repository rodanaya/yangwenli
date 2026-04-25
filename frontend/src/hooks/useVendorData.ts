/**
 * useVendorData — consolidated data hook for the Vendor dossier.
 *
 * Replaces ~18 individual useQuery calls previously inlined at the top of
 * VendorProfile. Groups them by eagerness so the tab-scoped queries only fire
 * when their tab is active.
 *
 * Eager (on mount):
 *   - vendor, riskProfile, contracts (page 1), institutions, coBidders,
 *     externalFlags, qqw, lifecycle, footprint, groundTruthStatus,
 *     linkedScandals, shap, aria, scorecard
 *
 * Tab-deferred:
 *   - waterfall, peerComparison, histogram, rollingTimeline     → Evidence tab
 *
 * User-gated:
 *   - aiSummary                                                  → explicit load
 */
import { useQuery } from '@tanstack/react-query'
import { ariaApi, networkApi, scorecardApi, vendorApi } from '@/api/client'
import type {
  AriaQueueItem,
  ContractHistogramResponse,
  VendorQQWResponse,
} from '@/api/types'
import type { VendorScorecardData } from '@/components/ui/ScorecardWidgets'

const MIN = 60 * 1000
const HOUR = 60 * MIN

export type VendorTabKey = 'overview' | 'evidence' | 'activity' | 'network' | 'aria'

interface UseVendorDataOptions {
  /** Active tab — controls which queries fire. */
  activeTab: VendorTabKey
  /** Page for the contracts list (1-based). */
  contractsPage?: number
  /** Gate for the AI summary query. */
  loadAiSummary?: boolean
  /** Page size for contracts. */
  contractsPerPage?: number
}

const notFoundRetry = (count: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status
  return status !== 404 && count < 2
}

export function useVendorData(
  vendorIdRaw: string | number | undefined,
  opts: UseVendorDataOptions
) {
  const {
    activeTab,
    contractsPage = 1,
    loadAiSummary = false,
    contractsPerPage = 50,
  } = opts

  const vendorId =
    vendorIdRaw == null || vendorIdRaw === ''
      ? undefined
      : typeof vendorIdRaw === 'number'
        ? vendorIdRaw
        : Number(vendorIdRaw)
  const enabled = vendorId != null && Number.isFinite(vendorId)
  const evidenceTabActive = activeTab === 'evidence' || activeTab === 'overview'

  // ───────────────────────────── Eager queries ────────────────────────────
  const vendor = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => vendorApi.getById(vendorId!),
    enabled,
    staleTime: 5 * MIN,
    retry: notFoundRetry,
  })

  const riskProfile = useQuery({
    queryKey: ['vendor', vendorId, 'risk-profile'],
    queryFn: () => vendorApi.getRiskProfile(vendorId!),
    enabled,
    staleTime: 5 * MIN,
  })

  const contracts = useQuery({
    queryKey: ['vendor', vendorId, 'contracts', contractsPage, contractsPerPage],
    queryFn: () =>
      vendorApi.getContracts(vendorId!, {
        per_page: contractsPerPage,
        page: contractsPage,
      }),
    enabled,
    staleTime: 2 * MIN,
  })

  const institutions = useQuery({
    queryKey: ['vendor', vendorId, 'institutions'],
    queryFn: () => vendorApi.getInstitutions(vendorId!),
    enabled,
    staleTime: 5 * MIN,
  })

  const coBidders = useQuery({
    queryKey: ['vendor', vendorId, 'co-bidders'],
    queryFn: () => networkApi.getCoBidders(vendorId!, 5, 10),
    enabled,
    staleTime: 10 * MIN,
    retry: false,
  })

  const externalFlags = useQuery({
    queryKey: ['vendor-external-flags', vendorId],
    queryFn: () => vendorApi.getExternalFlags(vendorId!),
    enabled,
    staleTime: 10 * MIN,
  })

  const qqw = useQuery<VendorQQWResponse>({
    queryKey: ['vendor-qqw', vendorId],
    queryFn: () => vendorApi.getQQW(vendorId!),
    enabled,
    staleTime: HOUR,
  })

  const lifecycle = useQuery({
    queryKey: ['vendor', vendorId, 'risk-timeline'],
    queryFn: () => vendorApi.getRiskTimeline(vendorId!),
    enabled,
    staleTime: 10 * MIN,
  })

  const footprint = useQuery({
    queryKey: ['vendor', vendorId, 'footprint'],
    queryFn: () => vendorApi.getFootprint(vendorId!),
    enabled,
    staleTime: 10 * MIN,
  })

  const groundTruthStatus = useQuery({
    queryKey: ['vendor', vendorId, 'ground-truth-status'],
    queryFn: () => vendorApi.getGroundTruthStatus(vendorId!),
    enabled,
    staleTime: 30 * MIN,
  })

  const linkedScandals = useQuery({
    queryKey: ['vendor', vendorId, 'linked-scandals'],
    queryFn: () => vendorApi.getLinkedScandals(vendorId!),
    enabled,
    staleTime: 30 * MIN,
  })

  const shap = useQuery({
    queryKey: ['vendor', vendorId, 'shap-v52'],
    queryFn: () => vendorApi.getShap(vendorId!),
    enabled,
    staleTime: HOUR,
    retry: false,
  })

  const aria = useQuery<AriaQueueItem>({
    queryKey: ['vendor', vendorId, 'aria-detail'],
    queryFn: () => ariaApi.getVendorDetail(vendorId!),
    enabled,
    staleTime: 10 * MIN,
    retry: false,
  })

  const scorecard = useQuery<VendorScorecardData>({
    queryKey: ['vendor', vendorId, 'scorecard'],
    queryFn: () => scorecardApi.getVendor(vendorId!),
    enabled,
    staleTime: HOUR,
    retry: false,
  })

  // ─────────────────────────── Tab-deferred queries ───────────────────────
  const waterfall = useQuery({
    queryKey: ['vendor', vendorId, 'risk-waterfall'],
    queryFn: () => vendorApi.getRiskWaterfall(vendorId!),
    enabled: enabled && evidenceTabActive,
    staleTime: 10 * MIN,
  })

  const peerComparison = useQuery({
    queryKey: ['vendor', vendorId, 'peer-comparison'],
    queryFn: () => vendorApi.getPeerComparison(vendorId!),
    enabled: enabled && evidenceTabActive,
    staleTime: 10 * MIN,
  })

  const histogram = useQuery<ContractHistogramResponse>({
    queryKey: ['vendor', vendorId, 'contract-histogram'],
    queryFn: () => vendorApi.getContractHistogram(vendorId!),
    enabled: enabled && evidenceTabActive,
    staleTime: 30 * MIN,
    retry: false,
  })

  const rollingTimeline = useQuery({
    queryKey: ['vendor', vendorId, 'rolling-timeline'],
    queryFn: () => vendorApi.getRollingTimeline(vendorId!),
    enabled: enabled && evidenceTabActive,
    staleTime: HOUR,
    retry: false,
  })

  // ───────────────────────────── User-gated ───────────────────────────────
  const aiSummary = useQuery({
    queryKey: ['vendor', vendorId, 'ai-summary'],
    queryFn: () => vendorApi.getAiSummary(vendorId!),
    enabled: enabled && loadAiSummary,
    staleTime: 30 * MIN,
  })

  // Derived signals that every consumer needs.
  const hasCoBiddingRisk =
    coBidders.data?.co_bidders?.some(
      (cb) =>
        cb.relationship_strength === 'very_strong' ||
        cb.relationship_strength === 'strong'
    ) || (coBidders.data?.suspicious_patterns?.length ?? 0) > 0

  const isLoading =
    vendor.isLoading || riskProfile.isLoading || contracts.isLoading

  return {
    // core identity + risk
    vendor,
    riskProfile,
    scorecard,
    // activity
    contracts,
    institutions,
    lifecycle,
    footprint,
    // evidence (deferred)
    waterfall,
    peerComparison,
    histogram,
    rollingTimeline,
    shap,
    // network
    coBidders,
    // external signals
    externalFlags,
    qqw,
    groundTruthStatus,
    linkedScandals,
    // investigation
    aria,
    // ai
    aiSummary,
    // derived
    hasCoBiddingRisk,
    isLoading,
  }
}

export type VendorData = ReturnType<typeof useVendorData>
