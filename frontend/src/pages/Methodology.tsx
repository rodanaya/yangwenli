import { useState, memo } from 'react'
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
} from 'lucide-react'
import { RiskFactorTable } from '@/components/RiskExplainer'
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
  { name: 'Price Volatility', coeff: 1.219, note: 'NEW in v5.0 — strongest predictor' },
  { name: 'Win Rate', coeff: 0.727, note: 'NEW in v5.0' },
  { name: 'Vendor Concentration', coeff: 0.428, note: '' },
  { name: 'Industry Mismatch', coeff: 0.305, note: '' },
  { name: 'Same-Day Contracts', coeff: 0.222, note: '' },
  { name: 'Direct Award', coeff: 0.182, note: 'Reversed from v4.0 (-0.197)' },
  { name: 'Network Members', coeff: 0.064, note: 'Now positive (was zeroed in v4.0)' },
  { name: 'Year-End', coeff: 0.059, note: '' },
  { name: 'Institution Risk', coeff: 0.057, note: '' },
  { name: 'Price Ratio', coeff: -0.015, note: '' },
  { name: 'Single Bid', coeff: 0.013, note: '' },
  { name: 'Price Hyp. Confidence', coeff: 0.001, note: '' },
  { name: 'Co-Bid Rate', coeff: 0.0, note: 'Regularized to zero' },
  { name: 'Ad Period Days', coeff: -0.104, note: '' },
  { name: 'Institution Diversity', coeff: -0.848, note: 'NEW in v5.0 — serves many institutions = less risky' },
  { name: 'Sector Spread', coeff: -0.374, note: 'NEW in v5.0 — cross-sector = less risky' },
] as const

const V33_WEIGHTS = [
  { name: 'Single Bidding', weight: 18 },
  { name: 'Non-Open Procedure', weight: 18 },
  { name: 'Price Anomaly', weight: 18 },
  { name: 'Vendor Concentration', weight: 12 },
  { name: 'Short Ad Period', weight: 12 },
  { name: 'Network Risk', weight: 8 },
  { name: 'Year-End Timing', weight: 7 },
  { name: 'Threshold Splitting', weight: 7 },
] as const

const RISK_LEVELS_V5 = [
  { level: 'Critical', threshold: '>= 0.50', meaning: '>= 50% estimated corruption probability', pct: '5.8%', count: '178,938', color: '#f87171' },
  { level: 'High', threshold: '>= 0.30', meaning: '>= 30% estimated probability', pct: '2.2%', count: '67,190', color: '#fb923c' },
  { level: 'Medium', threshold: '>= 0.10', meaning: '>= 10% estimated probability', pct: '9.5%', count: '294,468', color: '#fbbf24' },
  { level: 'Low', threshold: '< 0.10', meaning: '< 10% probability', pct: '82.6%', count: '2,569,411', color: '#4ade80' },
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
  { metric: 'AUC-ROC', v33: '0.584', v50: '0.960', improvement: '+64%' },
  { metric: 'Brier Score', v33: '0.411', v50: '0.060', improvement: '-85%' },
  { metric: 'Detection Rate (med+)', v33: '67.1%', v50: '99.8%', improvement: '+33pp' },
  { metric: 'High+ Detection', v33: '18.3%', v50: '93.0%', improvement: '+75pp' },
  { metric: 'Lift vs Random', v33: '1.22x', v50: '4.04x', improvement: '+2.8x' },
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
        <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="flex-1">{title}</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
            )}
          </CardTitle>
        </CardHeader>
        {isOpen && <CardContent>{children}</CardContent>}
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
  const chartData = V5_COEFFICIENTS.map((c) => ({
    name: c.name,
    coeff: c.coeff,
    note: c.note,
    fill:
      c.coeff > 0 ? '#4ade80' : c.coeff < 0 ? '#f87171' : '#64748b',
  }))

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
                    {d.note && (
                      <p className="text-xs text-text-muted mt-0.5">{d.note}</p>
                    )}
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
  const chartData = [...V33_WEIGHTS].sort((a, b) => b.weight - a.weight)

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
// Table of Contents (sidebar)
// ============================================================================

