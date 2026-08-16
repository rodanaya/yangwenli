/**
 * useInstitutionRelatedVendors — Atlas inline drill-chain.
 *
 * When a contract is focused in planetary mode, this fetches other vendors
 * at the SAME institution so the contract card can offer "jump to a related
 * vendor" without leaving /atlas. Backed by the existing
 * `/api/v1/institutions/{id}/vendors` endpoint (already used by
 * InstitutionDossier / InstitutionProfile / InstitutionCompare) — no backend
 * change needed.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { institutionApi } from '@/api/client'

export interface RelatedVendor {
  id: number
  name: string
  riskScore: number | null
  contractCount: number
}

const EMPTY_RELATED_VENDORS: RelatedVendor[] = []
const FETCH_LIMIT = 8
const DISPLAY_LIMIT = 5

export function useInstitutionRelatedVendors(
  institutionId: number | null,
  excludeVendorId?: number | null,
) {
  const query = useQuery({
    queryKey: ['atlas-institution-vendors', institutionId],
    queryFn: async (): Promise<RelatedVendor[]> => {
      if (institutionId === null) return []
      const res = await institutionApi.getVendors(institutionId, FETCH_LIMIT)
      return (res.data ?? []).map((v): RelatedVendor => ({
        id: v.vendor_id,
        name: v.vendor_name,
        riskScore: typeof v.avg_risk_score === 'number' ? v.avg_risk_score : null,
        contractCount: v.contract_count,
      }))
    },
    enabled: institutionId !== null,
    staleTime: 5 * 60 * 1000,
  })

  return useMemo(() => {
    const rows = query.data ?? EMPTY_RELATED_VENDORS
    const filtered = excludeVendorId ? rows.filter((v) => v.id !== excludeVendorId) : rows
    return filtered.length > 0 ? filtered.slice(0, DISPLAY_LIMIT) : EMPTY_RELATED_VENDORS
  }, [query.data, excludeVendorId])
}
