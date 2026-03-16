/**
 * Model Transparency Page
 *
 * Explains the v6.0 risk scoring model: coefficients, validation metrics,
 * per-case detection performance, model comparison (v3.3 vs v6.0), and
 * known limitations. All data is hardcoded from methodology documentation.
 */

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, slideUp, fadeIn } from '@/lib/animations'
import { useTranslation, Trans } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionDescription } from '@/components/SectionDescription'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { TableExportButton } from '@/components/TableExportButton'
import { cn, formatNumber } from '@/lib/utils'
import { RISK_COLORS, RISK_THRESHOLDS, CURRENT_MODEL_VERSION } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import {
  Shield,
  Target,
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Brain,
  Scale,
  Database,
  Eye,
  Lock,
  BarChart3,
  ArrowRight,
  Info,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  ReferenceLine,
  ErrorBar,
  LineChart,
  Line,
  Legend,
} from '@/components/charts'

// ============================================================================
// Hardcoded Model Data (from v6.0 methodology documentation)
// ============================================================================

interface Coefficient {
  factor: string
  beta: number
  raw_beta: number
  ci_lower: number
  ci_upper: number
  direction: 'positive' | 'negative' | 'neutral' | 'zeroed'
  note?: string
}

const MODEL_COEFFICIENTS: Coefficient[] = [
  { factor: 'price_volatility', beta: 1.219, raw_beta: 1.219, ci_lower: 1.016, ci_upper: 1.431, direction: 'positive', note: 'Strongest predictor' },
  { factor: 'win_rate', beta: 0.727, raw_beta: 0.727, ci_lower: 0.648, ci_upper: 0.833, direction: 'positive', note: '' },
  { factor: 'vendor_concentration', beta: 0.428, raw_beta: 0.428, ci_lower: 0.277, ci_upper: 0.597, direction: 'positive' },
  { factor: 'industry_mismatch', beta: 0.305, raw_beta: 0.305, ci_lower: 0.263, ci_upper: 0.345, direction: 'positive' },
  { factor: 'same_day_count', beta: 0.222, raw_beta: 0.222, ci_lower: 0.172, ci_upper: 0.286, direction: 'positive' },
  { factor: 'direct_award', beta: 0.182, raw_beta: 0.182, ci_lower: 0.124, ci_upper: 0.247, direction: 'positive', note: 'Reversed from v4.0 (-0.197)' },
  { factor: 'network_member_count', beta: 0.064, raw_beta: 0.064, ci_lower: 0.033, ci_upper: 0.097, direction: 'positive', note: 'Now positive (was zeroed in v4.0)' },
  { factor: 'year_end', beta: 0.059, raw_beta: 0.059, ci_lower: 0.023, ci_upper: 0.098, direction: 'positive' },
  { factor: 'institution_risk', beta: 0.057, raw_beta: 0.057, ci_lower: 0.016, ci_upper: 0.097, direction: 'positive' },
  { factor: 'single_bid', beta: 0.013, raw_beta: 0.013, ci_lower: -0.042, ci_upper: 0.074, direction: 'neutral' },
  { factor: 'price_hyp_confidence', beta: 0.001, raw_beta: 0.001, ci_lower: -0.049, ci_upper: 0.050, direction: 'neutral' },
  { factor: 'co_bid_rate', beta: 0.000, raw_beta: 0.000, ci_lower: 0.000, ci_upper: 0.000, direction: 'neutral', note: 'Regularized to zero' },
  { factor: 'price_ratio', beta: -0.015, raw_beta: -0.015, ci_lower: -0.098, ci_upper: 0.080, direction: 'neutral' },
  { factor: 'ad_period_days', beta: -0.104, raw_beta: -0.104, ci_lower: -0.180, ci_upper: -0.032, direction: 'negative' },
  { factor: 'sector_spread', beta: -0.374, raw_beta: -0.374, ci_lower: -0.443, ci_upper: -0.316, direction: 'negative', note: 'Cross-sector = less risky' },
  { factor: 'institution_diversity', beta: -0.848, raw_beta: -0.848, ci_lower: -0.933, ci_upper: -0.777, direction: 'negative', note: 'Serves many institutions = less risky' },
]

const VALIDATION_METRICS = {
  auc_train: 0.858,
  auc_roc: 0.849,
  brier_score: 0.090,
  detection_rate_medium_plus: 0.887,
  detection_rate_high_plus: 0.253,
  high_risk_rate: 0.253,
  pu_correction: 0.448,
  ground_truth_cases: 390,
  ground_truth_vendors: 725,
  ground_truth_contracts: 310296,
} as const

interface CaseDetection {
  case_name: string
  contracts: number
  detection_pct: number
  high_plus_pct: number
  avg_score: number
}

const CASE_DETECTION: CaseDetection[] = [
  { case_name: 'IMSS Ghost Companies', contracts: 9366, detection_pct: 99.9, high_plus_pct: 99.0, avg_score: 0.977 },
  { case_name: 'Segalmex Food Distribution', contracts: 6326, detection_pct: 99.6, high_plus_pct: 89.3, avg_score: 0.664 },
  { case_name: 'COVID-19 Emergency', contracts: 5371, detection_pct: 99.9, high_plus_pct: 84.9, avg_score: 0.821 },
  { case_name: 'Edenred Voucher Monopoly', contracts: 2939, detection_pct: 100.0, high_plus_pct: 96.7, avg_score: 0.884 },
  { case_name: 'Toka IT Monopoly', contracts: 1954, detection_pct: 100.0, high_plus_pct: 100.0, avg_score: 0.964 },
  { case_name: 'Infrastructure Network', contracts: 191, detection_pct: 100.0, high_plus_pct: 99.5, avg_score: 0.962 },
  { case_name: 'SixSigma Tender Rigging', contracts: 147, detection_pct: 95.2, high_plus_pct: 87.8, avg_score: 0.756 },
  { case_name: 'Cyber Robotic IT', contracts: 139, detection_pct: 100.0, high_plus_pct: 14.4, avg_score: 0.249 },
  { case_name: 'PEMEX-Cotemar', contracts: 51, detection_pct: 100.0, high_plus_pct: 100.0, avg_score: 1.000 },
  { case_name: 'IPN Cartel de la Limpieza', contracts: 48, detection_pct: 95.8, high_plus_pct: 64.6, avg_score: 0.551 },
  { case_name: 'Odebrecht-PEMEX', contracts: 35, detection_pct: 97.1, high_plus_pct: 97.1, avg_score: 0.915 },
  { case_name: 'La Estafa Maestra', contracts: 10, detection_pct: 90.0, high_plus_pct: 0.0, avg_score: 0.179 },
  { case_name: 'Grupo Higa', contracts: 3, detection_pct: 100.0, high_plus_pct: 33.3, avg_score: 0.359 },
  { case_name: 'Oceanografia PEMEX', contracts: 2, detection_pct: 50.0, high_plus_pct: 0.0, avg_score: 0.152 },
  { case_name: 'SAT EFOS Ghost Network', contracts: 122, detection_pct: 41.8, high_plus_pct: 27.9, avg_score: 0.283 },
]

