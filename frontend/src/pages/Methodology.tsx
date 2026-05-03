import { useState, memo, useMemo, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
// Card components replaced by fern-card editorial utility class
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Brain,
  Target,
  AlertTriangle,
  Database,
  BarChart3,
  Beaker,
  FileText,
  History,
  FlaskConical,
  GitBranch,
  Copy,
  Check,
  Printer,
} from 'lucide-react'
import { RiskFactorTable } from '@/components/RiskExplainer'
import { CitationBlock } from '@/components/CitationBlock'
import { RiskScoreDisclaimer } from '@/components/RiskScoreDisclaimer'

// ============================================================================
// Static Data
// ============================================================================

// v0.8.5 ACTIVE (May 2 2026, Run ID: CAL-v8-202605020212)
// 18 active features from ElasticNet (C=0.2243, l1_ratio=0.7545, c_pu=0.32)
const V6_COEFFICIENTS = [
  { nameKey: 'priceVolatility', coeff: 0.558 },
  { nameKey: 'institutionDiversity', coeff: -0.388 },
  { nameKey: 'priceRatio', coeff: 0.358 },
  { nameKey: 'vendorConcentration', coeff: 0.327 },
  { nameKey: 'cobidHerfindahl', coeff: 0.272 },
  { nameKey: 'recencyZ', coeff: -0.247 },
  { nameKey: 'amountResidualZ', coeff: -0.187 },
  { nameKey: 'networkMembers', coeff: 0.166 },
  { nameKey: 'amendmentFlag', coeff: 0.102 },
  { nameKey: 'adPeriodDays', coeff: 0.090 },
  { nameKey: 'directAward', coeff: -0.081 },
  { nameKey: 'pubDelayZ', coeff: -0.055 },
  { nameKey: 'sameDayContracts', coeff: 0.0 },
  { nameKey: 'winRate', coeff: 0.0 },
  { nameKey: 'singleBid', coeff: 0.0 },
  { nameKey: 'sectorSpread', coeff: 0.0 },
  { nameKey: 'coBidRate', coeff: 0.0 },
  { nameKey: 'priceHypConfidence', coeff: 0.0 },
] as const

const V33_WEIGHTS = [
  { nameKey: 'singleBidding', weight: 18 },
  { nameKey: 'nonOpenProcedure', weight: 18 },
  { nameKey: 'priceAnomaly', weight: 18 },
  { nameKey: 'vendorConcentration', weight: 12 },
  { nameKey: 'shortAdPeriod', weight: 12 },
  { nameKey: 'networkRisk', weight: 8 },
  { nameKey: 'yearEndTiming', weight: 7 },
  { nameKey: 'thresholdSplitting', weight: 7 },
] as const

// Colors routed through canonical RISK_COLORS instead of three local hex
// duplicates that drifted from the rest of the platform.
// v0.8.5 distribution (3,051,294 scored contracts, HR=11.01%)
const RISK_LEVELS_V6 = [
  { level: 'Critical', threshold: '>= 0.60', meaning: 'Very high similarity to known corruption patterns', pct: '5.2%', count: '158,667', color: RISK_COLORS.critical },
  { level: 'High', threshold: '>= 0.40', meaning: 'High similarity to known corruption patterns', pct: '5.9%', count: '179,026', color: RISK_COLORS.high },
  { level: 'Medium', threshold: '>= 0.25', meaning: 'Moderate similarity to known corruption patterns', pct: '16.2%', count: '494,310', color: RISK_COLORS.medium },
  { level: 'Low', threshold: '< 0.25', meaning: 'Low similarity to known corruption patterns', pct: '72.8%', count: '2,219,291', color: RISK_COLORS.low },
] as const

const CORRUPTION_CASES = [
  { name: 'IMSS Ghost Company Network', type: 'Ghost companies', contracts: '9,366', detection: '99.9%', highPlus: '99.0%', avgScore: '0.977' },
  { name: 'Segalmex Food Distribution', type: 'Procurement fraud', contracts: '6,326', detection: '99.6%', highPlus: '89.3%', avgScore: '0.664' },
  { name: 'COVID-19 Emergency Procurement', type: 'Embezzlement', contracts: '5,371', detection: '99.9%', highPlus: '84.9%', avgScore: '0.821' },
  { name: 'Edenred Voucher Monopoly', type: 'Monopoly', contracts: '2,939', detection: '100%', highPlus: '96.7%', avgScore: '0.884' },
  { name: 'Toka IT Monopoly', type: 'Monopoly', contracts: '1,954', detection: '100%', highPlus: '100%', avgScore: '0.964' },
  { name: 'Infrastructure Fraud Network', type: 'Overpricing', contracts: '191', detection: '100%', highPlus: '99.5%', avgScore: '0.962' },
  { name: 'SixSigma Tender Rigging', type: 'Tender rigging', contracts: '147', detection: '95.2%', highPlus: '87.8%', avgScore: '0.756' },
  { name: 'Cyber Robotic IT Overpricing', type: 'Overpricing', contracts: '139', detection: '100%', highPlus: '14.4%', avgScore: '0.249' },
  { name: 'PEMEX-Cotemar Irregularities', type: 'Procurement fraud', contracts: '51', detection: '100%', highPlus: '100%', avgScore: '1.000' },
  { name: 'IPN Cartel de la Limpieza', type: 'Bid rigging', contracts: '48', detection: '95.8%', highPlus: '64.6%', avgScore: '0.551' },
  { name: 'Odebrecht-PEMEX Bribery', type: 'Bribery', contracts: '35', detection: '97.1%', highPlus: '97.1%', avgScore: '0.915' },
  { name: 'La Estafa Maestra', type: 'Ghost companies', contracts: '10', detection: '90.0%', highPlus: '0%', avgScore: '0.179' },
  { name: 'Grupo Higa / Casa Blanca', type: 'Conflict of interest', contracts: '3', detection: '100%', highPlus: '33.3%', avgScore: '0.359' },
  { name: 'Oceanografia PEMEX Fraud', type: 'Procurement fraud', contracts: '2', detection: '50.0%', highPlus: '0%', avgScore: '0.152' },
  { name: 'PEMEX Emilio Lozoya', type: 'Bribery', contracts: '0*', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'ISSSTE Ambulance Leasing Fraud', type: 'Overpricing', contracts: '603', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'Decoaro Ghost Cleaning Company', type: 'Ghost companies', contracts: '46', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'CONAGUA Ghost Contractor Rotation', type: 'Ghost companies', contracts: '29', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'SEGOB-Mainbit IT Monopoly', type: 'Monopoly', contracts: '604', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'IMSS Overpriced Medicines (Ethomedical)', type: 'Overpricing', contracts: '--', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'Tren Maya Direct Award Irregularities', type: 'Procurement fraud', contracts: '--', detection: '--', highPlus: '--', avgScore: '--' },
  { name: 'SAT EFOS Art. 69-B Ghost Network', type: 'Ghost companies', contracts: '122', detection: '41.8%', highPlus: '27.9%', avgScore: '0.283' },
] as const

