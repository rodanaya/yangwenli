/**
 * RUBLI API Client
 * Centralized API calls with TypeScript types
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios'
import type {
  ScandalListItem,
  ScandalDetail,
  ScandalStats,
  CaseLibraryParams,
  PoliticalCycleResponse,
  PublicationDelayResponse,
  ThresholdGamingResponse,
  ConcentrationRankingsResponse,
  ContractListResponse,
  ContractListItem,
  ContractDetail,
  ContractFilterParams,
  ContractStatistics,
  ContractExportFilters,
  TrendDataPoint,
  VendorListResponse,
  VendorDetailResponse,
  VendorRiskProfile,
  VendorTopListResponse,
  VendorTopItem,
  VendorInstitutionListResponse,
  VendorFilterParams,
  VendorExternalFlags,
  InstitutionListResponse,
  InstitutionDetailResponse,
  InstitutionRiskProfile,
  InstitutionTopListResponse,
  InstitutionVendorListResponse,
  InstitutionFilterParams,
  SectorListResponse,
  SectorDetailResponse,
  AnalysisOverview,
  RiskDistribution,
  YearOverYearChange,
  ClassificationStatsResponse,
  AnomalyItem,
  SectorYearItem,
  MoneyFlowResponse,
  RiskFactorAnalysisResponse,
  InstitutionRankingsResponse,
  CoBiddingResponse,
  ConcentrationResponse,
  YearEndResponse,
  InvestigationLeadsResponse,
  FactorAnalysisValidationResponse,
  InvestigationCaseListResponse,
  InvestigationCaseDetail,
  InvestigationStats,
  InvestigationDashboardSummary,
  InvestigationFilterParams,
  ExternalEvidence,
  ExecutiveSummaryResponse,
  RiskExplanation,
  ASFInstitutionResponse,
  SectorASFResponse,
  ASFInstitutionSummaryResponse,
  DataQualityResponse,
  MonthlyBreakdownResponse,
  StructuralBreaksResponse,
  TemporalEventsResponse,
  WatchlistResponse,
  WatchlistItem,
  WatchlistItemCreate,
  WatchlistItemUpdate,
  WatchlistStats,
  WatchlistChanges,
  NetworkGraphResponse,
  NetworkGraphParams,
  CoBiddersResponse,
  CommunitiesResponse,
  PriceHypothesisItem,
  PriceHypothesesResponse,
  PriceHypothesisDetailResponse,
  MlAnomaliesResponse,
  FastDashboardResponse,
  VendorGroundTruthStatus,
  VendorWaterfallContribution,
  VendorReport,
  InstitutionReport,
  SectorReport,
  ThematicReport,
  ReportTypeSummary,
  VendorAISummary,
  VendorQQWResponse,
  FeatureImportanceItem,
  ModelComparisonItem,
  CommunityDetailResponse,
  ComparePeriodResponse,
  InstitutionRiskFactorResponse,
  VendorSHAPResponse,
  FeatureImportanceResponse,
  PyodAgreementResponse,
  DriftReportResponse,
  AriaQueueItem,
  AriaStatsResponse,
  AriaQueueResponse,
  StoryPackagesResponse,
  VendorSimilarCasesResponse,
  VendorNarrativeResponse,
  ContractHistogramResponse,
} from './types'

// Re-export types that were moved from client.ts to types.ts for backward compatibility
export type {
  GradeDistribution,
  StructureQuality,
  FieldCompleteness,
  KeyIssue,
  DataQualityResponse,
  MonthlyDataPoint,
  MonthlyBreakdownResponse,
  StructuralBreakpoint,
  StructuralBreaksResponse,
  TemporalEvent,
  TemporalEventsResponse,
  WatchlistItem,
  WatchlistChanges,
  WatchlistResponse,
  WatchlistItemCreate,
  WatchlistItemUpdate,
  WatchlistStats,
  NetworkNode,
  NetworkLink,
  NetworkGraphResponse,
  NetworkGraphParams,
  CoBidderItem,
  CoBiddersResponse,
  CommunityItem,
  CommunitiesResponse,
  PriceHypothesisItem,
  PriceHypothesesResponse,
  PriceHypothesisDetailResponse,
  MlAnomalyItem,
  MlAnomaliesResponse,
  FastDashboardResponse,
  VendorGroundTruthStatus,
  VendorWaterfallContribution,
  VendorReport,
  InstitutionReport,
  SectorReport,
  ThematicReport,
  ReportTypeSummary,
  VendorAISummary,
  FeatureImportanceItem,
  ModelComparisonItem,
  CommunityDetailResponse,
  ComparePeriodResponse,
  InstitutionRiskFactorResponse,
  ContractExportFilters,
  TrendDataPoint,
  ContractListItem,
  VendorQQWResponse,
  VendorSHAPFactor,
  VendorSHAPResponse,
  FeatureImportanceV52Item,
  FeatureImportanceResponse,
  PyodRiskLevelBreakdown,
  PyodAgreementResponse,
  DriftFeature,
  DriftReportResponse,
  AriaQueueItem,
  AriaStats,
  AriaStatsResponse,
  AriaQueueResponse,
  StoryPackageExample,
  StoryPackage,
  StoryPackagesResponse,
  VendorSimilarCase,
  VendorSimilarCasesResponse,
  VendorNarrativeYear,
  VendorNarrativeResponse,
} from './types'

/** Generic query parameter map — used internally by buildQueryParams */
type QueryParams = Record<string, unknown>

// API Base URL - proxied through Vite in development; override with VITE_API_BASE_URL in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

// Create axios instance with defaults
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach write key to all mutating requests if configured.
// The key is injected at nginx startup (docker-entrypoint.sh → window.__RUBLI_CONFIG__)
// rather than baked into the JS bundle via Vite env vars — the latter would expose it
// to anyone who inspects the bundle with browser devtools.
// In local development, fall back to VITE_RUBLI_WRITE_KEY if set (not committed to git).
declare global {
  interface Window {
    __RUBLI_CONFIG__?: { writeKey?: string }
  }
}
const WRITE_KEY: string | undefined =
  window.__RUBLI_CONFIG__?.writeKey ||
  (import.meta.env.VITE_RUBLI_WRITE_KEY as string | undefined)
if (WRITE_KEY) {
  api.interceptors.request.use((config) => {
    const method = (config.method ?? '').toUpperCase()
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      config.headers['X-Rubli-Key'] = WRITE_KEY
    }
    return config
  })
}

// Error handler
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// ============================================================================
// Helper Functions
// ============================================================================

function buildQueryParams(params: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  return searchParams
}

// ============================================================================
// Sector Endpoints
// ============================================================================

export const sectorApi = {
  /**
   * Get all sectors with statistics
   */
  async getAll(): Promise<SectorListResponse> {
    const { data } = await api.get<SectorListResponse>('/sectors')
    return data
  },

  /**
   * Get sector details by ID
   */
  async getById(sectorId: number): Promise<SectorDetailResponse> {
    const { data } = await api.get<SectorDetailResponse>(`/sectors/${sectorId}`)
    return data
  },

  /**
   * Get sector trends
   */
  async getTrends(sectorId: number): Promise<{ data: YearOverYearChange[] }> {
    const { data } = await api.get(`/sectors/${sectorId}/trends`)
    return data
  },

  /**
   * Get risk distribution for a sector
   */
  async getRiskDistribution(sectorId: number): Promise<{ data: RiskDistribution[] }> {
    const { data } = await api.get(`/analysis/risk-distribution?sector_id=${sectorId}`)
    return data
  },

  /**
   * P2 #47: Get per-sector model coefficients
   */
  async getModelCoefficients(sectorId: number): Promise<{
    sector_id: number
    sector_code: string
    sector_name: string
    model_used: 'sector' | 'global'
    intercept: number | null
    coefficients: Array<{ feature: string; coefficient: number }>
  }> {
    const { data } = await api.get(`/sectors/${sectorId}/model-coefficients`)
    return data
  },

  /**
   * P2 #50: Get temporal anomaly for a sector
   */
  async getTemporalAnomaly(sectorId: number, year = 2024): Promise<{
    sector_id: number
    sector_code: string
    sector_name: string
    current_year: number
    contract_count: number
    anomalies: Array<{ feature: string; label: string; z_score: number; direction: 'above' | 'below'; severity: 'high' | 'moderate' }>
  }> {
    const { data } = await api.get(`/sectors/${sectorId}/temporal-anomaly?year=${year}`)
    return data
  },
}

// ============================================================================
// Contract Endpoints
// ============================================================================