function TableOfContents() {
  return (
    <nav className="hidden lg:block sticky top-4" aria-label="Table of contents">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold tracking-wider text-text-secondary font-mono mb-2 px-2">
          CONTENTS
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
              <span>{section.label}</span>
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
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-accent" />
          How We Detect Corruption
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Statistical analysis of 3.1M Mexican government procurement contracts
        </p>
      </div>

      {/* Hero KPI badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: '3.1M Contracts', variant: 'default' as const },
          { label: 'AUC 0.960', variant: 'default' as const },
          { label: '15 Cases Validated', variant: 'default' as const },
          { label: '12 Sectors', variant: 'default' as const },
        ].map((kpi) => (
          <Badge
            key={kpi.label}
            variant={kpi.variant}
            className="text-xs px-3 py-1 bg-accent/10 text-accent border-accent/20"
          >
            {kpi.label}
          </Badge>
        ))}
      </div>

      {/* Layout: TOC sidebar + content */}
      <div className="grid gap-5 lg:grid-cols-[1fr_200px]">
        {/* Main Content */}
        <div className="space-y-4">

          {/* Section 2: Model Overview */}
          <CollapsibleSection id="overview" title="Model Overview (v5.0)" icon={Shield}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Every risk score is a <strong className="text-text-primary">calibrated probability</strong>{' '}
                <Mono>P(corrupt|features)</Mono> with 95% confidence intervals. Unlike the previous weighted
                checklist, v5.0 scores have direct probabilistic meaning: a score of 0.35 means we estimate
                a 35% likelihood that this contract exhibits corruption indicators.
              </p>

              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">
                  SCORE FORMULA
                </p>
                <Formula>
                  P(corrupt | z) = sigma(beta_0 + beta^T z) / c
                </Formula>
                <p className="text-xs text-text-muted">
                  Where z = z-score features, beta = learned coefficients, sigma = logistic sigmoid, c = PU correction (0.887)
                </p>
              </div>

              {/* Risk level thresholds table */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 font-mono">
                  RISK LEVEL THRESHOLDS
                </p>
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
                High-risk rate: <strong className="text-text-secondary">7.9%</strong> (critical + high), within OECD benchmark of 2-15%.
                v5.0 replaced the v4.0 statistical framework as the primary model on February 14, 2026.
              </p>
            </div>
          </CollapsibleSection>

          {/* Section 3: The 12 Features */}
          <CollapsibleSection id="features" title="The 16 Features" icon={BarChart3}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Each contract is described by 16 z-score features normalized by sector and year baselines.
                v5.0 adds 4 new behavioral features: price_volatility, institution_diversity, win_rate, and sector_spread.
                The chart below shows the learned cross-validated ElasticNet coefficients.
                Positive coefficients increase estimated corruption probability; negative coefficients decrease it.
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

          {/* Section 3b: Risk Factor Evidence Base */}
          <CollapsibleSection id="risk-evidence" title="Risk Factor Evidence Base" icon={FlaskConical} defaultOpen={false}>
            <div className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                Each risk factor is grounded in peer-reviewed literature on procurement corruption.
                The table below shows each factor's learned coefficient, global evidence strength, and
                key source. Hover over a factor name for mechanism details.
              </p>
              <RiskFactorTable />
            </div>
          </CollapsibleSection>

          {/* Section 4: Key Findings */}
          <CollapsibleSection id="findings" title="Key Findings" icon={Brain}>
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
                  Vendors with wildly varying contract sizes are the strongest corruption signal in v5.0.
                  This is followed by institution diversity (-0.85, protective factor) and win rate (+0.73).
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
                  Direct awards now CORRECTLY increase risk in v5.0
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

          {/* Section 5: Ground Truth Validation */}
          <CollapsibleSection id="validation" title="Ground Truth Validation" icon={Target}>
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                The model was trained and validated against <strong className="text-text-primary">15 documented
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
                but does not contribute additional training data.
              </p>

              {/* Validation metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Test AUC-ROC', value: '0.960' },
                  { label: 'Brier Score', value: '0.060' },
                  { label: 'Lift', value: '4.04x' },
                  { label: 'Detection Rate', value: '99.8%' },
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

          {/* Section 6: Statistical Methods */}
          <CollapsibleSection id="methods" title="Statistical Methods" icon={Beaker}>
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
                  Cross-validated ElasticNet (C=10.0, l1_ratio=0.25) trained on 26,582 known-bad contracts from
                  15 corruption cases with temporal split (train on contracts &lt;= 2020, test on &gt;= 2021).
                  12 per-sector sub-models + 1 global fallback capture sector-specific corruption patterns.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Train AUC: 0.967, Test AUC: 0.960. No ad-hoc coefficient dampening needed -- ElasticNet
                  regularization naturally controls coefficient magnitudes.
                </p>
              </div>

              {/* PU Learning */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">PU-Learning Correction (Elkan & Noto 2008)</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Since unlabeled contracts are not necessarily clean (some may be corrupt but undetected),
                  we apply a Positive-Unlabeled learning correction: <Mono>P(corrupt|x) = P(labeled=1|x) / c</Mono>
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Estimated c = 0.887 using Elkan & Noto holdout method (20% held-out positives) -- meaning
                  ~89% of truly corrupt contracts would be labeled if we had perfect coverage. This replaces
                  v4.0's circular estimator (c=0.890) with an honest out-of-sample estimate.
                </p>
              </div>

              {/* Bootstrap CIs */}
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Bootstrap Confidence Intervals</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Each contract receives a 95% confidence interval from 500 bootstrap resamples of the
                  training data. A score of 0.35 [0.22, 0.48] means: we estimate 35% corruption probability,
                  but given data uncertainty, it could be as low as 22% or as high as 48%.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 7: Limitations */}
          <CollapsibleSection id="limitations" title="Limitations" icon={AlertTriangle}>
            <div className="space-y-3">
              {[
                {
                  title: 'Ground truth concentration',
                  text: 'While diversified to 15 cases across all 12 sectors (up from 9 in 3 sectors), three cases (IMSS, Segalmex, COVID-19) still account for 79% of the 26,582 training contracts. Vendor concentration remains the dominant predictor in most per-sector sub-models.',
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
                  text: 'A high P(corrupt|x) indicates a statistical anomaly consistent with corruption patterns. It does not constitute proof of wrongdoing. Risk scores are intended to prioritize investigation, not determine guilt.',
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

          {/* Section 8: Previous Model (v3.3) */}
          <CollapsibleSection id="v33" title="Previous Model (v3.3)" icon={History} defaultOpen={false}>
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
                  <table className="w-full text-xs" role="table" aria-label="Model comparison v3.3 vs v5.0">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 pr-3 text-text-muted font-medium">Metric</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">v3.3</th>
                        <th className="text-right py-2 pr-3 text-text-muted font-medium">v5.0</th>
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

          {/* Section 9: Data Sources */}
          <CollapsibleSection id="data-sources" title="Data Sources" icon={Database}>
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

          {/* Section 10: References */}
          <CollapsibleSection id="references" title="References" icon={FileText} defaultOpen={false}>
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
                Risk scores are calibrated probabilities with confidence intervals. A high score indicates
                statistical anomaly consistent with corruption patterns -- it does not constitute proof of wrongdoing.
              </p>
            </div>
          </CollapsibleSection>

        </div>

        {/* Sidebar: Table of Contents */}
        <TableOfContents />
      </div>
    </div>
  )
}

export default Methodology
