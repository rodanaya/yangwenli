/**
 * RUBLI API Client
 * Centralized API calls with TypeScript types
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios'
import type {
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
  InvestigationCaseListResponse,
  InvestigationCaseDetail,
  InvestigationStats,
  InvestigationDashboardSummary,
  InvestigationFilterParams,
  ExternalEvidence,
  ExecutiveSummaryResponse,
  FastDashboardData,
  RiskExplanation,
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
}

// ============================================================================
// Vendor Endpoints
// ============================================================================

export const vendorApi = {
  /**
   * Get paginated list of vendors with filters
   */
  async getAll(params: VendorFilterParams = {}): Promise<VendorListResponse> {
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
    const { data } = await api.get<VendorInstitutionListResponse>(`/vendors/${vendorId}/institutions?limit=${limit}`)
    return data
  },

  /**
   * Search vendors by name
   */
  async search(query: string, limit = 10): Promise<VendorListResponse> {
    const { data } = await api.get<VendorListResponse>(`/vendors?search=${encodeURIComponent(query)}&per_page=${limit}`)
    return data
  },
}

// ============================================================================
// Institution Endpoints
// ============================================================================

export const institutionApi = {
  /**
   * Get paginated list of institutions with filters
   */
  async getAll(params: InstitutionFilterParams = {}): Promise<InstitutionListResponse> {
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
    const { data } = await api.get<InstitutionTopListResponse>(`/institutions/top?metric=${metric}&limit=${limit}`)
    return data
  },

  /**
   * Get institution's vendors
   */
  async getVendors(institutionId: number, limit = 50): Promise<InstitutionVendorListResponse> {
    const { data } = await api.get<InstitutionVendorListResponse>(`/institutions/${institutionId}/vendors?limit=${limit}`)
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
}

// ============================================================================
// Analysis Endpoints
// ============================================================================

// Fast dashboard response type — uses typed interfaces from types.ts
export type FastDashboardResponse = FastDashboardData

// Data Quality types
export interface GradeDistribution {
  grade: string
  count: number
  percentage: number
}

export interface StructureQuality {
  structure: string
  years: string
  contract_count: number
  avg_quality_score: number
  rfc_coverage: number
  quality_description: string
}

export interface FieldCompleteness {
  field_name: string
  fill_rate: number
  null_count: number
  total_count: number
}

export interface KeyIssue {
  field: string
  issue_type: string
  severity: string
  description: string
  affected_count: number
}

export interface DataQualityResponse {
  overall_score: number
  total_contracts: number
  grade_distribution: GradeDistribution[]
  by_structure: StructureQuality[]
  field_completeness: FieldCompleteness[]
  key_issues: KeyIssue[]
  last_calculated: string | null
}

// Monthly breakdown types
export interface MonthlyDataPoint {
  month: number
  month_name: string
  contracts: number
  value: number
  avg_risk: number
  direct_award_count: number
  single_bid_count: number
  is_year_end: boolean
}

export interface MonthlyBreakdownResponse {
  year: number
  months: MonthlyDataPoint[]
  total_contracts: number
  total_value: number
  avg_risk: number
  december_spike: number | null
}

// Temporal events types
export interface TemporalEvent {
  id: string
  date: string
  year: number
  month: number | null
  type: string
  title: string
  description: string
  impact: string
  source: string | null
}

export interface TemporalEventsResponse {
  events: TemporalEvent[]
  total: number
}

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
}

// ============================================================================
// Watchlist Types
// ============================================================================

export interface WatchlistItem {
  id: number
  item_type: 'vendor' | 'institution' | 'contract'
  item_id: number
  item_name: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  status: 'watching' | 'investigating' | 'resolved'
  notes: string | null
  alert_threshold: number | null
  alerts_enabled: boolean
  risk_score: number | null
  risk_score_at_creation: number | null
  created_at: string
  updated_at: string
}

export interface WatchlistChanges {
  watchlist_id: number
  item_type: 'vendor' | 'institution' | 'contract'
  item_id: number
  risk_score_at_creation: number | null
  current_risk_score: number | null
  risk_change: number | null
  recent_contracts: Array<{
    id: number
    amount_mxn: number
    risk_score: number | null
    contract_date: string | null
    sector_id: number | null
  }>
}