export const contractApi = {
  /**
   * Get paginated list of contracts with filters
   */
  async getAll(params: ContractFilterParams = {}): Promise<ContractListResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<ContractListResponse>(`/contracts?${queryParams}`)
    return data
  },

  /**
   * Get contract details by ID
   */
  async getById(contractId: number): Promise<ContractDetail> {
    const { data } = await api.get<ContractDetail>(`/contracts/${contractId}`)
    return data
  },

  /**
   * Get contract statistics with optional filters
   */
  async getStatistics(params: Partial<ContractFilterParams> = {}): Promise<ContractStatistics> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<ContractStatistics>(`/contracts/statistics?${queryParams}`)
    return data
  },

  /**
   * Search contracts by text
   */
  async search(query: string, params: ContractFilterParams = {}): Promise<ContractListResponse> {
    const queryParams = buildQueryParams({ ...params, search: query } as QueryParams)
    const { data } = await api.get<ContractListResponse>(`/contracts?${queryParams}`)
    return data
  },

  /**
   * Get v6.0 risk score explanation with per-feature contributions
   */
  async getRiskExplanation(contractId: number): Promise<RiskExplanation> {
    const { data } = await api.get<RiskExplanation>(`/contracts/${contractId}/risk-explain`)
    return data
  },

  async getRiskBreakdown(contractId: number): Promise<unknown> {
    const { data } = await api.get(`/contracts/${contractId}/risk`)
    return data
  },

  async getPriceAnalysis(contractId: number): Promise<unknown> {
    const { data } = await api.get(`/analysis/contracts/${contractId}/price-analysis`)
    return data
  },

  async getByVendor(vendorId: number, page = 1): Promise<ContractListResponse> {
    const { data } = await api.get<ContractListResponse>(`/contracts/by-vendor/${vendorId}?page=${page}`)
    return data
  },

  async getByInstitution(institutionId: number, page = 1): Promise<ContractListResponse> {
    const { data } = await api.get<ContractListResponse>(`/contracts/by-institution/${institutionId}?page=${page}`)
    return data
  },

  /**
   * Fetch a large batch of contracts for client-side export (up to 5000 rows).
   * Uses the standard /contracts endpoint with a high per_page limit.
   */
  async getForExport(filters: ContractExportFilters = {}): Promise<ContractListItem[]> {
    const params: Record<string, unknown> = {
      ...filters,
      per_page: filters.limit ?? 5000,
    }
    delete params.limit
    const queryParams = buildQueryParams(params)
    const { data } = await api.get<ContractListResponse>(`/contracts?${queryParams}`)
    return data.data
  },
}

// ============================================================================
// Vendor Endpoints
// ============================================================================

