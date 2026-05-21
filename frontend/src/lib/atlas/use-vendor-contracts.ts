/**
 * useVendorContracts — Atlas P6 Frontier C.
 *
 * Fetches the latest contracts for a vendor so the Observatory can render a
 * "planetary system" — contract dots orbiting the focused vendor. Backed by
 * the existing `/api/v1/contracts/by-vendor/{id}` endpoint which is paginated
 * (per_page max=100). We deliberately ask for one page only — the orbit caps
 * at ~60 dots, beyond which clusters become unreadable.
 *
 * Why TanStack Query?
 *   • The Observatory keeps the vendor focused while the user pans/zooms;
 *     caching prevents a refetch every time React reconciles parent state.
 *   • 5-minute staleTime matches the rest of the Atlas data layer
 *     (use-cluster-vendors, use-top-vendors).
 *   • `enabled` toggles cleanly with the local `focusedVendor` state — no
 *     manual fetch lifecycle in CanvasAtlasView.
 */
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/api/client'
import type { ContractListItem } from '@/api/types'

export interface VendorContractDot {
  id: number
  amount: number | null
  riskScore: number | null
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | null
  contractDate: string | null
  title: string | null
  institutionName: string | null
  procedureType: string | null
  isDirectAward: boolean
  isSingleBid: boolean
}

function normalize(c: ContractListItem): VendorContractDot {
  const lvl = typeof c.risk_level === 'string'
    ? (c.risk_level.toLowerCase() as VendorContractDot['riskLevel'])
    : null
  const allowed: VendorContractDot['riskLevel'][] = ['critical', 'high', 'medium', 'low']
  const normalizedLvl = allowed.includes(lvl) ? lvl : null
  return {
    id: c.id,
    amount: typeof c.amount_mxn === 'number' ? c.amount_mxn : null,
    riskScore: typeof c.risk_score === 'number' ? c.risk_score : null,
    riskLevel: normalizedLvl,
    contractDate: c.contract_date ?? null,
    title: c.title ?? null,
    institutionName: c.institution_name ?? null,
    procedureType: c.procedure_type ?? null,
    isDirectAward: !!c.is_direct_award,
    isSingleBid: !!c.is_single_bid,
  }
}

export function useVendorContracts(vendorId: number | null) {
  return useQuery({
    queryKey: ['atlas-vendor-contracts', vendorId],
    queryFn: async (): Promise<{ contracts: VendorContractDot[] }> => {
      if (vendorId === null) return { contracts: [] }
      const res = await contractsApi.getByVendor(vendorId, 1)
      const rows = (res.data ?? []).slice(0, 60).map(normalize)
      return { contracts: rows }
    },
    staleTime: 5 * 60 * 1000,
    enabled: vendorId !== null,
  })
}
