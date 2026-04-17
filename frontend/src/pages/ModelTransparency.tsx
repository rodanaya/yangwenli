/**
 * Model Transparency Page — Editorial 3-tab Layout
 *
 * Summary · Metrics · Audit Trail
 * Explains the v0.6.5 risk scoring model in plain language.
 */

import { useMemo } from 'react'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import { useQuery } from '@tanstack/react-query'
import { SimpleTabs, TabPanel } from '@/components/ui/SimpleTabs'
import { analysisApi } from '@/api/client'
import { CURRENT_MODEL_VERSION } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'
import { FileText, BarChart3, History } from 'lucide-react'

// ============================================================================
// Design tokens
// ============================================================================

const ACCENT = '#d4922a'
const POSITIVE = '#d4922a' // amber for risk-increasing
const NEGATIVE = '#38bdf8' // cyan/blue for protective

// ============================================================================
// Static model data (v0.6.5)
// ============================================================================

interface Coefficient {
  factor: string
  label: string
  beta: number
  note?: string
}

const ACTIVE_COEFFICIENTS: Coefficient[] = [
  { factor: 'price_volatility', label: 'Price Volatility', beta: 0.5343, note: 'Strongest signal — vendor contract-size variance vs sector norm' },
  { factor: 'institution_diversity', label: 'Institution Diversity', beta: -0.3821, note: 'Protective — vendors serving many institutions are less suspicious' },
  { factor: 'vendor_concentration', label: 'Vendor Concentration', beta: 0.3749, note: 'Vendor value share within sector' },
  { factor: 'price_ratio', label: 'Price Ratio', beta: 0.2345, note: 'Contract amount / sector median' },
  { factor: 'network_member_count', label: 'Network Members', beta: 0.1811, note: 'Co-contracting network size' },
  { factor: 'same_day_count', label: 'Same-Day Contracts', beta: 0.0945, note: 'Threshold splitting signal' },
  { factor: 'win_rate', label: 'Win Rate', beta: 0.0488, note: 'Vendor win rate vs sector baseline' },
  { factor: 'ad_period_days', label: 'Ad Period Days', beta: 0.0423, note: 'Publication period length' },
  { factor: 'direct_award', label: 'Direct Award', beta: 0.0306, note: 'Direct award flag' },
]

const RISK_DISTRIBUTION = [
  { level: 'Critical', threshold: '≥ 0.60', count: 184_031, pct: 6.01, color: '#dc2626' },
  { level: 'High',     threshold: '≥ 0.40', count: 228_814, pct: 7.48, color: '#ea580c' },
  { level: 'Medium',   threshold: '≥ 0.25', count: 821_251, pct: 26.84, color: '#eab308' },
  { level: 'Low',      threshold: '< 0.25', count: 1_817_198, pct: 59.39, color: '#16a34a' },
]

interface VersionEntry {
  version: string
  date: string
  auc: number
  hr: number
  change: string
  status: 'active' | 'preserved' | 'superseded'
}

const VERSION_HISTORY: VersionEntry[] = [
  {
    version: 'v0.6.5',
    date: '2026-03-25',
    auc: 0.828,
    hr: 13.49,
    change: 'Institution-scoped GT labels reduced noise (IMSS Ghost −85%, COVID −73%). Structural FPs excluded. 9 active features after L1 regularization. Current active model.',
    status: 'active',
  },
  {
    version: 'v5.1',
    date: '2026-02-27',
    auc: 0.957,
    hr: 9.0,
    change: 'Added SAT EFOS ghost network (Case 22, 38 vendors). Ghost-company detection avg score 0.028 → 0.283. Preserved in risk_score_v5 column.',
    status: 'preserved',
  },
  {
    version: 'v5.0',
    date: '2026-02-14',
    auc: 0.960,
    hr: 9.1,
    change: 'Per-sector sub-models (1 global + 12 sector LRs). Diversified ground truth to 15 cases across all 12 sectors. Elkan & Noto PU correction. ElasticNet CV.',
    status: 'superseded',
  },
  {
    version: 'v4.0',
    date: '2026-02-09',
    auc: 0.942,
    hr: 11.0,
    change: 'Statistical framework: 12 z-score features, Mahalanobis distance, Bayesian calibration with bootstrap 95% CIs. Ground truth: 9 cases, 17 vendors.',
    status: 'superseded',
  },
  {
    version: 'v3.3',
    date: '2026-02-06',
    auc: 0.584,
    hr: 12.4,
    change: 'Weighted checklist of 8 IMF-aligned factors plus interaction effects. Expert-assigned weights. Foundational model, superseded by statistical framework.',
    status: 'superseded',
  },
]

