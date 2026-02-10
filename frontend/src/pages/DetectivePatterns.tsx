import { memo, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import { AlertPanel } from '@/components/charts'
import { SectionDescription } from '@/components/SectionDescription'
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
  ChevronRight,
  Brain,
} from 'lucide-react'

interface PatternCard {
  id: string
  /** Key into PATTERN_DESCRIPTIONS for rich details */
  descriptionKey: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  href: string
}

const PATTERNS: PatternCard[] = [
  {
    id: 'ghost',
    descriptionKey: 'single_bid',
    title: 'Ghost Vendors',
    description: 'Vendors winning >50% via single-bid procedures',
    icon: UserX,
    color: '#dc2626',
    href: '/contracts?risk_factor=single_bid',
  },
  {
    id: 'december',
    descriptionKey: 'year_end',
    title: 'December Rush',
    description: 'Year-end contracts with elevated risk scores',
    icon: CalendarDays,
    color: '#ea580c',
    href: '/contracts?risk_factor=year_end_timing&risk_level=high',
  },
  {
    id: 'split',
    descriptionKey: 'split',
    title: 'Split Contracts',
    description: 'Same vendor + institution + day, multiple contracts',
    icon: Scissors,
    color: '#eab308',
    href: '/contracts?risk_factor=threshold_splitting',
  },
  {
    id: 'cobid',
    descriptionKey: 'co_bid',
    title: 'Co-Bidding Rings',
    description: 'Vendors with suspiciously high co-bid rates',
    icon: GitMerge,
    color: '#8b5cf6',
    href: '/contracts?risk_factor=co_bid',
  },
  {
    id: 'price',
    descriptionKey: 'price_anomaly',
    title: 'Price Outliers',
    description: 'Extreme overpricing flagged by IQR analysis',
    icon: TrendingUp,
    color: '#dc2626',
    href: '/contracts?risk_factor=price_anomaly',
  },
  {
    id: 'monopoly',
    descriptionKey: 'monopoly',
    title: 'Sector Monopolies',
    description: 'Vendors with >30% sector share',
    icon: Crown,
    color: '#ea580c',
    href: '/vendors?min_contracts=100',
  },
  {
    id: 'new',
    descriptionKey: 'new_vendor',
    title: 'New & Suspicious',
    description: 'Recently registered vendors with high risk',
    icon: Sparkles,
    color: '#eab308',
    href: '/vendors?risk_level=high',
  },
  {
    id: 'rubber',
    descriptionKey: 'rubber',
    title: 'Rubber Stamp',
    description: 'Institutions with >90% direct award rate',
    icon: Stamp,
    color: '#be123c',
    href: '/institutions',
  },
]

const AI_INSIGHTS = [
  {
    html: '<strong>Vendor concentration</strong> is 18.7× more predictive of corruption than any other indicator — dominant vendors can extract rents through market power and captured relationships.',
    dotClass: 'bg-risk-critical',
  },
  {
    html: '<strong>Direct awards</strong> are actually <em>less</em> common in known corruption cases (coefficient: −0.20). Known-bad vendors tend to win through competitive procedures.',
    dotClass: 'bg-accent',
  },
  {
    html: '<strong>Short advertisement periods</strong> show a reversed signal — corrupt vendors use normal-length ad periods rather than rushed timelines.',
    dotClass: 'bg-accent',
  },
  {
    html: '<strong>Industry mismatch</strong> — vendors operating outside their registered sector — has a +0.21 coefficient. A travel agency winning pharma contracts is a meaningful red flag.',
    dotClass: 'bg-risk-high',
  },
  {
    html: '<strong>Co-bidding patterns</strong> provide no signal in current ground truth (coefficient: 0.00). This may change as ground truth diversifies beyond health sector cases.',
    dotClass: 'bg-text-muted',
  },
  {
    html: '<strong>Network membership</strong> shows a reversed sign — known-bad vendors tend NOT to appear in detected vendor networks. They operate as standalone dominant players.',
    dotClass: 'bg-accent',
  },
]