export const vendorApi = {
  /**
   * Get paginated list of vendors with filters
   * @param year - Filter to vendors with contracts in this year
   */
  async getAll(params: VendorFilterParams & { year?: number } = {}): Promise<VendorListResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<VendorListResponse>(`/vendors?${queryParams}`)
    return data
  },

  /**
   * Get vendor details by ID
   */
  async getById(vendorId: number): Promise<VendorDetailResponse> {
    const { data } = await api.get<VendorDetailResponse>(`/vendors/${vendorId}`)
    return data
  },

  /**
   * Get vendor risk profile
   */
  async getRiskProfile(vendorId: number): Promise<VendorRiskProfile> {
    const { data } = await api.get<VendorRiskProfile>(`/vendors/${vendorId}/risk-profile`)
    return data
  },

  /**
   * Get vendor's contracts
   */
  async getContracts(vendorId: number, params: ContractFilterParams = {}): Promise<ContractListResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<ContractListResponse>(`/vendors/${vendorId}/contracts?${queryParams}`)
    return data
  },

  /**
   * Get top vendors by metric
   */
  async getTop(
    metric: 'value' | 'count' | 'risk' = 'value',
    limit = 20,
    params: Partial<VendorFilterParams> & { year?: number } = {}
  ): Promise<VendorTopListResponse> {
    const queryParams = buildQueryParams({ ...params, by: metric, limit } as QueryParams)
    const { data } = await api.get<VendorTopListResponse>(`/vendors/top?${queryParams}`)
    return data
  },

  /**
   * Get top vendors by ALL metrics in a single request (3x fewer calls)
   * @deprecated - defined but not yet wired to any UI
   */
  async getTopAll(limit = 5): Promise<{
    value: VendorTopItem[]
    count: VendorTopItem[]
    risk: VendorTopItem[]
  }> {
    const { data } = await api.get(`/vendors/top-all?limit=${limit}`)
    return data
  },

  /**
   * Get vendor's institutions
   */
  async getInstitutions(vendorId: number, limit = 50): Promise<VendorInstitutionListResponse> {
    const { data } = await api.get<VendorInstitutionListResponse>(`/vendors/${vendorId}/institutions?per_page=${limit}`)
    return data
  },

  /**
   * Search vendors by name
   */
  async search(query: string, limit = 10): Promise<VendorListResponse> {
    const { data } = await api.get<VendorListResponse>(`/vendors?search=${encodeURIComponent(query)}&per_page=${limit}`)
    return data
  },

  /**
   * Get external registry flags: SFP sanctions, RUPC grade, ASF cases
   */
  async getExternalFlags(vendorId: number): Promise<VendorExternalFlags> {
    const { data } = await api.get<VendorExternalFlags>(`/vendors/${vendorId}/external-flags`)
    return data
  },

  /**
   * Get year-by-year risk timeline for a vendor (contract count, avg risk, total value per year)
   */
  async getRiskTimeline(vendorId: number): Promise<{
    vendor_id: number
    vendor_name: string
    timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  }> {
    const { data } = await api.get(`/vendors/${vendorId}/risk-timeline`)
    return data
  },

  /**
   * Get top risk factors by frequency across a vendor's contracts (for Watchlist attribution)
   */
  async getTopFactors(vendorId: number, limit = 5): Promise<{
    vendor_id: number
    total_contracts: number
    factors: Array<{ factor: string; count: number; pct: number }>
  }> {
    const { data } = await api.get(`/vendors/${vendorId}/top-factors?limit=${limit}`)
    return data
  },

  async getGroundTruthStatus(vendorId: number): Promise<VendorGroundTruthStatus> {
    const { data } = await api.get<VendorGroundTruthStatus>(`/vendors/${vendorId}/ground-truth-status`)
    return data
  },

  async getRiskWaterfall(vendorId: number): Promise<VendorWaterfallContribution[]> {
    const { data } = await api.get<{ items: VendorWaterfallContribution[] } | VendorWaterfallContribution[]>(`/vendors/${vendorId}/risk-waterfall`)
    // Backend returns { vendor_id, items, total_contracts } — extract the array
    if (data && !Array.isArray(data) && Array.isArray((data as { items: VendorWaterfallContribution[] }).items)) {
      return (data as { items: VendorWaterfallContribution[] }).items
    }
    return Array.isArray(data) ? data : []
  },

  async getPeerComparison(vendorId: number): Promise<unknown> {
    const { data } = await api.get(`/vendors/${vendorId}/peer-comparison`)
    return data
  },

  async getLinkedScandals(vendorId: number): Promise<unknown> {
    const { data } = await api.get(`/vendors/${vendorId}/linked-scandals`)
    return data
  },

  async getAsfCases(vendorId: number): Promise<unknown> {
    const { data } = await api.get(`/vendors/${vendorId}/asf-cases`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async compare(ids: number[]): Promise<unknown> {
    const { data } = await api.get(`/vendors/compare?ids=${ids.join(',')}`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getVerified(): Promise<unknown> {
    const { data } = await api.get('/vendors/verified')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getClassification(vendorId: number): Promise<unknown> {
    const { data } = await api.get(`/vendors/${vendorId}/classification`)
    return data
  },

  async getFootprint(vendorId: number): Promise<{
    vendor_id: number
    footprint: Array<{
      sector_id: number
      sector_name: string
      institution_id: number
      institution_name: string
      contract_count: number
      total_value: number
      avg_risk_score: number | null
    }>
  }> {
    const { data } = await api.get(`/vendors/${vendorId}/footprint`)
    return data
  },

  async getAiSummary(vendorId: number): Promise<VendorAISummary> {
    const { data } = await api.get<VendorAISummary>(`/vendors/${vendorId}/ai-summary`)
    return data
  },

  async getQQW(vendorId: number): Promise<VendorQQWResponse> {
    const { data } = await api.get<VendorQQWResponse>(`/vendors/${vendorId}/qqw`)
    return data
  },

  /**
   * Get SHAP-based risk explanation for a vendor (v5.2)
   * Returns per-feature SHAP values and top contributing factors
   */
  async getShap(vendorId: number): Promise<VendorSHAPResponse> {
    const { data } = await api.get<VendorSHAPResponse>(`/vendors/${vendorId}/shap`)
    return data
  },

  async getNarrative(vendorId: number): Promise<VendorNarrativeResponse> {
    const { data } = await api.get<VendorNarrativeResponse>(`/vendors/${vendorId}/narrative`)
    return data
  },

  async getSimilarCases(vendorId: number): Promise<VendorSimilarCasesResponse> {
    const { data } = await api.get<VendorSimilarCasesResponse>(`/vendors/${vendorId}/similar-cases`)
    return data
  },

  /**
   * Get year-by-year trajectory for a vendor (spending, risk, institution count)
   */
  async getTrajectory(vendorId: number): Promise<VendorTrajectoryResponse> {
    const { data } = await api.get<VendorTrajectoryResponse>(`/vendors/${vendorId}/trajectory`)
    return data
  },

  /**
   * Get vendor's risk percentile rank among all vendors in the same sector
   */
  async getPercentile(vendorId: number): Promise<{ percentile: number; rank: number; total: number }> {
    const { data } = await api.get(`/vendors/${vendorId}/percentile`)
    return data
  },

  async getContractHistogram(vendorId: number): Promise<ContractHistogramResponse> {
    const { data } = await api.get<ContractHistogramResponse>(`/vendors/${vendorId}/contract-histogram`)
    return data
  },
}

// ============================================================================
// Institution Endpoints
// ============================================================================

export const institutionApi = {
  /**
   * Get paginated list of institutions with filters
   * @param year - Filter to institutions with contracts in this year
   */
  async getAll(params: InstitutionFilterParams & { year?: number } = {}): Promise<InstitutionListResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<InstitutionListResponse>(`/institutions?${queryParams}`)
    return data
  },

  /**
   * Get institution details by ID
   */
  async getById(institutionId: number): Promise<InstitutionDetailResponse> {
    const { data } = await api.get<InstitutionDetailResponse>(`/institutions/${institutionId}`)
    return data
  },

  /**
   * Get institution risk profile
   */
  async getRiskProfile(institutionId: number): Promise<InstitutionRiskProfile> {
    const { data } = await api.get<InstitutionRiskProfile>(`/institutions/${institutionId}/risk-profile`)
    return data
  },

  /**
   * Get institution's contracts
   */
  async getContracts(institutionId: number, params: ContractFilterParams = {}): Promise<ContractListResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<ContractListResponse>(`/institutions/${institutionId}/contracts?${queryParams}`)
    return data
  },

  /**
   * Get top institutions by metric
   */
  async getTop(
    metric: 'spending' | 'contracts' | 'risk' = 'spending',
    limit = 20,
    year?: number
  ): Promise<InstitutionTopListResponse> {
    const qs = year ? `&year=${year}` : ''
    const { data } = await api.get<InstitutionTopListResponse>(`/institutions/top?by=${metric}&limit=${limit}${qs}`)
    return data
  },

  /**
   * Get institution's vendors
   */
  async getVendors(institutionId: number, limit = 50): Promise<InstitutionVendorListResponse> {
    const { data } = await api.get<InstitutionVendorListResponse>(`/institutions/${institutionId}/vendors?per_page=${limit}`)
    return data
  },

  /**
   * Search institutions by name
   */
  async search(query: string, limit = 10): Promise<InstitutionListResponse> {
    const { data } = await api.get<InstitutionListResponse>(
      `/institutions?search=${encodeURIComponent(query)}&per_page=${limit}`
    )
    return data
  },

  /**
   * Get year-by-year risk timeline for an institution
   */
  async getRiskTimeline(institutionId: number): Promise<{
    institution_id: number
    institution_name: string
    timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  }> {
    const { data } = await api.get(`/institutions/${institutionId}/risk-timeline`)
    return data
  },

  async getVendorLoyalty(institutionId: number, topN = 15): Promise<{
    institution_id: number
    vendors: Array<{
      vendor_id: number
      vendor_name: string
      total_value: number
      first_year: number
      last_year: number
      year_count: number
      years: Array<{ year: number; contract_count: number; total_value: number; avg_risk: number | null }>
    }>
    year_range: number[]
  }> {
    const { data } = await api.get(`/institutions/${institutionId}/vendor-loyalty?top_n=${topN}`)
    return data
  },

  async getPeerComparison(institutionId: number): Promise<{
    institution_id: number
    institution_name: string
    institution_type: string | null
    peer_count: number
    metrics: Array<{
      metric: string
      label: string
      value: number
      peer_min: number
      peer_p25: number
      peer_median: number
      peer_p75: number
      peer_max: number
      percentile: number
    }>
  }> {
    const { data } = await api.get(`/institutions/${institutionId}/peer-comparison`)
    return data
  },

  async getTopCategories(institutionId: number, options?: { year?: number; limit?: number }) {
    const { data } = await api.get(`/institutions/${institutionId}/top-categories`, { params: options })
    return data
  },

  async getCriScatter(params: { sector_id?: number; min_contracts?: number; limit?: number } = {}): Promise<{
    data: Array<{
      id: number
      name: string
      sector_id: number
      sector_code: string
      total_contracts: number
      avg_risk: number
      direct_award_pct: number
      single_bid_pct: number
      high_risk_pct: number
    }>
    total: number
  }> {
    const q = new URLSearchParams()
    if (params.sector_id) q.set('sector_id', String(params.sector_id))
    if (params.min_contracts) q.set('min_contracts', String(params.min_contracts))
    if (params.limit) q.set('limit', String(params.limit))
    const { data } = await api.get(`/institutions/cri-scatter?${q}`)
    return data
  },

  async getConcentrationRankings(params: {
    year?: number
    sector_id?: number
    limit?: number
  } = {}): Promise<ConcentrationRankingsResponse> {
    const q = new URLSearchParams()
    if (params.year) q.set('year', String(params.year))
    if (params.sector_id) q.set('sector_id', String(params.sector_id))
    if (params.limit) q.set('limit', String(params.limit))
    const { data } = await api.get<ConcentrationRankingsResponse>(`/institutions/concentration-rankings?${q}`)
    return data
  },

  /**
   * Get ASF audit findings for an institution
   */
  async getGroundTruthStatus(institutionId: number): Promise<{
    is_ground_truth_related: boolean
    case_name?: string
    case_type?: string
    contract_count?: number
  }> {
    const { data } = await api.get(`/institutions/${institutionId}/ground-truth-status`)
    return data
  },

  async getASFFindings(institutionId: number): Promise<ASFInstitutionResponse> {
    const { data } = await api.get<ASFInstitutionResponse>(`/institutions/${institutionId}/asf-findings`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async compare(ids: number[]): Promise<unknown> {
    const { data } = await api.get(`/institutions/compare?ids=${ids.join(',')}`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getHierarchy(): Promise<unknown> {
    const { data } = await api.get('/institutions/hierarchy')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getTypes(): Promise<unknown> {
    const { data } = await api.get('/institutions/types')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getSizeTiers(): Promise<unknown> {
    const { data } = await api.get('/institutions/size-tiers')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getOfficials(institutionId: number): Promise<unknown> {
    const { data } = await api.get(`/institutions/${institutionId}/officials`)
    return data
  },
}

// ============================================================================
// Analysis Endpoints
// ============================================================================

export const analysisApi = {
  /**
   * Get fast pre-computed dashboard stats (single request, <100ms)
   */
  async getFastDashboard(): Promise<FastDashboardResponse> {
    const { data } = await api.get<FastDashboardResponse>('/stats/dashboard/fast')
    return data
  },

  /**
   * Get combined risk overview (overview + risk distribution + trends in one call)
   */
  async getRiskOverview(): Promise<{
    overview: unknown
    risk_distribution: unknown[]
    yearly_trends: unknown[]
  }> {
    const { data } = await api.get('/analysis/risk-overview')
    return data
  },

  /**
   * Get all pattern match counts in a single request (for DetectivePatterns page)
   */
  async getPatternCounts(): Promise<{
    counts: {
      critical: number
      december_rush: number
      split_contracts: number
      co_bidding: number
      price_outliers: number
    }
  }> {
    const { data } = await api.get('/analysis/patterns/counts')
    return data
  },

  /**
   * Get overall analysis overview
   */
  async getOverview(): Promise<AnalysisOverview> {
    const { data } = await api.get<AnalysisOverview>('/analysis/overview')
    return data
  },

  /**
   * Get risk distribution across all contracts
   */
  async getRiskDistribution(): Promise<{ data: RiskDistribution[] }> {
    const { data } = await api.get('/analysis/risk-distribution')
    return data
  },

  /**
   * Get year-over-year trends
   */
  async getYearOverYear(): Promise<{ data: YearOverYearChange[] }> {
    const { data } = await api.get('/analysis/year-over-year')
    return data
  },

  /**
   * Get trend data for export/charting — wraps the year-over-year endpoint
   * with optional sector/year range filtering.
   */
  async getTrendData(params: { sector_id?: number; year_start?: number; year_end?: number } = {}): Promise<TrendDataPoint[]> {
    const queryParams = buildQueryParams(params as QueryParams)
    const paramStr = queryParams.toString()
    const { data } = await api.get<{ data: TrendDataPoint[] }>(
      `/analysis/year-over-year${paramStr ? `?${paramStr}` : ''}`
    )
    return data.data
  },

  /**
   * Get monthly breakdown for a specific year
   */
  async getMonthlyBreakdown(year: number, sectorId?: number): Promise<MonthlyBreakdownResponse> {
    const params = sectorId ? `?sector_id=${sectorId}` : ''
    const { data } = await api.get<MonthlyBreakdownResponse>(`/analysis/monthly-breakdown/${year}${params}`)
    return data
  },

  /**
   * Get temporal events affecting procurement
   */
  async getTemporalEvents(year?: number, eventType?: string): Promise<TemporalEventsResponse> {
    const queryParams = buildQueryParams({ year, event_type: eventType } as QueryParams)
    const paramStr = queryParams.toString()
    const { data } = await api.get<TemporalEventsResponse>(`/analysis/temporal-events${paramStr ? `?${paramStr}` : ''}`)
    return data
  },

  /**
   * Get detected anomalies
   */
  async getAnomalies(severity?: string): Promise<{ data: AnomalyItem[]; total: number }> {
    const params = severity ? `?severity=${severity}` : ''
    const { data } = await api.get(`/analysis/anomalies${params}`)
    return data
  },

  /**
   * Get classification statistics
   */
  async getClassificationStats(): Promise<ClassificationStatsResponse> {
    const { data } = await api.get<ClassificationStatsResponse>('/stats/classifications')
    return data
  },

  /**
   * Get sector x year cross-tabulation for administration analysis
   */
  async getSectorYearBreakdown(): Promise<{ data: SectorYearItem[]; total_rows: number }> {
    const { data } = await api.get('/analysis/sector-year-breakdown')
    return data
  },

  /**
   * Get money flow data for Sankey visualization
   */
  async getMoneyFlow(year?: number, sectorId?: number, directAwardOnly?: boolean, sortBy?: string): Promise<MoneyFlowResponse> {
    const params = buildQueryParams({
      year,
      sector_id: sectorId,
      direct_award_only: directAwardOnly || undefined,
      sort_by: sortBy && sortBy !== 'value' ? sortBy : undefined,
    } as QueryParams)
    const paramStr = params.toString()
    const { data } = await api.get<MoneyFlowResponse>(`/analysis/money-flow${paramStr ? `?${paramStr}` : ''}`)
    return data
  },

  /**
   * Get risk factor frequency and co-occurrence analysis
   */
  async getRiskFactorAnalysis(sectorId?: number, year?: number): Promise<RiskFactorAnalysisResponse> {
    const params = buildQueryParams({ sector_id: sectorId, year } as QueryParams)
    const paramStr = params.toString()
    const { data } = await api.get<RiskFactorAnalysisResponse>(`/analysis/risk-factor-analysis${paramStr ? `?${paramStr}` : ''}`)
    return data
  },

  /**
   * Get institution health rankings with HHI
   */
  async getInstitutionRankings(sortBy = 'risk', minContracts = 100, limit = 50): Promise<InstitutionRankingsResponse> {
    const { data } = await api.get<InstitutionRankingsResponse>(
      `/analysis/institution-rankings?sort_by=${sortBy}&min_contracts=${minContracts}&limit=${limit}`
    )
    return data
  },

  /**
   * Get per-case detection statistics from live contract data
   */
  async getPerCaseDetection(): Promise<unknown> {
    const { data } = await api.get('/analysis/validation/per-case-detection')
    return data
  },

  /**
   * Get ground truth validation summary
   */
  async getValidationSummary(): Promise<unknown> {
    const { data } = await api.get('/analysis/validation/summary')
    return data
  },

  /**
   * Get detection rate metrics
   */
  async getDetectionRate(modelVersion?: string): Promise<unknown> {
    const params = modelVersion ? `?model_version=${modelVersion}` : ''
    const { data } = await api.get(`/analysis/validation/detection-rate${params}`)
    return data
  },

  /**
   * Get false negatives from ground truth
   */
  async getFalseNegatives(limit = 50): Promise<unknown> {
    const { data } = await api.get(`/analysis/validation/false-negatives?limit=${limit}`)
    return data
  },

  /**
   * Get per-factor lift: detection rate on ground-truth contracts vs population base rate.
   * lift > 1.0 means the factor is over-represented in known corrupt contracts.
   */
  async getFactorLift(): Promise<{
    factors: Array<{ factor: string; gt_count: number; gt_rate: number; base_rate: number; lift: number }>
    gt_total: number
    population_total: number
  }> {
    const { data } = await api.get('/analysis/validation/factor-lift')
    return data
  },

  /**
   * Get data quality metrics
   */
  async getDataQuality(): Promise<DataQualityResponse> {
    const { data } = await api.get<DataQualityResponse>('/stats/data-quality')
    return data
  },

  /**
   * Get executive summary data (all sections in one call)
   */
  async getExecutiveSummary(): Promise<ExecutiveSummaryResponse> {
    const { data } = await api.get<ExecutiveSummaryResponse>('/executive/summary')
    return data
  },

  /**
   * Get December spike analysis — average spike ratio vs. average month
   */
  async getDecemberSpike(startYear = 2015, endYear = 2024): Promise<{
    years: Array<{ year: number; spike_ratio: number | null; is_significant: boolean }>
    average_spike_ratio: number
    years_with_significant_spike: number
    total_years_analyzed: number
    description: string
  }> {
    const { data } = await api.get(
      `/analysis/december-spike-analysis?start_year=${startYear}&end_year=${endYear}`
    )
    return data
  },

  async getCoBiddingPatterns(minCoBidRate = 0.5): Promise<CoBiddingResponse> {
    const { data } = await api.get(`/analysis/patterns/co-bidding?min_co_bid_rate=${minCoBidRate}`)
    return data
  },

  async getConcentrationPatterns(minSharePct = 0.3): Promise<ConcentrationResponse> {
    const { data } = await api.get(`/analysis/patterns/concentration?min_share_pct=${minSharePct}`)
    return data
  },

  async getYearEndPatterns(startYear = 2010, endYear = 2024): Promise<YearEndResponse> {
    const { data } = await api.get(
      `/analysis/patterns/year-end?start_year=${startYear}&end_year=${endYear}`
    )
    return data
  },

  async getInvestigationLeads(limit = 20): Promise<InvestigationLeadsResponse> {
    const { data } = await api.get(`/analysis/leads?limit=${limit}`)
    return data
  },

  async getFactorEffectiveness(): Promise<FactorAnalysisValidationResponse> {
    const { data } = await api.get('/analysis/validation/factor-analysis')
    return data
  },

  /**
   * Detect statistically significant change points in 23-year procurement trends.
   * Uses PELT algorithm (ruptures library). Cached server-side for 1 hour.
   */
  async getStructuralBreaks(): Promise<StructuralBreaksResponse> {
    const { data } = await api.get<StructuralBreaksResponse>('/analysis/structural-breaks')
    return data
  },

  async getPoliticalCycle(): Promise<PoliticalCycleResponse> {
    const { data } = await api.get<PoliticalCycleResponse>('/analysis/political-cycle')
    return data
  },

  async getPublicationDelays(): Promise<PublicationDelayResponse> {
    const { data } = await api.get<PublicationDelayResponse>('/analysis/transparency/publication-delays')
    return data
  },

  async getThresholdGaming(): Promise<ThresholdGamingResponse> {
    const { data } = await api.get<ThresholdGamingResponse>('/analysis/threshold-gaming')
    return data
  },

  /**
   * Get ASF audit findings for a sector
   */
  async getSectorASFFindings(sectorId: number): Promise<SectorASFResponse> {
    const { data } = await api.get<SectorASFResponse>(`/analysis/sectors/${sectorId}/asf-findings`)
    return data
  },

  /**
   * Get ASF audit findings aggregated by entity, cross-referenced with RUBLI risk scores
   */
  async getASFInstitutionSummary(): Promise<ASFInstitutionSummaryResponse> {
    const { data } = await api.get<ASFInstitutionSummaryResponse>('/analysis/asf-institution-summary')
    return data
  },

  async comparePeriods(p1s: string, p1e: string, p2s: string, p2e: string): Promise<ComparePeriodResponse> {
    const { data } = await api.get<ComparePeriodResponse>(
      `/analysis/compare-periods?p1_start=${p1s}&p1_end=${p1e}&p2_start=${p2s}&p2_end=${p2e}`
    )
    return data
  },

  async getInstitutionRiskFactors(limit = 10): Promise<InstitutionRiskFactorResponse[]> {
    const { data } = await api.get<InstitutionRiskFactorResponse[]>(`/analysis/institution-risk-factors?limit=${limit}`)
    return data
  },

  async getModelMetadata(): Promise<{ version: string; trained_at: string; auc_test: number; pu_correction?: number; n_contracts?: number }> {
    const { data } = await api.get('/analysis/model/metadata')
    return data
  },

  async getFeatureImportance(sectorId?: number): Promise<FeatureImportanceItem[]> {
    const { data } = await api.get<FeatureImportanceItem[]>(
      `/investigation/feature-importance${sectorId ? `?sector_id=${sectorId}` : ''}`
    )
    return data
  },

  async getModelComparison(): Promise<ModelComparisonItem[]> {
    const { data } = await api.get<ModelComparisonItem[]>('/investigation/model-comparison')
    return data
  },

  /**
   * Get flash vendors — short-lived but high-value vendors
   */
  async getFlashVendors(params: {
    max_active_years?: number
    min_value?: number
    limit?: number
  } = {}): Promise<FlashVendorsResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<FlashVendorsResponse>(
      `/analysis/flash-vendors${queryParams.toString() ? `?${queryParams}` : ''}`
    )
    return data
  },

  /**
   * Get value concentration alerts — vendors dominating a single institution's spending
   */
  async getValueConcentration(params: {
    min_pct?: number
    limit?: number
  } = {}): Promise<ValueConcentrationResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<ValueConcentrationResponse>(
      `/analysis/value-concentration${queryParams.toString() ? `?${queryParams}` : ''}`
    )
    return data
  },

  /**
   * Get seasonal risk by month — compares target month risk premium vs. rest of year
   */
  async getSeasonalRisk(month = 12): Promise<SeasonalRiskResponse> {
    const { data } = await api.get<SeasonalRiskResponse>(
      `/analysis/seasonal-risk?month=${month}`
    )
    return data
  },

  /**
   * Get monthly risk summary — avg risk per calendar month (1-12) across all years
   */
  async getMonthlyRiskSummary(sectorId?: number): Promise<MonthlyRiskSummaryResponse> {
    const qs = sectorId != null ? `?sector_id=${sectorId}` : ''
    const { data } = await api.get<MonthlyRiskSummaryResponse>(
      `/analysis/monthly-risk-summary${qs}`
    )
    return data
  },

  /**
   * Get procedure risk comparison — direct award vs. competitive risk by sector/year
   */
  async getProcedureRiskComparison(params: {
    sector_id?: number
    year?: number
  } = {}): Promise<ProcedureRiskComparisonResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<ProcedureRiskComparisonResponse>(
      `/analysis/procedure-risk-comparison${queryParams.toString() ? `?${queryParams}` : ''}`
    )
    return data
  },

  /**
   * Get industry risk clusters — vendor count, total value, avg risk by sector.
   * First call takes ~100s (no cache), subsequent calls are fast.
   */
  async getIndustryClusters(minContracts = 100): Promise<IndustryClusterResponse> {
    const { data } = await api.get<IndustryClusterResponse>(
      `/analysis/industry-risk-clusters?min_contracts=${minContracts}`,
      { timeout: 180000 }
    )
    return data
  },

  /**
   * Get the top vendors or institutions for a given year range.
   * entity: 'vendor' | 'institution'
   * by: 'value' | 'count'
   */
  async getTopByPeriod(
    startYear: number,
    endYear: number,
    entity: 'vendor' | 'institution',
    by: 'value' | 'count' = 'value',
    limit = 20,
  ): Promise<TopByPeriodResponse> {
    const queryParams = buildQueryParams({
      start_year: startYear,
      end_year: endYear,
      entity,
      by,
      limit,
    } as QueryParams)
    const { data } = await api.get<TopByPeriodResponse>(
      `/analysis/top-by-period?${queryParams}`,
    )
    return data
  },

  /**
   * Get sector-level value and contract count growth for year vs. year-1.
   */
  async getSectorGrowth(year: number): Promise<SectorGrowthResponse> {
    const { data } = await api.get<SectorGrowthResponse>(
      `/analysis/sector-growth?year=${year}`,
    )
    return data
  },

  /**
   * Get a comprehensive summary for a single procurement year.
   */
  async getYearSummary(year: number): Promise<YearSummaryResponse> {
    const { data } = await api.get<YearSummaryResponse>(
      `/analysis/year-summary/${year}`,
    )
    return data
  },

  /**
   * Get SHAP-based global feature importance (v5.2)
   * Optional sector_id for per-sector model breakdown
   */
  async getFeatureImportanceV52(sectorId?: number): Promise<FeatureImportanceResponse> {
    const { data } = await api.get<FeatureImportanceResponse>(
      `/analysis/feature-importance${sectorId ? `?sector_id=${sectorId}` : ''}`
    )
    return data
  },

  /**
   * Get PyOD anomaly detection agreement with v6.0 risk scores
   * Shows confirmation rate between ML outlier detection and risk model
   */
  async getPyodAgreement(): Promise<PyodAgreementResponse> {
    const { data } = await api.get<PyodAgreementResponse>('/analysis/pyod-agreement')
    return data
  },

  /**
   * Get latest feature drift report (v5.2)
   * Uses Kolmogorov-Smirnov test to detect distributional shift
   */
  async getDrift(): Promise<DriftReportResponse> {
    const { data } = await api.get<DriftReportResponse>('/analysis/drift')
    return data
  },

  /**
   * Get factor baselines (mean/stddev) for a given sector and year
   */
  async getFactorBaselines(sectorId: number, year: number): Promise<FactorBaselineResponse> {
    const { data } = await api.get<FactorBaselineResponse>(`/analysis/factor-baselines/${sectorId}/${year}`)
    return data
  },
}

// ============================================================================
// Export Data Endpoints
// ============================================================================

export const exportApi = {
  /**
   * Export contracts to CSV
   */
  async exportContracts(params: ContractFilterParams = {}): Promise<Blob> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get(`/export/contracts/csv?${queryParams}`, {
      responseType: 'blob',
    })
    return data
  },

  /**
   * Export vendors to CSV
   */
  async exportVendors(params: VendorFilterParams = {}): Promise<Blob> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get(`/export/vendors/csv?${queryParams}`, {
      responseType: 'blob',
    })
    return data
  },

  async downloadExcel(filters: Record<string, unknown> = {}): Promise<Blob> {
    const queryParams = buildQueryParams(filters)
    const { data } = await api.get(`/export/contracts/excel?${queryParams}`, {
      responseType: 'blob',
    })
    return data
  },
}

// ============================================================================
// Watchlist Endpoints
// ============================================================================

/** Alert item returned by /watchlist/alerts/check (feature 4.3C) */
export interface WatchlistAlertItem {
  id: number
  item_type: string
  item_id: number
  item_name: string
  alert_threshold: number
  current_risk_score: number
  priority: string
  status: string
  notes: string | null
}

export const watchlistApi = {
  /**
   * Get all watchlist items with optional filters
   */
  async getAll(params?: { status?: string; item_type?: string; priority?: string }): Promise<WatchlistResponse> {
    const queryParams = params ? buildQueryParams(params as QueryParams) : ''
    const { data } = await api.get<WatchlistResponse>(`/watchlist?${queryParams}`)
    return data
  },

  /**
   * Get watchlist item by ID
   */
  async getById(id: number): Promise<WatchlistItem> {
    const { data } = await api.get<WatchlistItem>(`/watchlist/${id}`)
    return data
  },

  /**
   * Add item to watchlist
   */
  async create(item: WatchlistItemCreate): Promise<WatchlistItem> {
    const { data } = await api.post<WatchlistItem>('/watchlist', item)
    return data
  },

  /**
   * Update watchlist item
   */
  async update(id: number, update: WatchlistItemUpdate): Promise<WatchlistItem> {
    const { data } = await api.patch<WatchlistItem>(`/watchlist/${id}`, update)
    return data
  },

  /**
   * Remove item from watchlist
   */
  async delete(id: number): Promise<{ message: string; id: number }> {
    const { data } = await api.delete<{ message: string; id: number }>(`/watchlist/${id}`)
    return data
  },

  /**
   * Get watchlist statistics
   */
  async getStats(): Promise<WatchlistStats> {
    const { data } = await api.get<WatchlistStats>('/watchlist/stats')
    return data
  },

  /**
   * Get risk score changes since item was added to watchlist
   */
  async getChanges(id: number): Promise<WatchlistChanges> {
    const { data } = await api.get<WatchlistChanges>(`/watchlist/${id}/changes`)
    return data
  },

  /**
   * 4.3C Alert System — return watchlist items whose current risk score has
   * reached or exceeded their configured alert threshold.
   */
  async checkAlerts(): Promise<WatchlistAlertItem[]> {
    const { data } = await api.get<WatchlistAlertItem[]>('/watchlist/alerts/check')
    return data
  },

  async getFolders(): Promise<Array<{ id: number; name: string; color: string }>> {
    const { data } = await api.get<{ folders?: Array<{ id: number; name: string; color: string }> } | Array<{ id: number; name: string; color: string }>>('/watchlist/folders')
    if (Array.isArray(data)) return data
    return (data as { folders?: Array<{ id: number; name: string; color: string }> }).folders ?? []
  },

  async createFolder(name: string, color: string): Promise<{ id: number; name: string; color: string }> {
    const { data } = await api.post<{ id: number; name: string; color: string }>('/watchlist/folders', { name, color })
    return data
  },

  async deleteFolder(folderId: number): Promise<void> {
    await api.delete(`/watchlist/folders/${folderId}`)
  },
}

// ============================================================================
// Network Graph Endpoints
// ============================================================================

export const networkApi = {
  /**
   * Get network graph data for visualization
   */
  async getGraph(params: NetworkGraphParams = {}): Promise<NetworkGraphResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<NetworkGraphResponse>(`/network/graph?${queryParams}`)
    return data
  },

  /**
   * Get co-bidders for a vendor
   */
  async getCoBidders(vendorId: number, minProcedures = 3, limit = 20): Promise<CoBiddersResponse> {
    const { data } = await api.get<CoBiddersResponse>(
      `/network/co-bidders/${vendorId}?min_procedures=${minProcedures}&limit=${limit}`
    )
    return data
  },

  /**
   * Get vendors connected to an institution
   */
  async getInstitutionVendors(
    institutionId: number,
    params?: { year?: number; min_contracts?: number; limit?: number }
  ): Promise<{
    institution_id: number
    institution_name: string
    vendors: Array<{
      vendor_id: number
      vendor_name: string
      contract_count: number
      total_value: number
      avg_risk_score: number | null
      direct_award_count: number
      direct_award_pct: number
    }>
    total_vendors: number
    total_contracts: number
    total_value: number
    concentration_index: number
  }> {
    const queryParams = params ? buildQueryParams(params as QueryParams) : ''
    const { data } = await api.get(`/network/institution-vendors/${institutionId}?${queryParams}`)
    return data
  },

  /**
   * Get related vendors (same group, shared RFC, similar names)
   */
  async getRelatedVendors(vendorId: number, limit = 20): Promise<{
    vendor_id: number
    vendor_name: string
    related: Array<{
      vendor_id: number
      vendor_name: string
      rfc: string | null
      relationship: string
      confidence: number
      contracts: number
      value: number
    }>
    total: number
  }> {
    const { data } = await api.get(`/network/related-vendors/${vendorId}?limit=${limit}`)
    return data
  },

  async getCommunityDetail(communityId: number): Promise<CommunityDetailResponse> {
    const { data } = await api.get<CommunityDetailResponse>(`/network/communities/${communityId}`)
    return data
  },

  /**
   * Get Louvain co-bidding communities (requires build_vendor_graph.py)
   */
  async getCommunities(params?: {
    min_size?: number
    min_avg_risk?: number
    sector_id?: number
    limit?: number
  }): Promise<CommunitiesResponse> {
    const queryParams = params ? buildQueryParams(params as QueryParams) : ''
    const { data } = await api.get<CommunitiesResponse>(`/network/communities?${queryParams}`)
    return data
  },
}

// ============================================================================
// Price Hypothesis Endpoints (types that stayed local for priceApi use)
// ============================================================================

export interface SectorPriceBaseline {
  sector_id: number
  sector_name: string
  contract_type: string
  percentile_10: number
  percentile_25: number
  percentile_50: number
  percentile_75: number
  percentile_90: number
  percentile_95: number
  mean_value: number
  std_dev: number
  iqr: number
  upper_fence: number
  extreme_fence: number
  sample_count: number
}

export interface PriceHypothesesSummary {
  status: string
  overall?: {
    total_hypotheses: number
    pending_review: number
    confirmed: number
    dismissed: number
    total_flagged_value: number
    avg_confidence: number
  }
  by_type: Array<{
    type: string
    count: number
    avg_confidence: number
    total_value: number
  }>
  by_sector: Array<{
    sector_id: number
    sector_name: string
    count: number
    total_value: number
  }>
  by_confidence: Array<{
    level: string
    count: number
  }>
  recent_runs: Array<{
    run_id: string
    started_at: string
    completed_at?: string
    contracts_analyzed: number
    hypotheses_generated: number
    status: string
  }>
}

export interface ContractPriceAnalysis {
  contract_id: number
  amount_mxn: number
  sector_id?: number
  sector_name?: string
  sector_comparison?: {
    median: number
    p75: number
    p95: number
    upper_fence: number
    extreme_fence: number
    ratio_to_median: number
    sample_count: number
  }
  vendor_comparison?: {
    avg_contract_value: number
    median_contract_value: number
    contract_count: number
    price_trend: string
    ratio_to_vendor_median: number
  }
  hypotheses: PriceHypothesisItem[]
  price_percentile?: number
  is_outlier: boolean
  outlier_type?: string
}

export interface PriceHypothesesFilterParams {
  hypothesis_type?: string
  confidence_level?: string
  min_confidence?: number
  sector_id?: number
  year?: number
  is_reviewed?: boolean
  is_valid?: boolean
  sort_by?: string
  sort_order?: string
  page?: number
  per_page?: number
}

// ============================================================================
// Price Hypothesis Endpoints
// ============================================================================

export const priceApi = {
  /**
   * Get paginated list of price hypotheses
   */
  async getHypotheses(params: PriceHypothesesFilterParams = {}): Promise<PriceHypothesesResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<PriceHypothesesResponse>(`/analysis/price-hypotheses?${queryParams}`)
    return data
  },

  /**
   * Get detailed hypothesis with context
   */
  async getHypothesisDetail(hypothesisId: string): Promise<PriceHypothesisDetailResponse> {
    const { data } = await api.get<PriceHypothesisDetailResponse>(`/analysis/price-hypotheses/${hypothesisId}`)
    return data
  },

  /**
   * Review a hypothesis (confirm/dismiss)
   */
  async reviewHypothesis(hypothesisId: string, isValid: boolean, notes?: string): Promise<{ success: boolean }> {
    const { data } = await api.put(`/analysis/price-hypotheses/${hypothesisId}/review`, {
      is_valid: isValid,
      review_notes: notes,
    })
    return data
  },

  /**
   * Get price analysis for a specific contract
   */
  async getContractPriceAnalysis(contractId: number): Promise<ContractPriceAnalysis> {
    const { data } = await api.get<ContractPriceAnalysis>(`/analysis/contracts/${contractId}/price-analysis`)
    return data
  },

  /**
   * Get sector price baselines
   */
  async getBaselines(sectorId?: number): Promise<SectorPriceBaseline[]> {
    const params = sectorId ? `?sector_id=${sectorId}` : ''
    const { data } = await api.get<SectorPriceBaseline[]>(`/analysis/price-baselines${params}`)
    return data
  },

  /**
   * Get price hypotheses summary statistics
   */
  async getSummary(): Promise<PriceHypothesesSummary> {
    const { data } = await api.get<PriceHypothesesSummary>('/analysis/price-hypotheses/summary')
    return data
  },

  /**
   * Get ML-detected price anomalies (Isolation Forest, multi-feature).
   * Populate via: python -m scripts.compute_price_anomaly_scores
   */
  async getMlAnomalies(params: {
    sector_id?: number
    limit?: number
    only_new?: boolean
    model?: string
  } = {}): Promise<MlAnomaliesResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<MlAnomaliesResponse>(`/analysis/prices/ml-anomalies?${queryParams}`)
    return data
  },
}

// ============================================================================
// Investigation Endpoints
// ============================================================================

export const investigationApi = {
  /**
   * Get paginated list of investigation cases
   */
  async getCases(params: InvestigationFilterParams = {}): Promise<InvestigationCaseListResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<InvestigationCaseListResponse>(`/investigation/cases?${queryParams}`)
    return data
  },

  /**
   * Get full case details by case_id
   */
  async getCaseById(caseId: string): Promise<InvestigationCaseDetail> {
    const { data } = await api.get<InvestigationCaseDetail>(`/investigation/cases/${caseId}`)
    return data
  },

  /**
   * Get investigation stats summary
   */
  async getStats(): Promise<InvestigationStats> {
    const { data } = await api.get<InvestigationStats>('/investigation/stats')
    return data
  },

  /**
   * Get top N most suspicious cases
   */
  async getTopCases(n: number, sectorId?: number): Promise<{ data: unknown[]; count: number }> {
    const params = sectorId ? `?sector_id=${sectorId}` : ''
    const { data } = await api.get(`/investigation/top/${n}${params}`)
    return data
  },

  /**
   * Get combined dashboard summary (funnel, hit rate, top corroborated)
   */
  async getDashboardSummary(): Promise<InvestigationDashboardSummary> {
    const { data } = await api.get<InvestigationDashboardSummary>('/investigation/dashboard-summary')
    return data
  },

  /**
   * Update case review status
   */
  async reviewCase(caseId: string, status: string, notes?: string, reviewedBy?: string): Promise<{ success: boolean }> {
    const { data } = await api.put(`/investigation/cases/${caseId}/review`, {
      validation_status: status,
      review_notes: notes,
      reviewed_by: reviewedBy,
    })
    return data
  },

  /**
   * Add external evidence to a case
   */
  async addEvidence(caseId: string, evidence: ExternalEvidence[], updateStatus?: string): Promise<{ success: boolean; total_evidence: number }> {
    const { data } = await api.put(`/investigation/cases/${caseId}/evidence`, {
      evidence,
      update_status: updateStatus,
    })
    return data
  },

  /**
   * Promote corroborated case to ground truth
   */
  async promoteToGroundTruth(caseId: string, caseName: string, caseType?: string): Promise<{ success: boolean; ground_truth_case_id: string }> {
    const { data } = await api.post(`/investigation/cases/${caseId}/promote-to-ground-truth`, {
      case_name: caseName,
      case_type: caseType || 'procurement_fraud',
    })
    return data
  },

  /**
   * Get SHAP-based vendor explanation
   */
  async getVendorExplanation(vendorId: number, sectorId?: number): Promise<unknown> {
    const { data } = await api.get(`/investigation/vendors/${vendorId}/explanation${sectorId ? `?sector_id=${sectorId}` : ''}`)
    return data
  },

  async getTopAnomalousVendors(limit = 20, sectorId?: number): Promise<TopAnomalousVendorsResponse> {
    const { data } = await api.get<TopAnomalousVendorsResponse>(`/investigation/top-anomalous-vendors?limit=${limit}${sectorId ? `&sector_id=${sectorId}` : ''}`)
    return data
  },

  async runPipeline(): Promise<unknown> {
    const { data } = await api.post('/investigation/run', {})
    return data
  },

  async getCaseExport(caseId: number): Promise<unknown> {
    const { data } = await api.get(`/investigation/cases/${caseId}/export`)
    return data
  },

  async getCaseAsfMatches(caseId: number): Promise<unknown> {
    const { data } = await api.get(`/investigation/cases/${caseId}/asf-matches`)
    return data
  },
}

