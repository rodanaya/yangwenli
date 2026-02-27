/**
 * Model Transparency Page
 *
 * Explains the v5.1 risk scoring model: coefficients, validation metrics,
 * per-case detection performance, model comparison (v3.3 vs v5.1), and
 * known limitations. All data is hardcoded from methodology documentation.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionDescription } from '@/components/SectionDescription'
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
} from '@/components/charts'

// ============================================================================
// Hardcoded Model Data (from v5.1 methodology documentation)
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
  auc_roc: 0.957,
  brier_score: 0.060,
  detection_rate_medium_plus: 0.998,
  detection_rate_high_plus: 0.930,
  high_risk_rate: 0.090,
  pu_correction: 0.8815,
  ground_truth_cases: 22,
  ground_truth_vendors: 65,
  ground_truth_contracts: 26704,
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
]

const MODEL_COMPARISON = {
  v33: { auc: 0.584, detection: 67.1, high_plus: 18.3, brier: 0.411, lift: 1.22 },
  v50: { auc: 0.957, detection: 99.8, high_plus: 93.0, brier: 0.060, lift: 4.04 },
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
// Main Component
// ============================================================================

export default function ModelTransparency() {
  const [selectedSector, setSelectedSector] = useState(0)
  const [coeffSectorId, setCoeffSectorId] = useState<number | undefined>(undefined)

  // ------------------------------------------------------------------
  // Model metadata from API (freshness badge)
  // ------------------------------------------------------------------
  const { data: modelMeta } = useQuery({
    queryKey: ['model', 'metadata'],
    queryFn: async () => {
      const resp = await fetch('/api/v1/analysis/model/metadata')
      if (!resp.ok) throw new Error('Failed to fetch model metadata')
      return resp.json() as Promise<{ version: string; trained_at: string; n_contracts: number; auc_test: number }>
    },
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
      const v50 = modelComparison.find((m) => m.model === 'v5.0')
      if (v33 && v50) {
        return [
          { metric: 'AUC-ROC', v33: v33.auc, v50: v50.auc },
          { metric: 'High+ Rate', v33: v33.high_rate * 100, v50: v50.high_rate * 100 },
          { metric: '1 - Brier', v33: 1 - v33.brier, v50: 1 - v50.brier },
        ]
      }
    }
    return [
      { metric: 'AUC-ROC', v33: MODEL_COMPARISON.v33.auc, v50: MODEL_COMPARISON.v50.auc },
      { metric: 'Detection %', v33: MODEL_COMPARISON.v33.detection, v50: MODEL_COMPARISON.v50.detection },
      { metric: 'High+ %', v33: MODEL_COMPARISON.v33.high_plus, v50: MODEL_COMPARISON.v50.high_plus },
      { metric: 'Lift', v33: MODEL_COMPARISON.v33.lift, v50: MODEL_COMPARISON.v50.lift },
      { metric: '1 - Brier', v33: 1 - MODEL_COMPARISON.v33.brier, v50: 1 - MODEL_COMPARISON.v50.brier },
    ]
  }, [modelComparison])

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* L0: Page Header                                                  */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-text-primary">Model Transparency</h1>
            <Badge variant="outline" className="text-xs tabular-nums gap-1 border-risk-low/30">
              <Brain className="h-3 w-3 text-risk-low" aria-hidden="true" />
              {modelMeta
                ? `Model ${modelMeta.version} · Trained ${modelMeta.trained_at} · ${formatNumber(modelMeta.n_contracts)} contracts · AUC ${modelMeta.auc_test.toFixed(3)}`
                : `${CURRENT_MODEL_VERSION} | AUC ${VALIDATION_METRICS.auc_roc.toFixed(3)}`
              }
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Understanding how the {modelMeta?.version ?? CURRENT_MODEL_VERSION} risk scoring model works — coefficients, validation, and limitations
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/[0.04] px-3 py-2 text-xs text-text-muted">
        <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          {featureImportance
            ? <>Coefficient chart and model comparison are loaded from the <strong className="text-text-primary">live API</strong>. Use the sector selector to view per-sector model weights.</>
            : <>Falling back to <strong className="text-text-primary">static documentation</strong> data. Live endpoints will be used when available.</>
          }
        </span>
      </div>

      {/* ================================================================ */}
      {/* L1: Key Metrics (4 gauge-style cards)                            */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="flex items-center gap-3 mb-4">
            <SectionDescription variant="callout" className="flex-1">
              Each coefficient represents the change in log-odds of corruption per 1 standard deviation increase
              in the z-scored feature. Positive values increase risk; negative values decrease it.
              {!featureImportance && ' Error bars show 95% bootstrap confidence intervals (1,000 resamples).'}
            </SectionDescription>
            <select
              value={coeffSectorId ?? ''}
              onChange={(e) => setCoeffSectorId(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded border border-border bg-background-elevated px-2 py-1 text-xs text-text-primary shrink-0"
              aria-label="Select sector for coefficients"
            >
              <option value="">Global (all sectors)</option>
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

          <div className="h-[560px]">
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
              <CardTitle>Per-Sector Models</CardTitle>
              <CardDescription>
                Top 3 factors for each of the 12 per-sector logistic regression sub-models
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
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">Rank</th>
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Factor</th>
                  <th className="text-right py-2 pl-3 text-text-muted font-medium">Coefficient</th>
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
            Sector models are applied when the contract's sector has 30+ contracts in the training data. Global model is used as fallback.
          </p>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* L3: Model Comparison — v3.3 vs v5.1                              */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <div>
              <CardTitle>Model Comparison: v3.3 vs v5.1</CardTitle>
              <CardDescription>
                Per-sector framework (v5.1) dramatically outperforms the weighted checklist (v3.3) on every metric
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
                <Bar dataKey="v50" name="v5.1 (Per-Sector)" fill="#58a6ff" radius={[4, 4, 0, 0]} barSize={28} />
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
              v5.1 Per-Sector Framework
            </span>
          </div>

          {/* Detailed comparison table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Model comparison metrics">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">Metric</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">v3.3</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">v5.1</th>
                  <th className="text-right py-2 pl-3 text-text-muted font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">AUC-ROC</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.auc.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v50.auc.toFixed(3)}</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.auc} v50={MODEL_COMPARISON.v50.auc} /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">Detection Rate (med+)</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.detection}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v50.detection}%</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.detection} v50={MODEL_COMPARISON.v50.detection} suffix="pp" /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">High+ Detection</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.high_plus}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v50.high_plus}%</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.high_plus} v50={MODEL_COMPARISON.v50.high_plus} suffix="pp" /></td>
                </tr>
                <tr className="border-b border-border/10">
                  <td className="py-2 pr-4 text-text-secondary">Brier Score</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.brier.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v50.brier.toFixed(3)}</td>
                  <td className="py-2 pl-3 text-right">
                    <span className="text-xs font-medium text-risk-low">
                      -{(MODEL_COMPARISON.v33.brier - MODEL_COMPARISON.v50.brier).toFixed(2)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-text-secondary">Lift vs Baseline</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-secondary">{MODEL_COMPARISON.v33.lift}x</td>
                  <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">{MODEL_COMPARISON.v50.lift}x</td>
                  <td className="py-2 pl-3 text-right"><DeltaLabel v33={MODEL_COMPARISON.v33.lift} v50={MODEL_COMPARISON.v50.lift} suffix="x" /></td>
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
                How the model performs on each of the 15 documented corruption cases
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
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border/20 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-risk-low" aria-hidden="true" />
              12 of 15 cases: {'>'}95% detection rate
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-400" aria-hidden="true" />
              3 largest cases (21K contracts): {'>'}84% high+
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-risk-medium" aria-hidden="true" />
              Weakest: Oceanografia (50% detection, 2 contracts)
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LimitationCard
            icon={Users}
            title="Ground Truth Concentration"
            color="#f87171"
            description="v5.1 includes 22 documented cases across all 12 sectors (including SAT EFOS ghost companies). However, three cases (IMSS, Segalmex, COVID-19) still account for the majority of training contracts. Vendor concentration remains dominant across most per-sector sub-models."
          />
          <LimitationCard
            icon={TrendingDown}
            title="Small-Case Detection"
            color="#fb923c"
            description="Cases with few contracts have lower detection rates: La Estafa Maestra (10 contracts, 0% high+), Oceanografia (2 contracts, 50% detection). The model requires sufficient contract volume to detect patterns reliably."
          />
          <LimitationCard
            icon={Lock}
            title="No Causal Claims"
            color="#58a6ff"
            description="A high P(corrupt|z) indicates a statistical anomaly consistent with corruption patterns observed in 22 documented cases. It does not prove corruption. Some sectors (defense, energy) have structural reasons for high vendor concentration that are legitimate."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: 1,
                title: 'Z-Score Normalization',
                description: 'Each of the 16 features is normalized relative to its sector and year baseline, producing z-scores that measure how unusual a contract is compared to peers.',
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
                title: 'Per-Sector Logistic Regression',
                description: 'Cross-validated ElasticNet (C=10.0, l1_ratio=0.25) with 12 per-sector sub-models trained on known-bad contracts from 22 corruption cases converts z-scores into corruption probabilities.',
                icon: TrendingUp,
              },
              {
                step: 4,
                title: 'PU Correction + CI',
                description: 'Elkan & Noto (2008) holdout PU-learning correction (c=0.8815) adjusts for unlabeled corrupt contracts. Bootstrap (500 resamples) provides 95% confidence intervals.',
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
            <p className="text-xs text-text-muted mb-2 font-medium">Risk Level Thresholds (calibrated probabilities)</p>
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