const DATA_STRUCTURES = [
  { structure: 'A', years: '2002-2010', quality: 'Lowest', rfc: '0.1%', description: 'Risk scores may be underestimated' },
  { structure: 'B', years: '2010-2017', quality: 'Better', rfc: '15.7%', description: 'UPPERCASE text, 72.2% direct award' },
  { structure: 'C', years: '2018-2022', quality: 'Good', rfc: '30.3%', description: 'Mixed case, 78.4% direct award' },
  { structure: 'D', years: '2023-2025', quality: 'Best', rfc: '47.4%', description: '100% Partida codes, best coverage' },
] as const

const REFERENCES = [
  { authors: 'IMF Working Paper 2022/094', title: 'Assessing Vulnerabilities to Corruption in Public Procurement', year: 2022 },
  { authors: 'OECD', title: 'Public Procurement Performance Report', year: 2023 },
  { authors: 'European Commission', title: 'ARACHNE Risk Scoring Methodology', year: 2023 },
  { authors: 'World Bank INT', title: 'Warning Signs of Fraud and Corruption in Public Procurement', year: 2019 },
  { authors: 'Gallego, J. et al.', title: 'Early Warning Model of Malfeasance in Public Procurement', year: 2022 },
  { authors: 'Mahalanobis, P.C.', title: 'On the Generalized Distance in Statistics', year: 1936 },
  { authors: 'Ledoit, O. & Wolf, M.', title: 'A Well-Conditioned Estimator for Large-Dimensional Covariance Matrices', year: 2004 },
  { authors: 'Elkan, C. & Noto, K.', title: 'Learning Classifiers from Only Positive and Unlabeled Data', year: 2008 },
] as const

const MODEL_COMPARISON = [
  { metric: 'AUC-ROC', v33: '0.584', v60: '0.785', improvement: '+34%' },
  { metric: 'Brier Score', v33: '0.411', v60: '0.114', improvement: '-72%' },
  { metric: 'Detection Rate (med+)', v33: '67.1%', v60: '100%', improvement: '+33pp' },
  { metric: 'High+ Detection', v33: '18.3%', v60: '67.4%', improvement: '+49pp' },
  { metric: 'Lift vs Random', v33: '1.22x', v60: '3.1x', improvement: '+1.9x' },
] as const

const MODEL_EVOLUTION_STEPS = [
  {
    version: 'v3.3',
    date: 'Feb 2026',
    titleKey: 'v33Title',
    descKey: 'v33Desc',
    metric: 'AUC 0.584',
    active: false,
    overlay: false,
  },
  {
    version: 'v4.0',
    date: 'Feb 2026',
    titleKey: 'v40Title',
    descKey: 'v40Desc',
    metric: 'AUC 0.942',
    active: false,
    overlay: false,
  },
  {
    version: 'v5.0',
    date: 'Feb 2026',
    titleKey: 'v50Title',
    descKey: 'v50Desc',
    metric: 'AUC 0.960',
    active: false,
    overlay: false,
  },
  {
    version: 'v5.1',
    date: 'Feb 27, 2026',
    titleKey: 'v51Title',
    descKey: 'v51Desc',
    metric: 'AUC 0.957 (temporal)',
    active: false,
    overlay: false,
  },
  {
    version: 'v0.6.5',
    date: 'Mar 25, 2026',
    titleKey: 'v60Title',
    descKey: 'v60Desc',
    metric: 'AUC 0.828 (test)',
    active: false,
    overlay: false,
  },
  {
    version: 'v5.2 layer',
    date: 'Mar 7, 2026',
    titleKey: 'v52Title',
    descKey: 'v52Desc',
    metric: '~130K dual-confirmed',
    active: false,
    overlay: true,
  },
  {
    version: 'v0.8.5',
    date: 'May 2, 2026',
    titleKey: 'v85Title',
    descKey: 'v85Desc',
    metric: 'AUC 0.785 (test)',
    active: true,
    overlay: false,
  },
] as const

// ============================================================================
// Section IDs for TOC navigation
// ============================================================================

const SECTIONS = [
  { id: 'overview', icon: Shield },
  { id: 'features', icon: BarChart3 },
  { id: 'findings', icon: Brain },
  { id: 'validation', icon: Target },
  { id: 'methods', icon: Beaker },
  { id: 'v52-layer', icon: FlaskConical },
  { id: 'limitations', icon: AlertTriangle },
  { id: 'v33', icon: History },
  { id: 'data-sources', icon: Database },
  { id: 'references', icon: FileText },
] as const

// ============================================================================
// Helper Components
// ============================================================================

function CollapsibleSection({
  id,
  title,
  icon: Icon,
  defaultOpen = true,
  number,
  children,
}: {
  id: string
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  number?: string
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section id={id} className="scroll-mt-20">
      <div className="fern-card">
        <div className="px-6 pt-5 pb-3">
          <button
            type="button"
            className="w-full flex items-baseline gap-4 cursor-pointer select-none text-left group"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls={`section-content-${id}`}
          >
            {number && (
              <span
                className="font-mono text-[11px] font-bold tracking-[0.2em] text-accent shrink-0 pt-0.5"
                aria-hidden="true"
              >
                {number}
              </span>
            )}
            <span className="flex-1 flex items-center gap-2">
              <Icon className="h-4 w-4 text-accent/70 shrink-0" aria-hidden="true" />
              <span
                className="text-lg font-bold text-text-primary leading-tight group-hover:text-accent transition-colors"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {title}
              </span>
            </span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-text-muted shrink-0 self-center" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 text-text-muted shrink-0 self-center" aria-hidden="true" />
            )}
          </button>
        </div>
        {isOpen && (
          <div
            id={`section-content-${id}`}
            className="px-6 pb-6 pt-4 border-t border-border/30 leading-relaxed"
          >
            {children}
          </div>
        )}
      </div>
    </section>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-accent">{children}</span>
}