// ============================================================================
// Report Endpoints
// ============================================================================

export const reportApi = {
  async getVendorReport(id: number): Promise<VendorReport> {
    const { data } = await api.get<VendorReport>(`/reports/vendor/${id}`)
    return data
  },

  async getInstitutionReport(id: number): Promise<InstitutionReport> {
    const { data } = await api.get<InstitutionReport>(`/reports/institution/${id}`)
    return data
  },

  async getSectorReport(id: number): Promise<SectorReport> {
    const { data } = await api.get<SectorReport>(`/reports/sector/${id}`)
    return data
  },

  async getThematicReport(theme: string): Promise<ThematicReport> {
    const { data } = await api.get<ThematicReport>(`/reports/thematic/${theme}`)
    return data
  },

  async getAvailableReports(): Promise<ReportTypeSummary> {
    const { data } = await api.get<ReportTypeSummary>('/reports/')
    return data
  },
}

// ============================================================================
// Stats Endpoints
// ============================================================================

export const statsApi = {
  async getDatabase(): Promise<unknown> {
    const { data } = await api.get('/stats/database')
    return data
  },
}

// ============================================================================
// Industries Endpoints
// ============================================================================

export const industriesApi = {
  async getAll(): Promise<unknown> {
    const { data } = await api.get('/industries')
    return data
  },
}

