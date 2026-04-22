/**
 * CollisionFlash — compact dashboard widget showing the #1 most suspicious
 * co-bidding vendor pair. Pulls from /collusion/pairs sorted by co_bid_rate.
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/client'
import { ArrowRight } from 'lucide-react'

interface CollusionPair {
  vendor_id_a: number
  vendor_id_b: number
  vendor_name_a: string
  vendor_name_b: string
  shared_procedures: number
  vendor_a_procedures: number
  vendor_b_procedures: number
  co_bid_rate: number
  is_potential_collusion: boolean
}

interface CollusionPairsResponse {
  data: CollusionPair[]
  pagination: { total: number }
}

function useTopCollisionPair() {
  return useQuery({
    queryKey: ['collision-flash'],
    queryFn: async () => {
      const { data } = await api.get<CollusionPairsResponse>(
        '/collusion/pairs?is_potential_collusion=true&sort_by=co_bid_rate&per_page=1'
      )
      return data.data[0] ?? null
    },
    staleTime: 60 * 60 * 1000,
  })
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function CollisionFlash({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const { data: pair, isLoading, isError } = useTopCollisionPair()

  if (isLoading) {
    return (
      <div className={className}>
        <div className="h-[88px] bg-zinc-800/40 rounded animate-pulse" />
      </div>
    )
  }

  if (isError || !pair) return null

  const coRate = Math.round(pair.co_bid_rate)
  const nameA = truncate(pair.vendor_name_a, 32)
  const nameB = truncate(pair.vendor_name_b, 32)

  return (
    <div className={className}>
      {/* Kicker */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-mono font-bold uppercase tracking-[0.12em]"
          style={{ color: '#f87171' }}
        >
          {lang === 'en' ? 'CO-BIDDING ALERT' : 'ALERTA CO-LICITACIÓN'}
        </span>
        <Link
          to="/collusion"
          className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 transition-colors"
        >
          {lang === 'en' ? 'all pairs' : 'todos'}
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Pair display */}
      <div className="flex items-center gap-2 mb-2">
        {/* Vendor A */}
        <Link
          to={`/vendors/${pair.vendor_id_a}`}
          className="flex-1 min-w-0 px-2 py-1.5 rounded border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 transition-colors"
        >
          <span className="block text-[11px] font-mono font-semibold text-zinc-200 leading-tight truncate">
            {nameA}
          </span>
          <span className="text-[9px] font-mono text-zinc-500">
            {pair.vendor_a_procedures.toLocaleString()} {lang === 'en' ? 'procedures' : 'procedimientos'}
          </span>
        </Link>

        {/* Arrow + rate */}
        <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
          <span
            className="text-[13px] font-mono font-bold"
            style={{ color: '#f87171' }}
          >
            ↔
          </span>
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: '#f87171' }}
          >
            {coRate}%
          </span>
        </div>

        {/* Vendor B */}
        <Link
          to={`/vendors/${pair.vendor_id_b}`}
          className="flex-1 min-w-0 px-2 py-1.5 rounded border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 transition-colors"
        >
          <span className="block text-[11px] font-mono font-semibold text-zinc-200 leading-tight truncate">
            {nameB}
          </span>
          <span className="text-[9px] font-mono text-zinc-500">
            {pair.vendor_b_procedures.toLocaleString()} {lang === 'en' ? 'procedures' : 'procedimientos'}
          </span>
        </Link>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
        <span>
          <span className="text-zinc-300">{pair.shared_procedures.toLocaleString()}</span>
          {' '}{lang === 'en' ? 'shared procedures' : 'procedimientos compartidos'}
        </span>
        <span className="text-zinc-700">·</span>
        <span style={{ color: '#f87171' }}>
          {coRate}% {lang === 'en' ? 'co-bid rate' : 'tasa de co-licitación'}
        </span>
      </div>
    </div>
  )
}