export interface WatchlistResponse {
  data: WatchlistItem[]
  total: number
  by_status: {
    watching: number
    investigating: number
    resolved: number
  }
  by_priority: {
    high: number
    medium: number
    low: number
  }
  high_priority_count: number
}

export interface WatchlistItemCreate {
  item_type: 'vendor' | 'institution' | 'contract'
  item_id: number
  reason: string
  priority?: 'high' | 'medium' | 'low'
  notes?: string
  alert_threshold?: number
}

export interface WatchlistItemUpdate {
  status?: 'watching' | 'investigating' | 'resolved'
  priority?: 'high' | 'medium' | 'low'
  notes?: string
  alert_threshold?: number
  alerts_enabled?: boolean
}

export interface WatchlistStats {
  total: number
  watching: number
  investigating: number
  resolved: number
  high_priority: number
  with_alerts: number
}

// ============================================================================
// Watchlist Endpoints
// ============================================================================

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
}

// ============================================================================
// Network Graph Types
// ============================================================================

export interface NetworkNode {
  id: string
  type: 'vendor' | 'institution'
  name: string
  value: number
  contracts: number
  risk_score: number | null
  metadata?: Record<string, unknown>
}

export interface NetworkLink {
  source: string
  target: string
  value: number
  contracts: number
  avg_risk: number | null
  relationship?: string
}

export interface NetworkGraphResponse {
  nodes: NetworkNode[]
  links: NetworkLink[]
  total_nodes: number
  total_links: number
  total_value: number
}

export interface NetworkGraphParams {
  vendor_id?: number
  institution_id?: number
  sector_id?: number
  year?: number
  min_value?: number
  min_contracts?: number
  depth?: number
  limit?: number
}

export interface CoBidderItem {
  vendor_id: number
  vendor_name: string
  co_bid_count: number
  win_count: number
  loss_count: number
  same_winner_ratio: number
  relationship_strength: 'weak' | 'moderate' | 'strong' | 'very_strong'
}

export interface CoBiddersResponse {
  vendor_id: number
  vendor_name: string
  co_bidders: CoBidderItem[]
  total_procedures: number
  suspicious_patterns: Array<{
    pattern: string
    description: string
    vendors: Array<{ id: number; name: string; [key: string]: unknown }>
  }>
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
}

// ============================================================================
// Price Hypothesis Types
// ============================================================================

export interface PriceHypothesisItem {
  id: number
  hypothesis_id: string
  contract_id: number
  hypothesis_type: string
  confidence: number
  confidence_level: string
  explanation: string
  supporting_evidence: Array<{
    evidence_type: string
    description: string
    value: unknown
    comparison_value?: unknown
    source?: string
  }>
  recommended_action: string
  literature_reference: string
  sector_id?: number
  vendor_id?: number
  amount_mxn?: number
  is_reviewed: boolean
  is_valid?: boolean
  review_notes?: string
  created_at: string
}

export interface PriceHypothesesResponse {
  data: PriceHypothesisItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
  summary: {
    total_hypotheses: number
    by_confidence: {
      very_high: number
      high: number
      medium: number
      low: number
    }
    reviewed_count: number
    confirmed_count: number
    total_flagged_value: number
  }
}

export interface PriceHypothesisDetailResponse {
  hypothesis: PriceHypothesisItem
  contract: Record<string, unknown>
  sector_baseline?: {
    sector_id: number
    median: number
    p75: number
    p95: number
    upper_fence: number
    extreme_fence: number
    mean: number
    std_dev: number
    sample_count: number
  }
  vendor_profile?: {
    vendor_id: number
    avg_contract_value: number
    median_contract_value: number
    contract_count: number
    price_trend: string
  }
  similar_contracts: Array<Record<string, unknown>>
}

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
  async getVendorExplanation(vendorId: number, sectorId: number): Promise<Record<string, unknown>> {
    const { data } = await api.get(`/investigation/vendors/${vendorId}/explanation?sector_id=${sectorId}`)
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
}