// ============================================================================
// CATEGORIES API
// ============================================================================

export const categoriesApi = {
  getSummary: async () => {
    const { data } = await api.get('/categories/summary')
    return data
  },

  getContracts: async (categoryId: number, params?: { page?: number; per_page?: number; risk_level?: string; year?: number }) => {
    const { data } = await api.get(`/categories/${categoryId}/contracts`, { params })
    return data
  },

  getTrends: async (yearFrom = 2010, yearTo = 2025) => {
    const { data } = await api.get('/categories/trends', { params: { year_from: yearFrom, year_to: yearTo } })
    return data
  },

  getSubcategories: async (categoryId: number) => {
    const { data } = await api.get(`/categories/${categoryId}/subcategories`)
    return data as {
      category_id: number
      category_name: string
      total: number
      data: {
        subcategory_id: number
        code: string
        name_en: string
        name_es: string
        is_catch_all: boolean
        display_order: number
        total_contracts: number
        total_value: number
        avg_risk: number
        direct_award_pct: number
        single_bid_pct: number
        year_min: number | null
        year_max: number | null
        top_vendor_name: string | null
        top_vendor_id: number | null
        example_titles: string[]
        pct_of_category: number
      }[]
    }
  },

  getVendorInstitution: async (categoryId: number, limit = 25) => {
    const { data } = await api.get(`/categories/${categoryId}/vendor-institution`, { params: { limit } })
    return data as {
      category_id: number
      category_name: string
      total: number
      data: {
        vendor_id: number
        vendor_name: string
        institution_id: number
        institution_name: string
        contract_count: number
        total_value: number
        avg_risk: number
        max_risk: number
        direct_award_pct: number
        single_bid_pct: number
      }[]
    }
  },
}