export function DetectivePatterns() {
  const navigate = useNavigate()
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined)
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)

  // Fetch all pattern counts in a single request (replaces 6 separate calls)
  const { data: patternData } = useQuery({
    queryKey: ['patterns', 'counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch anomalies (separate because it has a severity filter)
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

      {/* Page description */}
      <SectionDescription title="How patterns are detected">
        Each pattern below represents a specific corruption red flag identified by international anti-corruption frameworks
        (OECD, IMF CRI, EU ARACHNE). The platform scans 3.1 million contracts for these indicators, normalizing each
        against sector and year baselines so that a "suspicious" pattern in Health is calibrated differently than in Energy.
        Click any card to see how it works and explore the matching contracts.
      </SectionDescription>

      {/* Model Insight Strip */}
      <Card className="border-accent/30 bg-accent/[0.04]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 flex-shrink-0">
              <Brain className="h-4.5 w-4.5 text-accent" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                What the AI Learned
              </h3>
              <div className="space-y-2">
                {AI_INSIGHTS.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`mt-1 inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${insight.dotClass}`} />
                    <p className="text-xs text-text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: insight.html }} />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Link
                  to="/methodology"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  View full methodology
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern cards grid */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-animate">
          {PATTERNS.map((pattern) => (
            <PatternCardComponent
              key={pattern.id}
              pattern={pattern}
              count={counts[pattern.id]}
              onClick={() => setExpandedPattern(expandedPattern === pattern.id ? null : pattern.id)}
              isExpanded={expandedPattern === pattern.id}
            />
          ))}
        </div>

        {/* Expanded pattern detail */}
        {expandedPattern && (() => {
          const pattern = PATTERNS.find(p => p.id === expandedPattern)
          if (!pattern) return null
          const desc = PATTERN_DESCRIPTIONS[pattern.descriptionKey]
          if (!desc) return null
          return (
            <Card className="border-accent/30 bg-accent/[0.02] animate-slide-up">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-text-primary">{desc.title}</h3>
                  <Link
                    to={pattern.href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    View all matches
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-text-secondary mb-1">What it is</h4>
                      <p className="text-xs text-text-muted leading-relaxed">{desc.what}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-text-secondary mb-1">How we detect it</h4>
                      <p className="text-xs text-text-muted leading-relaxed">{desc.howDetected}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-text-secondary mb-1">Real-world example</h4>
                      <p className="text-xs text-text-muted leading-relaxed italic">{desc.realExample}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-text-secondary mb-1">Why it matters</h4>
                      <p className="text-xs text-text-muted leading-relaxed">{desc.whyItMatters}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Anomaly Investigation Queue */}
      <Card className="hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-risk-high" />
                Anomaly Investigation Queue
              </CardTitle>
              <CardDescription>
                Detected patterns requiring investigation ({anomalies?.total || 0} total)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {['all', 'critical', 'high', 'medium'].map((severity) => (
                <Button
                  key={severity}
                  variant={severityFilter === (severity === 'all' ? undefined : severity) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter(severity === 'all' ? undefined : severity)}
                  className="capitalize"
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
  isExpanded,
}: {
  pattern: PatternCard
  count?: number
  onClick: () => void
  isExpanded?: boolean
}) {
  const Icon = pattern.icon
  return (
    <Card
      className={`cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group animate-slide-up opacity-0 ${isExpanded ? 'border-accent/40 ring-1 ring-accent/20' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
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
          <ChevronRight className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">{pattern.title}</h3>
        <p className="text-[11px] text-text-muted leading-relaxed mb-3">{pattern.description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {count !== undefined ? (
            <span className="text-xs font-bold tabular-nums text-text-primary">
              {formatNumber(count)} <span className="font-normal text-text-muted">matches</span>
            </span>
          ) : (
            <span className="text-[11px] text-text-muted italic">Detection in development</span>
          )}
          <span className="text-[10px] text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            {isExpanded ? 'Details ↓' : 'Expand →'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
})

export default DetectivePatterns
