/**
 * Model Transparency Page
 *
 * Explains the v4.0 risk scoring model: coefficients, validation metrics,
 * per-case detection performance, model comparison (v3.3 vs v4.0), and
 * known limitations. All data is hardcoded from methodology documentation.
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionDescription } from '@/components/SectionDescription'
import { cn, formatNumber } from '@/lib/utils'
import { RISK_COLORS, RISK_THRESHOLDS, CURRENT_MODEL_VERSION } from '@/lib/constants'
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
} from 'recharts'

// ============================================================================
// Hardcoded Model Data (from v4.0 methodology documentation)
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
  { factor: 'vendor_concentration', beta: 1.0000, raw_beta: 1.8497, ci_lower: 1.766, ci_upper: 1.949, direction: 'positive', note: 'Capped from +1.85 to reduce overfit' },
  { factor: 'industry_mismatch', beta: 0.2141, raw_beta: 0.2141, ci_lower: 0.169, ci_upper: 0.258, direction: 'positive' },
  { factor: 'same_day_count', beta: 0.1424, raw_beta: 0.1424, ci_lower: 0.077, ci_upper: 0.215, direction: 'positive' },
  { factor: 'institution_risk', beta: 0.1189, raw_beta: 0.1189, ci_lower: 0.074, ci_upper: 0.167, direction: 'positive' },
  { factor: 'single_bid', beta: 0.0997, raw_beta: 0.0997, ci_lower: 0.056, ci_upper: 0.143, direction: 'positive' },
  { factor: 'price_ratio', beta: 0.0984, raw_beta: 0.0984, ci_lower: -0.091, ci_upper: 0.303, direction: 'positive', note: 'Wide CI - uncertain' },
  { factor: 'year_end', beta: 0.0231, raw_beta: 0.0231, ci_lower: -0.021, ci_upper: 0.063, direction: 'neutral' },
  { factor: 'price_hyp_confidence', beta: 0.0212, raw_beta: 0.0212, ci_lower: -0.017, ci_upper: 0.058, direction: 'neutral' },
  { factor: 'co_bid_rate', beta: 0.0000, raw_beta: 0.0000, ci_lower: 0.000, ci_upper: 0.000, direction: 'neutral', note: 'Regularized to zero' },
  { factor: 'direct_award', beta: -0.1968, raw_beta: -0.1968, ci_lower: -0.250, ci_upper: -0.150, direction: 'negative' },
  { factor: 'ad_period_days', beta: -0.2216, raw_beta: -0.2216, ci_lower: -0.284, ci_upper: -0.170, direction: 'negative' },
  { factor: 'network_member_count', beta: 0.0000, raw_beta: -4.1142, ci_lower: -4.477, ci_upper: -3.781, direction: 'zeroed', note: 'Zeroed - training artifact' },
]

const VALIDATION_METRICS = {
  auc_roc: 0.9416,
  brier_score: 0.065,
  detection_rate_medium_plus: 0.906,
  detection_rate_high_plus: 0.457,
  high_risk_rate: 0.110,
  pu_correction: 0.890,
  ground_truth_cases: 9,
  ground_truth_vendors: 17,
  ground_truth_contracts: 21252,
} as const

interface CaseDetection {
  case_name: string
  contracts: number
  detection_pct: number
  high_plus_pct: number
  avg_score: number
}

const CASE_DETECTION: CaseDetection[] = [
  { case_name: 'IMSS Ghost Companies', contracts: 9366, detection_pct: 100.0, high_plus_pct: 99.0, avg_score: 0.962 },
  { case_name: 'Segalmex Food Distribution', contracts: 6326, detection_pct: 100.0, high_plus_pct: 94.3, avg_score: 0.828 },
  { case_name: 'COVID-19 Emergency', contracts: 5371, detection_pct: 100.0, high_plus_pct: 91.8, avg_score: 0.863 },
  { case_name: 'Cyber Robotic IT', contracts: 139, detection_pct: 100.0, high_plus_pct: 43.2, avg_score: 0.261 },
  { case_name: 'Odebrecht-PEMEX', contracts: 35, detection_pct: 82.9, high_plus_pct: 68.6, avg_score: 0.314 },
  { case_name: 'La Estafa Maestra', contracts: 10, detection_pct: 100.0, high_plus_pct: 70.0, avg_score: 0.205 },
  { case_name: 'Grupo Higa', contracts: 3, detection_pct: 100.0, high_plus_pct: 33.3, avg_score: 0.268 },
  { case_name: 'Oceanografia PEMEX', contracts: 2, detection_pct: 100.0, high_plus_pct: 100.0, avg_score: 0.354 },
]

const MODEL_COMPARISON = {
  v33: { auc: 0.584, detection: 67.1, high_plus: 18.3, brier: 0.411, lift: 1.22 },
  v40: { auc: 0.942, detection: 90.6, high_plus: 45.7, brier: 0.065, lift: 3.80 },
} as const

// ============================================================================
// Factor display names and descriptions
// ============================================================================

const FACTOR_LABELS: Record<string, string> = {
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
        <div className="flex items-start gap-3">
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
            <p className="text-[10px] text-text-secondary mt-0.5">{subtitle}</p>
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
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
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

function DeltaLabel({ v33, v40, suffix = '' }: { v33: number; v40: number; suffix?: string }) {
  const delta = v40 - v33
  const isPositive = delta > 0
  return (
    <span className={cn('text-[10px] font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
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
            <span className="text-text-muted">Raw (pre-dampen)</span>
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
        <div className="flex items-start gap-3">
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
// Main Component
// ============================================================================

export default function ModelTransparency() {
  // ------------------------------------------------------------------
  // L2: Prepare coefficient chart data (sorted by beta descending)
  // ------------------------------------------------------------------
  const coefficientData = useMemo(() => {
    return MODEL_COEFFICIENTS
      .map((c) => ({
        ...c,
        label: FACTOR_LABELS[c.factor] ?? c.factor,
        // For the chart, use the dampened beta value
        displayBeta: c.beta,
        // Error bar deltas relative to beta
        errorLower: c.beta - c.ci_lower,
        errorUpper: c.ci_upper - c.beta,
        fill: DIRECTION_COLORS[c.direction],
      }))
      .sort((a, b) => b.beta - a.beta)
  }, [])

  // ------------------------------------------------------------------
  // L3: Prepare comparison chart data
  // ------------------------------------------------------------------
  const comparisonData = useMemo(() => {
    return [
      { metric: 'AUC-ROC', v33: MODEL_COMPARISON.v33.auc, v40: MODEL_COMPARISON.v40.auc },
      { metric: 'Detection %', v33: MODEL_COMPARISON.v33.detection, v40: MODEL_COMPARISON.v40.detection },
      { metric: 'High+ %', v33: MODEL_COMPARISON.v33.high_plus, v40: MODEL_COMPARISON.v40.high_plus },
      { metric: 'Lift', v33: MODEL_COMPARISON.v33.lift, v40: MODEL_COMPARISON.v40.lift },
      // Invert Brier score: lower is better, so show (1 - brier) for visual clarity
      { metric: '1 - Brier', v33: 1 - MODEL_COMPARISON.v33.brier, v40: 1 - MODEL_COMPARISON.v40.brier },
    ]
  }, [])

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* L0: Page Header                                                  */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary">Model Transparency</h1>
            <Badge variant="outline" className="text-[10px] tabular-nums gap-1">
              <Brain className="h-3 w-3" aria-hidden="true" />
              {CURRENT_MODEL_VERSION} | AUC {VALIDATION_METRICS.auc_roc.toFixed(3)}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Understanding how the {CURRENT_MODEL_VERSION} risk scoring model works — coefficients, validation, and limitations
          </p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* L1: Key Metrics (4 gauge-style cards)                            */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricGauge
          label="AUC-ROC"
          value={VALIDATION_METRICS.auc_roc.toFixed(3)}
          subtitle="Excellent discrimination"
          icon={Target}
          color="#58a6ff"
        />
        <MetricGauge
          label="Detection Rate"
          value={`${(VALIDATION_METRICS.detection_rate_medium_plus * 100).toFixed(1)}%`}
          subtitle="Medium+ on known-bad contracts"
          icon={Eye}
          color="#4ade80"
        />
        <MetricGauge
          label="High-Risk Rate"
          value={`${(VALIDATION_METRICS.high_risk_rate * 100).toFixed(1)}%`}
          subtitle="Within OECD 2-15% benchmark"
          icon={Activity}
          color="#fbbf24"
        />
        <MetricGauge
          label="Ground Truth"
          value={`${VALIDATION_METRICS.ground_truth_cases}`}
          format={`cases, ${VALIDATION_METRICS.ground_truth_vendors} vendors`}
          subtitle={`${formatNumber(VALIDATION_METRICS.ground_truth_contracts)} training contracts`}
          icon={Users}
          color="#f87171"
        />
      </div>

      {/* ================================================================ */}
      {/* L2: Coefficient Chart                                            */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <div>
              <CardTitle>What Drives Risk Scores?</CardTitle>
              <CardDescription>
                Logistic regression coefficients — larger bars mean stronger influence on corruption probability
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SectionDescription variant="callout" className="mb-4">
            Each coefficient represents the change in log-odds of corruption per 1 standard deviation increase
            in the z-scored feature. Positive values increase risk; negative values decrease it.
            Error bars show 95% bootstrap confidence intervals (1,000 resamples).
          </SectionDescription>

          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={coefficientData}
                layout="vertical"
                margin={{ top: 5, right: 40, bottom: 5, left: 140 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-0.5, 1.2]}
                  tick={{ fontSize: 10, fill: '#8b949e' }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  axisLine={{ stroke: '#30363d' }}
                  tickLine={{ stroke: '#30363d' }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#c9d1d9' }}
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
                    direction="right"
                  />
                  <ErrorBar
                    dataKey="errorLower"
                    width={4}
                    strokeWidth={1.5}
                    stroke="#8b949e"
                    direction="left"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Coefficient legend + annotation */}
          <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIRECTION_COLORS.positive }} />
              Increases risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIRECTION_COLORS.negative }} />
              Decreases risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIRECTION_COLORS.neutral }} />
              Negligible / zero signal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIRECTION_COLORS.zeroed }} />
              Zeroed (training artifact)
            </span>
          </div>

          {/* Dampening annotations */}
          <div className="mt-4 space-y-2">
            {MODEL_COEFFICIENTS.filter((c) => c.note).map((c) => (
              <div key={c.factor} className="flex items-start gap-2 text-[10px] text-text-muted">
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
      {/* L3: Model Comparison — v3.3 vs v4.0                              */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <div>
              <CardTitle>Model Comparison: v3.3 vs v4.0</CardTitle>
              <CardDescription>
                Statistical framework (v4.0) dramatically outperforms the weighted checklist (v3.3) on every metric
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Side-by-side comparison chart */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 10, right: 30, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: '#c9d1d9' }}
                  axisLine={{ stroke: '#30363d' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#8b949e' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'auto']}
                />
                <RechartsTooltip content={<ComparisonTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="v33" name="v3.3 (Checklist)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="v40" name="v4.0 (Statistical)" fill="#58a6ff" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#64748b]" />
              v3.3 Weighted Checklist
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#58a6ff]" />
              v4.0 Statistical Framework
            </span>
          </div>

          {/* Detailed comparison table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Model comparison metrics">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">Metric</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">v3.3</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">v4.0</th>
                  <th className="text-right py-2 pl-3 text-text-muted font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">AUC-ROC</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.auc.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v40.auc.toFixed(3)}</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.auc} v40={MODEL_COMPARISON.v40.auc} /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">Detection Rate (med+)</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.detection}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v40.detection}%</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.detection} v40={MODEL_COMPARISON.v40.detection} suffix="pp" /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">High+ Detection</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.high_plus}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v40.high_plus}%</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.high_plus} v40={MODEL_COMPARISON.v40.high_plus} suffix="pp" /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">Brier Score</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.brier.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v40.brier.toFixed(3)}</td>
                  <td className="py-2 pl-3 text-right">
                    <span className="text-[10px] font-medium text-emerald-400">
                      -{(MODEL_COMPARISON.v33.brier - MODEL_COMPARISON.v40.brier).toFixed(2)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-text-secondary">Lift vs Baseline</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.lift}x</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v40.lift}x</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.lift} v40={MODEL_COMPARISON.v40.lift} suffix="x" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* L4: Per-Case Detection Table                                     */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <div>
              <CardTitle>Per-Case Detection Performance</CardTitle>
              <CardDescription>
                How the model performs on each of the 9 documented corruption cases
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SectionDescription className="mb-4">
            Detection % measures the share of contracts from each case that the model flags at medium risk or above
            (score {'>'}= {RISK_THRESHOLDS.medium}). High+ % measures the share flagged at high or critical levels
            (score {'>'}= {RISK_THRESHOLDS.high}). Cases with more contracts provide stronger validation signal.
          </SectionDescription>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Per-case detection performance">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2.5 pr-4 text-text-muted font-medium">Case</th>
                  <th className="text-right py-2.5 px-3 text-text-muted font-medium">Contracts</th>
                  <th className="text-left py-2.5 px-3 text-text-muted font-medium min-w-[160px]">Detection %</th>
                  <th className="text-left py-2.5 px-3 text-text-muted font-medium min-w-[160px]">High+ %</th>
                  <th className="text-right py-2.5 pl-3 text-text-muted font-medium">Avg Score</th>
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
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border/20 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              7 of 9 cases: 100% detection rate
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-400" aria-hidden="true" />
              3 largest cases (21K contracts): {'>'}91% high+
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" aria-hidden="true" />
              Weakest: Odebrecht (82.9% detection, small sample)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* L5: Known Limitations                                            */}
      {/* ================================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text-primary">Known Limitations</h2>
        </div>
        <SectionDescription variant="warning" className="mb-4">
          No model is perfect. These limitations are disclosed for transparency. A high risk score indicates
          statistical anomaly consistent with corruption patterns — it does not constitute proof of wrongdoing.
        </SectionDescription>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LimitationCard
            icon={Users}
            title="Ground Truth Bias"
            color="#f87171"
            description="Three cases (IMSS, Segalmex, COVID-19) account for 99% of the 21,252 training contracts. The model's coefficients heavily reflect these cases' characteristics: large, concentrated vendors in health and agriculture sectors. Detection may be weaker for corruption patterns in other sectors like infrastructure or defense."
          />
          <LimitationCard
            icon={TrendingDown}
            title="Reversed Factors"
            color="#fb923c"
            description="Direct awards and short ad periods have negative coefficients, meaning they decrease risk scores. This contradicts expert intuition but reflects the data: known-bad vendors (LICONSA, Pisa, DIMM) operate through competitive procedures with normal timelines, not rushed direct awards."
          />
          <LimitationCard
            icon={Lock}
            title="No Causal Claims"
            color="#58a6ff"
            description="A high P(corrupt|z) indicates a statistical anomaly consistent with corruption patterns observed in 9 documented cases. It does not prove corruption. Some sectors (defense, energy) have structural reasons for high vendor concentration that are legitimate."
          />
          <LimitationCard
            icon={Database}
            title="Data Quality Variation"
            color="#64748b"
            description="Structure A data (2002-2010) has only 0.1% RFC coverage, making vendor identification unreliable for that period. Z-scores and risk scores for earlier contracts may be less accurate. Network analysis is most reliable for 2010+ data where RFC coverage exceeds 15%."
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
              <CardTitle>How the Score is Computed</CardTitle>
              <CardDescription>
                End-to-end pipeline from raw contract data to calibrated probability
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                step: 1,
                title: 'Z-Score Normalization',
                description: 'Each of the 12 features is normalized relative to its sector and year baseline, producing z-scores that measure how unusual a contract is compared to peers.',
                icon: Activity,
              },
              {
                step: 2,
                title: 'Mahalanobis Distance',
                description: 'The z-score vector is evaluated against the sector covariance matrix (Ledoit-Wolf shrinkage) to detect multivariate anomalies — unusual combinations of factors.',
                icon: Target,
              },
              {
                step: 3,
                title: 'Logistic Regression',
                description: 'Bayesian logistic regression (L2, C=0.1) trained on 21,252 known-bad contracts converts z-scores into a raw corruption probability via the sigmoid function.',
                icon: TrendingUp,
              },
              {
                step: 4,
                title: 'PU Correction + CI',
                description: 'Positive-Unlabeled learning correction (c=0.890) adjusts for unlabeled corrupt contracts. Bootstrap (1,000 resamples) provides 95% confidence intervals.',
                icon: Shield,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-lg border border-border/30 bg-background-elevated/20 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#58a6ff]/15 text-[10px] font-bold text-[#58a6ff] tabular-nums">
                    {item.step}
                  </span>
                  <item.icon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  <span className="text-xs font-medium text-text-primary">{item.title}</span>
                </div>
                <p className="text-[10px] text-text-secondary leading-relaxed">{item.description}</p>
                {item.step < 4 && (
                  <div className="flex justify-end">
                    <ArrowRight className="h-3 w-3 text-text-muted/50 hidden lg:block" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Risk thresholds reference */}
          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-[10px] text-text-muted mb-2 font-medium">Risk Level Thresholds (calibrated probabilities)</p>
            <div className="flex flex-wrap gap-3">
              {(Object.entries(RISK_THRESHOLDS) as Array<[keyof typeof RISK_THRESHOLDS, number]>)
                .filter(([level]) => level !== 'low')
                .map(([level, threshold]) => (
                  <div key={level} className="flex items-center gap-1.5 text-[10px]">
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
              <div className="flex items-center gap-1.5 text-[10px]">
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