// ============================================================================
// Issue Reporting Endpoints
// ============================================================================

export const issueApi = {
  async submit(data: {
    category: string
    subject: string
    description: string
    page_url: string
    email?: string
  }): Promise<{ id: number; status: string; created_at: string }> {
    const { data: res } = await api.post('/issues', data)
    return res
  },
}

// ============================================================================
// Case Library Endpoints
// ============================================================================

export const caseLibraryApi = {
  async getAll(params: CaseLibraryParams = {}): Promise<ScandalListItem[]> {
    const { data } = await api.get<ScandalListItem[]>('/cases', { params })
    return data
  },

  async getStats(): Promise<ScandalStats> {
    const { data } = await api.get<ScandalStats>('/cases/stats')
    return data
  },

  async getBySlug(slug: string): Promise<ScandalDetail> {
    const { data } = await api.get<ScandalDetail>(`/cases/${slug}`)
    return data
  },

  async getBySector(sectorId: number): Promise<ScandalListItem[]> {
    const { data } = await api.get<ScandalListItem[]>(`/cases/by-sector/${sectorId}`)
    return data
  },
}

// ============================================================================
// Federated Search Types & Endpoints
// ============================================================================

export interface FederatedVendorResult {
  id: number
  name: string
  rfc?: string | null
  contracts: number
  risk_score?: number | null
}

