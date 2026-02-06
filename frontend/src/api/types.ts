/**
 * Yang Wen-li API Types
 * Generated from backend Pydantic models
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

// ============================================================================
// Sector Types
// ============================================================================

export interface Sector {
  id: number
  code: string
  name: string
  color: string
}

export interface SectorStatistics {
  sector_id: number
  sector_code: string
  sector_name: string
  color: string
  total_contracts: number
  total_value_mxn: number
  total_vendors: number
  total_institutions: number
  avg_contract_value: number
  avg_risk_score: number
  low_risk_count: number
  medium_risk_count: number
  high_risk_count: number
  critical_risk_count: number
  high_risk_pct: number
  direct_award_count: number
  direct_award_pct: number
  single_bid_count: number
  single_bid_pct: number
}

export interface SectorTrend {
  year: number
  total_contracts: number
  total_value_mxn: number
  avg_risk_score: number
  direct_award_pct: number
  single_bid_pct: number
}

export interface SectorDetailResponse extends Sector {
  statistics: SectorStatistics
  trends: SectorTrend[]
}

export interface SectorListResponse {
  data: SectorStatistics[]
  total_contracts: number
  total_value_mxn: number
}

// ============================================================================
// Contract Types
// ============================================================================

export interface ContractBase {
  id: number
  contract_number?: string
  title?: string
  amount_mxn: number
  contract_date?: string
  contract_year?: number
  sector_id?: number
  sector_name?: string
  risk_score?: number
  risk_level?: RiskLevel
  is_direct_award: boolean
  is_single_bid: boolean
}

export interface ContractListItem extends ContractBase {
  vendor_name?: string
  institution_name?: string
  procedure_type?: string
}

export interface ContractDetail extends ContractBase {
  procedure_number?: string
  expedient_code?: string
  vendor_id?: number
  vendor_name?: string
  vendor_rfc?: string
  institution_id?: number
  institution_name?: string
  institution_type?: string
  description?: string
  procedure_type?: string
  procedure_type_normalized?: string
  contract_type?: string
  contract_type_normalized?: string
  procedure_character?: string
  participation_form?: string
  partida_especifica?: string
  start_date?: string
  end_date?: string
  award_date?: string
  publication_date?: string
  amount_original?: number
  currency?: string
  is_framework: boolean
  is_consolidated: boolean
  is_multiannual: boolean
  is_high_value: boolean
  is_year_end: boolean
  risk_factors?: string[]
  risk_confidence?: string
  data_quality_score?: number
  data_quality_grade?: string
  source_structure?: string
  source_year?: number
  url?: string
  contract_status?: string
}

export interface ContractListResponse extends PaginatedResponse<ContractListItem> {}

export interface ContractFilterParams {
  sector_id?: number
  year?: number
  vendor_id?: number
  institution_id?: number
  risk_level?: RiskLevel
  risk_factor?: string  // v3.2: Filter by specific risk factor (e.g., co_bid, price_hyp, direct_award)
  is_direct_award?: boolean
  is_single_bid?: boolean
  min_amount?: number
  max_amount?: number
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// v3.2 Risk factors for filtering
export const RISK_FACTORS = [
  { value: 'co_bid', label: 'Co-Bidding Pattern', icon: 'users', description: 'Vendors frequently bidding together' },
  { value: 'price_hyp', label: 'Price Anomaly', icon: 'dollar-sign', description: 'Statistical price outlier' },
  { value: 'direct_award', label: 'Direct Award', icon: 'zap', description: 'Non-competitive procedure' },
  { value: 'single_bid', label: 'Single Bidder', icon: 'user', description: 'Only one vendor bid' },
  { value: 'year_end', label: 'Year-End', icon: 'calendar', description: 'December contract' },
  { value: 'short_ad', label: 'Short Ad Period', icon: 'clock', description: 'Brief advertisement window' },
  { value: 'split', label: 'Threshold Splitting', icon: 'scissors', description: 'Multiple same-day contracts' },
  { value: 'network', label: 'Network Risk', icon: 'git-branch', description: 'Related vendor group' },
  { value: 'inst_risk', label: 'Institution Risk', icon: 'building', description: 'Higher-risk institution type' },
  { value: 'industry_mismatch', label: 'Industry Mismatch', icon: 'alert-triangle', description: 'Vendor outside their sector' },
] as const

export interface ContractStatistics {
  total_contracts: number
  total_value_mxn: number
  avg_contract_value: number
  median_contract_value?: number
  low_risk_count: number
  medium_risk_count: number
  high_risk_count: number
  critical_risk_count: number
  direct_award_count: number
  direct_award_pct: number
  single_bid_count: number
  single_bid_pct: number
  min_year: number
  max_year: number
}

// ============================================================================
// Vendor Types
// ============================================================================

export interface VendorListItem {
  id: number
  name: string
  rfc?: string
  name_normalized?: string
  total_contracts: number
  total_value_mxn: number
  avg_risk_score?: number
  high_risk_pct: number
  direct_award_pct: number
  first_contract_year?: number
  last_contract_year?: number
}

export interface VendorDetailResponse {
  id: number
  name: string
  rfc?: string
  name_normalized?: string
  phonetic_code?: string
  industry_id?: number
  industry_code?: string
  industry_name?: string
  industry_confidence?: number
  sector_affinity?: number
  vendor_group_id?: number
  group_name?: string
  total_contracts: number
  total_value_mxn: number
  avg_contract_value?: number
  avg_risk_score?: number
  high_risk_count: number
  high_risk_pct: number
  direct_award_count: number
  direct_award_pct: number
  single_bid_count: number
  single_bid_pct: number
  first_contract_year?: number
  last_contract_year?: number
  years_active: number
  primary_sector_id?: number
  primary_sector_name?: string
  sectors_count: number
  total_institutions: number
}

export interface VendorRiskProfile {
  vendor_id: number
  vendor_name: string
  avg_risk_score?: number
  risk_trend?: 'improving' | 'stable' | 'worsening'
  contracts_by_risk_level: Record<RiskLevel, number>
  value_by_risk_level: Record<RiskLevel, number>
  top_risk_factors: Array<{
    factor: string
    count: number
    percentage: number
  }>
  risk_vs_sector_avg?: number
  risk_percentile?: number
}

export interface VendorInstitutionItem {
  institution_id: number
  institution_name: string
  institution_type?: string
  contract_count: number
  total_value_mxn: number
  avg_risk_score?: number
  first_year?: number
  last_year?: number
}

export interface VendorRelatedItem {
  vendor_id: number
  vendor_name: string
  rfc?: string
  relationship_type: 'same_group' | 'similar_name' | 'shared_rfc_root'
  similarity_score?: number
  total_contracts: number
  total_value_mxn: number
}

export interface VendorTopItem {
  rank: number
  vendor_id: number
  vendor_name: string
  rfc?: string
  metric_value: number
  total_contracts: number
  total_value_mxn: number
  avg_risk_score?: number
}

export interface VendorListResponse extends PaginatedResponse<VendorListItem> {
  filters_applied: Record<string, unknown>
  generated_at: string
}

export interface VendorTopListResponse {
  data: VendorTopItem[]
  metric: 'value' | 'count' | 'risk'
  total: number
  generated_at: string
}

export interface VendorInstitutionListResponse {
  vendor_id: number
  vendor_name: string
  data: VendorInstitutionItem[]
  total: number
  generated_at: string
}

// ============================================================================
// Institution Types
// ============================================================================

export interface InstitutionType {
  id: number
  code: string
  name_es: string
  name_en?: string
  description?: string
  is_legally_decentralized: boolean
  default_sector?: string
  risk_baseline: number
}

export interface InstitutionResponse {
  id: number
  name: string
  name_normalized?: string
  siglas?: string
  institution_type?: string
  institution_type_id?: number
  size_tier?: string
  autonomy_level?: string
  is_legally_decentralized?: boolean
  sector_id?: number
  state_code?: string
  geographic_scope?: string
  total_contracts?: number
  total_amount_mxn?: number
  classification_confidence?: number
  data_quality_grade?: string
}

export interface InstitutionDetailResponse extends InstitutionResponse {
  risk_baseline?: number
  size_risk_adjustment?: number
  autonomy_risk_baseline?: number
  avg_contract_value?: number
  high_risk_contract_count?: number
  high_risk_percentage?: number
}

export interface InstitutionRiskProfile {
  institution_id: number
  institution_name: string
  institution_type?: string
  risk_baseline: number
  size_tier?: string
  size_risk_adjustment: number
  autonomy_level?: string
  autonomy_risk_baseline: number
  effective_risk: number
  total_contracts: number
  total_value: number
  contracts_by_risk_level: Record<RiskLevel, number>
  avg_risk_score?: number
}

export interface InstitutionVendorItem {
  vendor_id: number
  vendor_name: string
  rfc?: string
  contract_count: number
  total_value_mxn: number
  avg_risk_score?: number
  first_year?: number
  last_year?: number
}

export interface InstitutionTopItem {
  rank: number
  institution_id: number
  institution_name: string
  institution_type?: string
  metric_value: number
  total_contracts: number
  total_value_mxn: number
  avg_risk_score?: number
}

export interface InstitutionListResponse extends PaginatedResponse<InstitutionResponse> {
  filters_applied: Record<string, unknown>
  generated_at: string
}

export interface InstitutionTopListResponse {
  data: InstitutionTopItem[]
  metric: 'spending' | 'contracts' | 'risk'
  total: number
  generated_at: string
}

export interface InstitutionVendorListResponse {
  institution_id: number
  institution_name: string
  data: InstitutionVendorItem[]
  total: number
  generated_at: string
}

// ============================================================================
// Analysis/Overview Types
// ============================================================================

export interface AnalysisOverview {
  total_contracts: number
  total_value_mxn: number
  total_vendors: number
  total_institutions: number
  avg_risk_score: number
  high_risk_contracts: number
  high_risk_value_mxn: number
  high_risk_pct: number
  direct_award_pct: number
  single_bid_pct: number
  years_covered: number
  min_year: number
  max_year: number
  sectors_count: number
  top_sector_by_value: string
  top_sector_by_risk: string
}

export interface RiskDistribution {
  risk_level: RiskLevel
  count: number
  percentage: number
  total_value_mxn: number
}

export interface YearOverYearChange {
  year: number
  contracts: number
  value_mxn: number
  avg_risk: number
  contracts_change_pct?: number
  value_change_pct?: number
}

export interface AnomalyItem {
  anomaly_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affected_contracts: number
  affected_value_mxn: number
  details: Record<string, unknown>
}

// ============================================================================
// Classification Types
// ============================================================================

export interface IndustryCoverage {
  industry_id: number
  industry_code: string
  industry_name: string
  vendor_count: number
  percentage_of_verified: number
}

export interface ClassificationStatsResponse {
  total_vendors: number
  verified_vendors: number
  unverified_vendors: number
  coverage_percentage: number
  total_patterns: number
  total_industries: number
  top_industries: IndustryCoverage[]
  sector_coverage: Array<{
    sector_id: number
    sector_name: string
    verified_vendor_count: number
    industries_mapped: number
  }>
  last_updated?: string
  methodology_version: string
  generated_at: string
}

// ============================================================================
// Filter Types
// ============================================================================

export interface VendorFilterParams {
  industry_id?: number
  sector_affinity?: number
  min_contracts?: number
  max_contracts?: number
  min_value?: number
  max_value?: number
  risk_level?: RiskLevel
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface InstitutionFilterParams {
  institution_type?: string
  sector_id?: number
  size_tier?: string
  state_code?: string
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}
