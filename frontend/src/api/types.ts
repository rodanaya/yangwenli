/**
 * RUBLI API Types
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
  vendor_id?: number
  vendor_name?: string
  vendor_rfc?: string
  institution_id?: number
  institution_name?: string
  procedure_type?: string
  mahalanobis_distance?: number
  risk_factors?: string[]
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
  threshold_proximity?: number
  is_threshold_gaming: boolean
  risk_factors?: string[]
  risk_confidence?: string
  risk_confidence_lower?: number
  risk_confidence_upper?: number
  risk_model_version?: string
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

export interface RiskFeatureContribution {
  feature: string
  label: string
  z_score: number
  coefficient: number
  contribution: number
}

export interface RiskExplanation {
  contract_id: number
  risk_score: number
  risk_level: string
  model_version?: string
  model_type?: string
  sector_id?: number
  confidence_interval?: {
    lower?: number | null
    upper?: number | null
  }
  explanation_available: boolean
  intercept?: number
  logit?: number
  pu_correction?: number
  features: RiskFeatureContribution[]
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
  single_bid_pct: number
  first_contract_year?: number
  last_contract_year?: number
  primary_sector_id?: number
  pct_anomalous?: number
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
  avg_mahalanobis?: number
  max_mahalanobis?: number
  pct_anomalous?: number
  name_variants: NameVariant[]
  top_institutions: VendorTenureInstitution[]
  // Co-bidding triangle clustering (Wachs, Fazekas & Kertész 2021)
  cobid_clustering_coeff?: number
  cobid_triangle_count?: number
}

export interface NameVariant {
  variant_name: string
  source: string  // 'qqw' | 'manual' | 'etl'
}

export interface VendorTenureInstitution {
  institution_id: number
  institution_name: string
  first_contract_year: number
  last_contract_year: number
  tenure_years: number
  total_contracts: number
  total_amount_mxn: number
}

export interface LongestTenuredVendor {
  vendor_id: number
  vendor_name: string
  first_contract_year: number
  last_contract_year: number
  tenure_years: number
  total_contracts: number
  avg_risk_score?: number
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
  avg_risk_score?: number
  high_risk_pct?: number
  direct_award_pct?: number
  single_bid_pct?: number
  vendor_count?: number
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
  avg_risk_score?: number
  direct_award_rate?: number
  direct_award_count?: number
  longest_tenured_vendors: LongestTenuredVendor[]
  supplier_diversity?: SupplierDiversity
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
// Fast Dashboard Types (from /stats/dashboard/fast precomputed endpoint)
// ============================================================================

export interface DashboardOverview {
  total_contracts: number
  total_value_mxn: number
  total_vendors: number
  total_institutions: number
  avg_risk_score: number
  high_risk_contracts: number
  high_risk_value_mxn: number
  high_risk_pct?: number
  direct_award_pct: number
  single_bid_pct: number
  min_year: number
  max_year: number
  years_covered?: number
}

export interface DashboardSectorItem {
  id: number
  code: string
  name: string
  total_contracts: number
  total_value_mxn: number
  total_vendors: number
  avg_risk_score: number
  low_risk_count: number
  medium_risk_count: number
  high_risk_count: number
  critical_risk_count: number
  direct_award_count: number
  single_bid_count: number
}

export interface FastDashboardData {
  overview: DashboardOverview
  sectors: DashboardSectorItem[]
  risk_distribution: RiskDistribution[]
  yearly_trends: YearOverYearChange[]
  december_spike?: Record<string, unknown> | null
  monthly_2023?: Record<string, unknown> | null
  cached_at: string | null
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
  total_value: number
  value_mxn?: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  high_risk_pct: number
  vendor_count: number
  institution_count: number
  contracts_change_pct?: number
  value_change_pct?: number
  risk_stddev?: number
}

export interface AnomalyItem {
  anomaly_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affected_contracts: number
  affected_value_mxn: number
  details: Record<string, unknown>
}

export interface SectorYearItem {
  year: number
  sector_id: number
  contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number | null
  high_risk_pct: number
  vendor_count: number
  institution_count: number
}

// ============================================================================
// Money Flow Types
// ============================================================================

export interface MoneyFlowItem {
  source_type: string
  source_id: number
  source_name: string
  target_type: string
  target_id: number
  target_name: string
  value: number
  contracts: number
  avg_risk: number | null
  high_risk_pct: number | null
}

export interface MoneyFlowResponse {
  flows: MoneyFlowItem[]
  total_value: number
  total_contracts: number
}

// ============================================================================
// Risk Factor Analysis Types
// ============================================================================

export interface RiskFactorFrequency {
  factor: string
  count: number
  percentage: number
  avg_risk_score: number
}

export interface FactorCooccurrence {
  factor_a: string
  factor_b: string
  count: number
  expected_count: number
  lift: number
}

export interface RiskFactorAnalysisResponse {
  total_contracts_with_factors: number
  factor_frequencies: RiskFactorFrequency[]
  top_cooccurrences: FactorCooccurrence[]
}

// ============================================================================
// Institution Health Types
// ============================================================================

export interface InstitutionHealthItem {
  institution_id: number
  institution_name: string
  total_contracts: number
  total_value: number
  avg_risk_score: number
  direct_award_pct: number
  single_bid_pct: number
  high_risk_pct: number
  vendor_count: number
  hhi: number
  top_vendor_share: number
}

export interface InstitutionRankingsResponse {
  data: InstitutionHealthItem[]
  total_institutions: number
}

// ============================================================================
// Procurement Intelligence — Collusion / Concentration / Year-End / Leads
// ============================================================================

export interface CoBiddingPair {
  vendor_1_id: number
  vendor_1_name: string
  vendor_2_id: number
  vendor_2_name: string
  co_bid_count: number
  co_bid_rate: number
  combined_value: number
  is_potential_collusion: boolean
}

export interface CoBiddingResponse {
  total_pairs_analyzed: number
  high_confidence_pairs: number
  potential_collusion_pairs: number
  pairs: CoBiddingPair[]
}

export interface ConcentrationAlert {
  vendor_id: number
  vendor_name: string
  institution_id: number
  institution_name: string
  vendor_contracts: number
  vendor_value: number
  total_contracts: number
  total_value: number
  value_share_pct: number
  avg_risk_score: number | null
}

export interface ConcentrationResponse {
  institutions_analyzed: number
  high_concentration_count: number
  alerts: ConcentrationAlert[]
}

export interface YearEndPattern {
  year: number
  december_value: number
  december_contracts: number
  avg_monthly_value: number
  spike_ratio: number | null
  is_significant: boolean
  december_risk: number | null
}

export interface YearEndResponse {
  years_analyzed: number
  years_with_spikes: number
  average_spike_ratio: number
  patterns: YearEndPattern[]
}

export interface InvestigationLead {
  lead_type: string
  priority: string
  contract_id: number | null
  vendor_id: number | null
  vendor_name: string | null
  institution_id: number | null
  institution_name: string | null
  amount_mxn: number | null
  risk_score: number | null
  risk_indicators: string[]
  verification_steps: string[]
}

export interface InvestigationLeadsResponse {
  total_leads: number
  high_priority: number
  leads: InvestigationLead[]
}

export interface FactorEffectivenessItem {
  factor_name: string
  trigger_rate_known_bad: number
  trigger_rate_baseline: number
  lift: number
  effectiveness_score: number
}

export interface FactorAnalysisValidationResponse {
  factors: FactorEffectivenessItem[]
  sample_sizes: {
    known_bad_contracts: number
    baseline_contracts: number
  }
  recommendations: FactorEffectivenessItem[]
}

// ============================================================================
// External Registry Types (SFP Sanctions + RUPC + ASF)
// ============================================================================

export interface SFPSanction {
  id: number
  rfc: string | null
  company_name: string
  sanction_type: string | null
  sanction_start: string | null
  sanction_end: string | null
  amount_mxn: number | null
  authority: string | null
}

export interface RUPCVendor {
  rfc: string
  company_name: string
  compliance_grade: string | null
  status: string | null
  registered_date: string | null
  expiry_date: string | null
}

export interface ASFCaseItem {
  id: number
  asf_report_id: string | null
  entity_name: string
  finding_type: string
  amount_mxn: number | null
  report_year: number | null
  report_url: string | null
  summary: string | null
}

export interface SATEFOSRecord {
  rfc: string
  company_name: string
  stage: 'presunto' | 'definitivo' | 'favorecido' | 'desvirtuado'
  dof_date: string | null
}

export interface VendorExternalFlags {
  vendor_id: number
  sfp_sanctions: SFPSanction[]
  rupc: RUPCVendor | null
  asf_cases: ASFCaseItem[]
  sat_efos: SATEFOSRecord | null
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
  sector_id?: number
  min_contracts?: number
  max_contracts?: number
  min_value?: number
  max_value?: number
  has_rfc?: boolean
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
  min_contracts?: number
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// ============================================================================
// Investigation Types
// ============================================================================

export type InvestigationValidationStatus = 'pending' | 'corroborated' | 'refuted' | 'inconclusive'

export interface InvestigationCaseListItem {
  id: number
  case_id: string
  case_type: string
  sector_id: number
  sector_name: string
  suspicion_score: number
  anomaly_score: number | null
  confidence: number
  title: string
  total_contracts: number
  total_value_mxn: number
  estimated_loss_mxn: number
  date_range_start: string | null
  date_range_end: string | null
  priority: number
  is_reviewed: boolean
  validation_status: InvestigationValidationStatus
  vendor_count: number
  signals_triggered: string[]
}

export interface InvestigationVendor {
  vendor_id: number
  name: string
  rfc: string | null
  role: string
  contract_count: number | null
  contract_value_mxn: number | null
  avg_risk_score: number | null
}

export interface InvestigationQuestion {
  id: number
  question_type: string
  question_text: string
  priority: number
  supporting_evidence: string[] | null
}

export interface ExternalEvidence {
  source_url: string
  source_title: string
  source_type: string
  summary: string
  date_published: string | null
  credibility: string
}

export interface InvestigationCaseDetail extends InvestigationCaseListItem {
  summary: string | null
  narrative: string | null
  risk_factor_counts: Record<string, number>
  vendors: InvestigationVendor[]
  questions: InvestigationQuestion[]
  external_sources: Array<Record<string, string>>
  generated_at: string
}

export interface InvestigationCaseListResponse {
  data: InvestigationCaseListItem[]
  pagination: PaginationMeta
}

export interface InvestigationStats {
  total_cases: number
  by_sector: Record<string, number>
  by_type: Record<string, number>
  by_status: Record<string, number>
  total_value_mxn: number
  total_estimated_loss_mxn: number
  avg_suspicion_score: number
  critical_cases: number
  high_cases: number
}

export interface InvestigationDashboardSummary {
  total_cases: number
  corroborated_cases: number
  pending_cases: number
  total_value_at_risk: number
  hit_rate: {
    checked: number
    confirmed: number
    rate: number
  }
  top_corroborated: Array<{
    id?: number
    case_id: string
    title: string
    score: number
    value: number
    total_value_mxn?: number
    contracts: number
    sector_code: string
    sector_name: string
    news_summary: string
    summary?: string
  }>
  validation_funnel: {
    detected: number
    researched: number
    corroborated: number
    promoted_to_gt: number
  }
}

// ============================================================================
// Executive Summary Types
// ============================================================================

export interface ExecutiveSummaryHeadline {
  total_contracts: number
  total_value: number
  total_vendors: number
  total_institutions: number
  min_year: number
  max_year: number
}

export interface ExecutiveSummaryRisk {
  critical_count: number
  critical_value: number
  critical_pct: number
  high_count: number
  high_value: number
  high_pct: number
  medium_count: number
  medium_value: number
  medium_pct: number
  low_count: number
  low_value: number
  low_pct: number
  value_at_risk: number
  value_at_risk_pct: number
  high_risk_rate: number
}

export interface ExecutiveSectorItem {
  code: string
  name: string
  contracts: number
  value: number
  avg_risk: number
  high_plus_pct: number
}

export interface ExecutiveTopInstitution {
  name: string
  contracts: number
  value: number
  avg_risk: number
}

export interface ExecutiveTopVendor {
  id: number
  name: string
  contracts: number
  value_billions: number
  avg_risk: number
}

export interface ExecutiveAdministration {
  name: string
  full_name: string
  years: string
  party: string
  contracts: number
  value: number
  avg_risk: number
  high_risk_pct: number
  direct_award_pct: number
}

export interface ExecutiveYearlyTrend {
  year: number
  contracts: number
  value_billions: number
  avg_risk: number
}

export interface ExecutiveCaseDetail {
  name: string
  type: string
  contracts: number
  high_plus_pct: number
  avg_score: number
  sector: string
}

export interface ExecutiveGroundTruth {
  cases: number
  vendors: number
  contracts: number
  detection_rate: number
  auc: number
  case_details: ExecutiveCaseDetail[]
}

export interface ExecutiveModelPredictor {
  name: string
  beta: number
  direction: 'positive' | 'negative'
}

export interface ExecutiveModel {
  version: string
  auc: number
  brier: number
  lift: number
  top_predictors: ExecutiveModelPredictor[]
  counterintuitive: string[]
}

export interface ExecutiveSummaryResponse {
  headline: ExecutiveSummaryHeadline
  risk: ExecutiveSummaryRisk
  procedures: { direct_award_pct: number; single_bid_pct: number }
  sectors: ExecutiveSectorItem[]
  top_institutions: ExecutiveTopInstitution[]
  top_vendors: ExecutiveTopVendor[]
  administrations: ExecutiveAdministration[]
  yearly_trends: ExecutiveYearlyTrend[]
  ground_truth: ExecutiveGroundTruth
  model: ExecutiveModel
  generated_at: string
}

export interface InvestigationFilterParams {
  sector_id?: number
  case_type?: string
  min_score?: number
  validation_status?: InvestigationValidationStatus
  priority?: number
  page?: number
  per_page?: number
}

// ============================================================================
// Case Library Types
// ============================================================================

export type FraudType =
  | 'ghost_company'
  | 'bid_rigging'
  | 'overpricing'
  | 'conflict_of_interest'
  | 'embezzlement'
  | 'bribery'
  | 'procurement_fraud'
  | 'monopoly'
  | 'emergency_fraud'
  | 'tender_rigging'
  | 'other'

export type Administration = 'fox' | 'calderon' | 'epn' | 'amlo' | 'sheinbaum'

export type LegalStatus =
  | 'investigation'
  | 'prosecuted'
  | 'convicted'
  | 'acquitted'
  | 'dismissed'
  | 'impunity'
  | 'unresolved'

export type CompranetVisibility = 'high' | 'partial' | 'invisible'

export interface KeyActor {
  name: string
  role: 'vendor' | 'official' | 'institution' | 'journalist'
  title?: string
  note?: string
}

export interface ScandalSource {
  title: string
  outlet: string
  date?: string
  type: 'journalism' | 'audit' | 'legal' | 'academic' | 'official'
  url?: string
}

export interface ScandalListItem {
  id: number
  name_en: string
  name_es: string
  slug: string
  fraud_type: FraudType
  administration: Administration
  sector_id?: number
  sector_ids: number[]
  contract_year_start?: number
  contract_year_end?: number
  discovery_year?: number
  amount_mxn_low?: number
  amount_mxn_high?: number
  severity: number
  legal_status: LegalStatus
  compranet_visibility: CompranetVisibility
  summary_en: string
  is_verified: number
  ground_truth_case_id?: number
}

export interface ScandalDetail extends ScandalListItem {
  amount_note?: string
  legal_status_note?: string
  compranet_note?: string
  summary_es?: string
  key_actors: KeyActor[]
  sources: ScandalSource[]
  investigation_case_ids: number[]
}

export interface ScandalStats {
  total_cases: number
  total_amount_mxn_low: number
  cases_by_fraud_type: { fraud_type: string; count: number }[]
  cases_by_administration: { administration: string; count: number }[]
  cases_by_legal_status: { legal_status: string; count: number }[]
  cases_by_severity: { severity: number; count: number }[]
  gt_linked_count: number
  compranet_visible_count: number
}

export interface CaseLibraryParams {
  fraud_type?: FraudType
  administration?: Administration
  sector_id?: number
  legal_status?: LegalStatus
  severity_min?: number
  compranet_visibility?: CompranetVisibility
  search?: string
}

// Political Cycle Analysis
export interface SexenioYearBreakdown {
  sexenio_year: number
  label: string
  contracts: number
  avg_risk: number
  high_risk_pct: number
  direct_award_pct: number
  single_bid_pct: number
}

export interface ElectionYearGroup {
  contracts: number
  avg_risk: number
  high_risk_pct: number
  direct_award_pct: number
  single_bid_pct: number
}

export interface PoliticalCycleResponse {
  election_year_effect: {
    election_year?: ElectionYearGroup
    non_election_year?: ElectionYearGroup
    risk_delta?: number
    risk_delta_pct?: number
  }
  sexenio_year_breakdown: SexenioYearBreakdown[]
  q4_election_interaction: Record<string, { contracts: number; avg_risk: number }>
}

// Publication Delay Transparency
export interface DelayBucket {
  label: string
  count: number
  pct: number
  days_min?: number
  days_max?: number | null
}

export interface PublicationDelayResponse {
  total_with_delay_data: number
  avg_delay_days: number
  timely_pct: number
  distribution: DelayBucket[]
  by_year: { year: number; contracts_with_delay: number; avg_delay: number; timely_pct: number }[]
}

// Supplier Diversity / HHI (Prozorro analytics; Fazekas CRI)
export interface SupplierDiversityHistory {
  year: number
  hhi: number
  unique_vendors: number
}

export interface SupplierDiversity {
  hhi_current_year: number
  hhi_5yr_avg: number
  unique_vendors_current_year: number
  concentration_level: 'low' | 'medium' | 'high'
  trend: 'increasing' | 'decreasing' | 'stable'
  history: SupplierDiversityHistory[]
  prozorro_note: string
}

export interface ConcentrationRankingItem {
  institution_id: number
  name: string
  siglas?: string
  sector_id?: number
  hhi: number
  unique_vendors: number
  total_value_mxn: number
  concentration_level: 'low' | 'medium' | 'high'
}

export interface ConcentrationRankingsResponse {
  year: number
  most_concentrated: ConcentrationRankingItem[]
  least_concentrated: ConcentrationRankingItem[]
  note: string
}

// Threshold Gaming (Szucs 2023 / Coviello et al. 2018)
export interface ThresholdGamingSector {
  sector_id: number
  sector_name: string
  flagged_contracts: number
  total_value_mxn: number
}

export interface ThresholdGamingResponse {
  total_flagged: number
  pct_of_competitive_procedures: number
  by_sector: ThresholdGamingSector[]
}

// ============================================================================
// ASF Institution Findings Types
// ============================================================================

export interface ASFInstitutionFinding {
  year: number
  observations_total: number | null
  amount_mxn: number | null
  observations_solved: number | null
  finding_type: string | null
  recovery_rate: number | null
}

export interface ASFInstitutionResponse {
  institution_id: number
  ramo_code: number | null
  findings: ASFInstitutionFinding[]
  total_amount_mxn: number
  years_audited: number
}

export interface SectorASFFinding {
  year: number
  total_observations: number
  total_amount_mxn: number
  institutions_audited: number
  observations_solved: number
}

export interface SectorASFResponse {
  sector_id: number
  sector_name: string
  findings: SectorASFFinding[]
  total_amount_mxn: number
  years_audited: number
}

export interface ASFInstitutionSummaryItem {
  entity_name: string
  finding_count: number
  total_amount_mxn: number
  earliest_year: number | null
  latest_year: number | null
  matched_risk_score: number | null
  matched_institution_name: string | null
}

export interface ASFInstitutionSummaryResponse {
  items: ASFInstitutionSummaryItem[]
  total_findings: number
  total_amount_mxn: number
}

// ============================================================================
// Data Quality Types (moved from client.ts)
// ============================================================================

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

// ============================================================================
// Monthly Breakdown Types (moved from client.ts)
// ============================================================================

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

// ============================================================================
// Structural Breakpoints Types (moved from client.ts)
// ============================================================================

export interface StructuralBreakpoint {
  metric: string       // 'direct_award_pct' | 'single_bid_pct' | 'high_risk_pct'
  year: number
  delta: number        // percentage point change
  direction: 'increase' | 'decrease'
}

export interface StructuralBreaksResponse {
  breakpoints: StructuralBreakpoint[]
  error?: string
}

// ============================================================================
// Temporal Events Types (moved from client.ts)
// ============================================================================

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

// ============================================================================
// Watchlist Types (moved from client.ts)
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
// Network Graph Types (moved from client.ts)
// ============================================================================

export interface NetworkNode {
  id: string
  type: 'vendor' | 'institution'
  name: string
  value: number
  contracts: number
  risk_score: number | null
  metadata?: Record<string, unknown>
  community_id?: number | null
  community_size?: number | null
  pagerank?: number | null
  // Co-bidding triangle clustering (Wachs, Fazekas & Kertész 2021)
  cobid_clustering_coeff?: number | null
  cobid_triangle_count?: number | null
}

export interface CommunityVendorItem {
  vendor_id: number
  vendor_name: string
  pagerank: number
  degree: number
  avg_risk: number
  contracts: number
  total_value: number
}

export interface CommunityItem {
  community_id: number
  size: number
  avg_risk: number
  sector_count: number
  top_vendors: CommunityVendorItem[]
}

export interface CommunitiesResponse {
  communities: CommunityItem[]
  total_communities: number
  graph_ready: boolean
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
// Price Hypothesis Types (moved from client.ts)
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

export interface MlAnomalyItem {
  contract_id: number
  anomaly_score: number
  sector_id: number
  sector_name: string
  iqr_flagged: boolean
  amount_mxn: number
  vendor_name: string
  contract_date: string
}

export interface MlAnomaliesResponse {
  data: MlAnomalyItem[]
  total: number
  new_detections: number
}

// ============================================================================
// Fast Dashboard Response Type (moved from client.ts)
// ============================================================================

export type FastDashboardResponse = FastDashboardData

// ============================================================================
// New Types for API expansion
// ============================================================================

export interface VendorGroundTruthStatus {
  is_known_bad: boolean
  cases: Array<{
    case_id: number
    scandal_slug: string
    fraud_type: string
    case_name: string
  }>
}

export interface VendorWaterfallContribution {
  feature: string
  z_score: number
  coefficient: number
  contribution: number
  label_es: string
  label_en: string
}

export interface VendorReport {
  vendor_id: number
  vendor_name: string
  generated_at: string
  summary: string
  risk_score: number
  contract_count: number
}

export interface InstitutionReport {
  institution_id: number
  institution_name: string
  generated_at: string
  summary: string
}

export interface SectorReport {
  sector_id: number
  sector_name: string
  generated_at: string
  summary: string
}

export interface ThematicReport {
  theme: string
  generated_at: string
  summary: string
}

export interface ReportTypeSummary {
  vendor_count: number
  institution_count: number
  sector_count: number
  thematic_count: number
}

export interface VendorAISummary {
  vendor_id: number
  vendor_name: string
  summary: string
  insights: string[]
  total_contracts: number
  avg_risk_score: number | null
  generated_by: string
}

export interface FeatureImportanceItem {
  feature: string
  importance: number
  description_es: string
  description_en: string
}

export interface ModelComparisonItem {
  model: string
  auc: number
  brier: number
  high_rate: number
}

export interface CommunityDetailResponse {
  community_id: number
  size: number
  avg_risk_score: number
  members: Array<{
    vendor_id: number
    vendor_name: string
    risk_score: number
  }>
}

export interface ComparePeriodResponse {
  period1: {
    start: string
    end: string
    total_value: number
    avg_risk: number
  }
  period2: {
    start: string
    end: string
    total_value: number
    avg_risk: number
  }
  delta_risk: number
  delta_value: number
}

export interface InstitutionRiskFactorResponse {
  factor: string
  value: number
  sector_median: number
  percentile: number
}