export interface FederatedInstitutionResult {
  id: number
  name: string
  institution_type?: string | null
  total_contracts?: number | null
}

export interface FederatedContractResult {
  id: number
  title: string
  amount?: number | null
  risk_level?: string | null
  year?: number | null
}

// Flash Vendors
export interface FlashVendorItem {
  vendor_id: number
  vendor_name: string
  total_value: number
  contract_count: number
  min_year: number
  max_year: number
  active_years: number
  avg_risk_score: number
  primary_institution: string | null
  is_currently_active: boolean
}

export interface FlashVendorsResponse {
  data: FlashVendorItem[]
  total: number
  max_active_years: number
  min_value: number
}

// Vendor Trajectory
export interface VendorTrajectoryYear {
  year: number
  total_contracts: number
  total_value_mxn: number
  avg_risk_score: number | null
  institution_count: number
}

export interface VendorTrajectoryResponse {
  vendor_id: number
  vendor_name?: string
  scores?: Record<string, number | null>
  data?: VendorTrajectoryYear[]
}

// Top Anomalous Vendors
export interface AnomalousVendorItem {
  vendor_id: number
  vendor_name: string
  sector_id: number | null
  sector_name: string | null
  risk_score: number
  risk_level: string
  anomaly_score: number
  ensemble_score: number | null
  both_flagged: boolean
  total_contracts: number
  total_value_mxn: number
}

export interface TopAnomalousVendorsResponse {
  data: AnomalousVendorItem[]
  total: number
  agreement_rate: number
}

// Factor Baselines
export interface FactorBaselineItem {
  factor_name: string
  mean: number
  stddev: number
  count: number
}

export interface FactorBaselineResponse {
  sector_id: number
  year: number
  baselines: FactorBaselineItem[]
}

// ARIA Memos
export interface AriaMemoResponse {
  vendor_id: number
  vendor_name: string
  tier: number | null
  memo_text: string
  generated_at: string
  model_used: string | null
}

export interface AriaMemoListResponse {
  data: AriaMemoResponse[]
  total: number
}

// Value Concentration
export interface ValueConcentrationItem {
  vendor_id: number
  vendor_name: string
  institution_id: number
  institution_name: string
  vendor_value: number
  institution_total_value: number
  value_share_pct: number
  contract_count: number
  avg_risk_score: number
}

export interface ValueConcentrationResponse {
  data: ValueConcentrationItem[]
  total: number
  min_pct: number
}

// Seasonal Risk
export interface SeasonalRiskItem {
  sector_id: number
  sector_name: string
  month_risk: number
  other_risk: number
  risk_premium_pct: number
  month_value: number
  month_count: number
  other_count: number
}

export interface SeasonalRiskResponse {
  month: number
  data: SeasonalRiskItem[]
}

// Monthly Risk Summary (all 12 months, cross-year averages)
export interface MonthlyRiskSummaryItem {
  month: number
  month_name: string
  avg_risk: number
  overall_avg_risk: number
  risk_premium_pct: number
  contract_count: number
}

export interface MonthlyRiskSummaryResponse {
  data: MonthlyRiskSummaryItem[]
  overall_avg_risk: number
}

// Procedure Risk Comparison
export interface ProcedureRiskItem {
  sector_id: number
  sector_name: string
  year: number
  direct_award_risk: number
  competitive_risk: number
  ratio: number
}

export interface ProcedureRiskComparisonResponse {
  data: ProcedureRiskItem[]
  total: number
}

// Industry Risk Clusters
export interface IndustryClusterItem {
  sector_id: number
  sector_name: string
  vendor_count: number
  total_value: number
  avg_risk_score: number
  high_risk_vendor_count: number
  top_vendor_name: string | null
  top_vendor_value: number | null
  top_vendor_risk: number | null
}

export interface IndustryClusterResponse {
  data: IndustryClusterItem[]
  total: number
  min_contracts: number
}

// Top By Period
export interface TopPeriodEntityItem {
  id: number
  name: string
  rfc?: string | null
  total_contracts: number
  total_value_mxn: number
  avg_risk_score: number | null
  direct_award_pct: number | null
}

export interface TopByPeriodResponse {
  entity: 'vendor' | 'institution'
  by: 'value' | 'count'
  start_year: number
  end_year: number
  limit: number
  data: TopPeriodEntityItem[]
}

// Sector Growth
export interface SectorGrowthItem {
  sector_id: number
  name_es: string | null
  name_en: string | null
  color: string | null
  current_value: number
  prior_value: number | null
  value_growth_pct: number | null
  current_contracts: number
  prior_contracts: number | null
  contracts_growth_pct: number | null
  avg_risk: number | null
}

export interface SectorGrowthResponse {
  year: number
  prior_year: number
  data: SectorGrowthItem[]
}

// Year Summary
export interface YearSummaryOverview {
  total_contracts: number
  total_value_mxn: number
  avg_risk_score: number | null
  high_risk_count: number
  high_risk_pct: number | null
}

export interface YearSummaryVsPrior {
  contracts_change_pct: number | null
  value_change_pct: number | null
  risk_change_pct: number | null
}

export interface YearSummaryTopGrowingSector {
  sector_id: number
  name_es: string | null
  name_en: string | null
  color: string | null
  current_value: number
  prior_value: number
  value_growth_pct: number | null
}

export interface YearSummaryResponse {
  year: number
  overview: YearSummaryOverview
  vs_prior_year: YearSummaryVsPrior | null
  top_vendors_by_value: TopPeriodEntityItem[]
  top_institutions_by_spend: TopPeriodEntityItem[]
  top_growing_sector: YearSummaryTopGrowingSector | null
  risk_level_counts: { critical: number; high: number; medium: number; low: number }
  direct_award_pct: number | null
  single_bid_pct: number | null
}

export interface FederatedCaseResult {
  slug: string
  title: string
  year?: number | null
  sector?: string | null
}

export interface FederatedSearchResponse {
  query: string
  vendors: FederatedVendorResult[]
  institutions: FederatedInstitutionResult[]
  contracts: FederatedContractResult[]
  cases: FederatedCaseResult[]
  total: number
}

export const searchApi = {
  async federated(q: string, limit = 5): Promise<FederatedSearchResponse> {
    const { data } = await api.get<FederatedSearchResponse>('/search', {
      params: { q, limit },
    })
    return data
  },
}

// ============================================================================
// Alerts API — critical-risk contract feed
// ============================================================================

export interface AlertItem {
  type: string
  vendor_id: number | null
  vendor_name: string | null
  risk_score: number | null
  amount_mxn: number | null
  contract_date: string | null
  sector_name: string | null
  contract_id: number
}

export interface AlertFeedResponse {
  alerts: AlertItem[]
  total: number
}

export const alertsApi = {
  async feed(days = 30, limit = 20): Promise<AlertFeedResponse> {
    const { data } = await api.get<AlertFeedResponse>('/alerts/feed', {
      params: { days, limit },
    })
    return data
  },
}

// ============================================================================
// Feedback API (feature 4.7 — False Positive Feedback Loop)
// ============================================================================

export interface FeedbackRecord {
  id: number
  entity_type: string
  entity_id: number
  feedback_type: 'not_suspicious' | 'confirmed_suspicious' | 'needs_review'
  reason?: string | null
  created_at: string
}

export interface FeedbackIn {
  entity_type: string
  entity_id: number
  feedback_type: string
  reason?: string
}

export const feedbackApi = {
  /** Retrieve analyst feedback for an entity, or null if none recorded. */
  async get(entityType: string, entityId: number): Promise<FeedbackRecord | null> {
    const { data } = await api.get<FeedbackRecord | null>('/feedback', {
      params: { entity_type: entityType, entity_id: entityId },
    })
    return data
  },

  /** Submit or update feedback (upsert). */
  async submit(body: FeedbackIn): Promise<FeedbackRecord> {
    const { data } = await api.post<FeedbackRecord>('/feedback', body)
    return data
  },

  /** Remove feedback for an entity. */
  async remove(entityType: string, entityId: number): Promise<void> {
    await api.delete('/feedback', {
      params: { entity_type: entityType, entity_id: entityId },
    })
  },
}

// ============================================================================
// Dossier API (feature 4.3A — Case Dossier System)
// ============================================================================

