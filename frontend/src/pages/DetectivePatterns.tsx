import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import { AlertPanel } from '@/components/charts'
import { PATTERN_DESCRIPTIONS } from '@/lib/pattern-descriptions'
import type { AnomalyItem } from '@/api/types'
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
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Brain,
  ArrowRight,
} from 'lucide-react'

interface PatternDef {
  id: string
  descriptionKey: string
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  href: string
}

const PATTERNS: PatternDef[] = [
  {
    id: 'ghost',
    descriptionKey: 'single_bid',
    title: 'Ghost Vendors',
    subtitle: 'Winning >50% via single-bid procedures',
    icon: UserX,
    color: '#dc2626',
    href: '/contracts?risk_factor=single_bid',
  },
  {
    id: 'december',
    descriptionKey: 'year_end',
    title: 'December Rush',
    subtitle: 'Year-end contracts with elevated risk',
    icon: CalendarDays,
    color: '#ea580c',
    href: '/contracts?risk_factor=year_end_timing&risk_level=high',
  },
  {
    id: 'split',
    descriptionKey: 'split',
    title: 'Split Contracts',
    subtitle: 'Same vendor + institution + day, multiple awards',
    icon: Scissors,
    color: '#eab308',
    href: '/contracts?risk_factor=threshold_splitting',
  },
  {
    id: 'cobid',
    descriptionKey: 'co_bid',
    title: 'Co-Bidding Rings',
    subtitle: 'Suspiciously high co-bid rates',
    icon: GitMerge,
    color: '#8b5cf6',
    href: '/contracts?risk_factor=co_bid',
  },
  {
    id: 'price',
    descriptionKey: 'price_anomaly',
    title: 'Price Outliers',
    subtitle: 'Extreme overpricing flagged by IQR',
    icon: TrendingUp,
    color: '#dc2626',
    href: '/contracts?risk_factor=price_anomaly',
  },
  {
    id: 'monopoly',
    descriptionKey: 'monopoly',
    title: 'Sector Monopolies',
    subtitle: 'Vendors with >30% sector share',
    icon: Crown,
    color: '#ea580c',
    href: '/vendors?min_contracts=100',
  },
  {
    id: 'new',
    descriptionKey: 'new_vendor',
    title: 'New & Suspicious',
    subtitle: 'Recently registered, high risk',
    icon: Sparkles,
    color: '#eab308',
    href: '/vendors?risk_level=high',
  },
  {
    id: 'rubber',
    descriptionKey: 'rubber',
    title: 'Rubber Stamp',
    subtitle: 'Institutions with >90% direct award rate',
    icon: Stamp,
    color: '#be123c',
    href: '/institutions',
  },
]

