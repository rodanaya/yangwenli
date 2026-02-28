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
  ContractDetail,
  ContractFilterParams,
  ContractStatistics,
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
  FastDashboardData,
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
  FeatureImportanceItem,
  ModelComparisonItem,
  CommunityDetailResponse,
  ComparePeriodResponse,
  InstitutionRiskFactorResponse,
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
} from './types'

// API Base URL - proxied through Vite in development
const API_BASE_URL = '/api/v1'

// Create axios instance with defaults
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
    const { data } = await api.get(`/sectors/${sectorId}/risk-distribution`)
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
    const { data } = await api.get<ContractStatistics>(`/contracts/statistics?${queryParams}`)
    return data
  },

  /**
   * Search contracts by text
   */
  async search(query: string, params: ContractFilterParams = {}): Promise<ContractListResponse> {
    const queryParams = buildQueryParams({ ...params, search: query } as Record<string, unknown>)
    const { data } = await api.get<ContractListResponse>(`/contracts?${queryParams}`)
    return data
  },

  /**
   * Get v5.0 risk score explanation with per-feature contributions
   */
  async getRiskExplanation(contractId: number): Promise<RiskExplanation> {
    const { data } = await api.get<RiskExplanation>(`/contracts/${contractId}/risk-explain`)
    return data
  },

  async getRiskBreakdown(contractId: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/contracts/${contractId}/risk`)
    return data
  },

  async getPriceAnalysis(contractId: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/analysis/contracts/${contractId}/price-analysis`)
    return data
  },

  async getByVendor(vendorId: number, page = 1): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/contracts/by-vendor/${vendorId}?page=${page}`)
    return data
  },

  async getByInstitution(institutionId: number, page = 1): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/contracts/by-institution/${institutionId}?page=${page}`)
    return data
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
    const { data } = await api.get<ContractListResponse>(`/vendors/${vendorId}/contracts?${queryParams}`)
    return data
  },

  /**
   * Get top vendors by metric
   */
  async getTop(
    metric: 'value' | 'count' | 'risk' = 'value',
    limit = 20,
    params: Partial<VendorFilterParams> = {}
  ): Promise<VendorTopListResponse> {
    const queryParams = buildQueryParams({ ...params, by: metric, limit } as Record<string, unknown>)
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
    const { data } = await api.get<VendorWaterfallContribution[]>(`/vendors/${vendorId}/risk-waterfall`)
    return data
  },

  async getPeerComparison(vendorId: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/vendors/${vendorId}/peer-comparison`)
    return data
  },

  async getLinkedScandals(vendorId: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/vendors/${vendorId}/linked-scandals`)
    return data
  },

  async getAsfCases(vendorId: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/vendors/${vendorId}/asf-cases`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async compare(ids: number[]): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/vendors/compare?ids=${ids.join(',')}`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getVerified(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/vendors/verified')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getClassification(vendorId: number): Promise<Record<string, unknown>> {
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
    const { data } = await api.get<ContractListResponse>(`/institutions/${institutionId}/contracts?${queryParams}`)
    return data
  },

  /**
   * Get top institutions by metric
   */
  async getTop(
    metric: 'spending' | 'contracts' | 'risk' = 'spending',
    limit = 20
  ): Promise<InstitutionTopListResponse> {
    const { data } = await api.get<InstitutionTopListResponse>(`/institutions/top?by=${metric}&limit=${limit}`)
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
  async getASFFindings(institutionId: number): Promise<ASFInstitutionResponse> {
    const { data } = await api.get<ASFInstitutionResponse>(`/institutions/${institutionId}/asf-findings`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async compare(ids: number[]): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/institutions/compare?ids=${ids.join(',')}`)
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getHierarchy(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/institutions/hierarchy')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getTypes(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/institutions/types')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getSizeTiers(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/institutions/size-tiers')
    return data
  },

  /** @deprecated - defined but not yet wired to any UI */
  async getOfficials(institutionId: number): Promise<Record<string, unknown>> {
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
    overview: Record<string, unknown>
    risk_distribution: Array<Record<string, unknown>>
    yearly_trends: Array<Record<string, unknown>>
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
    const queryParams = buildQueryParams({ year, event_type: eventType } as Record<string, unknown>)
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
    const { data } = await api.get<ClassificationStatsResponse>('/vendors/classification/stats')
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
  async getMoneyFlow(year?: number, sectorId?: number): Promise<MoneyFlowResponse> {
    const params = buildQueryParams({ year, sector_id: sectorId } as Record<string, unknown>)
    const paramStr = params.toString()
    const { data } = await api.get<MoneyFlowResponse>(`/analysis/money-flow${paramStr ? `?${paramStr}` : ''}`)
    return data
  },

  /**
   * Get risk factor frequency and co-occurrence analysis
   */
  async getRiskFactorAnalysis(sectorId?: number, year?: number): Promise<RiskFactorAnalysisResponse> {
    const params = buildQueryParams({ sector_id: sectorId, year } as Record<string, unknown>)
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
  async getPerCaseDetection(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/analysis/validation/per-case-detection')
    return data
  },

  /**
   * Get ground truth validation summary
   */
  async getValidationSummary(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/analysis/validation/summary')
    return data
  },

  /**
   * Get detection rate metrics
   */
  async getDetectionRate(modelVersion?: string): Promise<Record<string, unknown>> {
    const params = modelVersion ? `?model_version=${modelVersion}` : ''
    const { data } = await api.get(`/analysis/validation/detection-rate${params}`)
    return data
  },

  /**
   * Get false negatives from ground truth
   */
  async getFalseNegatives(limit = 50): Promise<Record<string, unknown>> {
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

  async getModelMetadata(): Promise<{ version: string; trained_at: string; auc_test: number; pu_correction?: number }> {
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
}

// ============================================================================
// Export Data Endpoints
// ============================================================================

export const exportApi = {
  /**
   * Export contracts to CSV
   */
  async exportContracts(params: ContractFilterParams = {}): Promise<Blob> {
    const queryParams = buildQueryParams(params as Record<string, unknown>)
    const { data } = await api.get(`/export/contracts/csv?${queryParams}`, {
      responseType: 'blob',
    })
    return data
  },

  /**
   * Export vendors to CSV
   */
  async exportVendors(params: VendorFilterParams = {}): Promise<Blob> {
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
    const queryParams = params ? buildQueryParams(params as Record<string, unknown>) : ''
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
}

// ============================================================================
// Network Graph Endpoints
// ============================================================================

export const networkApi = {
  /**
   * Get network graph data for visualization
   */
  async getGraph(params: NetworkGraphParams = {}): Promise<NetworkGraphResponse> {
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
    const queryParams = params ? buildQueryParams(params as Record<string, unknown>) : ''
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
    const queryParams = params ? buildQueryParams(params as Record<string, unknown>) : ''
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
    const queryParams = buildQueryParams(params as Record<string, unknown>)
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
  async getTopCases(n: number, sectorId?: number): Promise<{ data: Array<Record<string, unknown>>; count: number }> {
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
  async getVendorExplanation(vendorId: number, sectorId?: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/investigation/vendors/${vendorId}/explanation${sectorId ? `?sector_id=${sectorId}` : ''}`)
    return data
  },

  async getTopAnomalousVendors(limit = 20, sectorId?: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/investigation/top-anomalous-vendors?limit=${limit}${sectorId ? `&sector_id=${sectorId}` : ''}`)
    return data
  },

  async runPipeline(): Promise<Record<string, unknown>> {
    const { data } = await api.post('/investigation/run', {})
    return data
  },

  async getCaseExport(caseId: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/investigation/cases/${caseId}/export`)
    return data
  },

  async getCaseAsfMatches(caseId: number): Promise<Record<string, unknown>> {
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
  async getDatabase(): Promise<Record<string, unknown>> {
    const { data } = await api.get('/stats/database')
    return data
  },
}

// ============================================================================
// Industries Endpoints
// ============================================================================

export const industriesApi = {
  async getAll(): Promise<Record<string, unknown>> {
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
}