export interface DossierSummary {
  id: number
  name: string
  description?: string | null
  status: 'active' | 'archived' | 'closed'
  color: string
  item_count: number
  highest_risk_score?: number | null
  highest_risk_name?: string | null
  created_at: string
  updated_at: string
}

export interface DossierItem {
  id: number
  dossier_id: number
  item_type: 'vendor' | 'institution' | 'contract' | 'note'
  item_id?: number | null
  item_name: string
  annotation?: string | null
  color: string
  created_at: string
  // Alias fields for consistency with entity_* naming convention
  /** Alias for item_type */
  entity_type?: 'vendor' | 'institution' | 'contract'
  /** Alias for item_id */
  entity_id?: number | null
  /** Alias for item_name */
  entity_name?: string
  /** Alias for created_at */
  added_at?: string
  /** Alias for annotation */
  notes?: string | null
}

export const dossierApi = {
  async list(status?: string): Promise<DossierSummary[]> {
    const { data } = await api.get<DossierSummary[]>('/workspace/dossiers', { params: status ? { status } : {} })
    return data
  },
  async create(body: { name: string; description?: string; color?: string }): Promise<DossierSummary> {
    const { data } = await api.post<DossierSummary>('/workspace/dossiers', body)
    return data
  },
  async update(id: number, body: { name: string; description?: string; status?: string; color?: string }): Promise<DossierSummary> {
    const { data } = await api.patch<DossierSummary>(`/workspace/dossiers/${id}`, body)
    return data
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/workspace/dossiers/${id}`)
  },
  async listItems(dossierId: number): Promise<DossierItem[]> {
    const { data } = await api.get<DossierItem[]>(`/workspace/dossiers/${dossierId}/items`)
    return data
  },
  async addItem(dossierId: number, item: { item_type: string; item_id?: number; item_name: string; annotation?: string }): Promise<DossierItem> {
    const { data } = await api.post<DossierItem>(`/workspace/dossiers/${dossierId}/items`, item)
    return data
  },
  async removeItem(dossierId: number, itemId: number): Promise<void> {
    await api.delete(`/workspace/dossiers/${dossierId}/items/${itemId}`)
  },
}

export const subnationalApi = {
  async getStates(year?: number): Promise<import('./types').SubnationalStatesResponse> {
    const { data } = await api.get<import('./types').SubnationalStatesResponse>(
      '/subnational/states',
      year ? { params: { year } } : undefined,
    )
    return data
  },
  async getStateDetail(code: string): Promise<import('./types').SubnationalStateDetail> {
    const { data } = await api.get<import('./types').SubnationalStateDetail>(`/subnational/states/${code}`)
    return data
  },
  async getStateVendors(code: string, localOnly?: boolean): Promise<import('./types').SubnationalVendorsResponse> {
    const { data } = await api.get<import('./types').SubnationalVendorsResponse>(
      `/subnational/states/${code}/vendors`,
      { params: localOnly ? { local_only: true } : {} }
    )
    return data
  },
  async getStateVendorsByYear(
    code: string,
    year: number,
  ): Promise<import('./types').SubnationalTopVendorsByYearResponse> {
    const { data } = await api.get<import('./types').SubnationalTopVendorsByYearResponse>(
      `/subnational/states/${code}/vendors`,
      { params: { year, limit: 10 } },
    )
    return data
  },
  async getStateInstitutions(code: string, options?: { year?: number; limit?: number }) {
    const { data } = await api.get(
      `/subnational/states/${code}/institutions`,
      { params: options },
    )
    return data
  },
  async getStateSectors(code: string, year?: number): Promise<import('./types').SubnationalSectorsResponse> {
    const { data } = await api.get<import('./types').SubnationalSectorsResponse>(
      `/subnational/states/${code}/sectors`,
      { params: year ? { year } : {} },
    )
    return data
  },
}

// ============================================================================
// ARIA Investigation Queue API
// ============================================================================

export const ariaApi = {
  /**
   * Fetch the investigation queue with optional filters and pagination
   */
  async getQueue(params?: {
    tier?: number
    pattern?: string
    search?: string
    efos_only?: boolean
    new_vendor_only?: boolean
    page?: number
    per_page?: number
  }): Promise<AriaQueueResponse> {
    const queryParams = params ? buildQueryParams(params as QueryParams) : ''
    const { data } = await api.get<AriaQueueResponse>(`/aria/queue?${queryParams}`)
    return data
  },

  /**
   * Get detailed breakdown for a single vendor in the queue
   */
  async getVendorDetail(vendorId: number): Promise<AriaQueueItem> {
    const { data } = await api.get<AriaQueueItem>(`/aria/queue/${vendorId}`)
    return data
  },

  /**
   * Fetch the ARIA queue entry for a vendor (for VendorProfile review notes #63).
   * Returns null if the vendor is not in the queue.
   */
  async getAriaQueueEntry(vendorId: number): Promise<AriaQueueItem | null> {
    try {
      const { data } = await api.get<AriaQueueItem>(`/aria/queue/${vendorId}`)
      return data
    } catch {
      return null
    }
  },

  /**
   * Update review status for a queue item
   */
  async updateReview(
    vendorId: number,
    update: { review_status: AriaQueueItem['review_status']; reviewer_name?: string }
  ): Promise<AriaQueueItem> {
    const { data } = await api.patch<AriaQueueItem>(`/aria/queue/${vendorId}/review`, {
      status: update.review_status,
      reviewer_name: update.reviewer_name,
    })
    return data
  },

  /**
   * Fetch aggregate stats about the latest ARIA run
   */
  async getStats(): Promise<AriaStatsResponse> {
    const { data } = await api.get<AriaStatsResponse>('/aria/stats')
    return data
  },

  /**
   * Trigger a new ARIA pipeline run (async — returns immediately)
   */
  async runPipeline(): Promise<{ message: string; run_id: string }> {
    const { data } = await api.post<{ message: string; run_id: string }>('/aria/run')
    return data
  },

  /**
   * Get LLM-generated investigation memo for a vendor
   */
  async getMemo(vendorId: number): Promise<AriaMemoResponse | null> {
    try {
      const { data } = await api.get<AriaMemoResponse>(`/aria/memos/${vendorId}`)
      return data
    } catch {
      return null
    }
  },

  /**
   * Get paginated list of ARIA memos
   */
  async getMemos(params: { tier?: number; limit?: number; offset?: number } = {}): Promise<AriaMemoListResponse> {
    const queryParams = buildQueryParams(params as QueryParams)
    const { data } = await api.get<AriaMemoListResponse>(`/aria/memos?${queryParams}`)
    return data
  },
}

// ============================================================================
// Procurement Health Index (PHI) Endpoints
// ============================================================================

export const phiApi = {
  async getSectors(yearMin?: number, yearMax?: number) {
    const params = buildQueryParams({ year_min: yearMin, year_max: yearMax })
    const { data } = await api.get(`/procurement-health/sectors?${params}`)
    return data
  },
  async getSectorDetail(sectorId: number, yearMin?: number, yearMax?: number) {
    const params = buildQueryParams({ year_min: yearMin, year_max: yearMax })
    const { data } = await api.get(`/procurement-health/sectors/${sectorId}?${params}`)
    return data
  },
  async getTrend() {
    const { data } = await api.get('/procurement-health/trend')
    return data
  },
  async getCorrelation() {
    const { data } = await api.get('/procurement-health/ml-correlation')
    return data
  },
}

export const scorecardApi = {
  async getSummary() {
    const { data } = await api.get('/scorecards/summary')
    return data
  },
  async getInstitutions(params: {
    page?: number
    per_page?: number
    sort_by?: string
    order?: string
    grade?: string
    sector?: string
    min_score?: number
    max_score?: number
    search?: string
  } = {}) {
    const q = buildQueryParams(params)
    const { data } = await api.get(`/scorecards/institutions?${q}`)
    return data
  },
  async getInstitution(id: number) {
    const { data } = await api.get(`/scorecards/institutions/${id}`)
    return data
  },
  async getVendors(params: {
    page?: number
    per_page?: number
    sort_by?: string
    order?: string
    grade?: string
    min_score?: number
    max_score?: number
    search?: string
  } = {}) {
    const q = buildQueryParams(params)
    const { data } = await api.get(`/scorecards/vendors?${q}`)
    return data
  },
  async getVendor(id: number) {
    const { data } = await api.get(`/scorecards/vendors/${id}`)
    return data
  },
}

export const storiesApi = {
  async getAdministrationComparison() {
    const { data } = await api.get('/stories/administration-comparison')
    return data
  },
  async getGhostCompanies() {
    const { data } = await api.get('/stories/ghost-companies')
    return data
  },
  async getTopSuspiciousVendors() {
    const { data } = await api.get('/stories/top-suspicious-vendors')
    return data
  },
  async getOverpricingPatterns() {
    const { data } = await api.get('/stories/overpricing-patterns')
    return data
  },
  async getPackages(): Promise<StoryPackagesResponse> {
    const { data } = await api.get<StoryPackagesResponse>('/stories/packages')
    return data
  },
}

// Default export with all API modules
export default {
  sector: sectorApi,
  contract: contractApi,
  vendor: vendorApi,
  institution: institutionApi,
  analysis: analysisApi,
  export: exportApi,
  price: priceApi,
  watchlist: watchlistApi,
  network: networkApi,
  investigation: investigationApi,
  categories: categoriesApi,
  cases: caseLibraryApi,
  report: reportApi,
  stats: statsApi,
  industries: industriesApi,
  search: searchApi,
  feedback: feedbackApi,
  dossiers: dossierApi,
  issues: issueApi,
  aria: ariaApi,
  phi: phiApi,
  alerts: alertsApi,
  scorecards: scorecardApi,
  stories: storiesApi,
}
