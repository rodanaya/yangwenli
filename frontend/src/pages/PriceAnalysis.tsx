/**
 * Price Analysis Page
 *
 * Displays price manipulation hypotheses with investigation workflow.
 * Part of the Price Manipulation Detection System.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { priceApi, type PriceHypothesisItem, type PriceHypothesesSummary } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import {
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  FileText,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// Confidence level colors
const CONFIDENCE_COLORS: Record<string, string> = {
  very_high: '#dc2626', // red
  high: '#ea580c',      // orange
  medium: '#eab308',    // amber
  low: '#64748b',       // slate
}

// Hypothesis type labels
const HYPOTHESIS_TYPE_LABELS: Record<string, string> = {
  extreme_overpricing: 'Extreme Overpricing',
  statistical_outlier: 'Statistical Outlier',
  sudden_price_jump: 'Sudden Price Jump',
  round_number_suspicious: 'Round Number',
  vendor_price_anomaly: 'Vendor Price Anomaly',
  price_clustering: 'Price Clustering',
  sector_mismatch_pricing: 'Sector Mismatch',
  threshold_proximity: 'Threshold Proximity',
}

// Hypothesis type icons
const getHypothesisIcon = (type: string) => {
  switch (type) {
    case 'extreme_overpricing':
      return <AlertOctagon className="h-4 w-4 text-red-500" />
    case 'statistical_outlier':
      return <TrendingUp className="h-4 w-4 text-orange-500" />
    case 'round_number_suspicious':
      return <DollarSign className="h-4 w-4 text-amber-500" />
    case 'vendor_price_anomaly':
      return <BarChart3 className="h-4 w-4 text-purple-500" />
    default:
      return <AlertTriangle className="h-4 w-4 text-slate-500" />
  }
}

// Status badge component
function StatusBadge({ isReviewed, isValid }: { isReviewed: boolean; isValid?: boolean }) {
  if (!isReviewed) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    )
  }
  if (isValid) {
    return (
      <Badge variant="default" className="gap-1 bg-risk-low">
        <CheckCircle className="h-3 w-3" />
        Confirmed
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="h-3 w-3" />
      Dismissed
    </Badge>
  )
}

// Confidence badge component
function ConfidenceBadge({ level, score }: { level: string; score: number }) {
  const color = CONFIDENCE_COLORS[level] || CONFIDENCE_COLORS.low
  return (
    <Badge
      style={{ backgroundColor: color, color: 'white' }}
      className="gap-1"
    >
      {formatPercent(score)}
    </Badge>
  )
}

// Summary cards component
function SummaryCards({ summary }: { summary: PriceHypothesesSummary }) {
  if (summary.status !== 'active' || !summary.overall) {
    return (
      <Card className="bg-risk-medium/10 border-risk-medium/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-risk-medium" />
            <div>
              <p className="font-medium text-text-primary">No Hypotheses Generated</p>
              <p className="text-sm text-text-muted">
                Run <code className="bg-background-elevated px-1 rounded">python backend/scripts/price_hypothesis_engine.py --all</code> to generate price hypotheses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { overall } = summary

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">
            Total Hypotheses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(overall.total_hypotheses)}</div>
          <p className="text-xs text-text-muted">
            {overall.pending_review} pending review
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">
            Flagged Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCompactMXN(overall.total_flagged_value)}</div>
          <p className="text-xs text-text-muted">
            Total value of flagged contracts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">
            Avg Confidence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(overall.avg_confidence)}</div>
          <p className="text-xs text-text-muted">
            Across all hypotheses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">
            Review Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overall.confirmed + overall.dismissed} / {overall.total_hypotheses}
          </div>
          <p className="text-xs text-text-muted">
            {overall.confirmed} confirmed, {overall.dismissed} dismissed
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Distribution charts component
function DistributionCharts({ summary }: { summary: PriceHypothesesSummary }) {
  if (summary.status !== 'active') return null

  const typeData = summary.by_type.map(item => ({
    name: HYPOTHESIS_TYPE_LABELS[item.type] || item.type,
    count: item.count,
    value: item.total_value,
  }))

  const confidenceData = summary.by_confidence.map(item => ({
    name: item.level.charAt(0).toUpperCase() + item.level.slice(1).replace('_', ' '),
    count: item.count,
    color: CONFIDENCE_COLORS[item.level] || CONFIDENCE_COLORS.low,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Hypothesis Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typeData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
              <RechartsTooltip
                formatter={(value: number) => formatNumber(value)}
              />
              <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Confidence Level</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={confidenceData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {confidenceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// Hypothesis card component
function HypothesisCard({
  hypothesis,
  onReview,
  onViewDetail,
}: {
  hypothesis: PriceHypothesisItem
  onReview: (id: string) => void
  onViewDetail: (id: string) => void
}) {
  const sectorName = SECTORS.find(s => s.id === hypothesis.sector_id)?.name || 'Unknown'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {getHypothesisIcon(hypothesis.hypothesis_type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium">
                  {HYPOTHESIS_TYPE_LABELS[hypothesis.hypothesis_type] || hypothesis.hypothesis_type}
                </span>
                <ConfidenceBadge level={hypothesis.confidence_level} score={hypothesis.confidence} />
                <StatusBadge isReviewed={hypothesis.is_reviewed} isValid={hypothesis.is_valid} />
              </div>
              <p className="text-sm text-text-muted line-clamp-2 mb-2">
                {hypothesis.explanation}
              </p>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCompactMXN(hypothesis.amount_mxn || 0)}
                </span>
                <span>Sector: {sectorName}</span>
                <span>Contract #{hypothesis.contract_id}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetail(hypothesis.hypothesis_id)}
            >
              <FileText className="h-4 w-4 mr-1" />
              Details
            </Button>
            {!hypothesis.is_reviewed && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onReview(hypothesis.hypothesis_id)}
              >
                Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Review dialog component
function ReviewDialog({
  hypothesisId,
  open,
  onClose,
  onSubmit,
}: {
  hypothesisId: string | null
  open: boolean
  onClose: () => void
  onSubmit: (id: string, isValid: boolean, notes: string) => void
}) {
  const [notes, setNotes] = useState('')

  const handleSubmit = (isValid: boolean) => {
    if (hypothesisId) {
      onSubmit(hypothesisId, isValid, notes)
      setNotes('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Hypothesis</DialogTitle>
          <DialogDescription>
            Mark this hypothesis as confirmed (valid) or dismissed (invalid).
            This helps calibrate the detection model.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium">Review Notes (optional)</label>
          <Textarea
            placeholder="Add notes about your review decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleSubmit(false)}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
          <Button
            variant="default"
            className="bg-risk-low hover:bg-risk-low/90"
            onClick={() => handleSubmit(true)}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main page component
export function PriceAnalysis() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [confidenceFilter, setConfidenceFilter] = useState<string>('')
  const [sectorFilter, setSectorFilter] = useState<string>('')
  const [reviewedFilter, setReviewedFilter] = useState<string>('')
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(null)

  // Fetch summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['price-hypotheses', 'summary'],
    queryFn: () => priceApi.getSummary(),
  })

  // Fetch hypotheses
  const { data: hypotheses, isLoading: hypothesesLoading } = useQuery({
    queryKey: ['price-hypotheses', 'list', page, typeFilter, confidenceFilter, sectorFilter, reviewedFilter],
    queryFn: () => priceApi.getHypotheses({
      page,
      per_page: 20,
      hypothesis_type: typeFilter || undefined,
      confidence_level: confidenceFilter || undefined,
      sector_id: sectorFilter ? parseInt(sectorFilter) : undefined,
      is_reviewed: reviewedFilter === 'reviewed' ? true : reviewedFilter === 'pending' ? false : undefined,
      sort_by: 'confidence',
      sort_order: 'desc',
    }),
  })

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: ({ id, isValid, notes }: { id: string; isValid: boolean; notes: string }) =>
      priceApi.reviewHypothesis(id, isValid, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-hypotheses'] })
      setReviewDialogOpen(false)
      setSelectedHypothesisId(null)
    },
  })

  const handleReview = (id: string) => {
    setSelectedHypothesisId(id)
    setReviewDialogOpen(true)
  }

  const handleReviewSubmit = (id: string, isValid: boolean, notes: string) => {
    reviewMutation.mutate({ id, isValid, notes })
  }

  const handleViewDetail = (id: string) => {
    // For now, navigate to contracts page with the contract ID
    // In a full implementation, this would open a detail modal or page
    const hypothesis = hypotheses?.data.find(h => h.hypothesis_id === id)
    if (hypothesis) {
      navigate(`/contracts?id=${hypothesis.contract_id}`)
    }
  }

  const totalPages = hypotheses?.pagination.total_pages || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-4.5 w-4.5 text-accent" />
            Price Analysis
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review and validate price manipulation hypotheses
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/risk-analysis')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Risk Analysis
        </Button>
      </div>

      {/* Methodology note */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-text-primary">About Price Hypotheses</p>
              <p className="text-text-secondary">
                These are <strong>hypotheses for review</strong>, not confirmed findings.
                Each flag is generated using statistical methods (IQR outlier detection)
                aligned with EU OLAF and IMF CRI methodology. Review each case to build
                a calibrated model with known false positive rates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <SummaryCards summary={summary} />
      ) : null}

      {/* Distribution Charts */}
      {summary && summary.status === 'active' && (
        <DistributionCharts summary={summary} />
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Hypotheses
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter('')
                setConfidenceFilter('')
                setSectorFilter('')
                setReviewedFilter('')
                setPage(1)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Hypothesis Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {Object.entries(HYPOTHESIS_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Confidence Level</label>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  <SelectItem value="very_high">Very High</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Sector</label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sectors</SelectItem>
                  {SECTORS.map(sector => (
                    <SelectItem key={sector.id} value={String(sector.id)}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Review Status</label>
              <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hypotheses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Hypotheses Queue
            {hypotheses && (
              <span className="text-text-muted font-normal ml-2">
                ({formatNumber(hypotheses.pagination.total)} total)
              </span>
            )}
          </h2>
        </div>

        {hypothesesLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : hypotheses?.data.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-text-muted">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hypotheses found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {hypotheses?.data.map(hypothesis => (
              <HypothesisCard
                key={hypothesis.hypothesis_id}
                hypothesis={hypothesis}
                onReview={handleReview}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {hypotheses && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-text-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <ReviewDialog
        hypothesisId={selectedHypothesisId}
        open={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false)
          setSelectedHypothesisId(null)
        }}
        onSubmit={handleReviewSubmit}
      />
    </div>
  )
}

export default PriceAnalysis