/**
 * PullQuote — editorial blockquote with left amber border and large serif number.
 * Used to highlight key statistics (AUC, HR, case count) inside sections.
 */
function PullQuote({
  stat,
  label,
  source,
}: {
  stat: string
  label: string
  source?: string
}) {
  return (
    <blockquote className="my-3 pl-5 py-1" style={{ borderLeft: '2px solid var(--color-accent)' }}>
      <div
        className="font-mono tabular-nums leading-none"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--color-accent)',
        }}
      >
        {stat}
      </div>
      <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
        {label}
      </div>
      {source && (
        <div className="mt-1 text-[10px] font-mono text-text-muted leading-relaxed">
          {source}
        </div>
      )}
    </blockquote>
  )
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 px-4 py-3 rounded-md bg-background-elevated/50 border border-border/50 font-mono text-xs text-text-secondary overflow-x-auto">
      {children}
    </div>
  )
}

// ============================================================================
// Chart Components
// ============================================================================

// ── Horizontal dot-matrix geometry (shared) ──────────────────────────────────
const MD_DOTS = 50
const MD_DOT_R = 2.8
const MD_DOT_GAP = 7
const MD_ROW_H = 20
const MD_LABEL_W = 150
const MD_VAL_W = 48
const MD_TOP_PAD = 8
const MD_BOTTOM_PAD = 6