// ============================================================================
// Editorial primitives
// ============================================================================

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div
      className="border-l-2 pl-4 py-2"
      style={{ borderColor: ACCENT }}
    >
      <div
        className="text-4xl font-bold tabular-nums tracking-tight"
        style={{ fontFamily: 'ui-serif, Georgia, serif', color: ACCENT }}
      >
        {value}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-400 mt-1">
        {label}
      </div>
      {sub && <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{sub}</div>}
    </div>
  )
}

function SectionOverline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
      {children}
    </p>
  )
}

// ============================================================================
// Tab content
// ============================================================================

function SummaryTab({ auc, nContracts }: { auc: number; nContracts: number }) {
  return (
    <div className="space-y-10">
      <section>
        <SectionOverline>Key Facts</SectionOverline>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard
            value={auc.toFixed(3)}
            label="Test AUC-ROC"
            sub="Vendor-stratified hold-out. 0.5 = random, 1.0 = perfect."
          />
          <StatCard
            value="13.49%"
            label="High-Risk Rate"
            sub="OECD compliant (2–15% benchmark range)."
          />
          <StatCard
            value={formatNumber(nContracts || 3_051_294)}
            label="Contracts Scored"
            sub="All v0.6.5-tagged records, 2002–2025."
          />
          <StatCard
            value="748"
            label="Ground-Truth Cases"
            sub="603 vendors, ~288K scoped contracts, institution-windowed."
          />
        </div>
      </section>

      <section>
        <SectionOverline>How the model works</SectionOverline>
        <div className="prose prose-invert max-w-none">
          <p
            className="text-lg leading-relaxed text-zinc-300"
            style={{ fontFamily: 'ui-serif, Georgia, serif' }}
          >
            RUBLI scores every Mexican federal procurement contract on a 0–1 scale
            by comparing it against patterns from 748 documented corruption cases.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400 mt-4">
            The model is a calibrated <strong className="text-zinc-200">logistic regression</strong> with
            Positive-Unlabeled learning correction (Elkan &amp; Noto, 2008). It takes 16 z-score
            features — vendor behavior, price dynamics, network structure, procurement procedure —
            and produces a similarity score to known fraud patterns. Nine features survive L1
            regularization and actively drive scores; the other seven are zeroed out.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400 mt-3">
            There is one global model plus twelve sector-specific sub-models, trained jointly
            via curriculum learning (confirmed cases weighted 1.0, high-confidence 0.8, medium 0.5,
            low 0.2). Sectors with too few positives (Tecnología, Trabajo, Otros) fall back to
            the global model.
          </p>
          <div
            className="mt-6 rounded-xl border p-4"
            style={{ borderColor: `${ACCENT}33`, backgroundColor: `${ACCENT}0d` }}
          >
            <p className="text-[10px] font-mono uppercase tracking-wide mb-1" style={{ color: ACCENT }}>
              What the score means
            </p>
            <p className="text-sm text-zinc-200 leading-relaxed">
              A score of 0.60 does <em>not</em> mean a 60% chance of corruption. It means the
              contract <em>resembles</em> documented corruption cases strongly enough to warrant
              investigation. Scores are triage signals for journalists and auditors — never
              verdicts.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionOverline>Primary signals</SectionOverline>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Strongest positive</div>
            <div className="text-base font-semibold text-zinc-100 mt-1">Price Volatility</div>
            <div className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Contract-size variance vs sector norm. β = +0.5343.
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Strongest protective</div>
            <div className="text-base font-semibold text-zinc-100 mt-1">Institution Diversity</div>
            <div className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Serving many distinct agencies lowers risk. β = −0.3821.
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Concentration</div>
            <div className="text-base font-semibold text-zinc-100 mt-1">Vendor Concentration</div>
            <div className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Vendor's value share within sector. β = +0.3749.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricsTab({ liveCoefficients }: { liveCoefficients: Coefficient[] }) {
  const maxAbs = Math.max(...liveCoefficients.map((c) => Math.abs(c.beta)), 0.0001)

  return (
    <div className="space-y-10">
      <section>
        <SectionOverline>Active Feature Coefficients · v0.6.5 Global Model</SectionOverline>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-3xl">
          Nine features survive L1 regularization. Positive coefficients (amber) push contracts
          toward higher risk scores; negative coefficients (blue) are protective. The other seven
          features in the architecture are regularized to zero.
        </p>

        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th className="text-left py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500 w-[28%]">Feature</th>
                <th className="text-left py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500">Coefficient</th>
                <th className="text-right py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500 w-[14%]">β</th>
              </tr>
            </thead>
            <tbody>
              {liveCoefficients.map((c) => {
                const isPositive = c.beta >= 0
                const color = isPositive ? POSITIVE : NEGATIVE
                const barPct = (Math.abs(c.beta) / maxAbs) * 100
                return (
                  <tr
                    key={c.factor}
                    className="border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="text-zinc-100 font-medium">{c.label}</div>
                      {c.note && (
                        <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{c.note}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden max-w-[320px]">
                          {/* zero marker */}
                          <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-700" />
                          <div
                            className="absolute inset-y-0 rounded-full"
                            style={{
                              backgroundColor: color,
                              left: isPositive ? '50%' : `${50 - barPct / 2}%`,
                              width: `${barPct / 2}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 text-right font-mono tabular-nums text-sm"
                      style={{ color }}
                    >
                      {isPositive ? '+' : ''}
                      {c.beta.toFixed(4)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex gap-6 text-[11px] text-zinc-500 font-mono uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <span className="h-2 w-4 rounded-full" style={{ backgroundColor: POSITIVE }} />
            Risk-increasing
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-4 rounded-full" style={{ backgroundColor: NEGATIVE }} />
            Protective
          </div>
        </div>
      </section>

      <section>
        <SectionOverline>Risk Distribution · 3,051,294 Contracts</SectionOverline>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-3xl">
          How the model distributes Mexico's procurement history across risk tiers. The high-risk
          rate of 13.49% sits within the OECD's 2–15% benchmark, with structural-FP exclusions
          and ghost-companion boosts applied.
        </p>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th className="text-left py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500">Level</th>
                <th className="text-left py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500">Threshold</th>
                <th className="text-right py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500">Contracts</th>
                <th className="text-right py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500">Share</th>
                <th className="text-left py-3 px-4 text-[10px] font-mono uppercase tracking-wide text-zinc-500 w-[28%]">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {RISK_DISTRIBUTION.map((row) => (
                <tr
                  key={row.level}
                  className="border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center gap-2 text-zinc-100 font-medium"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-400 text-xs">{row.threshold}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-200">
                    {formatNumber(row.count)}
                  </td>
                  <td
                    className="py-3 px-4 text-right font-mono tabular-nums font-semibold"
                    style={{ color: row.color }}
                  >
                    {row.pct.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function AuditTrailTab() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <SectionOverline>Model Version History</SectionOverline>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Every score in the database carries a model-version tag. Preserved scores remain
          queryable in <span className="font-mono text-zinc-300">risk_score_v3</span>,{' '}
          <span className="font-mono text-zinc-300">risk_score_v4</span>, and{' '}
          <span className="font-mono text-zinc-300">risk_score_v5</span> columns for reproducibility.
        </p>
      </div>

      <ol className="space-y-4">
        {VERSION_HISTORY.map((entry) => {
          const isActive = entry.status === 'active'
          const borderColor = isActive ? ACCENT : entry.status === 'preserved' ? '#64748b' : '#3f3f46'
          return (
            <li
              key={entry.version}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 border-l-4 transition-colors hover:bg-zinc-900/50"
              style={{ borderLeftColor: borderColor }}
            >
              <div className="flex flex-wrap items-baseline gap-3 mb-3">
                <h3
                  className="text-2xl font-bold tracking-tight"
                  style={{ fontFamily: 'ui-serif, Georgia, serif', color: isActive ? ACCENT : '#e4e4e7' }}
                >
                  {entry.version}
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500">
                  {entry.date}
                </span>
                {isActive && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide"
                    style={{
                      backgroundColor: `${ACCENT}1a`,
                      color: ACCENT,
                      border: `1px solid ${ACCENT}33`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: ACCENT }}
                    />
                    Active
                  </span>
                )}
                {entry.status === 'preserved' && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Preserved
                  </span>
                )}
                {entry.status === 'superseded' && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide bg-zinc-900 text-zinc-500 border border-zinc-800">
                    Superseded
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">AUC</div>
                  <div className="text-xl font-mono tabular-nums text-zinc-100 mt-0.5">
                    {entry.auc.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">High-Risk Rate</div>
                  <div className="text-xl font-mono tabular-nums text-zinc-100 mt-0.5">
                    {entry.hr.toFixed(2)}%
                  </div>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">{entry.change}</p>
            </li>
          )
        })}
      </ol>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 mt-6">
        <SectionOverline>Reproducibility</SectionOverline>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Current model run ID:{' '}
          <span className="font-mono text-zinc-200">CAL-v6.1-202603251039</span>. Training
          hyperparameters fixed via Optuna TPE (150 trials, vendor-stratified 70/30 split):{' '}
          <span className="font-mono text-zinc-200">C = 0.0100</span>,{' '}
          <span className="font-mono text-zinc-200">l1_ratio = 0.9673</span>,{' '}
          PU correction <span className="font-mono text-zinc-200">c = 0.3000</span> (floor).
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Main page
// ============================================================================

export default function ModelTransparency() {
  // Live metadata (AUC + freshness)
  const { data: modelMeta } = useQuery({
    queryKey: ['model', 'metadata'],
    queryFn: () => analysisApi.getModelMetadata(),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  })

  // Live coefficients (with bootstrap CIs) — preferred over static table
  const { data: modelCalibration } = useQuery({
    queryKey: ['model', 'calibration'],
    queryFn: () => analysisApi.getModelCalibration(),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  })

  const liveCoefficients = useMemo<Coefficient[]>(() => {
    const labelMap: Record<string, string> = Object.fromEntries(
      ACTIVE_COEFFICIENTS.map((c) => [c.factor, c.label])
    )
    const noteMap: Record<string, string | undefined> = Object.fromEntries(
      ACTIVE_COEFFICIENTS.map((c) => [c.factor, c.note])
    )
    if (modelCalibration?.coefficients?.length) {
      return modelCalibration.coefficients
        .filter((c) => Math.abs(c.beta) > 0.0005)
        .map((c) => ({
          factor: c.factor,
          label:
            labelMap[c.factor] ??
            c.factor.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
          beta: c.beta,
          note: noteMap[c.factor],
        }))
        .sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta))
    }
    return ACTIVE_COEFFICIENTS
  }, [modelCalibration])

  const auc = modelMeta?.auc_test ?? 0.828
  const nContracts = modelMeta?.n_contracts ?? 3_051_294

  const tabs = [
    { key: 'summary', label: 'Summary', icon: FileText },
    { key: 'metrics', label: 'Metrics', icon: BarChart3 },
    { key: 'audit', label: 'Audit Trail', icon: History },
  ]

  const isLoading = !modelMeta

  return (
    <EditorialPageShell
      kicker="MODEL TRANSPARENCY · GROUND TRUTH"
      headline="The cases that teach the model what corruption looks like."
      paragraph="The RUBLI risk model is trained on 748 documented corruption cases matched to procurement contracts in COMPRANET. These are the ground truth labels — vendor-matched, institution-scoped, and time-windowed to reduce label noise."
      stats={[
        { value: '748', label: 'GT cases' },
        { value: '603', label: 'Vendors' },
        { value: '~288K', label: 'Contracts' },
        { value: 'v0.6.5', label: 'Active model' },
      ]}
      loading={isLoading}
    >
    <Act number="I" label="GROUND TRUTH">
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-10">
      {/* ============================================================== */}
      {/* Editorial hero                                                  */}
      {/* ============================================================== */}
      <header className="border-b border-zinc-800 pb-8">
        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
          RUBLI · {modelMeta?.version ?? CURRENT_MODEL_VERSION} · LOGISTIC REGRESSION
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-50 leading-[1.05]"
          style={{ fontFamily: 'ui-serif, Georgia, serif' }}
        >
          Model Transparency
        </h1>
        <p
          className="text-lg md:text-xl text-zinc-400 leading-relaxed mt-4 max-w-3xl"
          style={{ fontFamily: 'ui-serif, Georgia, serif' }}
        >
          How we score {formatNumber(nContracts)} Mexican federal procurement
          contracts for corruption risk — the features, the math, and the paper trail.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono"
            style={{
              backgroundColor: `${ACCENT}1a`,
              color: ACCENT,
              border: `1px solid ${ACCENT}33`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: ACCENT }}
            />
            Live · AUC {auc.toFixed(3)}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">
            Trained {modelMeta?.trained_at ?? '2026-03-25'}
          </span>
        </div>
      </header>

      {/* ============================================================== */}
      {/* Tabs                                                            */}
      {/* ============================================================== */}
      <SimpleTabs tabs={tabs} defaultTab="summary">
        <TabPanel tabKey="summary">
          <SummaryTab auc={auc} nContracts={nContracts} />
        </TabPanel>
        <TabPanel tabKey="metrics">
          <MetricsTab liveCoefficients={liveCoefficients} />
        </TabPanel>
        <TabPanel tabKey="audit">
          <AuditTrailTab />
        </TabPanel>
      </SimpleTabs>
    </div>
    </Act>
    </EditorialPageShell>
  )
}
