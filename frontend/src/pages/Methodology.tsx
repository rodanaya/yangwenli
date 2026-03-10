import { useState, memo, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  BookOpen,
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
} from 'lucide-react'
import { RiskFactorTable } from '@/components/RiskExplainer'
import { RiskScoreDisclaimer } from '@/components/RiskScoreDisclaimer'
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from '@/components/charts'

// ============================================================================
// Static Data
// ============================================================================

const V5_COEFFICIENTS = [
  { nameKey: 'priceVolatility', coeff: 1.219 },
  { nameKey: 'winRate', coeff: 0.727 },
  { nameKey: 'vendorConcentration', coeff: 0.428 },
  { nameKey: 'industryMismatch', coeff: 0.305 },
  { nameKey: 'sameDayContracts', coeff: 0.222 },
  { nameKey: 'directAward', coeff: 0.182 },
  { nameKey: 'networkMembers', coeff: 0.064 },
  { nameKey: 'yearEnd', coeff: 0.059 },
  { nameKey: 'institutionRisk', coeff: 0.057 },
  { nameKey: 'priceRatio', coeff: -0.015 },
  { nameKey: 'singleBid', coeff: 0.013 },
  { nameKey: 'priceHypConfidence', coeff: 0.001 },
  { nameKey: 'coBidRate', coeff: 0.0 },
  { nameKey: 'adPeriodDays', coeff: -0.104 },
  { nameKey: 'institutionDiversity', coeff: -0.848 },
  { nameKey: 'sectorSpread', coeff: -0.374 },
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

const RISK_LEVELS_V5 = [
  { level: 'Critical', threshold: '>= 0.50', meaning: 'Very high similarity to known corruption patterns', pct: '6.5%', count: '201,745', color: '#f87171' },
  { level: 'High', threshold: '>= 0.30', meaning: 'High similarity to known corruption patterns', pct: '4.1%', count: '126,553', color: '#fb923c' },
  { level: 'Medium', threshold: '>= 0.10', meaning: 'Moderate similarity to known corruption patterns', pct: '43.9%', count: '~1,363,000', color: '#fbbf24' },
  { level: 'Low', threshold: '< 0.10', meaning: 'Low similarity to known corruption patterns', pct: '45.6%', count: '~1,415,000', color: '#4ade80' },
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
  { metric: 'AUC-ROC', v33: '0.584', v50: '0.9572', improvement: '+64%' },
  { metric: 'Brier Score', v33: '0.411', v50: '0.060', improvement: '-85%' },
  { metric: 'Detection Rate (med+)', v33: '67.1%', v50: '99.8%', improvement: '+33pp' },
  { metric: 'High+ Detection', v33: '18.3%', v50: '93.0%', improvement: '+75pp' },
  { metric: 'Lift vs Random', v33: '1.22x', v50: '4.04x', improvement: '+2.8x' },
] as const

const MODEL_EVOLUTION_STEPS = [
  {
    version: 'v3.3',
    date: 'Feb 2026',
    title: 'Weighted Checklist',
    desc: '8 expert-weighted factors, IMF CRI aligned. AUC barely above random.',
    metric: 'AUC 0.584',
    active: false,
    overlay: false,
  },
  {
    version: 'v4.0',
    date: 'Feb 2026',
    title: 'Statistical Framework',
    desc: 'Z-score normalization, Bayesian calibration, 9 corruption cases, 12 features.',
    metric: 'AUC 0.942',
    active: false,
    overlay: false,
  },
  {
    version: 'v5.0',
    date: 'Feb 2026',
    title: 'Per-Sector Models',
    desc: '12 sector sub-models, 15 documented cases, temporal train/test split.',
    metric: 'AUC 0.960',
    active: false,
    overlay: false,
  },
  {
    version: 'v5.1',
    date: 'Feb 27, 2026',
    title: 'EFOS Integration',
    desc: '22 cases including SAT EFOS Case 22: 38 RFC-confirmed ghost companies.',
    metric: 'AUC 0.957',
    active: true,
    overlay: false,
  },
  {
    version: 'v5.2 layer',
    date: 'Mar 7, 2026',
    title: 'Analytical Overlay (Live)',
    desc: 'SHAP per-vendor explanations (456K vendors) + PyOD cross-model ensemble (9.3M scores) + KS drift monitoring. See Vendor Profile → Risk tab, Contract detail → AI Confirmed, Dashboard → Cross-Model.',
    metric: '~130K dual-confirmed',
    active: false,
    overlay: true,
  },
] as const

// ============================================================================
// Section IDs for TOC navigation
// ============================================================================

const SECTIONS = [
  { id: 'overview', label: 'Model Overview', icon: Shield },
  { id: 'features', label: 'The 16 Features', icon: BarChart3 },
  { id: 'findings', label: 'Key Findings', icon: Brain },
  { id: 'validation', label: 'Ground Truth Validation', icon: Target },
  { id: 'methods', label: 'Statistical Methods', icon: Beaker },
  { id: 'v52-layer', label: 'v5.2 Analytical Layer', icon: FlaskConical },
  { id: 'limitations', label: 'Limitations', icon: AlertTriangle },
  { id: 'v33', label: 'Previous Model (v3.3)', icon: History },
  { id: 'data-sources', label: 'Data Sources', icon: Database },
  { id: 'references', label: 'References', icon: FileText },
] as const

// ============================================================================
// Helper Components
// ============================================================================

function CollapsibleSection({
  id,
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  id: string
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section id={id} className="scroll-mt-20">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            <button
              type="button"
              className="w-full flex items-center gap-2 cursor-pointer select-none text-left"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls={`section-content-${id}`}
            >
              <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="flex-1">{title}</span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
              )}
            </button>
          </CardTitle>
        </CardHeader>
        {isOpen && <CardContent id={`section-content-${id}`}>{children}</CardContent>}
      </Card>
    </section>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-accent">{children}</span>
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

const CoefficientChart = memo(function CoefficientChart() {
  const { t } = useTranslation('methodology')
  const chartData = useMemo(() => V5_COEFFICIENTS.map((c) => ({
    name: t(`featureNames.${c.nameKey}`),
    coeff: c.coeff,
    fill: c.coeff > 0 ? '#4ade80' : c.coeff < 0 ? '#f87171' : '#64748b',
  })), [t])

  return (
    <div className="h-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} opacity={0.3} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            domain={[-1.0, 1.4]}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={140}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.name}</p>
                    <p className="text-xs text-text-muted tabular-nums font-mono">
                      {d.coeff > 0 ? '+' : ''}{d.coeff.toFixed(3)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="coeff" radius={[0, 3, 3, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} opacity={0.3} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            domain={[0, 20]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={130}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.name}</p>
                    <p className="text-xs text-text-muted tabular-nums">{d.weight}% weight</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="weight" fill="var(--color-accent)" radius={[0, 3, 3, 0]} fillOpacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// ============================================================================
// Model Evolution Timeline
// ============================================================================

function ModelEvolutionTimeline() {
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
          'w-40 flex-shrink-0 rounded-lg border p-3 text-[11px] space-y-1.5',
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
        <p className="font-semibold text-text-primary leading-tight">{step.title}</p>
        <p className="text-text-muted leading-relaxed">{step.desc}</p>
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
            <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-accent/10 text-accent">
              Active
            </span>
          )}
          {step.overlay && (
            <span className="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-border/30 text-text-muted">
              Overlay
            </span>
          )}
        </div>
      </div>
    )
    return acc
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-accent" aria-hidden="true" />
          Model Evolution
        </CardTitle>
        <p className="text-xs text-text-muted">
          From expert-weighted checklist (v3.3) to per-sector ML with cross-model validation and explainability (v5.2 layer).
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="flex items-stretch gap-1.5 min-w-max">
            {nodes}
          </div>
        </div>
      </CardContent>
    </Card>
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
        <p className="text-xs font-semibold tracking-wider text-text-secondary font-mono mb-2 px-2">
          {t('contents')}
        </p>
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-accent/5 transition-colors"
            >
              <Icon className="h-3 w-3 text-text-muted" aria-hidden="true" />
              <span>{t(`sectionLabels.${section.id}`)}</span>
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
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-accent" />
          {t('pageHeadline')}
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          {t('pageSubline')}
        </p>
      </div>

      {/* Hero KPI badges */}
      <motion.div
        className="flex flex-wrap gap-2"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
      >
        {[
          { label: '3.1M Contracts', variant: 'default' as const },
          { label: 'AUC 0.9572', variant: 'default' as const },
          { label: '22 Cases Validated', variant: 'default' as const },
          { label: '12 Sectors', variant: 'default' as const },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={staggerItem}>
            <Badge
              variant={kpi.variant}
              className="text-xs px-3 py-1 bg-accent/10 text-accent border-accent/20"
            >
              {kpi.label}
            </Badge>
          </motion.div>
        ))}
      </motion.div>

      {/* Model Evolution Flowchart */}
      <ModelEvolutionTimeline />

      {/* Layout: TOC sidebar + content */}
      <div className="grid gap-5 lg:grid-cols-[1fr_200px]">
        {/* Main Content */}
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
        >

          {/* Section 2: Model Overview */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="overview" title={t('sectionLabels.overview')} icon={Shield}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Every risk score is a <strong className="text-text-primary">statistical corruption risk indicator</strong>{' '}
                <Mono>S(corrupt|features)</Mono> with 95% confidence intervals. Unlike the previous weighted
                checklist, v5.1 scores measure statistical similarity to documented corruption patterns: a score of 0.35 means this contract's procurement characteristics closely resemble those from known corruption cases.
              </p>

              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">
                  SCORE FORMULA
                </p>
                <Formula>
                  S(z) = sigma(beta_0 + beta^T z) / c
                </Formula>
                <p className="text-xs text-text-muted">
                  Where z = z-score features, beta = learned coefficients, sigma = logistic sigmoid, c = PU correction (0.882).
                  S(z) is a <strong>risk similarity score</strong> — it measures how closely a contract&apos;s
                  procurement characteristics resemble those from documented corruption cases. It is not a
                  literal probability of corruption.
                </p>
              </div>

              {/* Risk level thresholds table */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                    RISK LEVEL THRESHOLDS
                  </p>
                  <RiskScoreDisclaimer />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table" aria-label="Risk level thresholds">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">Level</th>
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">Threshold</th>
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">Meaning</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">Distribution</th>
                        <th className="text-right py-2 text-text-muted font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RISK_LEVELS_V5.map((r) => (
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
                High-risk rate: <strong className="text-text-secondary">10.6%</strong> (critical + high).
                Thresholds were calibrated using 22 documented corruption cases to yield a rate consistent with
                international procurement risk ranges. v5.1 is the active model, replacing v5.0 on February 27, 2026.
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 3: The 12 Features */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="features" title={t('sectionLabels.features')} icon={BarChart3}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Each contract is described by 16 z-score features normalized by sector and year baselines.
                v5.1 uses 4 behavioral features added in v5.0: price_volatility, institution_diversity, win_rate, and sector_spread.
                The chart below shows the learned cross-validated ElasticNet coefficients.
                Positive coefficients increase the risk score; negative coefficients decrease it.
              </p>

              <CoefficientChart />

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#f87171]" aria-hidden="true" />
                  <span className="text-text-muted">Increases risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" aria-hidden="true" />
                  <span className="text-text-muted">Decreases risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#64748b]" aria-hidden="true" />
                  <span className="text-text-muted">No signal</span>
                </div>
              </div>

              <p className="text-xs text-text-muted">
                Coefficients from cross-validated ElasticNet (C=10.0, l1_ratio=0.25).
                4 new features (price_volatility, institution_diversity, win_rate, sector_spread) absorb
                variance previously captured by vendor_concentration alone, producing a more balanced model.
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 3b: Risk Factor Evidence Base */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="risk-evidence" title={t('sectionLabels.risk-evidence')} icon={FlaskConical} defaultOpen={false}>
            <div className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                Each risk factor is grounded in peer-reviewed literature on procurement corruption.
                The table below shows each factor's learned coefficient, global evidence strength, and
                key source. Hover over a factor name for mechanism details.
              </p>
              <RiskFactorTable />
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 4: Key Findings */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="findings" title={t('sectionLabels.findings')} icon={Brain}>
            <div className="space-y-4">

              {/* Finding 1: Vendor Concentration */}
              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-1">
                  #1 PREDICTOR
                </p>
                <p className="text-sm font-bold text-text-primary">
                  Price Volatility is the strongest predictor (+1.22)
                </p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Vendors with wildly varying contract sizes are the strongest corruption signal.
                  This is followed by institution diversity (-0.85, associated with lower risk) and win rate (+0.73).
                  Vendor concentration (+0.43) remains important but is no longer the dominant predictor,
                  as the 4 new behavioral features absorb much of the variance it previously captured alone.
                </p>
              </div>

              {/* Finding 2: Reversed factors */}
              <div className="p-3 rounded-md bg-risk-medium/5 border border-risk-medium/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-risk-medium mb-1">
                  COUNTERINTUITIVE
                </p>
                <p className="text-sm font-bold text-text-primary">
                  Direct awards now CORRECTLY increase risk (fixed in v5.0, retained in v5.1)
                </p>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">1.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">Direct awards now increase risk</strong>{' '}
                      <Mono>(beta = +0.182)</Mono> -- With diversified ground truth and new behavioral features,
                      direct awards correctly increase risk, aligning with OECD guidance. This was reversed (-0.197) in v4.0.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">2.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">Network membership now correctly positive</strong>{' '}
                      <Mono>(beta = +0.064)</Mono> -- Network membership now naturally increases risk.
                      In v4.0, the -4.11 raw coefficient was a training artifact that had to be zeroed.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-text-muted shrink-0 w-2">3.</span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">Protective factors discovered</strong>{' '}
                      <Mono>(institution_diversity -0.85, sector_spread -0.37)</Mono> -- Vendors serving many
                      institutions or operating across sectors are LESS suspicious, suggesting legitimate diversified operations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Finding 3: Co-bidding */}
              <div className="p-3 rounded-md bg-background-elevated/50 border border-border/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                  NO SIGNAL
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Co-bidding provides NO signal</strong> --
                  The co_bid_rate coefficient was regularized to exactly 0.0 by L2 regularization. Co-bidding
                  patterns do not help distinguish known-bad contracts from random contracts in this dataset.
                  This suggests the known-bad vendors operate through market concentration rather than collusion.
                </p>
              </div>

              <div className="p-3 rounded-md border border-risk-high/20 bg-risk-high/5">
                <p className="text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">These findings challenge the standard OECD/IMF
                  anti-corruption framework</strong> for Mexican procurement. The traditional indicators
                  (single bidding, direct awards, short ad periods) that dominate international methodology
                  are weak or reversed in our ground truth data. This may reflect the specific characteristics
                  of Mexican procurement corruption, or the limitations of our ground truth sample.
                </p>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 5: Ground Truth Validation */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="validation" title={t('sectionLabels.validation')} icon={Target}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                The model was trained and validated against <strong className="text-text-primary">22 documented
                Mexican corruption cases</strong>, matching 27 vendors to 26,582 contracts across all 12 sectors in the COMPRANET database.
              </p>

              {/* Cases table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label="Corruption cases validation">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-2 text-text-muted font-medium">Case</th>
                      <th className="text-left py-2 pr-2 text-text-muted font-medium">Type</th>
                      <th className="text-right py-2 pr-2 text-text-muted font-medium">Contracts</th>
                      <th className="text-right py-2 pr-2 text-text-muted font-medium">Detected</th>
                      <th className="text-right py-2 pr-2 text-text-muted font-medium">High+</th>
                      <th className="text-right py-2 text-text-muted font-medium">Avg Score</th>
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
                *Case 9 (PEMEX Emilio Lozoya) shares vendors with the Odebrecht case. Documented for reference
                but does not contribute additional training data. Cases 16–19 are in the database but inactive
                (caused v5.0.2 regression). Cases 20–21 have vendor matching pending. Case 22 (SAT EFOS,
                38 RFC-confirmed ghost companies) is included in the active v5.1 model — avg score improved
                from 0.028 (v5.0) to 0.283 (v5.1), but 58.2% of EFOS contracts still score below medium.
              </p>

              {/* Validation metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Test AUC-ROC', value: '0.9572' },
                  { label: 'Brier Score', value: '0.060' },
                  { label: 'Lift', value: '4.04x' },
                  { label: 'Ground Truth Coverage (medium+)', value: '99.8%' },
                ].map((m) => (
                  <div key={m.label} className="p-2.5 rounded-md bg-background-elevated/50">
                    <p className="text-lg font-bold tabular-nums text-text-primary font-mono">
                      {m.value}
                    </p>
                    <p className="text-xs text-text-muted">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 6: Statistical Methods */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="methods" title={t('sectionLabels.methods')} icon={Beaker}>
            <div className="space-y-4">

              {/* Z-scores */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Z-Score Normalization</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Each feature is normalized relative to its sector and year baseline. A direct award in
                  Defensa (where 80% are direct) is less suspicious than in Educacion (where 50% are direct).
                </p>
                <Formula>
                  z_i = (x_i - mu_i(sector, year)) / max(sigma_i(sector, year), 0.001)
                </Formula>
                <p className="text-xs text-text-muted">
                  3,372 baselines computed across 12 sectors, ~24 years, and 16 features.
                  Fallback hierarchy: sector+year (if n &gt;= 30), sector-only (if n &gt;= 100), global.
                </p>
              </div>

              {/* Mahalanobis */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Mahalanobis Distance</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Captures multivariate anomalies -- contracts that are unusual across multiple dimensions
                  simultaneously. This replaces the 5 hardcoded interaction pairs from v3.3 with a full
                  covariance-based approach.
                </p>
                <Formula>
                  D^2(z) = z^T Sigma^(-1) z ~ chi^2(16)
                </Formula>
                <p className="text-xs text-text-muted">
                  Covariance estimated with Ledoit-Wolf shrinkage for stability in small sectors.
                  P-values computed against chi-squared distribution with 16 degrees of freedom.
                </p>
              </div>

              {/* Logistic Regression */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Per-Sector Logistic Regression</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Cross-validated ElasticNet (C=10.0, l1_ratio=0.25) trained on 26,704 known-bad contracts from
                  22 corruption cases with temporal split (train on contracts &lt;= 2020, test on &gt;= 2021).
                  12 per-sector sub-models + 1 global fallback capture sector-specific corruption patterns.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Train AUC: 0.9642, Test AUC: 0.9572. No ad-hoc coefficient dampening needed — ElasticNet
                  regularization naturally controls coefficient magnitudes.
                </p>
              </div>

              {/* PU Learning */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">PU-Learning Correction (Elkan & Noto 2008)</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Since unlabeled contracts are not necessarily clean (some may be corrupt but undetected),
                  we apply a Positive-Unlabeled learning correction: <Mono>S(x) = P(labeled=1|x) / c</Mono>
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Estimated c = 0.8815 using Elkan & Noto holdout method (20% held-out positives) — meaning
                  ~88% of truly corrupt contracts would be labeled if we had perfect coverage. This replaces
                  v4.0's circular estimator (c=0.890) with an honest out-of-sample estimate. IMPORTANT:
                  The SCAR assumption (labeled positives are random sample of all corrupt contracts) is
                  structurally violated — known cases are high-profile scandals, not a random sample.
                  c=0.8815 estimates coverage of scandal-similar corruption only.
                </p>
              </div>

              {/* Bootstrap CIs */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Bootstrap Confidence Intervals</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Each contract receives a 95% confidence interval from 500 bootstrap resamples of the
                  training data. A score of 0.35 [0.22, 0.48] means: the risk indicator is 0.35,
                  but given data uncertainty, it could be as low as 0.22 or as high as 0.48.
                </p>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 6b: v5.2 Analytical Layer */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="v52-layer" title={t('sectionLabels.v52-layer')} icon={FlaskConical}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                The <strong className="text-text-primary">v5.2 analytical layer</strong> adds three independent
                ML tools on top of the active v5.1 risk scores. These tools do not replace or alter any contract
                risk scores — they provide additional explanations and cross-validation signals.
              </p>

              {/* Three pillars */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    title: 'SHAP Explanations',
                    icon: Brain,
                    badge: '456K vendors',
                    color: 'text-accent',
                    bg: 'bg-accent/5 border-accent/15',
                    body: 'Exact Shapley values (φᵢ = βᵢ × (zᵢ − E[zᵢ])) computed for each vendor using their sector-specific model coefficients. Shows which of the 16 z-score features drove the risk score up or down.',
                    where: 'Vendor Profile → Risk tab → SHAP Analysis panel',
                  },
                  {
                    title: 'PyOD Cross-Validation',
                    icon: Target,
                    badge: '9.3M scores',
                    color: 'text-risk-high',
                    bg: 'bg-risk-high/5 border-risk-high/15',
                    body: 'Isolation Forest + COPOD ensemble anomaly detection run independently on all 3.1M contracts. A high ensemble score means the contract is a statistical outlier even without knowing the ground truth label.',
                    where: 'Contract detail → AI Confirmed badge · Dashboard → Cross-Model Validation · Explore → AI Confirmed filter',
                  },
                  {
                    title: 'Drift Monitoring',
                    icon: BarChart3,
                    badge: '16 features',
                    color: 'text-risk-medium',
                    bg: 'bg-risk-medium/5 border-risk-medium/15',
                    body: 'Kolmogorov-Smirnov tests compare the 2024–2025 feature distribution against the 2002–2020 training baseline. Detects when new procurement data develops patterns unlike the training period.',
                    where: 'Model Transparency → Drift Monitor section',
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className={`p-3 rounded-md border ${item.bg} space-y-2`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${item.color}`} aria-hidden="true" />
                          <p className={`text-xs font-semibold ${item.color}`}>{item.title}</p>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">{item.badge}</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{item.body}</p>
                      <p className="text-[10px] text-text-muted font-mono border-t border-border/30 pt-1.5">
                        Where to find: {item.where}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Key numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Vendors with SHAP', value: '456K' },
                  { label: 'PyOD Scores Computed', value: '9.33M' },
                  { label: 'Features Drift-Monitored', value: '16' },
                  { label: 'Dual-Confirmed Contracts', value: '~130K' },
                ].map((m) => (
                  <div key={m.label} className="p-2.5 rounded-md bg-background-elevated/50 text-center">
                    <p className="text-lg font-bold tabular-nums text-accent font-mono">{m.value}</p>
                    <p className="text-xs text-text-muted">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* AI Confirmed explanation */}
              <div className="p-3 rounded-md bg-background-elevated/40 border border-border/30 space-y-1.5">
                <p className="text-xs font-semibold text-text-primary">
                  What "AI Confirmed" means
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  A contract is <strong className="text-text-primary">dual-confirmed</strong> when the supervised
                  v5.1 logistic model scores it as high or critical risk <em>and</em> the unsupervised PyOD
                  ensemble independently scores it above the 0.50 anomaly threshold. Two completely different
                  methods — one trained on labeled corruption cases, one trained on no labels at all — agree
                  that this contract is unusual. This convergence reduces the false-positive rate for
                  investigation triage.
                </p>
              </div>

              <p className="text-xs text-text-muted">
                Note: v5.2 is an analytical overlay — it adds explanability and cross-validation. The active
                risk model is v5.1. Contract <code className="font-mono bg-border/20 px-1 py-0.5 rounded">risk_score</code> values
                are unchanged by the v5.2 layer.
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 7: Limitations */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="limitations" title={t('sectionLabels.limitations')} icon={AlertTriangle}>
            <div className="space-y-3">
              {[
                {
                  title: 'Ground truth concentration',
                  text: 'While diversified to 22 cases across all 12 sectors (up from 9 in 3 sectors), three cases (IMSS, Segalmex, COVID-19) still account for 79% of the 26,582 training contracts. Vendor concentration remains the dominant predictor in most per-sector sub-models.',
                },
                {
                  title: 'Small-case detection is weaker',
                  text: 'Cases with few contracts (La Estafa Maestra: 10, Grupo Higa: 3, Oceanografia: 2) have lower detection rates. The model requires sufficient contract volume to detect patterns reliably.',
                },
                {
                  title: 'Data quality varies by period',
                  text: 'Structure A (2002-2010) has only 0.1% RFC coverage. Z-scores and risk estimates are less reliable for this period. Network analysis requires 2010+ data for meaningful results.',
                },
                {
                  title: 'PU assumption sensitivity',
                  text: 'The Elkan & Noto correction (c=0.887) assumes labeled positives are representative of all corrupt contracts. If undiscovered corruption has fundamentally different patterns, the correction may be inaccurate.',
                },
                {
                  title: 'Co-bidding provides no signal',
                  text: 'The co_bid_rate coefficient was regularized to exactly 0.0 in both the global model and all 12 per-sector sub-models. Co-bidding patterns do not discriminate in our current ground truth.',
                },
                {
                  title: 'No causal claims',
                  text: 'A high risk score indicates a statistical anomaly consistent with documented corruption patterns. It does not constitute proof of wrongdoing. Risk scores are intended to prioritize investigation, not determine guilt.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-risk-medium shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-muted leading-relaxed mt-0.5">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 8: Previous Model (v3.3) */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="v33" title={t('sectionLabels.v33')} icon={History} defaultOpen={false}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                The v3.3 model was a <strong className="text-text-primary">weighted indicator checklist</strong>{' '}
                with 8 base factors aligned to the IMF Corruption Risk Index methodology. Each factor contributed
                a percentage of the total score, with interaction bonuses for correlated factor pairs. Scores were
                preserved in the <Mono>risk_score_v3</Mono> column for comparison.
              </p>

              <V33WeightsChart />

              <p className="text-xs text-text-muted">
                Additional bonus factors: Co-bidding +5%, Price Hypothesis +5%, Industry Mismatch +3%, Institution Risk +3%.
                5 interaction pairs with up to +15% bonus. Score capped at 1.0.
              </p>

              {/* Comparison table */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 font-mono">
                  MODEL COMPARISON
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table" aria-label="Model comparison v3.3 vs v5.1">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">Metric</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">v3.3</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">v5.1</th>
                        <th className="text-right py-2 text-text-muted font-medium">Change</th>
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
                            {row.v50}
                          </td>
                          <td className="py-2 text-right font-mono text-[#4ade80]">
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
          <CollapsibleSection id="data-sources" title={t('sectionLabels.data-sources')} icon={Database}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                All procurement data comes from <strong className="text-text-primary">COMPRANET</strong>,
                the Mexican government's official electronic procurement system. The data spans 4 different
                structures with varying column counts and quality levels.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label="COMPRANET data structures">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-3 text-text-muted font-medium">Structure</th>
                      <th className="text-left py-2 pr-3 text-text-muted font-medium">Years</th>
                      <th className="text-left py-2 pr-3 text-text-muted font-medium">Quality</th>
                      <th className="text-right py-2 pr-3 text-text-muted font-medium">RFC Coverage</th>
                      <th className="text-left py-2 text-text-muted font-medium">Notes</th>
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
                <p className="text-xs font-semibold uppercase tracking-wider text-risk-critical mb-1">
                  AMOUNT VALIDATION
                </p>
                <div className="space-y-1 text-xs text-text-secondary">
                  <p>
                    <strong className="text-text-primary">Reject:</strong> Contracts exceeding 100B MXN
                    are excluded as data entry errors (decimal point mistakes in original COMPRANET data).
                  </p>
                  <p>
                    <strong className="text-text-primary">Flag:</strong> Contracts between 10B and 100B MXN
                    are included but marked for manual review.
                  </p>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Context: Mexico's entire federal budget is ~8T MXN annually. A 100B contract would be 1.25% of the national budget.
                </p>
              </div>
            </div>
          </CollapsibleSection>
          </motion.div>

          {/* Section 10: References */}
          <motion.div variants={staggerItem}>
          <CollapsibleSection id="references" title={t('sectionLabels.references')} icon={FileText} defaultOpen={false}>
            <div className="space-y-2">
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
                Risk scores are statistical indicators with confidence intervals. A high score indicates
                similarity to documented corruption patterns -- it does not constitute proof of wrongdoing.
              </p>
            </div>
          </CollapsibleSection>
          </motion.div>

        </motion.div>

        {/* Sidebar: Table of Contents */}
        <TableOfContents />
      </div>
    </div>
  )
}

export default Methodology
