import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { contractApi, vendorApi, analysisApi } from '@/api/client'
import {
  Fingerprint,
  UserX,
  CalendarDays,
  Scissors,
  GitMerge,
  TrendingUp,
  Crown,
  Sparkles,
  Stamp,
  ArrowRight,
} from 'lucide-react'

interface PatternCard {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  href: string
}

const PATTERNS: PatternCard[] = [
  {
    id: 'ghost',
    title: 'Ghost Vendors',
    description: 'Vendors winning >50% via single-bid procedures',
    icon: UserX,
    color: '#dc2626',
    href: '/vendors?risk_level=critical&min_contracts=10',
  },
  {
    id: 'december',
    title: 'December Rush',
    description: 'Year-end contracts with elevated risk scores',
    icon: CalendarDays,
    color: '#ea580c',
    href: '/contracts?risk_factor=year_end_timing&risk_level=high',
  },
  {
    id: 'split',
    title: 'Split Contracts',
    description: 'Same vendor + institution + day, multiple contracts',
    icon: Scissors,
    color: '#eab308',
    href: '/contracts?risk_factor=threshold_splitting',
  },
  {
    id: 'cobid',
    title: 'Co-Bidding Rings',
    description: 'Vendors with suspiciously high co-bid rates',
    icon: GitMerge,
    color: '#8b5cf6',
    href: '/contracts?risk_factor=co_bid',
  },
  {
    id: 'price',
    title: 'Price Outliers',
    description: 'Extreme overpricing flagged by IQR analysis',
    icon: TrendingUp,
    color: '#dc2626',
    href: '/analysis/price',
  },
  {
    id: 'monopoly',
    title: 'Sector Monopolies',
    description: 'Vendors with >30% sector share',
    icon: Crown,
    color: '#ea580c',
    href: '/vendors?min_contracts=100',
  },
  {
    id: 'new',
    title: 'New & Suspicious',
    description: 'Recently registered vendors with high risk',
    icon: Sparkles,
    color: '#eab308',
    href: '/vendors?risk_level=high',
  },
  {
    id: 'rubber',
    title: 'Rubber Stamp',
    description: 'Institutions with >90% direct award rate',
    icon: Stamp,
    color: '#be123c',
    href: '/institutions',
  },
]

export function DetectivePatterns() {
  const navigate = useNavigate()

  // Fetch counts for pattern cards
  const { data: criticalContracts } = useQuery({
    queryKey: ['patterns', 'critical'],
    queryFn: () => contractApi.getAll({ risk_level: 'critical', per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: yearEndContracts } = useQuery({
    queryKey: ['patterns', 'year_end'],
    queryFn: () => contractApi.getAll({ risk_factor: 'year_end_timing', risk_level: 'high', per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: splitContracts } = useQuery({
    queryKey: ['patterns', 'split'],
    queryFn: () => contractApi.getAll({ risk_factor: 'threshold_splitting', per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: coBidContracts } = useQuery({
    queryKey: ['patterns', 'cobid'],
    queryFn: () => contractApi.getAll({ risk_factor: 'co_bid', per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: highRiskVendors } = useQuery({
    queryKey: ['patterns', 'high_risk_vendors'],
    queryFn: () => vendorApi.getTop('risk', 5),
    staleTime: 10 * 60 * 1000,
  })

  const { data: anomalies } = useQuery({
    queryKey: ['patterns', 'anomalies'],
    queryFn: () => analysisApi.getAnomalies(),
    staleTime: 10 * 60 * 1000,
  })

  const counts: Record<string, number | undefined> = useMemo(() => ({
    ghost: highRiskVendors?.data?.length ? highRiskVendors.data.length : undefined,
    december: yearEndContracts?.pagination?.total,
    split: splitContracts?.pagination?.total,
    cobid: coBidContracts?.pagination?.total,
    price: anomalies?.total,
    monopoly: undefined,
    new: undefined,
    rubber: undefined,
  }), [highRiskVendors, yearEndContracts, splitContracts, coBidContracts, anomalies])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-accent" />
          Detective Patterns
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Pre-built investigation queries for common corruption patterns
        </p>
      </div>

      {/* Pattern cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-animate">
        {PATTERNS.map((pattern) => (
          <PatternCardComponent
            key={pattern.id}
            pattern={pattern}
            count={counts[pattern.id]}
            onClick={() => navigate(pattern.href)}
          />
        ))}
      </div>

      {/* Methodology note */}
      <div className="text-[11px] text-text-muted/60 font-[var(--font-family-mono)] text-center pt-4">
        PATTERNS BASED ON OECD / IMF CRI / EU ARACHNE METHODOLOGIES
      </div>
    </div>
  )
}

const PatternCardComponent = memo(function PatternCardComponent({
  pattern,
  count,
  onClick,
}: {
  pattern: PatternCard
  count?: number
  onClick: () => void
}) {
  const Icon = pattern.icon
  return (
    <Card
      className="cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group animate-slide-up opacity-0"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${pattern.color}15`, color: pattern.color }}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">{pattern.title}</h3>
        <p className="text-[11px] text-text-muted leading-relaxed mb-3">{pattern.description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {count !== undefined ? (
            <span className="text-xs font-bold tabular-nums text-text-primary">
              {formatNumber(count)} <span className="font-normal text-text-muted">matches</span>
            </span>
          ) : (
            <Skeleton className="h-4 w-20" />
          )}
          <span className="text-[10px] text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Investigate →
          </span>
        </div>
      </CardContent>
    </Card>
  )
})

export default DetectivePatterns