const MODEL_COMPARISON = {
  v33: { auc: 0.584, detection: 67.1, high_plus: 18.3, brier: 0.411, lift: 1.22 },
  v60: { auc: 0.849, detection: 88.7, high_plus: 25.3, brier: 0.090, lift: 2.3 },
} as const

const SECTOR_MODELS = [
  { sector: 'Salud (1)', factors: [['vendor_concentration', '+1.39'], ['price_ratio', '+0.17'], ['same_day_count', '+0.16']] },
  { sector: 'Educacion (2)', factors: [['vendor_concentration', '+0.71'], ['industry_mismatch', '+0.55'], ['price_hyp_confidence', '+0.48']] },
  { sector: 'Infraestructura (3)', factors: [['vendor_concentration', '+0.97'], ['network_member_count', '+0.61'], ['industry_mismatch', '+0.52']] },
  { sector: 'Energia (4)', factors: [['industry_mismatch', '+1.17'], ['vendor_concentration', '+0.75'], ['network_member_count', '+0.26']] },
  { sector: 'Defensa (5)', factors: [['industry_mismatch', '+0.68'], ['vendor_concentration', '+0.21'], ['price_hyp_confidence', '+0.21']] },
  { sector: 'Tecnologia (6)', factors: [['network_member_count', '+0.39'], ['price_hyp_confidence', '+0.27'], ['industry_mismatch', '+0.25']] },
  { sector: 'Hacienda (7)', factors: [['network_member_count', '+0.77'], ['vendor_concentration', '+0.44'], ['price_hyp_confidence', '+0.32']] },
  { sector: 'Gobernacion (8)', factors: [['vendor_concentration', '+0.42'], ['industry_mismatch', '+0.37'], ['price_hyp_confidence', '+0.26']] },
  { sector: 'Agricultura (9)', factors: [['vendor_concentration', '+1.82'], ['network_member_count', '+0.26'], ['price_ratio', '+0.18']] },
  { sector: 'Ambiente (10)', factors: [['vendor_concentration', '+0.62'], ['network_member_count', '+0.60'], ['industry_mismatch', '+0.43']] },
  { sector: 'Trabajo (11)', factors: [['vendor_concentration', '+0.54'], ['network_member_count', '+0.37'], ['industry_mismatch', '+0.29']] },
  { sector: 'Otros (12)', factors: [['network_member_count', '+0.40'], ['industry_mismatch', '+0.29'], ['same_day_count', '+0.15']] },
] as const

// ============================================================================
// Factor display names and descriptions
// ============================================================================

const FACTOR_LABELS: Record<string, string> = {
  price_volatility: 'Price Volatility',
  institution_diversity: 'Institution Diversity',
  win_rate: 'Win Rate',
  sector_spread: 'Sector Spread',
  vendor_concentration: 'Vendor Concentration',
  industry_mismatch: 'Industry Mismatch',
  same_day_count: 'Same-Day Contracts',
  institution_risk: 'Institution Risk',
  single_bid: 'Single Bidder',
  price_ratio: 'Price Ratio',
  year_end: 'Year-End Timing',
  price_hyp_confidence: 'Price Hypothesis',
  co_bid_rate: 'Co-Bid Rate',
  direct_award: 'Direct Award',
  ad_period_days: 'Ad Period Days',
  network_member_count: 'Network Members',
}

const DIRECTION_COLORS: Record<string, string> = {
  positive: '#4ade80',
  negative: '#f87171',
  neutral: '#64748b',
  zeroed: '#475569',
}

// ============================================================================
// Helper Components
// ============================================================================