export function DetectivePatterns() {
  const navigate = useNavigate()
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined)
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)

  const { data: patternData } = useQuery({
    queryKey: ['patterns', 'counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['analysis', 'anomalies', severityFilter],
    queryFn: () => analysisApi.getAnomalies(severityFilter),
    staleTime: 5 * 60 * 1000,
  })

  const counts: Record<string, number | undefined> = useMemo(() => {
    const c = patternData?.counts
    if (!c) return {}
    return {
      ghost: c.critical,
      december: c.december_rush,
      split: c.split_contracts,
      cobid: c.co_bidding,
      price: c.price_outliers,
      monopoly: undefined,
      new: undefined,
      rubber: undefined,
    }
  }, [patternData])

  const handleInvestigateAnomaly = (anomaly: AnomalyItem) => {
    const params = new URLSearchParams()
    if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
      params.set('risk_level', anomaly.severity)
    }
    switch (anomaly.anomaly_type) {
      case 'single_bid_cluster':
      case 'high_single_bid':
        params.set('is_single_bid', 'true')
        break
      case 'vendor_concentration':
        break
      case 'direct_award_cluster':
        params.set('is_direct_award', 'true')
        break
      case 'year_end_spike':
        params.set('month', '12')
        break
    }
    navigate(`/contracts?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-accent" />
          Detective Patterns
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Investigation queries for common corruption red flags — click any pattern to learn more
        </p>
      </div>

      {/* Pattern list — clean rows, not boxy cards */}
      <div className="rounded-lg border border-border overflow-hidden">
        {PATTERNS.map((pattern, i) => {
          const Icon = pattern.icon
          const count = counts[pattern.id]
          const isExpanded = expandedPattern === pattern.id
          const desc = PATTERN_DESCRIPTIONS[pattern.descriptionKey]

          return (
            <div key={pattern.id}>
              {/* Row */}
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i > 0 ? 'border-t border-border/50' : ''
                } ${isExpanded ? 'bg-accent/[0.06]' : 'hover:bg-background-elevated/50'}`}
                onClick={() => setExpandedPattern(isExpanded ? null : pattern.id)}
                aria-expanded={isExpanded}
              >
                {/* Color dot + icon */}
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
                  style={{ backgroundColor: `${pattern.color}18`, color: pattern.color }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                {/* Title + subtitle */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-primary">{pattern.title}</span>
                  <span className="text-xs text-text-muted ml-2 hidden sm:inline">{pattern.subtitle}</span>
                </div>

                {/* Count */}
                <div className="shrink-0 text-right mr-2">
                  {count !== undefined ? (
                    <span className="text-sm font-mono tabular-nums text-text-primary">
                      {formatNumber(count)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-muted italic">—</span>
                  )}
                </div>

                {/* Chevron */}
                <ChevronDown
                  className={`h-4 w-4 text-text-muted shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {/* Expanded detail */}
              {isExpanded && desc && (
                <div className="px-4 pb-4 pt-1 bg-accent/[0.03] border-t border-accent/10">
                  <div className="grid gap-4 md:grid-cols-2 pl-11">
                    <div className="space-y-2.5">
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">What it is</h4>
                        <p className="text-xs text-text-secondary leading-relaxed">{desc.what}</p>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Detection method</h4>
                        <p className="text-xs text-text-secondary leading-relaxed">{desc.howDetected}</p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Real-world case</h4>
                        <p className="text-xs text-text-secondary leading-relaxed italic">{desc.realExample}</p>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Why it matters</h4>
                        <p className="text-xs text-text-secondary leading-relaxed">{desc.whyItMatters}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pl-11 mt-3">
                    <Link
                      to={pattern.href}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                    >
                      View matching contracts
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* AI Insights — compact horizontal strip */}
      <div className="rounded-lg border border-accent/20 bg-accent/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            What the Model Learned
          </h3>
          <Link
            to="/methodology"
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
          >
            Methodology
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          <Insight color="var(--risk-critical)">
            <strong>Vendor concentration</strong> is 18.7x more predictive than any other indicator.
          </Insight>
          <Insight color="var(--accent)">
            <strong>Direct awards</strong> are actually <em>less</em> common in known corruption cases.
          </Insight>
          <Insight color="var(--accent)">
            <strong>Short ad periods</strong> show a reversed signal — corrupt vendors use normal timelines.
          </Insight>
          <Insight color="var(--risk-high)">
            <strong>Industry mismatch</strong> has a +0.21 coefficient — out-of-sector work is a red flag.
          </Insight>
          <Insight color="var(--text-muted)">
            <strong>Co-bidding</strong> provides zero signal in current ground truth.
          </Insight>
          <Insight color="var(--accent)">
            <strong>Network membership</strong> is reversed — known-bad vendors operate as standalone players.
          </Insight>
        </div>
      </div>

      {/* Anomaly Investigation Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-risk-high" />
                Anomaly Queue
              </CardTitle>
              <CardDescription>
                {anomalies?.total || 0} detected patterns requiring investigation
              </CardDescription>
            </div>
            <div className="flex gap-1.5">
              {['all', 'critical', 'high', 'medium'].map((severity) => (
                <Button
                  key={severity}
                  variant={severityFilter === (severity === 'all' ? undefined : severity) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter(severity === 'all' ? undefined : severity)}
                  className="capitalize h-7 text-xs px-2.5"
                >
                  {severity}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {anomaliesLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <AlertPanel
              anomalies={anomalies?.data || []}
              maxItems={8}
              onInvestigate={handleInvestigateAnomaly}
            />
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-[11px] text-text-muted/50 font-mono text-center">
        OECD / IMF CRI / EU ARACHNE METHODOLOGIES
      </div>
    </div>
  )
}

function Insight({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <p className="text-[11px] text-text-muted leading-relaxed">{children}</p>
    </div>
  )
}

export default DetectivePatterns
