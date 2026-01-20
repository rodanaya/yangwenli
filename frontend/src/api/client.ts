/**
 * Yang Wen-li API Client
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
  VendorFilterParams,
  InstitutionListResponse,
  InstitutionDetailResponse,
  InstitutionRiskProfile,
  InstitutionTopListResponse,
  InstitutionFilterParams,
  SectorListResponse,
  SectorDetailResponse,
  AnalysisOverview,
  RiskDistribution,
  YearOverYearChange,
  ClassificationStatsResponse,
  AnomalyItem,
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
    const queryParams = buildQueryParams({ ...params, metric, limit } as Record<string, unknown>)
    const { data } = await api.get<VendorTopListResponse>(`/vendors/top?${queryParams}`)
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

export const analysisApi = {
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
    const { data } = await api.get(`/export/contracts?${queryParams}`, {
      responseType: 'blob',
    })
    return data
  },

  /**
   * Export vendors to CSV
   */
  async exportVendors(params: VendorFilterParams = {}): Promise<Blob> {
    const queryParams = buildQueryParams(params as Record<string, unknown>)
    const { data } = await api.get(`/export/vendors?${queryParams}`, {
      responseType: 'blob',
    })
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
}