function MetricGauge({
  label,
  value,
  format,
  subtitle,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  format?: string
  subtitle: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className="rounded-lg p-2 shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted">{label}</p>
            <p className="text-xl font-bold text-text-primary tabular-nums mt-0.5">
              {value}
              {format && <span className="text-xs font-normal text-text-muted ml-1">{format}</span>}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const level = score >= RISK_THRESHOLDS.critical ? 'critical'
    : score >= RISK_THRESHOLDS.high ? 'high'
    : score >= RISK_THRESHOLDS.medium ? 'medium'
    : 'low'

  const color = RISK_COLORS[level]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}30` }}
      role="status"
      aria-label={`Average score ${(score * 100).toFixed(0)}%`}
    >
      {(score * 100).toFixed(0)}%
    </span>
  )
}

function DetectionBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-background-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-xs tabular-nums text-text-secondary w-10 text-right">{pct}%</span>
    </div>
  )
}

function DeltaLabel({ v33, v50, suffix = '' }: { v33: number; v50: number; suffix?: string }) {
  const delta = v50 - v33
  const isPositive = delta > 0
  return (
    <span className={cn('text-xs font-medium', isPositive ? 'text-risk-low' : 'text-risk-critical')}>
      {isPositive ? '+' : ''}{delta.toFixed(delta < 1 ? 2 : 1)}{suffix}
    </span>
  )
}

// ============================================================================
// Custom Tooltip for coefficient chart
// ============================================================================

function CoefficientTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Coefficient & { label: string } }> }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg text-xs space-y-1.5 max-w-[260px]">
      <p className="font-semibold text-text-primary">{d.label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-text-muted">Coefficient</span>
        <span className="text-text-primary tabular-nums font-medium">
          {d.beta >= 0 ? '+' : ''}{d.beta.toFixed(4)}
        </span>
        {d.raw_beta !== d.beta && (
          <>
            <span className="text-text-muted">Raw coefficient</span>
            <span className="text-text-secondary tabular-nums">
              {d.raw_beta >= 0 ? '+' : ''}{d.raw_beta.toFixed(4)}
            </span>
          </>
        )}
        <span className="text-text-muted">95% CI</span>
        <span className="text-text-secondary tabular-nums">
          [{d.ci_lower.toFixed(3)}, {d.ci_upper.toFixed(3)}]
        </span>
      </div>
      {d.note && (
        <p className="text-text-muted italic border-t border-border/30 pt-1.5">{d.note}</p>
      )}
    </div>
  )
}

// ============================================================================
// Custom Tooltip for comparison chart
// ============================================================================

function ComparisonTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; fill: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-text-primary">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="text-text-primary tabular-nums font-medium">{entry.value.toFixed(entry.value < 1 ? 3 : 1)}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Limitation Card
// ============================================================================

function LimitationCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className="rounded-lg p-2 shrink-0 mt-0.5"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">{title}</p>
            <p className="text-xs text-text-secondary leading-relaxed mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SHAP Feature Importance Section (v5.2 live data)
// ============================================================================

function SHAPImportanceSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-importance-v52'],
    queryFn: () => analysisApi.getFeatureImportanceV52(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
  if (!data?.features?.length) return (
    <p className="text-sm text-text-muted">No SHAP data available. Run compute_shap_explanations.py first.</p>
  )

  const items = data.features.slice(0, 16)
  const maxVal = Math.max(...items.map((d) => d.shap_mean_abs), 0.01)

  return (
    <div>
      <p className="text-xs text-text-muted mb-3">
        Mean absolute SHAP values from the global {data.model_version ?? 'v5.2'} model.
        Higher = more influence on risk score. Direction indicates risk-increasing or protective.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table" aria-label="SHAP feature importance">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-2 pr-3 text-text-muted font-medium w-10">Rank</th>
              <th className="text-left py-2 px-3 text-text-muted font-medium">Factor</th>
              <th className="text-left py-2 px-3 text-text-muted font-medium min-w-[140px]">SHAP Mean |Abs|</th>
              <th className="text-center py-2 px-3 text-text-muted font-medium">Direction</th>
              <th className="text-right py-2 pl-3 text-text-muted font-medium">Coefficient</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.factor_name}
                className="border-b border-border/10 hover:bg-background-elevated/30 transition-colors"
              >
                <td className="py-2 pr-3 tabular-nums text-text-muted">#{item.rank}</td>
                <td className="py-2 px-3 text-text-primary font-medium capitalize">
                  {FACTOR_LABELS[item.factor_name] ?? item.factor_name.replace(/_/g, ' ')}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(item.shap_mean_abs / maxVal) * 100}%`,
                          backgroundColor: item.direction === 'risk' ? 'var(--color-accent)' : 'var(--color-accent-data)',
                        }}
                        role="presentation"
                      />
                    </div>
                    <span className="tabular-nums text-text-secondary font-mono text-[10px]">
                      {item.shap_mean_abs.toFixed(4)}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  {item.direction === 'risk' ? (
                    <Badge
                      className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20"
                      variant="outline"
                    >
                      Risk
                    </Badge>
                  ) : (
                    <Badge
                      className="text-[10px] px-1.5 py-0 bg-accent-data/10 text-accent-data border-accent-data/20"
                      variant="outline"
                    >
                      Protective
                    </Badge>
                  )}
                </td>
                <td className="py-2 pl-3 text-right tabular-nums font-mono text-[10px]">
                  <span className={item.direction === 'risk' ? 'text-accent' : 'text-accent-data'}>
                    {item.coefficient >= 0 ? '+' : ''}{item.coefficient.toFixed(3)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Distribution Drift Monitor Section (v5.2 live data)
// ============================================================================

function DriftMonitorSection() {
  const [open, setOpen] = useState(true)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['drift-report'],
    queryFn: () => analysisApi.getDrift(),
    staleTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error) => {
      // Do not retry on 404 — no report has been computed yet
      const axiosError = error as { response?: { status: number } }
      if (axiosError?.response?.status === 404) return false
      return failureCount < 2
    },
  })

  const is404 = isError && (() => {
    // narrow: axios errors carry response.status
    const err = data as unknown
    void err
    return true // isError covers 404; we show a gentle message for all errors
  })()

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center justify-between w-full text-left gap-2"
          aria-expanded={open}
          aria-controls="drift-monitor-body"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
            <CardTitle className="text-sm">Data Drift Monitor</CardTitle>
            {data && (
              <Badge
                className={cn(
                  'text-[10px] px-1.5 py-0 ml-1',
                  data.dataset_drift
                    ? 'bg-risk-high/10 text-risk-high border-risk-high/20'
                    : 'bg-risk-low/10 text-risk-low border-risk-low/20'
                )}
                variant="outline"
              >
                {data.dataset_drift ? 'Drift Detected' : 'Stable'}
              </Badge>
            )}
          </div>
          <span className="text-text-muted text-xs" aria-hidden="true">{open ? '▲' : '▼'}</span>
        </button>
        <CardDescription className="text-xs">
          Kolmogorov-Smirnov test comparing training baseline vs current data
        </CardDescription>
      </CardHeader>

      {open && (
        <CardContent id="drift-monitor-body">
          {isLoading && <Skeleton className="h-32" />}

          {(isError || is404) && !isLoading && (
            <p className="text-sm text-text-muted">
              No drift report computed yet. Run compute_vendor_drift.py first.
            </p>
          )}

          {data && !isError && (
            <div className="space-y-4">
              {/* Overall status banner */}
              <div
                className={cn(
                  'rounded-lg px-4 py-3 border',
                  data.dataset_drift
                    ? 'bg-risk-high/10 border-risk-high/30'
                    : 'bg-risk-low/10 border-risk-low/30'
                )}
              >
                <div className="flex items-center gap-2">
                  {data.dataset_drift ? (
                    <AlertTriangle className="h-4 w-4 text-risk-high" aria-hidden="true" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-risk-low" aria-hidden="true" />
                  )}
                  <p className={cn(
                    'text-sm font-semibold',
                    data.dataset_drift ? 'text-risk-high' : 'text-risk-low'
                  )}>
                    {data.dataset_drift ? 'Significant Drift Detected' : 'No Significant Drift'}
                  </p>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  <span className="tabular-nums font-medium text-text-secondary">{data.n_drifted}</span>
                  {' '}of{' '}
                  <span className="tabular-nums font-medium text-text-secondary">{data.n_features}</span>
                  {' '}features drifted between{' '}
                  <span className="font-medium text-text-secondary">{data.reference_year_range}</span>
                  {' '}(train) and{' '}
                  <span className="font-medium text-text-secondary">{data.current_year}</span>
                  {' '}(current).{' '}
                  {data.dataset_drift
                    ? 'Consider retraining the model.'
                    : 'Model is stable for current data.'}
                </p>
              </div>

              {/* Drifted features table */}
              {data.drifted_features.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">
                    Drifted Features ({data.drifted_features.length})
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" role="table" aria-label="Drifted features">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2 pr-4 text-text-muted font-medium">Feature</th>
                          <th className="text-right py-2 px-3 text-text-muted font-medium">KS Stat</th>
                          <th className="text-right py-2 px-3 text-text-muted font-medium">p-value</th>
                          <th className="text-right py-2 pl-3 text-text-muted font-medium">Mean Shift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.drifted_features.map((f) => {
                          const driftSeverity = f.ks_stat >= 0.2 ? 'text-risk-critical' : f.ks_stat >= 0.1 ? 'text-risk-high' : 'text-risk-medium'
                          return (
                          <tr key={f.feature} className="border-b border-border/10 hover:bg-background-elevated/30 transition-colors">
                            <td className="py-2 pr-4 text-text-secondary capitalize flex items-center gap-2">
                              <span className={cn('h-1.5 w-1.5 rounded-full', f.ks_stat >= 0.2 ? 'bg-risk-critical' : f.ks_stat >= 0.1 ? 'bg-risk-high' : 'bg-risk-medium')} />
                              {f.feature.replace(/^z_/, '').replace(/_/g, ' ')}
                            </td>
                            <td className={cn('py-2 px-3 text-right tabular-nums font-mono', driftSeverity)}>
                              {f.ks_stat.toFixed(3)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums font-mono text-text-muted">
                              {f.p_value < 0.001 ? '<0.001' : f.p_value.toFixed(3)}
                            </td>
                            <td className="py-2 pl-3 text-right tabular-nums font-mono">
                              <span className={f.mean_shift > 0 ? 'text-accent' : 'text-accent-data'}>
                                {f.mean_shift > 0 ? '+' : ''}{f.mean_shift.toFixed(3)}
                              </span>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stable features summary */}
              {data.stable_features.length > 0 && (
                <p className="text-xs text-text-muted">
                  <CheckCircle className="inline h-3 w-3 text-risk-low mr-1" aria-hidden="true" />
                  {data.stable_features.length} feature{data.stable_features.length !== 1 ? 's' : ''} stable:{' '}
                  {data.stable_features.slice(0, 5).map((f) =>
                    f.feature.replace(/^z_/, '').replace(/_/g, ' ')
                  ).join(', ')}
                  {data.stable_features.length > 5 && ` + ${data.stable_features.length - 5} more`}
                </p>
              )}

              <p className="text-[10px] text-text-muted">
                Report generated: {new Date(data.created_at).toLocaleDateString()} ·
                Reference: {data.reference_year_range} ·
                Current: {data.current_year}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function ModelTransparency() {
  const { t } = useTranslation('methodology')
  const [selectedSector, setSelectedSector] = useState(0)
  const [coeffSectorId, setCoeffSectorId] = useState<number | undefined>(undefined)

  // refs for chart download
  const coeffChartRef = useRef<HTMLDivElement>(null)
  const comparisonChartRef = useRef<HTMLDivElement>(null)

  // ------------------------------------------------------------------
  // Model metadata from API (freshness badge)
  // ------------------------------------------------------------------
  const { data: modelMeta } = useQuery({
    queryKey: ['model', 'metadata'],
    queryFn: () => analysisApi.getModelMetadata(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  // ------------------------------------------------------------------
  // Live feature importance from API (per-sector or global)
  // ------------------------------------------------------------------
  const { data: featureImportance } = useQuery({
    queryKey: ['feature-importance', coeffSectorId],
    queryFn: () => analysisApi.getFeatureImportance(coeffSectorId),
    staleTime: 60 * 60 * 1000,
  })

  // ------------------------------------------------------------------
  // Live model comparison from API
  // ------------------------------------------------------------------
  const { data: modelComparison } = useQuery({
    queryKey: ['model-comparison'],
    queryFn: () => analysisApi.getModelComparison(),
    staleTime: 60 * 60 * 1000,
  })

  // ------------------------------------------------------------------
  // Procedure Risk Paradox
  // ------------------------------------------------------------------
  const SECTOR_OPTIONS = [
    { id: undefined, label: 'All Sectors' },
    { id: 1, label: 'Salud' },
    { id: 2, label: 'Educacion' },
    { id: 3, label: 'Infraestructura' },
    { id: 4, label: 'Energia' },
    { id: 5, label: 'Defensa' },
    { id: 6, label: 'Tecnologia' },
    { id: 7, label: 'Hacienda' },
    { id: 8, label: 'Gobernacion' },
    { id: 9, label: 'Agricultura' },
    { id: 10, label: 'Ambiente' },
    { id: 11, label: 'Trabajo' },
    { id: 12, label: 'Otros' },
  ] as const

  const [procedureSectorId, setProcedureSectorId] = useState<number | undefined>(5) // default: Defensa
  const procedureChartRef = useRef<HTMLDivElement>(null)

  const { data: procedureRiskData, isLoading: procedureLoading, isError: procedureError } = useQuery({
    queryKey: ['analysis', 'procedure-risk-comparison', procedureSectorId],
    queryFn: () => analysisApi.getProcedureRiskComparison({ sector_id: procedureSectorId }),
    staleTime: 30 * 60 * 1000,
  })

  // ------------------------------------------------------------------
  // L2: Prepare coefficient chart data (sorted by beta descending)
  // Prefer live API data; fallback to hardcoded
  // ------------------------------------------------------------------
  const coefficientData = useMemo(() => {
    if (featureImportance && featureImportance.length > 0) {
      return featureImportance
        .map((f) => {
          const direction = f.importance > 0.01 ? 'positive' : f.importance < -0.01 ? 'negative' : 'neutral'
          return {
            factor: f.feature,
            beta: f.importance,
            raw_beta: f.importance,
            ci_lower: f.importance,
            ci_upper: f.importance,
            direction,
            label: FACTOR_LABELS[f.feature] ?? f.feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            displayBeta: f.importance,
            errorLower: 0,
            errorUpper: 0,
            fill: DIRECTION_COLORS[direction],
            note: f.description_en || undefined,
          }
        })
        .sort((a, b) => b.beta - a.beta)
    }
    return MODEL_COEFFICIENTS
      .map((c) => ({
        ...c,
        label: FACTOR_LABELS[c.factor] ?? c.factor,
        displayBeta: c.beta,
        errorLower: c.beta - c.ci_lower,
        errorUpper: c.ci_upper - c.beta,
        fill: DIRECTION_COLORS[c.direction],
      }))
      .sort((a, b) => b.beta - a.beta)
  }, [featureImportance])

  // ------------------------------------------------------------------
  // L3: Prepare comparison chart data
  // Prefer live API data; fallback to hardcoded
  // ------------------------------------------------------------------
  const comparisonData = useMemo(() => {
    if (modelComparison && modelComparison.length >= 2) {
      const v33 = modelComparison.find((m) => m.model === 'v3.3')
      const v50 = modelComparison.find((m) => m.model === 'v6.0') ?? modelComparison.find((m) => m.model === 'v5.1') ?? modelComparison.find((m) => m.model === 'v5.0')
      if (v33 && v50) {
        return [
          { metric: 'AUC-ROC', v33: v33.auc, v50: v50.auc },
          { metric: 'High+ Rate', v33: v33.high_rate * 100, v50: v50.high_rate * 100 },
          { metric: '1 - Brier', v33: 1 - v33.brier, v50: 1 - v50.brier },
        ]
      }
    }
    return [
      { metric: 'AUC-ROC', v33: MODEL_COMPARISON.v33.auc, v50: MODEL_COMPARISON.v60.auc },
      { metric: 'Detection %', v33: MODEL_COMPARISON.v33.detection, v50: MODEL_COMPARISON.v60.detection },
      { metric: 'High+ %', v33: MODEL_COMPARISON.v33.high_plus, v50: MODEL_COMPARISON.v60.high_plus },
      { metric: 'Lift', v33: MODEL_COMPARISON.v33.lift, v50: MODEL_COMPARISON.v60.lift },
      { metric: '1 - Brier', v33: 1 - MODEL_COMPARISON.v33.brier, v50: 1 - MODEL_COMPARISON.v60.brier },
    ]
  }, [modelComparison])

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* L0: Page Header                                                  */}
      {/* ================================================================ */}
      <div className="editorial-rule mb-3">
        <span className="editorial-label">TRANSPARENCIA DEL MODELO ML</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-text-primary">{t('modelTransparency.pageTitle')}</h1>
            <Badge variant="outline" className="text-xs tabular-nums gap-1 border-risk-low/30">
              <Brain className="h-3 w-3 text-risk-low" aria-hidden="true" />
              {modelMeta
                ? t('modelTransparency.badgeLiveApi', {
                    version: modelMeta.version,
                    date: modelMeta.trained_at,
                    contracts: formatNumber(modelMeta.n_contracts ?? 0),
                    auc: modelMeta.auc_test.toFixed(3),
                  })
                : t('modelTransparency.badgeStatic', {
                    version: CURRENT_MODEL_VERSION,
                    auc: VALIDATION_METRICS.auc_roc.toFixed(3),
                  })
              }
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {t('modelTransparency.subtitleLive', { version: modelMeta?.version ?? CURRENT_MODEL_VERSION })}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/[0.04] px-3 py-2 text-xs text-text-muted">
        <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          {featureImportance
            ? <Trans i18nKey="modelTransparency.bannerLive" ns="methodology" components={{ strong: <strong className="text-text-primary" /> }} />
            : <Trans i18nKey="modelTransparency.bannerFallback" ns="methodology" components={{ strong: <strong className="text-text-primary" /> }} />
          }
        </span>
      </div>

      {/* ================================================================ */}
      {/* L1: Key Metrics (4 gauge-style cards)                            */}
      {/* ================================================================ */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
      >
        <motion.div variants={staggerItem}>
          <MetricGauge
            label={t('modelTransparency.metrics.testAuc')}
            value={VALIDATION_METRICS.auc_roc.toFixed(4)}
            subtitle={t('modelTransparency.metrics.trainAucDetail', { value: VALIDATION_METRICS.auc_train.toFixed(4) })}
            icon={Target}
            color="#58a6ff"
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <MetricGauge
            label={t('modelTransparency.metrics.detectionRate')}
            value={`${(VALIDATION_METRICS.detection_rate_medium_plus * 100).toFixed(1)}%`}
            subtitle={t('modelTransparency.metrics.detectionDetail')}
            icon={Eye}
            color="#4ade80"
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <MetricGauge
            label={t('modelTransparency.metrics.highRiskRate')}
            value={`${(VALIDATION_METRICS.high_risk_rate * 100).toFixed(1)}%`}
            subtitle={t('modelTransparency.metrics.highRiskDetail')}
            icon={Activity}
            color="#fbbf24"
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <MetricGauge
            label={t('modelTransparency.metrics.groundTruth')}
            value={`${VALIDATION_METRICS.ground_truth_cases}`}
            format={t('modelTransparency.metrics.groundTruthFormat', { vendors: VALIDATION_METRICS.ground_truth_vendors })}
            subtitle={t('modelTransparency.metrics.groundTruthDetail', { contracts: formatNumber(VALIDATION_METRICS.ground_truth_contracts) })}
            icon={Users}
            color="#f87171"
          />
        </motion.div>
      </motion.div>

      {/* ================================================================ */}
      {/* L2: Coefficient Chart                                            */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <div>
                <CardTitle>{t('modelTransparency.coeffChart.title')}</CardTitle>
                <CardDescription>
                  {t('modelTransparency.coeffChart.description')}
                </CardDescription>
              </div>
            </div>
            <ChartDownloadButton targetRef={coeffChartRef} filename="rubli-model-coefficients" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <SectionDescription variant="callout" className="flex-1">
              {t('modelTransparency.coeffChart.callout')}
              {!featureImportance && t('modelTransparency.coeffChart.calloutCI')}
            </SectionDescription>
            <select
              value={coeffSectorId ?? ''}
              onChange={(e) => setCoeffSectorId(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded border border-border bg-background-elevated px-2 py-1 text-xs text-text-primary shrink-0"
              aria-label={t('modelTransparency.coeffChart.sectorLabel')}
            >
              <option value="">{t('modelTransparency.coeffChart.sectorGlobal')}</option>
              <option value="1">Salud</option>
              <option value="2">Educacion</option>
              <option value="3">Infraestructura</option>
              <option value="4">Energia</option>
              <option value="5">Defensa</option>
              <option value="6">Tecnologia</option>
              <option value="7">Hacienda</option>
              <option value="8">Gobernacion</option>
              <option value="9">Agricultura</option>
              <option value="10">Ambiente</option>
              <option value="11">Trabajo</option>
              <option value="12">Otros</option>
            </select>
          </div>

          <div ref={coeffChartRef} className="h-[560px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={coefficientData}
                layout="vertical"
                margin={{ top: 5, right: 40, bottom: 5, left: 140 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-1.0, 1.4]}
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  axisLine={{ stroke: '#30363d' }}
                  tickLine={{ stroke: '#30363d' }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-text-primary)' }}
                  width={135}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  content={<CoefficientTooltip />}
                  cursor={{ fill: '#ffffff08' }}
                />
                <ReferenceLine x={0} stroke="#58a6ff" strokeDasharray="3 3" strokeWidth={1} />
                <Bar dataKey="displayBeta" radius={[0, 4, 4, 0]} barSize={16}>
                  {coefficientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                  <ErrorBar
                    dataKey="errorUpper"
                    width={4}
                    strokeWidth={1.5}
                    stroke="#8b949e"
                    direction="x"
                  />
                  <ErrorBar
                    dataKey="errorLower"
                    width={4}
                    strokeWidth={1.5}
                    stroke="#8b949e"
                    direction="x"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Coefficient legend + annotation */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIRECTION_COLORS.positive }} />
              {t('modelTransparency.coeffChart.legendIncrease')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIRECTION_COLORS.negative }} />
              {t('modelTransparency.coeffChart.legendDecrease')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIRECTION_COLORS.neutral }} />
              {t('modelTransparency.coeffChart.legendNeutral')}
            </span>
          </div>

          {/* Coefficient annotations */}
          <div className="mt-4 space-y-2">
            {MODEL_COEFFICIENTS.filter((c) => c.note).map((c) => (
              <div key={c.factor} className="flex items-start gap-2 text-xs text-text-muted">
                <Info className="h-3 w-3 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <span className="font-medium text-text-secondary">{FACTOR_LABELS[c.factor]}:</span>{' '}
                  {c.note}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Per-Sector Models                                                */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <div>
              <CardTitle>{t('modelTransparency.perSector.title')}</CardTitle>
              <CardDescription>
                {t('modelTransparency.perSector.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {SECTOR_MODELS.map((sm, i) => (
              <button
                key={i}
                onClick={() => setSelectedSector(i)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-mono transition-colors',
                  selectedSector === i
                    ? 'bg-[#58a6ff]/15 text-[#58a6ff] font-medium'
                    : 'bg-background-elevated/30 text-text-muted hover:text-text-secondary'
                )}
              >
                {sm.sector}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Per-sector model factors">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">{t('modelTransparency.perSector.tableRank')}</th>
                  <th className="text-left py-2 px-3 text-text-muted font-medium">{t('modelTransparency.perSector.tableFactor')}</th>
                  <th className="text-right py-2 pl-3 text-text-muted font-medium">{t('modelTransparency.perSector.tableCoefficient')}</th>
                </tr>
              </thead>
              <tbody>
                {SECTOR_MODELS[selectedSector].factors.map(([factor, coeff], i) => (
                  <tr key={factor} className="border-b border-border/10">
                    <td className="py-2 pr-4 text-text-muted tabular-nums">#{i + 1}</td>
                    <td className="py-2 px-3 text-text-primary font-medium">{FACTOR_LABELS[factor] ?? factor}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-risk-low font-medium">{coeff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-muted mt-3">
            {t('modelTransparency.perSector.fallbackNote')}
          </p>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* L3: Model Comparison — v3.3 vs v6.0                              */}
      {/* ================================================================ */}
      <motion.div
        variants={slideUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
      >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <div>
                <CardTitle>{t('modelTransparency.comparison.title')}</CardTitle>
                <CardDescription>
                  {t('modelTransparency.comparison.description')}
                </CardDescription>
              </div>
            </div>
            <ChartDownloadButton targetRef={comparisonChartRef} filename="rubli-model-comparison" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Side-by-side comparison chart */}
          <div ref={comparisonChartRef} className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 10, right: 30, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: 'var(--color-text-primary)' }}
                  axisLine={{ stroke: '#30363d' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'auto']}
                />
                <RechartsTooltip content={<ComparisonTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="v33" name="v3.3 (Checklist)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="v50" name="v6.0 (Per-Sector)" fill="#58a6ff" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#64748b]" />
              {t('modelTransparency.comparison.legendChecklist')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#58a6ff]" />
              {t('modelTransparency.comparison.legendPerSector')}
            </span>
          </div>

          {/* Detailed comparison table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Model comparison metrics">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">{t('modelTransparency.comparison.tableMetric')}</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">{t('modelTransparency.comparison.tableV33')}</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">{t('modelTransparency.comparison.tableV51')}</th>
                  <th className="text-right py-2 pl-3 text-text-muted font-medium">{t('modelTransparency.comparison.tableDelta')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">{t('modelTransparency.comparison.rowAuc')}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.auc.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v60.auc.toFixed(3)}</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.auc} v50={MODEL_COMPARISON.v60.auc} /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">{t('modelTransparency.comparison.rowDetection')}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.detection}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v60.detection}%</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.detection} v50={MODEL_COMPARISON.v60.detection} suffix="pp" /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">{t('modelTransparency.comparison.rowHighPlus')}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.high_plus}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v60.high_plus}%</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.high_plus} v50={MODEL_COMPARISON.v60.high_plus} suffix="pp" /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">{t('modelTransparency.comparison.rowBrier')}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.brier.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v60.brier.toFixed(3)}</td>
                  <td className="py-2 pl-3 text-right">
                    <span className="text-xs font-medium text-risk-low">
                      -{(MODEL_COMPARISON.v33.brier - MODEL_COMPARISON.v60.brier).toFixed(2)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-text-secondary">{t('modelTransparency.comparison.rowLift')}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.lift}x</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v60.lift}x</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.lift} v50={MODEL_COMPARISON.v60.lift} suffix="x" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* ================================================================ */}
      {/* L4: Per-Case Detection Table                                     */}
      {/* ================================================================ */}
      <motion.div
        variants={fadeIn}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
      >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <div>
                <CardTitle>{t('modelTransparency.perCase.title')}</CardTitle>
                <CardDescription>
                  {t('modelTransparency.perCase.description')}
                </CardDescription>
              </div>
            </div>
            <TableExportButton
              data={CASE_DETECTION.map((row) => ({
                case_name: row.case_name,
                contracts: row.contracts,
                detection_pct: row.detection_pct,
                high_plus_pct: row.high_plus_pct,
                avg_score: row.avg_score,
              }))}
              filename="rubli-per-case-detection"
            />
          </div>
        </CardHeader>
        <CardContent>
          <SectionDescription className="mb-4">
            {t('modelTransparency.perCase.callout', {
              medium: RISK_THRESHOLDS.medium,
              high: RISK_THRESHOLDS.high,
            })}
          </SectionDescription>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Per-case detection performance">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2.5 pr-4 text-text-muted font-medium">{t('modelTransparency.perCase.colCase')}</th>
                  <th className="text-right py-2.5 px-3 text-text-muted font-medium">{t('modelTransparency.perCase.colContracts')}</th>
                  <th className="text-left py-2.5 px-3 text-text-muted font-medium min-w-[160px]">{t('modelTransparency.perCase.colDetection')}</th>
                  <th className="text-left py-2.5 px-3 text-text-muted font-medium min-w-[160px]">{t('modelTransparency.perCase.colHighPlus')}</th>
                  <th className="text-right py-2.5 pl-3 text-text-muted font-medium">{t('modelTransparency.perCase.colAvgScore')}</th>
                </tr>
              </thead>
              <tbody>
                {CASE_DETECTION.map((row) => {
                  const detectionColor = row.detection_pct >= 95 ? '#4ade80'
                    : row.detection_pct >= 80 ? '#fbbf24'
                    : '#f87171'
                  const highColor = row.high_plus_pct >= 90 ? '#4ade80'
                    : row.high_plus_pct >= 60 ? '#fbbf24'
                    : '#fb923c'
                  return (
                    <tr key={row.case_name} className="border-b border-border/10 hover:bg-background-elevated/30 transition-colors">
                      <td className="py-2.5 pr-4 text-text-primary font-medium">{row.case_name}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">
                        {formatNumber(row.contracts)}
                      </td>
                      <td className="py-2.5 px-3">
                        <DetectionBar pct={row.detection_pct} color={detectionColor} />
                      </td>
                      <td className="py-2.5 px-3">
                        <DetectionBar pct={row.high_plus_pct} color={highColor} />
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <ScoreBadge score={row.avg_score} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border/20 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-risk-low" aria-hidden="true" />
              {t('modelTransparency.perCase.footerHigh')}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-400" aria-hidden="true" />
              {t('modelTransparency.perCase.footerLarge')}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-risk-medium" aria-hidden="true" />
              {t('modelTransparency.perCase.footerWeak')}
            </span>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* ================================================================ */}
      {/* PROCEDURE RISK PARADOX                                           */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <div>
                <CardTitle>The Procedure Risk Paradox</CardTitle>
                <CardDescription>
                  Direct award vs. competitive procedure risk scores over time
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={procedureSectorId ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setProcedureSectorId(val === '' ? undefined : Number(val))
                }}
                className="text-xs rounded border border-border bg-background-elevated text-text-primary px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label="Select sector for procedure risk comparison"
              >
                {SECTOR_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.id ?? ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChartDownloadButton targetRef={procedureChartRef} filename="rubli-procedure-risk-paradox" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {procedureLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-[260px] w-full" />
            </div>
          ) : procedureError || !procedureRiskData ? (
            <div className="flex items-center gap-2 py-6 text-xs text-text-muted justify-center">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>Failed to load procedure risk comparison data</span>
            </div>
          ) : (
            <>
              <div ref={procedureChartRef} className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={procedureRiskData.data}
                    margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                      axisLine={{ stroke: '#30363d' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                      domain={[0, 'auto']}
                    />
                    <RechartsTooltip
                      cursor={{ stroke: '#ffffff10' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const competitive = payload.find((p) => p.dataKey === 'competitive_risk')
                        const directAward = payload.find((p) => p.dataKey === 'direct_award_risk')
                        const ratio = payload[0]?.payload?.ratio as number | undefined
                        return (
                          <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg text-xs space-y-1.5">
                            <p className="font-semibold text-text-primary">{label}</p>
                            {competitive && (
                              <div className="flex items-center gap-2">
                                <span className="w-3 inline-block rounded" style={{ height: 2, backgroundColor: '#58a6ff' }} />
                                <span className="text-text-muted">Competitive:</span>
                                <span className="text-text-primary tabular-nums font-medium">
                                  {((competitive.value as number) * 100).toFixed(1)}%
                                </span>
                              </div>
                            )}
                            {directAward && (
                              <div className="flex items-center gap-2">
                                <span className="w-3 inline-block rounded" style={{ height: 2, borderTop: '2px dashed #fb923c' }} />
                                <span className="text-text-muted">Direct award:</span>
                                <span className="text-text-primary tabular-nums font-medium">
                                  {((directAward.value as number) * 100).toFixed(1)}%
                                </span>
                              </div>
                            )}
                            {ratio != null && (
                              <p className="text-text-muted pt-1 border-t border-border/30">
                                Ratio: <span className="text-text-primary font-medium">{ratio.toFixed(2)}×</span>
                              </p>
                            )}
                          </div>
                        )
                      }}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === 'competitive_risk' ? 'Competitive (solid)' : 'Direct Award (dashed)'
                      }
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="competitive_risk"
                      stroke="#58a6ff"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: '#58a6ff', strokeWidth: 2, fill: 'var(--color-background-base)' }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="direct_award_risk"
                      stroke="#fb923c"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 4, stroke: '#fb923c', strokeWidth: 2, fill: 'var(--color-background-base)' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Callout box */}
              <div
                className="mt-4 rounded-lg border p-4 text-xs text-text-secondary leading-relaxed"
                style={{ borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.06)' }}
                role="note"
                aria-label="Procedure risk paradox finding"
              >
                <p className="font-semibold text-[#fbbf24] mb-1">Counterintuitive Finding</p>
                In Defensa and Salud, competitive procedures score{' '}
                <span className="font-semibold text-text-primary">1.7–2.3× higher risk</span> than
                direct awards — challenging OECD assumptions that direct awards are inherently riskier.
                Large, concentrated vendors win competitive procedures at above-baseline rates,
                driving elevated scores on vendor_concentration and win_rate.
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* SHAP Feature Importance (v5.2 live)                             */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" aria-hidden="true" />
            v5.2 SHAP Feature Importance
            <span className="text-[10px] font-normal bg-accent/10 text-accent px-1.5 py-0.5 rounded ml-auto">
              Live Data
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Exact Shapley values from 456K vendors — replaces coefficient-based approximation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SHAPImportanceSection />
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Model Version Timeline                                          */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
            <div>
              <CardTitle className="text-sm">Model Evolution Timeline</CardTitle>
              <CardDescription className="text-xs">
                Four generations of risk scoring, from expert checklists to vendor-stratified ML
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border/40" />

            {[
              { version: 'v3.3', date: 'Feb 2026', auc: '0.584', label: 'Weighted Checklist', desc: '8 base factors, IMF-aligned weights, interaction effects. AUC barely above random.', color: '#64748b' },
              { version: 'v4.0', date: 'Feb 2026', auc: '0.942', label: 'Statistical Framework', desc: 'Z-scores, Mahalanobis distance, Bayesian logistic regression. 12 features, PU-learning correction.', color: '#fb923c' },
              { version: 'v5.1', date: 'Feb 2026', auc: '0.957', label: 'Per-Sector Sub-Models', desc: '16 z-score features, 13 models (1 global + 12 sector). Temporal split inflated AUC due to vendor leakage.', color: '#3b82f6' },
              { version: 'v6.1', date: 'Mar 2026', auc: '0.849', label: 'Vendor-Stratified (Active)', desc: '~390 cases, ~725 vendors. Vendor-stratified 70/30 split. OECD-calibrated intercept. Honest AUC.', color: 'var(--color-accent)', active: true },
            ].map((item) => (
              <div key={item.version} className="relative flex items-start gap-4 pb-5 last:pb-0">
                <div
                  className={cn(
                    'relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 shrink-0 text-xs font-bold tabular-nums',
                    'active' in item && item.active
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-background-card border-border text-text-muted'
                  )}
                >
                  {item.version}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary">{item.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background-elevated border border-border/50 text-text-muted">{item.date}</span>
                    <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded" style={{ backgroundColor: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30` }}>
                      AUC {item.auc}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Intercept Explanation Card                                       */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-accent" aria-hidden="true" />
            <div>
              <CardTitle className="text-sm">Model Intercept & Baseline Risk</CardTitle>
              <CardDescription className="text-xs">
                What the intercept means for score interpretation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-4 space-y-2">
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Global Intercept</p>
              <p className="text-3xl font-bold tabular-nums text-accent">-2.856</p>
              <p className="text-xs text-text-muted leading-relaxed">
                This means a contract with all z-scores at zero (perfectly average for its sector and year) has a baseline logit of -2.856, corresponding to a raw probability of ~5.4% before PU correction.
              </p>
            </div>
            <div className="card p-4 space-y-2">
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Baseline Risk After PU</p>
              <p className="text-3xl font-bold tabular-nums text-accent-data">~12.5%</p>
              <p className="text-xs text-text-muted leading-relaxed">
                After dividing by the PU correction factor (c=0.448), an average contract scores ~12.5%. This is why the medium threshold is set at 15% -- most contracts score below it. The OECD intercept calibration (delta=-1.16) was applied post-hoc to bring the high-risk rate from 23.6% to 9.9%.
              </p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-md bg-accent/5 border border-accent/15 text-xs text-text-muted leading-relaxed">
            <span className="font-medium text-accent">Why this matters: </span>
            The intercept sets the "center of gravity" for the entire score distribution. When v6.1 used a less-regularized model (C=1.0 vs v6.0's C=0.35), the intercept shifted from -2.82 to -1.69, causing the high-risk rate to balloon to 23.6%. The post-hoc calibration restored OECD compliance by shifting it back to -2.856.
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Distribution Drift Monitor (v5.2 live)                          */}
      {/* ================================================================ */}
      <DriftMonitorSection />

      {/* ================================================================ */}
      {/* L5: Known Limitations                                            */}
      {/* ================================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text-primary">{t('modelTransparency.limitations.sectionTitle')}</h2>
        </div>
        <SectionDescription variant="warning" className="mb-4">
          {t('modelTransparency.limitations.warning')}
        </SectionDescription>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LimitationCard
            icon={Users}
            title={t('modelTransparency.limitations.groundTruthConc')}
            color="#f87171"
            description={t('modelTransparency.limitations.groundTruthConcDesc')}
          />
          <LimitationCard
            icon={TrendingDown}
            title={t('modelTransparency.limitations.smallCase')}
            color="#fb923c"
            description={t('modelTransparency.limitations.smallCaseDesc')}
          />
          <LimitationCard
            icon={Lock}
            title={t('modelTransparency.limitations.noCausal')}
            color="#58a6ff"
            description={t('modelTransparency.limitations.noCausalDesc')}
          />
          <LimitationCard
            icon={Database}
            title={t('modelTransparency.limitations.dataQuality')}
            color="#64748b"
            description={t('modelTransparency.limitations.dataQualityDesc')}
          />
        </div>
      </div>

      {/* ================================================================ */}
      {/* Pipeline & Technical Details                                     */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <div>
              <CardTitle>{t('modelTransparency.pipeline.title')}</CardTitle>
              <CardDescription>
                {t('modelTransparency.pipeline.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: 1,
                title: t('modelTransparency.pipeline.step1Title'),
                description: t('modelTransparency.pipeline.step1Desc'),
                icon: Activity,
              },
              {
                step: 2,
                title: t('modelTransparency.pipeline.step2Title'),
                description: t('modelTransparency.pipeline.step2Desc'),
                icon: Target,
              },
              {
                step: 3,
                title: t('modelTransparency.pipeline.step3Title'),
                description: t('modelTransparency.pipeline.step3Desc'),
                icon: TrendingUp,
              },
              {
                step: 4,
                title: t('modelTransparency.pipeline.step4Title'),
                description: t('modelTransparency.pipeline.step4Desc'),
                icon: Shield,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-lg border border-border/30 bg-background-elevated/20 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#58a6ff]/15 text-xs font-bold text-[#58a6ff] tabular-nums">
                    {item.step}
                  </span>
                  <item.icon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  <span className="text-xs font-medium text-text-primary">{item.title}</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
                {item.step < 4 && (
                  <div className="flex justify-end">
                    <ArrowRight className="h-3 w-3 text-text-muted hidden lg:block" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Risk thresholds reference */}
          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-xs text-text-muted mb-2 font-medium">{t('modelTransparency.pipeline.thresholds')}</p>
            <div className="flex flex-wrap gap-4">
              {(Object.entries(RISK_THRESHOLDS) as Array<[keyof typeof RISK_THRESHOLDS, number]>)
                .filter(([level]) => level !== 'low')
                .map(([level, threshold]) => (
                  <div key={level} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: RISK_COLORS[level] }}
                    />
                    <span className="text-text-secondary capitalize">{level}:</span>
                    <span className="text-text-primary tabular-nums font-medium">
                      {'>'}= {(threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RISK_COLORS.low }}
                />
                <span className="text-text-secondary">Low:</span>
                <span className="text-text-primary tabular-nums font-medium">
                  {'<'} {(RISK_THRESHOLDS.medium * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
