import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, formatPercentSafe } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import { SECTOR_COLORS, getSectorNameEN } from '@/lib/constants'
import type { SectorStatistics } from '@/api/types'
import { BarChart3, ExternalLink } from 'lucide-react'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts'

export function Sectors() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorApi.getAll(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-text-muted">
          <p>Failed to load sectors</p>
          <p className="text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    )
  }

  const sortedSectors = [...(data?.data || [])].sort((a, b) => b.total_value_mxn - a.total_value_mxn)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-accent" />
          Sectors Overview
        </h2>
        <p className="text-xs text-text-muted mt-0.5">12 sectors covering {formatNumber(data?.total_contracts || 0)} contracts</p>
      </div>

      {/* Summary chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-3.5 w-3.5 text-accent" />
            Contract Value by Sector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedSectors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1_000_000_000_000).toFixed(1)}T`}
                />
                <YAxis
                  type="category"
                  dataKey="sector_code"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  tickFormatter={(code) => getSectorNameEN(code)}
                  width={100}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SectorStatistics
                      return (
                        <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg">
                          <p className="font-medium">{getSectorNameEN(data.sector_code)}</p>
                          <p className="text-sm text-text-muted">Value: {formatCompactMXN(data.total_value_mxn)}</p>
                          <p className="text-sm text-text-muted">Contracts: {formatNumber(data.total_contracts)}</p>
                          <p className="text-sm text-text-muted">Avg Risk: {(data.avg_risk_score * 100).toFixed(1)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="total_value_mxn" radius={[0, 4, 4, 0]}>
                  {sortedSectors.map((sector) => (
                    <Cell key={sector.sector_id} fill={SECTOR_COLORS[sector.sector_code] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sector cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedSectors.map((sector) => (
          <SectorCard key={sector.sector_id} sector={sector} />
        ))}
      </div>
    </div>
  )
}

function SectorCard({ sector }: { sector: SectorStatistics }) {
  const sectorColor = SECTOR_COLORS[sector.sector_code] || '#64748b'

  // Prefetch sector details on hover for instant page transitions
  const prefetch = usePrefetchOnHover({
    queryKey: ['sector', sector.sector_id],
    queryFn: () => sectorApi.getById(sector.sector_id),
    delay: 150,
  })

  return (
    <Card
      className="hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group"
      {...prefetch}
    >
      <CardContent className="p-4 group-hover:bg-accent/[0.02] transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${sectorColor}20`, color: sectorColor }}
            >
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <Link
                to={`/sectors/${sector.sector_id}`}
                className="text-sm font-medium hover:text-accent transition-colors"
              >
                {getSectorNameEN(sector.sector_code)}
              </Link>
              <p className="text-xs text-text-muted">{formatNumber(sector.total_contracts)} contracts</p>
            </div>
          </div>
          <RiskBadge score={sector.avg_risk_score} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <p className="text-text-muted text-xs">Total Value</p>
            <p className="font-medium tabular-nums">{formatCompactMXN(sector.total_value_mxn)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Vendors</p>
            <p className="font-medium tabular-nums">{formatNumber(sector.total_vendors)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Direct Awards</p>
            <p className="font-medium tabular-nums">{formatPercentSafe(sector.direct_award_pct, false)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Single Bids</p>
            <p className="font-medium tabular-nums">{formatPercentSafe(sector.single_bid_pct, false)}</p>
          </div>
        </div>

        {/* Risk breakdown mini bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Risk Distribution</span>
            <span>{formatNumber(sector.high_risk_count + sector.critical_risk_count)} high risk</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-background-elevated">
            <div
              className="bg-risk-low"
              style={{ width: `${(sector.low_risk_count / sector.total_contracts) * 100}%` }}
            />
            <div
              className="bg-risk-medium"
              style={{ width: `${(sector.medium_risk_count / sector.total_contracts) * 100}%` }}
            />
            <div
              className="bg-risk-high"
              style={{ width: `${(sector.high_risk_count / sector.total_contracts) * 100}%` }}
            />
            <div
              className="bg-risk-critical"
              style={{ width: `${(sector.critical_risk_count / sector.total_contracts) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-end">
          <Link
            to={`/sectors/${sector.sector_id}`}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            View details
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default Sectors