const CoefficientChart = memo(function CoefficientChart() {
  const { t } = useTranslation('methodology')
  const chartData = useMemo(() => V6_COEFFICIENTS.map((c) => ({
    name: t(`featureNames.${c.nameKey}`),
    coeff: c.coeff,
    // Tokenized: positive coefficient = risk-increasing (amber); negative =
    // protective (neutral text-muted); zero = subtle. Was 3 hex constants.
    fill:
      c.coeff > 0
        ? 'var(--color-risk-high)'
        : c.coeff < 0
          ? 'var(--color-text-secondary)'
          : 'var(--color-text-muted)',
  })), [t])

  // Scale: v0.8.5 coefficients range from -0.39 to +0.56. Symmetric 0-based axis.
  // (v5.x had ±1.3; v0.6.5 max was price_volatility +0.534, v0.8.5 max is +0.558;
  // min is institution_diversity -0.3821.)
  const RANGE_MIN = -0.55
  const RANGE_MAX = 0.55
  const SPAN = RANGE_MAX - RANGE_MIN           // 1.10
  const ZERO_DOT = Math.round(((0 - RANGE_MIN) / SPAN) * MD_DOTS) // ≈11 (midpoint)

  const chartW = MD_LABEL_W + MD_DOTS * MD_DOT_GAP + MD_VAL_W
  const chartH = MD_TOP_PAD + chartData.length * MD_ROW_H + MD_BOTTOM_PAD

  return (
    <div role="img" aria-label="Dot matrix showing model coefficient values by feature">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
        {/* Zero reference line */}
        <line
          x1={MD_LABEL_W + ZERO_DOT * MD_DOT_GAP + MD_DOT_R}
          x2={MD_LABEL_W + ZERO_DOT * MD_DOT_GAP + MD_DOT_R}
          y1={MD_TOP_PAD - 2}
          y2={MD_TOP_PAD + chartData.length * MD_ROW_H}
          stroke="var(--color-text-muted)"
          strokeDasharray="3 3"
          strokeWidth={0.6}
        />

        {chartData.map((item, rowIdx) => {
          const valueDot = Math.round(((item.coeff - RANGE_MIN) / SPAN) * MD_DOTS)
          const yCenter = MD_TOP_PAD + rowIdx * MD_ROW_H + MD_ROW_H / 2
          const color = item.fill

          return (
            <g key={item.name}>
              <text
                x={MD_LABEL_W - 6}
                y={yCenter + 3}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
              >
                {item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name}
              </text>
              {Array.from({ length: MD_DOTS }).map((_, i) => {
                // Dot is "filled" if it's on the signed path from zero to value.
                const isFilled =
                  (item.coeff >= 0 && i >= ZERO_DOT && i < valueDot) ||
                  (item.coeff < 0 && i < ZERO_DOT && i >= valueDot)
                return (
                  <motion.circle
                    key={i}
                    cx={MD_LABEL_W + i * MD_DOT_GAP + MD_DOT_R}
                    cy={yCenter}
                    r={MD_DOT_R}
                    fill={isFilled ? color : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={0.4}
                    fillOpacity={isFilled ? 0.85 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                  />
                )
              })}
              <text
                x={MD_LABEL_W + MD_DOTS * MD_DOT_GAP + 6}
                y={yCenter + 3}
                fill={color}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                {item.coeff > 0 ? '+' : ''}{item.coeff.toFixed(3)}
              </text>
              <title>{item.name}: {item.coeff > 0 ? '+' : ''}{item.coeff.toFixed(3)}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
})

const V33WeightsChart = memo(function V33WeightsChart() {
  const { t } = useTranslation('methodology')
  const chartData = useMemo(() =>
    [...V33_WEIGHTS].sort((a, b) => b.weight - a.weight).map((c) => ({
      name: t(`v33WeightNames.${c.nameKey}`),
      weight: c.weight,
    })), [t])

  // Scale: weights range 0-20%. 1 dot = 0.4pp.
  const MAX_PCT = 20
  const chartW = MD_LABEL_W + MD_DOTS * MD_DOT_GAP + MD_VAL_W
  const chartH = MD_TOP_PAD + chartData.length * MD_ROW_H + MD_BOTTOM_PAD

  return (
    <div role="img" aria-label="Dot matrix showing risk factor weights in the v3.3 model">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
        {chartData.map((item, rowIdx) => {
          const filled = Math.round((item.weight / MAX_PCT) * MD_DOTS)
          const yCenter = MD_TOP_PAD + rowIdx * MD_ROW_H + MD_ROW_H / 2

          return (
            <g key={item.name}>
              <text
                x={MD_LABEL_W - 6}
                y={yCenter + 3}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
              >
                {item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name}
              </text>
              {Array.from({ length: MD_DOTS }).map((_, i) => {
                const isFilled = i < filled
                return (
                  <motion.circle
                    key={i}
                    cx={MD_LABEL_W + i * MD_DOT_GAP + MD_DOT_R}
                    cy={yCenter}
                    r={MD_DOT_R}
                    fill={isFilled ? 'var(--color-accent)' : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={0.4}
                    fillOpacity={isFilled ? 0.75 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                  />
                )
              })}
              <text
                x={MD_LABEL_W + MD_DOTS * MD_DOT_GAP + 6}
                y={yCenter + 3}
                fill="var(--color-accent)"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                {item.weight}%
              </text>
              <title>{item.name}: {item.weight}% weight</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
})

// ============================================================================
// Model Evolution Timeline
// ============================================================================

function ModelEvolutionTimeline() {
  const { t } = useTranslation('methodology')
  const steps = MODEL_EVOLUTION_STEPS
  const nodes = steps.reduce<ReactNode[]>((acc, step, i) => {
    if (i > 0) {
      acc.push(
        <ChevronRight
          key={`arrow-${i}`}
          className="h-4 w-4 text-text-muted flex-shrink-0 self-center"
          aria-hidden="true"
        />
      )
    }
    acc.push(
      <div
        key={step.version}
        className={cn(
          'w-40 flex-shrink-0 rounded-sm border p-3 text-[11px] space-y-1.5',
          step.active
            ? 'border-accent/40 bg-accent/5'
            : step.overlay
              ? 'border-dashed border-border/60 bg-transparent'
              : 'border-border/40 bg-background-elevated/20'
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              'font-mono font-bold px-1.5 py-0.5 rounded text-[10px]',
              step.active
                ? 'bg-accent/15 text-accent'
                : step.overlay
                  ? 'bg-border/30 text-text-muted'
                  : 'bg-border/20 text-text-secondary'
            )}
          >
            {step.version}
          </span>
          <span className="text-[10px] text-text-muted">{step.date}</span>
        </div>
        <p className="font-semibold text-text-primary leading-tight">{t(`evolution.steps.${step.titleKey}`)}</p>
        <p className="text-text-muted leading-relaxed">{t(`evolution.steps.${step.descKey}`)}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'font-mono text-[10px] font-semibold',
              step.active ? 'text-accent' : step.overlay ? 'text-text-muted' : 'text-text-secondary'
            )}
          >
            {step.metric}
          </span>
          {step.active && (
            <span className="text-[9px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-accent/10 text-accent">
              {t('evolution.active')}
            </span>
          )}
          {step.overlay && (
            <span className="text-[9px] font-semibold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-border/30 text-text-muted">
              {t('evolution.overlay')}
            </span>
          )}
        </div>
      </div>
    )
    return acc
  }, [])

  return (
    <div className="fern-card">
      <div className="px-5 pt-4 pb-3">
        <div className="editorial-rule mb-2">
          <GitBranch className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="editorial-label text-accent">{t('evolution.title')}</span>
        </div>
        <p className="text-xs text-text-muted">
          {t('evolution.subtitle')}
        </p>
      </div>
      <div className="px-5 pb-5">
        <div className="overflow-x-auto pb-1">
          <div className="flex items-stretch gap-1.5 min-w-max">
            {nodes}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Copy All Citations Button
// ============================================================================

function CopyCitationButton() {
  const { t } = useTranslation('methodology')
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const text = REFERENCES.map(
      (ref, i) => `[${i + 1}] ${ref.authors} (${ref.year}). ${ref.title}.`
    ).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  return (
    <button
      onClick={() => void handleCopy()}
      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md bg-background-elevated/50 hover:bg-background-elevated border border-border text-text-muted hover:text-text-secondary transition-colors"
      title={t('copyCitation')}
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? t('citationCopied') : t('copyCitation')}
    </button>
  )
}

// ============================================================================
// Table of Contents (sidebar)
// ============================================================================

function TableOfContents() {
  const { t } = useTranslation('methodology')
  return (
    <nav className="hidden lg:block sticky top-4" aria-label="Table of contents">
      <div className="space-y-0.5">
        <div className="editorial-rule mb-3 px-2">
          <span className="editorial-label">{t('contents')}</span>
        </div>
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-accent/5 transition-colors"
            >
              <Icon className="h-3 w-3 text-text-muted" aria-hidden="true" />
              <span>{t(`sectionLabels.${section.id as string}`)}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export function Methodology() {
  const { t } = useTranslation('methodology')
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Utility header — same redesign sweep. */}
        <header className="mb-5 pb-4 border-b border-border">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                How we score corruption risk.
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
                METHODOLOGY · TRANSPARENCY REPORT · v0.8.5
              </p>
            </div>
            <div className="flex items-baseline gap-5">
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">0.785</div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">Test AUC</div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">11.01%</div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">High-risk rate</div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">1,401</div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">GT cases</div>
              </div>
            </div>
          </div>
        </header>
    <div className="space-y-5">
      {/* Editorial Hero */}
      <header className="relative pt-4 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-text-secondary">RUBLI</span>
              </span>
              <span className="text-text-primary">·</span>
              <span>{t('kicker')}</span>
              <span className="text-text-primary">·</span>
              <span className="font-mono tabular-nums">v0.8.5</span>
            </div>
            <p className="text-kicker text-kicker--investigation mb-3">{t('kicker')}</p>
            <h1
              className="text-text-primary leading-[1.05]"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
              }}
            >
              {t('pageHeadline')}
            </h1>
            <p
              className="mt-4 text-text-secondary max-w-2xl"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(1rem, 1.3vw, 1.2rem)',
                lineHeight: 1.55,
              }}
            >
              {t('pageSubline')}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-background-elevated/50 hover:bg-background-elevated border border-border text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
            title="Export as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>

        {/* Editorial pull-quotes: the three numbers that matter */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <PullQuote
            stat="0.785"
            label="Test AUC"
            source="Vendor-stratified 70/30 hold-out"
          />
          <PullQuote
            stat="11.01%"
            label="High-risk rate"
            source="OECD benchmark: 2–15%"
          />
          <PullQuote
            stat="1,401"
            label="Ground-truth cases"
            source="861 vendors · ~302K contracts"
          />
        </div>
      </header>

      {/* Supporting KPI badges (context below hero) */}
      <motion.div
        className="flex flex-wrap gap-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        aria-label="Additional dataset context"
      >
        {(
          [
            t('kpiBadges.contracts'),
            t('kpiBadges.sectors'),
          ] as string[]
        ).map((label) => (
          <motion.div key={label} variants={staggerItem}>
            <Badge
              variant="default"
              className="text-xs px-3 py-1 bg-accent/10 text-accent border-accent/20"
            >
              {label}
            </Badge>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Confidence Tier Framework ─────────────────────────────── */}
      <section id="confidence-tiers" className="scroll-mt-20">
        <div className="fern-card">
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-accent">
                HOW TO INTERPRET FINDINGS · CONFIDENCE TIERS
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 max-w-2xl">
              Not all RUBLI findings carry equal certainty. Every claim — whether in a risk score,
              an ARIA flag, or a story — belongs to one of three tiers. The tier determines the
              language you should use when citing or reporting it.
            </p>
          </div>
          <div className="px-6 pb-6 border-t border-border/30">
            <div className="grid gap-4 sm:grid-cols-3 mt-4">

              {/* Tier I */}
              <div className="rounded-sm border border-[#ef4444]/25 bg-[#ef4444]/5 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#f87171]">TIER I</span>
                  <h3 className="text-sm font-bold text-text-primary mt-0.5" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    Externally Confirmed
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  An independent authority — SAT, SFP, or a documented judicial process — has
                  formally established fraud, simulated operations, or a procurement irregularity.
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">Sources in RUBLI</p>
                  <ul className="text-xs text-text-muted space-y-0.5">
                    <li>· SAT EFOS Definitivo list (13,960 vendors)</li>
                    <li>· SFP sanctions registry (544 vendors)</li>
                    <li>· Ground truth cases (1,401 documented investigations)</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-[#ef4444]/15">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">Say</p>
                  <p className="text-xs text-[#f87171] italic">"confirmed" · "documented" · "formally established"</p>
                </div>
              </div>

              {/* Tier II */}
              <div className="rounded-sm border border-[#f59e0b]/25 bg-[#f59e0b]/5 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#fbbf24]">TIER II</span>
                  <h3 className="text-sm font-bold text-text-primary mt-0.5" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    Corroborated
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Algorithmic risk signal plus at least one independent external source pointing
                  in the same direction. Neither source alone is conclusive; together they
                  warrant priority investigation.
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">Examples</p>
                  <ul className="text-xs text-text-muted space-y-0.5">
                    <li>· Critical risk score + EFOS Presunto match</li>
                    <li>· Multiple independent ARIA patterns (P2 + P3)</li>
                    <li>· High risk + RUPC exclusion list</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-[#f59e0b]/15">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">Say</p>
                  <p className="text-xs text-[#fbbf24] italic">"corroborated by" · "flagged and independently noted" · "warrants investigation"</p>
                </div>
              </div>

              {/* Tier III */}
              <div className="rounded-sm border border-border/40 bg-background-elevated/30 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-muted">TIER III</span>
                  <h3 className="text-sm font-bold text-text-primary mt-0.5" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    Statistical Pattern
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  RUBLI's algorithm detected procurement characteristics that statistically
                  resemble known corruption cases. No external source corroborates the flag.
                  <strong className="text-text-primary"> Most RUBLI findings are Tier III.</strong>
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">Scale</p>
                  <ul className="text-xs text-text-muted space-y-0.5">
                    <li>· 412K contracts at high/critical risk score</li>
                    <li>· 6,034 vendors with shell-company behavioral pattern</li>
                    <li>· Collusion ring detections (co-bidding heuristic)</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">Say</p>
                  <p className="text-xs text-text-secondary italic">"statistical pattern consistent with" · "flagged for investigation" · "behavioral anomaly"</p>
                </div>
              </div>

            </div>

            <div className="mt-4 p-3 rounded-md bg-border/10 border border-border/30">
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="font-semibold text-text-secondary">Critical rule: </span>
                Never use Tier I language ("confirmed," "proven") for Tier III findings. The RUBLI
                risk score is not a verdict — it is a triage signal. A score of 0.90 means strong
                resemblance to documented corruption patterns, not a 90% probability of guilt.
                Shell company behavioral pattern flags (P2 pattern) have a 0.7% SAT confirmation rate —
                the other 99.3% are unconfirmed algorithmic detections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Model Evolution Flowchart */}
      <ModelEvolutionTimeline />

      {/* Layout: TOC sidebar + content */}
      <div className="grid gap-5 lg:grid-cols-[1fr_200px]">
        {/* Main Content */}
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >

          {/* Section 2: Model Overview */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="overview" number="01" title={t('sectionLabels.overview')} icon={Shield}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.overview.p1Start')}<strong className="text-text-primary">{t('body.overview.p1StatisticalIndicator')}</strong>{' '}
                <Mono>S(features)</Mono>{t('body.overview.p1End')}
              </p>

              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-2">
                  {t('body.overview.formulaLabel')}
                </p>
                <Formula>
                  {t('body.overview.formulaExpr')}
                </Formula>
                <p className="text-xs text-text-muted">
                  {t('body.overview.formulaDescStart')}<strong>{t('body.overview.formulaDescStrong')}</strong>{t('body.overview.formulaDescEnd')}
                </p>
              </div>

              {/* Risk level thresholds table */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted font-mono">
                    {t('body.overview.riskThresholdsLabel')}
                  </p>
                  <RiskScoreDisclaimer />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table" aria-label="Risk level thresholds">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColLevel')}</th>
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColThreshold')}</th>
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColMeaning')}</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.overview.tableColDistribution')}</th>
                        <th className="text-right py-2 text-text-muted font-medium">{t('body.overview.tableColCount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RISK_LEVELS_V6.map((r) => (
                        <tr key={r.level} className="border-b border-border/20">
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: r.color }}
                                aria-hidden="true"
                              />
                              <span className="font-medium text-text-primary">{r.level}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 font-mono text-text-secondary">
                            {r.threshold}
                          </td>
                          <td className="py-2 pr-3 text-text-muted">{r.meaning}</td>
                          <td className="py-2 pr-3 text-right font-mono text-text-secondary">
                            {r.pct}
                          </td>
                          <td className="py-2 text-right font-mono text-text-muted">
                            {r.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-text-muted">
                {t('body.overview.highRiskSummaryStart')}<strong className="text-text-secondary">{t('body.overview.highRiskSummaryValue')}</strong>{t('body.overview.highRiskSummaryEnd')}
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 3: The 12 Features */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="features" number="02" title={t('sectionLabels.features')} icon={BarChart3}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.features.p1')}
              </p>

              <CoefficientChart />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" aria-hidden="true" />
                  <span className="text-text-muted">{t('body.features.legendIncreasesRisk')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#52525b]" aria-hidden="true" />
                  <span className="text-text-muted">{t('body.features.legendDecreasesRisk')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#64748b]" aria-hidden="true" />
                  <span className="text-text-muted">{t('body.features.legendNoSignal')}</span>
                </div>
              </div>

              <p className="text-xs text-text-muted">
                {t('body.features.footerNote')}
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 3b: Risk Factor Evidence Base */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="risk-evidence" number="03" title={t('sectionLabels.risk-evidence')} icon={FlaskConical} defaultOpen={false}>
            <div className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.riskEvidence.p1')}
              </p>
              <RiskFactorTable />
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 4: Key Findings */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="findings" number="04" title={t('sectionLabels.findings')} icon={Brain}>
            <div className="space-y-4">

              {/* Finding 1: Vendor Concentration */}
              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-1">
                  {t('body.findings.finding1Label')}
                </p>
                <p className="text-sm font-bold text-text-primary">
                  {t('body.findings.finding1Title')}
                </p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {t('body.findings.finding1Body')}
                </p>
              </div>

              {/* Finding 2: Reversed factors */}
              <div className="p-3 rounded-md bg-risk-medium/5 border border-risk-medium/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-risk-medium mb-1">
                  {t('body.findings.finding2Label')}
                </p>
                <p className="text-sm font-bold text-text-primary">
                  {t('body.findings.finding2Title')}
                </p>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">1.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">{t('body.findings.finding2Item1Strong')}</strong>{' '}
                      <Mono>{t('body.findings.finding2Item1Mono')}</Mono>{t('body.findings.finding2Item1End')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">2.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">{t('body.findings.finding2Item2Strong')}</strong>{' '}
                      <Mono>{t('body.findings.finding2Item2Mono')}</Mono>{t('body.findings.finding2Item2End')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">3.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">{t('body.findings.finding2Item3Strong')}</strong>{' '}
                      <Mono>{t('body.findings.finding2Item3Mono')}</Mono>{t('body.findings.finding2Item3End')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Finding 3: Co-bidding */}
              <div className="p-3 rounded-md bg-background-elevated/50 border border-border/50">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted mb-1">
                  {t('body.findings.finding3Label')}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">{t('body.findings.finding3BodyStrong')}</strong>{t('body.findings.finding3BodyEnd')}
                </p>
              </div>

              <div className="p-3 rounded-md border border-risk-high/20 bg-risk-high/5">
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">{t('body.findings.finding4Strong')}</strong>{t('body.findings.finding4End')}
                </p>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 5: Ground Truth Validation */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="validation" number="05" title={t('sectionLabels.validation')} icon={Target}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.validation.p1Start')}<strong className="text-text-primary">{t('body.validation.p1Strong')}</strong>{t('body.validation.p1End')}
              </p>

              {/* Cases table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label={t('body.validation.tableAriaLabel')}>
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColCase')}</th>
                      <th className="text-left py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColType')}</th>
                      <th className="text-right py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColContracts')}</th>
                      <th className="text-right py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColDetected')}</th>
                      <th className="text-right py-2 pr-2 text-text-muted font-medium">{t('body.validation.tableColHighPlus')}</th>
                      <th className="text-right py-2 text-text-muted font-medium">{t('body.validation.tableColAvgScore')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CORRUPTION_CASES.map((c) => (
                      <tr key={c.name} className="border-b border-border/20">
                        <td className="py-2 pr-2 text-text-primary font-medium max-w-[200px]">
                          <span className="truncate block">{c.name}</span>
                        </td>
                        <td className="py-2 pr-2 text-text-muted">{c.type}</td>
                        <td className="py-2 pr-2 text-right font-mono text-text-secondary">
                          {c.contracts}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-text-secondary">
                          {c.detection}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-text-secondary">
                          {c.highPlus}
                        </td>
                        <td className="py-2 text-right font-mono text-text-secondary">
                          {c.avgScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-text-muted">
                {t('body.validation.footnote')}
              </p>

              {/* Validation metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: t('body.validation.metricTestAuc'), value: '0.785' },
                  { label: t('body.validation.metricTrainAuc'), value: '0.797' },
                  { label: 'High-risk rate (OECD compliance)', value: '11.01%' },
                  { label: t('body.validation.metricHighPlus'), value: '25.3%' },
                  { label: t('body.validation.metricMedPlus'), value: '88.7%' },
                ].map((m) => (
                  <div key={m.label} className="fern-card p-3 text-center">
                    <p className="pull-stat text-text-primary">
                      {m.value}
                    </p>
                    <p className="editorial-label mt-1">{m.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-text-muted italic">
                Train AUC 0.797 / Test AUC 0.785 — vendor-stratified 70/30 split, no vendor appears in both train and test sets. HR=11.01% OECD-compliant (within 2–15% benchmark). Model v0.8.5 active since May 2, 2026. Run ID: CAL-v8-202605020212.
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 6: Statistical Methods */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="methods" number="06" title={t('sectionLabels.methods')} icon={Beaker}>
            <div className="space-y-4">

              {/* Z-scores */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.zScoreTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.zScoreP1')}
                </p>
                <Formula>
                  {t('body.methods.zScoreFormula')}
                </Formula>
                <p className="text-xs text-text-muted">
                  {t('body.methods.zScoreNote')}
                </p>
              </div>

              {/* Mahalanobis */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.mahalanobisTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.mahalanobisP1')}
                </p>
                <Formula>
                  {t('body.methods.mahalanobisFormula')}
                </Formula>
                <p className="text-xs text-text-muted">
                  {t('body.methods.mahalanobisNote')}
                </p>
              </div>

              {/* Logistic Regression */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.logisticTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.logisticP1')}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t('body.methods.logisticNote')}
                </p>
              </div>

              {/* PU Learning */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.puTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.puP1Start')}<Mono>S(x) = P(labeled=1|x) / c</Mono>
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t('body.methods.puNote')}
                </p>
              </div>

              {/* Bootstrap CIs */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">{t('body.methods.bootstrapTitle')}</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.methods.bootstrapP1')}
                </p>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 6b: v5.2 Analytical Layer */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="v52-layer" number="07" title={t('sectionLabels.v52-layer')} icon={FlaskConical}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.v52layer.p1Start')}<strong className="text-text-primary">{t('body.v52layer.p1Strong')}</strong>{t('body.v52layer.p1End')}
              </p>

              {/* Three pillars */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    titleKey: 'shapeTitle',
                    icon: Brain,
                    badgeKey: 'shapBadge',
                    color: 'text-accent',
                    bg: 'bg-accent/5 border-accent/15',
                    bodyKey: 'shapBody',
                    whereKey: 'shapWhere',
                  },
                  {
                    titleKey: 'pyodTitle',
                    icon: Target,
                    badgeKey: 'pyodBadge',
                    color: 'text-risk-high',
                    bg: 'bg-risk-high/5 border-risk-high/15',
                    bodyKey: 'pyodBody',
                    whereKey: 'pyodWhere',
                  },
                  {
                    titleKey: 'driftTitle',
                    icon: BarChart3,
                    badgeKey: 'driftBadge',
                    color: 'text-risk-medium',
                    bg: 'bg-risk-medium/5 border-risk-medium/15',
                    bodyKey: 'driftBody',
                    whereKey: 'driftWhere',
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.titleKey} className={`p-3 rounded-md border ${item.bg} space-y-2`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${item.color}`} aria-hidden="true" />
                          <p className={`text-xs font-semibold ${item.color}`}>{t(`body.v52layer.${item.titleKey}`)}</p>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">{t(`body.v52layer.${item.badgeKey}`)}</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{t(`body.v52layer.${item.bodyKey}`)}</p>
                      <p className="text-[10px] text-text-muted font-mono border-t border-border/30 pt-1.5">
                        {t('body.v52layer.whereToFind')} {t(`body.v52layer.${item.whereKey}`)}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Key numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { labelKey: 'statVendorsShap', value: '456K' },
                  { labelKey: 'statPyodScores', value: '9.33M' },
                  { labelKey: 'statDriftFeatures', value: '16' },
                  { labelKey: 'statDualConfirmed', value: '~130K' },
                ].map((m) => (
                  <div key={m.labelKey} className="fern-card p-3 text-center">
                    <p className="pull-stat text-accent">{m.value}</p>
                    <p className="editorial-label mt-1">{t(`body.v52layer.${m.labelKey}`)}</p>
                  </div>
                ))}
              </div>

              {/* AI Confirmed explanation */}
              <div className="p-3 rounded-md bg-background-elevated/40 border border-border/30 space-y-1.5">
                <p className="text-xs font-semibold text-text-primary">
                  {t('body.v52layer.aiConfirmedTitle')}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('body.v52layer.aiConfirmedStart')}<strong className="text-text-primary">{t('body.v52layer.aiConfirmedStrong')}</strong>{t('body.v52layer.aiConfirmedEnd')}
                </p>
              </div>

              <p className="text-xs text-text-muted">
                {t('body.v52layer.noteStart')}<code className="font-mono bg-border/20 px-1 py-0.5 rounded">{t('body.v52layer.noteCode')}</code>{t('body.v52layer.noteEnd')}
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 7: Limitations */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="limitations" number="08" title={t('sectionLabels.limitations')} icon={AlertTriangle}>
            <div className="space-y-3">
              {(
                [
                  { titleKey: 'item1Title', textKey: 'item1Text' },
                  { titleKey: 'item2Title', textKey: 'item2Text' },
                  { titleKey: 'item3Title', textKey: 'item3Text' },
                  { titleKey: 'item4Title', textKey: 'item4Text' },
                  { titleKey: 'item5Title', textKey: 'item5Text' },
                  { titleKey: 'item6Title', textKey: 'item6Text' },
                ] as const
              ).map((item) => (
                <div key={item.titleKey} className="flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-risk-medium shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{t(`body.limitations.${item.titleKey}`)}</p>
                    <p className="text-xs text-text-muted leading-relaxed mt-0.5">{t(`body.limitations.${item.textKey}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 8: Previous Model (v3.3) */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="v33" number="09" title={t('sectionLabels.v33')} icon={History} defaultOpen={false}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.v33section.p1Start')}<strong className="text-text-primary">{t('body.v33section.p1Strong')}</strong>{t('body.v33section.p1End')}<Mono>{t('body.v33section.p1Mono')}</Mono>{t('body.v33section.p1MonoEnd')}
              </p>

              <V33WeightsChart />

              <p className="text-xs text-text-muted">
                {t('body.v33section.bonusFactors')}
              </p>

              {/* Comparison table */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted mb-2 font-mono">
                  {t('body.v33section.modelComparisonLabel')}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table" aria-label={t('body.v33section.tableAriaLabel')}>
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.v33section.tableColMetric')}</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.v33section.tableColV33')}</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.v33section.tableColV60')}</th>
                        <th className="text-right py-2 text-text-muted font-medium">{t('body.v33section.tableColChange')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODEL_COMPARISON.map((row) => (
                        <tr key={row.metric} className="border-b border-border/20">
                          <td className="py-2 pr-3 text-text-primary font-medium">{row.metric}</td>
                          <td className="py-2 pr-3 text-right font-mono text-text-muted">
                            {row.v33}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-accent font-semibold">
                            {row.v60}
                          </td>
                          <td className="py-2 text-right font-mono text-[#71717a]">
                            {row.improvement}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 9: Data Sources */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="data-sources" number="10" title={t('sectionLabels.data-sources')} icon={Database}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('body.dataSources.p1Start')}<strong className="text-text-primary">{t('body.dataSources.p1Strong')}</strong>{t('body.dataSources.p1End')}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label={t('body.dataSources.tableAriaLabel')}>
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColStructure')}</th>
                      <th className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColYears')}</th>
                      <th className="text-left py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColQuality')}</th>
                      <th className="text-right py-2 pr-3 text-text-muted font-medium">{t('body.dataSources.tableColRfc')}</th>
                      <th className="text-left py-2 text-text-muted font-medium">{t('body.dataSources.tableColNotes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_STRUCTURES.map((ds) => (
                      <tr key={ds.structure} className="border-b border-border/20">
                        <td className="py-2 pr-3 font-mono text-accent font-semibold">
                          {ds.structure}
                        </td>
                        <td className="py-2 pr-3 text-text-secondary font-mono">
                          {ds.years}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant="default"
                            className={cn(
                              'text-xs px-1.5 py-0',
                              ds.quality === 'Lowest' && 'bg-risk-critical/10 text-risk-critical border-risk-critical/20',
                              ds.quality === 'Better' && 'bg-risk-medium/10 text-risk-medium border-risk-medium/20',
                              ds.quality === 'Good' && 'bg-accent/10 text-accent border-accent/20',
                              ds.quality === 'Best' && 'bg-risk-low/10 text-risk-low border-risk-low/20',
                            )}
                          >
                            {ds.quality}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-text-secondary">
                          {ds.rfc}
                        </td>
                        <td className="py-2 text-text-muted">{ds.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Amount validation */}
              <div className="p-3 rounded-md bg-risk-critical/5 border border-risk-critical/10">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-risk-critical mb-1">
                  {t('body.dataSources.amountValidationLabel')}
                </p>
                <div className="space-y-1 text-xs text-text-secondary">
                  <p>
                    <strong className="text-text-primary">{t('body.dataSources.rejectStrong')}</strong>{t('body.dataSources.rejectEnd')}
                  </p>
                  <p>
                    <strong className="text-text-primary">{t('body.dataSources.flagStrong')}</strong>{t('body.dataSources.flagEnd')}
                  </p>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  {t('body.dataSources.context')}
                </p>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 10: Known Limitations */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="limitations" number="11" title={t('sectionLabels.limitations')} icon={AlertTriangle} defaultOpen={false}>
            <div className="space-y-6">
              <p className="text-xs text-text-secondary leading-relaxed">
                These limitations are inherent to the data sources, modeling approach, and legal constraints of the platform.
                Understanding them is essential to interpreting risk scores correctly.
              </p>

              {/* Severity summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-risk-critical/5 border border-risk-critical/15">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-critical" />
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-risk-critical">5</span>
                    <span className="text-xs text-text-muted ml-1.5">High Impact</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-risk-high/5 border border-risk-high/15">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-high" />
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-risk-high">5</span>
                    <span className="text-xs text-text-muted ml-1.5">Medium Impact</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-risk-medium/5 border border-risk-medium/15">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-medium" />
                  <div>
                    <span className="text-lg font-bold font-mono tabular-nums text-risk-medium">4</span>
                    <span className="text-xs text-text-muted ml-1.5">Low Impact</span>
                  </div>
                </div>
              </div>

              {/* Summary table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs" aria-label="Model limitations summary">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-text-muted font-medium">Limitation</th>
                      <th className="px-3 py-2.5 text-left text-text-muted font-medium hidden md:table-cell">Impact</th>
                      <th className="px-3 py-2.5 text-left text-text-muted font-medium hidden lg:table-cell">Path to Fix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {([
                      { l: 'Execution-phase fraud invisible', i: 'Construction/infrastructure underscored', f: 'Requires ASF audit data integration' },
                      { l: 'Training bias (dominant cases)', i: 'Small-vendor & multi-sector corruption underdetected', f: 'Add more labeled ground truth cases' },
                      { l: 'Ghost company detection (partial)', i: 'Small-shell EFOS vendors still challenging to detect', f: 'Case 22 included; institution-scoped labels' },
                      { l: 'Vendor deduplication unsolved', i: 'True concentration understated pre-2018', f: 'RFC + address blocking (partial)' },
                      { l: 'Co-bidding signal = zero', i: 'Bid rotation & cover bidding not in score', f: 'Need collusion-specific ground truth' },
                      { l: 'CompraNet abolished Apr 2025', i: 'Future data unavailable; 1.9M records already deleted', f: 'Dependent on government decisions' },
                      { l: 'Pre-2010 data quality', i: '25% of records less reliable', f: 'Structural COMPRANET limitation' },
                      { l: 'Correlation ≠ causation', i: 'Scores require investigative follow-up', f: 'By design — model informs, not concludes' },
                      { l: 'Structural concentration (sector)', i: 'Some sectors over-flagged (Defensa, Energía)', f: 'Sector-specific exclusion lists' },
                      { l: 'Temporal stationarity', i: 'New fraud patterns may be undetected', f: 'Periodic retraining with new cases' },
                      { l: 'Contract modifications invisible', i: 'Infrastructure cost overruns untracked', f: 'Requires ASF audit data (Phase 6)' },
                      { l: 'PU learning SCAR assumption', i: 'c=0.3000 covers only scandal-similar corruption', f: 'Better labeled data from SAT, ASF' },
                      { l: 'Temporal feature leakage', i: 'Vendor aggregates use full history; mitigated by v0.8.5 temporal split', f: 'Point-in-time rolling features' },
                      { l: 'PU c=0.32 post-OECD calibration', i: 'HR=11.01% (within OECD 2–15% range); intercept -2.616 floor applied', f: 'Documented intentional design decision' },
                      { l: 'ARIA T1 = ground-truth lookup', i: 'External-flags +0.20 IPS boost guarantees GT vendors enter T1; T2 is the actual discovery surface', f: 'S.7 deliberate recalibration session pending' },
                    ] as const).map((row) => (
                      <tr key={row.l} className="hover:bg-accent/[0.03]">
                        <td className="px-3 py-2 text-text-primary">{row.l}</td>
                        <td className="px-3 py-2 text-text-muted hidden md:table-cell">{row.i}</td>
                        <td className="px-3 py-2 text-text-muted hidden lg:table-cell">{row.f}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Interpretive guidance */}
              <div className="p-3 rounded-md bg-border/10 border border-border/40">
                <p className="text-xs text-text-muted leading-relaxed">
                  <span className="font-medium text-text-primary">Interpretation guidance: </span>
                  Risk scores are statistical indicators — not verdicts. A high score means strong similarity
                  to documented corruption patterns. A low score does not certify a contract is clean.
                  Use scores for investigation triage only; follow-up with primary sources to establish facts.
                </p>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 11: References */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="references" number="12" title={t('sectionLabels.references')} icon={FileText} defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex justify-end mb-2">
                <CopyCitationButton />
              </div>
              {REFERENCES.map((ref, i) => (
                <div key={i} className="flex gap-2 py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs text-text-muted font-mono w-4 shrink-0 text-right">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="text-xs text-text-secondary">
                      <span className="text-text-primary font-medium">{ref.authors}</span>
                      {' '}({ref.year}).{' '}
                      <em>{ref.title}</em>.
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-text-muted pt-2">
                {t('body.references.footer')}
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

        </motion.div>

        {/* Sidebar: Table of Contents */}
        <TableOfContents />
      </div>

      <CitationBlock context="RUBLI methodology — v0.8.5 risk model" className="mt-2" />
    </div>
      </div>
    </div>
  )
}

export default Methodology
