/**
 * Model Transparency Page — Editorial 3-tab Layout
 *
 * Summary · Metrics · Audit Trail
 * Explains the v0.6.5 risk scoring model in plain language.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  { factor: 'price_ratio', label: 'Price Ratio', beta: 0.4159, note: 'Contract amount / sector median' },
  { factor: 'institution_diversity', label: 'Institution Diversity', beta: -0.2736, note: 'Protective — vendors serving many institutions are less suspicious' },
  { factor: 'vendor_concentration', label: 'Vendor Concentration', beta: 0.2736, note: 'Vendor value share within sector' },
  { factor: 'network_member_count', label: 'Network Members', beta: 0.1404, note: 'Co-contracting network size' },
  { factor: 'same_day_count', label: 'Same-Day Contracts', beta: 0.1084, note: 'Threshold splitting signal' },
  { factor: 'ad_period_days', label: 'Ad Period Days', beta: 0.0781, note: 'Publication period length' },
  { factor: 'single_bid', label: 'Single Bid', beta: 0.0587, note: 'Competitive procedure with only one bidder' },
  { factor: 'direct_award', label: 'Direct Award', beta: 0.0306, note: 'Direct award flag' },
]

const RISK_DISTRIBUTION = [
  { level: 'Critical', threshold: '≥ 0.60', count: 184_031, pct: 6.01, color: '#dc2626' },
  { level: 'High',     threshold: '≥ 0.40', count: 228_814, pct: 7.48, color: '#ea580c' },
  { level: 'Medium',   threshold: '≥ 0.25', count: 821_251, pct: 26.84, color: '#eab308' },
  { level: 'Low',      threshold: '< 0.25', count: 1_817_198, pct: 59.39, color: 'var(--color-text-muted)' },
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
      className="pl-4 py-1"
      style={{ borderLeft: `2px solid ${ACCENT}` }}
    >
      <div
        className="font-mono tabular-nums leading-none"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: ACCENT,
        }}
      >
        {value}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary mt-2">
        {label}
      </div>
      {sub && <div className="text-xs text-text-muted mt-1.5 leading-relaxed">{sub}</div>}
    </div>
  )
}

function SectionKicker({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: accent ? ACCENT : '#52525b' }}
      />
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary">
        {children}
      </span>
    </div>
  )
}

function SectionHeadline({ eyebrow, headline, deck }: { eyebrow: string; headline: string; deck?: string }) {
  return (
    <div className="mb-6">
      <SectionKicker>{eyebrow}</SectionKicker>
      <h2
        className="text-text-primary leading-[1.15] mb-2"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {headline}
      </h2>
      {deck && (
        <p
          className="text-text-secondary max-w-3xl"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            lineHeight: 1.55,
          }}
        >
          {deck}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Tab content
// ============================================================================

function SummaryTab({ auc, nContracts }: { auc: number; nContracts: number }) {
  return (
    <div className="space-y-14">
      {/* Key Facts — editorial stat row */}
      <section>
        <SectionKicker accent>Key facts</SectionKicker>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
          <StatCard
            value={auc.toFixed(3)}
            label="Test AUC-ROC"
            sub="Vendor-stratified hold-out. 0.5 = random, 1.0 = perfect."
          />
          <StatCard
            value="13.49%"
            label="High-risk rate"
            sub="OECD compliant (2–15% benchmark)."
          />
          <StatCard
            value={formatNumber(nContracts || 3_051_294)}
            label="Contracts scored"
            sub="All v0.6.5-tagged records, 2002–2025."
          />
          <StatCard
            value="748"
            label="Ground-truth cases"
            sub="603 vendors · 288K scoped contracts."
          />
        </div>
      </section>

      {/* How the model works — editorial article */}
      <section>
        <SectionHeadline
          eyebrow="How the model works"
          headline="Similarity to documented corruption — not literal probability"
          deck="A calibrated logistic regression trained on 748 ground-truth cases produces a 0–1 score for every federal procurement contract since 2002."
        />

        <div className="max-w-3xl space-y-5">
          <p
            className="text-text-secondary"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: '1.15rem',
              lineHeight: 1.65,
            }}
          >
            <span
              className="float-left mr-2 leading-[0.85]"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontSize: '3.5rem',
                fontWeight: 700,
                color: ACCENT,
                marginTop: '0.15rem',
              }}
            >
              R
            </span>
            UBLI scores every Mexican federal procurement contract on a 0–1 scale
            by comparing it against patterns from 748 documented corruption cases — ghost
            companies, bid rigging, captured institutions, inflated contracts.
          </p>
          <p className="text-[0.95rem] leading-[1.7] text-text-secondary" style={{ fontFamily: 'var(--font-family-serif)' }}>
            The model is a calibrated <span className="text-text-secondary font-medium">logistic regression</span> with
            Positive-Unlabeled learning correction (Elkan &amp; Noto, 2008). It takes 16 z-score
            features — vendor behavior, price dynamics, network structure, procurement procedure —
            and produces a similarity score to known fraud patterns. Nine features survive L1
            regularization and actively drive scores; the other seven are zeroed out.
          </p>
          <p className="text-[0.95rem] leading-[1.7] text-text-secondary" style={{ fontFamily: 'var(--font-family-serif)' }}>
            One global model plus twelve sector-specific sub-models train jointly
            via curriculum learning — confirmed cases weighted 1.0, high-confidence 0.8, medium 0.5,
            low 0.2. Sectors with too few positives (Tecnología, Trabajo, Otros) fall back to
            the global model.
          </p>
        </div>

        {/* Pull-quote aside — "What the score means" */}
        <aside
          className="mt-8 pl-5 py-3 max-w-2xl"
          style={{ borderLeft: `3px solid ${ACCENT}` }}
        >
          <p
            className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2"
            style={{ color: ACCENT }}
          >
            What the score means
          </p>
          <p
            className="text-text-secondary leading-[1.55]"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: '1.05rem',
              fontStyle: 'italic',
            }}
          >
            A score of 0.60 does <span className="not-italic font-semibold">not</span> mean a 60% chance of corruption.
            It means the contract resembles documented corruption cases strongly enough to warrant
            investigation. Scores are triage signals — never verdicts.
          </p>
        </aside>
      </section>

      {/* Primary signals — newspaper-style triple */}
      <section>
        <SectionHeadline
          eyebrow="Primary signals"
          headline="Three features do most of the work"
          deck="Nine active coefficients in the global model; these three carry the largest magnitudes."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-[rgba(255,255,255,0.08)]">
          {[
            {
              eyebrow: 'Strongest positive',
              name: 'Price Volatility',
              beta: '+0.5343',
              note: 'Contract-size variance vs sector norm. Vendors with wildly varying ticket sizes are the strongest predictor of investigation-worthy patterns.',
              color: POSITIVE,
            },
            {
              eyebrow: 'Strongest protective',
              name: 'Institution Diversity',
              beta: '−0.3821',
              note: 'Serving many distinct agencies lowers risk. Legitimate broad-reach vendors look nothing like captured suppliers.',
              color: NEGATIVE,
            },
            {
              eyebrow: 'Concentration signal',
              name: 'Vendor Concentration',
              beta: '+0.3749',
              note: 'Vendor’s share of sector spending. Dominant sector players — pharmaceutical distributors, food monopolies — trigger this.',
              color: POSITIVE,
            },
          ].map((sig, i) => (
            <div
              key={sig.name}
              className="px-5 py-6"
              style={{
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                borderTop: `2px solid ${sig.color}`,
              }}
            >
              <p
                className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2"
                style={{ color: sig.color }}
              >
                {sig.eyebrow}
              </p>
              <h3
                className="text-text-primary mb-2"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                }}
              >
                {sig.name}
              </h3>
              <div
                className="font-mono tabular-nums text-sm mb-3"
                style={{ color: sig.color }}
              >
                β = {sig.beta}
              </div>
              <p
                className="text-text-secondary text-sm leading-[1.6]"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {sig.note}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MetricsTab({ liveCoefficients }: { liveCoefficients: Coefficient[] }) {
  const maxAbs = Math.max(...liveCoefficients.map((c) => Math.abs(c.beta)), 0.0001)
  const totalContracts = RISK_DISTRIBUTION.reduce((s, r) => s + r.count, 0)

  return (
    <div className="space-y-14">
      {/* Feature coefficients — editorial divergent bar */}
      <section>
        <SectionHeadline
          eyebrow="Active coefficients · v0.6.5 global model"
          headline="Nine features survive L1 regularization"
          deck="Positive coefficients (amber) push contracts toward higher scores. Protective coefficients (blue) pull toward lower. Seven features in the architecture regularize to zero."
        />

        {/* Divergent-bar chart, hairline rows */}
        <div className="border-y border-[rgba(255,255,255,0.08)]">
          {/* Header row */}
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_auto] gap-4 py-2.5 px-1 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted border-b border-[rgba(255,255,255,0.06)]">
            <span>Feature</span>
            <span className="text-center">Protective ← 0 → Risk-increasing</span>
            <span className="text-right font-mono tabular-nums w-20">β</span>
          </div>
          {liveCoefficients.map((c, i) => {
            const isPositive = c.beta >= 0
            const color = isPositive ? POSITIVE : NEGATIVE
            const barPct = (Math.abs(c.beta) / maxAbs) * 100
            return (
              <div
                key={c.factor}
                className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_auto] gap-4 items-center py-3.5 px-1 group hover:bg-[rgba(255,255,255,0.015)] transition-colors"
                style={{
                  borderBottom: i < liveCoefficients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                }}
              >
                <div>
                  <div
                    className="text-text-primary"
                    style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.02rem', fontWeight: 600, letterSpacing: '-0.01em' }}
                  >
                    {c.label}
                  </div>
                  {c.note && (
                    <div className="text-[11px] text-text-muted mt-1 leading-snug max-w-xs">
                      {c.note}
                    </div>
                  )}
                </div>
                <div className="relative w-full">
                  {(() => {
                    const DOTS_PER_SIDE = 18, DR = 2.5, DG = 6
                    const totalW = DOTS_PER_SIDE * DG * 2
                    const filled = Math.max(1, Math.round((Math.min(100, barPct) / 100) * DOTS_PER_SIDE))
                    return (
                      <svg viewBox={`0 0 ${totalW} 8`} className="w-full" style={{ height: 8 }} preserveAspectRatio="none" aria-hidden="true">
                        {/* Zero line */}
                        <line x1={totalW / 2} y1={0} x2={totalW / 2} y2={8} stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} />
                        {/* Left side (negative) */}
                        {Array.from({ length: DOTS_PER_SIDE }).map((_, i) => {
                          const cx = totalW / 2 - (i * DG + DR) - 1
                          const isFilled = !isPositive && i < filled
                          return (
                            <circle key={`l-${i}`} cx={cx} cy={4} r={DR}
                              fill={isFilled ? color : 'var(--color-background-elevated)'}
                              stroke={isFilled ? undefined : 'var(--color-border-hover)'}
                              strokeWidth={isFilled ? 0 : 0.5}
                              fillOpacity={isFilled ? 0.85 : 1}
                            />
                          )
                        })}
                        {/* Right side (positive) */}
                        {Array.from({ length: DOTS_PER_SIDE }).map((_, i) => {
                          const cx = totalW / 2 + (i * DG + DR) + 1
                          const isFilled = isPositive && i < filled
                          return (
                            <circle key={`r-${i}`} cx={cx} cy={4} r={DR}
                              fill={isFilled ? color : 'var(--color-background-elevated)'}
                              stroke={isFilled ? undefined : 'var(--color-border-hover)'}
                              strokeWidth={isFilled ? 0 : 0.5}
                              fillOpacity={isFilled ? 0.85 : 1}
                            />
                          )
                        })}
                      </svg>
                    )
                  })()}
                </div>
                <div
                  className="text-right font-mono tabular-nums text-sm w-20"
                  style={{ color, fontFeatureSettings: '"tnum"' }}
                >
                  {isPositive ? '+' : ''}
                  {c.beta.toFixed(4)}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex gap-6 text-[10px] text-text-muted font-mono uppercase tracking-[0.18em]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-4" style={{ backgroundColor: POSITIVE }} />
            Risk-increasing
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-4" style={{ backgroundColor: NEGATIVE }} />
            Protective
          </div>
          <div className="flex items-center gap-2 ml-auto">
            max|β| {maxAbs.toFixed(3)}
          </div>
        </div>
      </section>

      {/* Risk distribution — editorial stacked strip + hairline table */}
      <section>
        <SectionHeadline
          eyebrow={`Risk distribution · ${formatNumber(totalContracts)} contracts`}
          headline="13.49 % of procurement volume crosses the high-risk threshold"
          deck="Within the OECD 2–15 % benchmark range, with structural false-positive exclusions and ghost-companion boosts applied."
        />

        {/* Unified distribution dot-matrix (was: stacked bar) */}
        {(() => {
          const N = 80, DR = 3, DG = 8
          const cells: { color: string; label: string }[] = []
          RISK_DISTRIBUTION.forEach((row) => {
            const segDots = Math.max(1, Math.round((row.pct / 100) * N))
            for (let k = 0; k < segDots && cells.length < N; k++) {
              cells.push({ color: row.color, label: row.level })
            }
          })
          while (cells.length < N && cells.length > 0) {
            cells.push(cells[cells.length - 1])
          }
          return (
            <svg viewBox={`0 0 ${N * DG} 12`} className="w-full mb-2" style={{ height: 36 }} preserveAspectRatio="none"
              role="img" aria-label="Unified risk distribution">
              {cells.map((c, k) => (
                <circle key={k} cx={k * DG + DR} cy={6} r={DR} fill={c.color} fillOpacity={0.9}>
                  <title>{c.label}</title>
                </circle>
              ))}
            </svg>
          )
        })()}
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-6">
          <span>Low</span>
          <span className="text-text-secondary">High-risk threshold →</span>
          <span>Critical</span>
        </div>

        {/* Editorial hairline table */}
        <div className="border-y border-[rgba(255,255,255,0.08)]">
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.6fr)] gap-4 py-2.5 px-1 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted border-b border-[rgba(255,255,255,0.06)]">
            <span>Level</span>
            <span>Threshold</span>
            <span className="text-right">Contracts</span>
            <span className="text-right">Share</span>
          </div>
          {RISK_DISTRIBUTION.map((row, i) => (
            <div
              key={row.level}
              className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.6fr)] gap-4 items-center py-3.5 px-1 hover:bg-[rgba(255,255,255,0.015)] transition-colors"
              style={{
                borderBottom: i < RISK_DISTRIBUTION.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-8 w-1"
                  style={{ backgroundColor: row.color }}
                />
                <span
                  className="text-text-primary"
                  style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.015em' }}
                >
                  {row.level}
                </span>
              </div>
              <span className="font-mono text-text-secondary text-xs tabular-nums">{row.threshold}</span>
              <span className="text-right font-mono tabular-nums text-text-secondary">
                {formatNumber(row.count)}
              </span>
              <span
                className="text-right font-mono tabular-nums font-semibold"
                style={{ color: row.color }}
              >
                {row.pct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AuditTrailTab() {
  return (
    <div className="space-y-14">
      <section>
        <SectionHeadline
          eyebrow="Model version history"
          headline="Every score carries a version tag"
          deck="Preserved scores remain queryable in risk_score_v3, risk_score_v4, and risk_score_v5 columns. Full reproducibility from hyperparameters to run ID."
        />

        {/* Vertical timeline */}
        <ol className="relative pl-8 space-y-0">
          {/* Vertical rail */}
          <div
            className="absolute top-2 bottom-2 left-[7px] w-px"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          />

          {VERSION_HISTORY.map((entry, i) => {
            const isActive = entry.status === 'active'
            const isLast = i === VERSION_HISTORY.length - 1
            const dotColor = isActive ? ACCENT : entry.status === 'preserved' ? 'var(--color-text-muted)' : '#3f3f46'

            return (
              <li
                key={entry.version}
                className="relative pb-10"
                style={{ paddingBottom: isLast ? 0 : '2.5rem' }}
              >
                {/* Timeline dot */}
                <span
                  className="absolute -left-[29px] top-1 h-[15px] w-[15px] rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: `2px solid ${dotColor}`,
                    boxShadow: isActive ? `0 0 12px ${ACCENT}99` : undefined,
                  }}
                >
                  {isActive && (
                    <span
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: ACCENT }}
                    />
                  )}
                </span>

                {/* Dateline + status chip */}
                <div className="flex items-center gap-3 mb-3 text-[10px] font-mono uppercase tracking-[0.18em]">
                  <span className="text-text-muted font-mono tabular-nums">{entry.date}</span>
                  {isActive && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5"
                      style={{
                        backgroundColor: `${ACCENT}1a`,
                        color: ACCENT,
                        border: `1px solid ${ACCENT}33`,
                      }}
                    >
                      <span className="h-1 w-1 rounded-full animate-pulse" style={{ backgroundColor: ACCENT }} />
                      Active
                    </span>
                  )}
                  {entry.status === 'preserved' && (
                    <span className="px-2 py-0.5 text-text-secondary border border-[rgba(255,255,255,0.12)]">
                      Preserved
                    </span>
                  )}
                  {entry.status === 'superseded' && (
                    <span className="px-2 py-0.5 text-text-muted border border-[rgba(255,255,255,0.06)]">
                      Superseded
                    </span>
                  )}
                </div>

                {/* Version headline */}
                <h3
                  className="tracking-tight leading-[1.1] mb-4"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    color: isActive ? ACCENT : 'var(--color-text-primary)',
                  }}
                >
                  {entry.version}
                </h3>

                {/* Metric pair — bylines */}
                <div className="flex gap-10 mb-4">
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-text-muted">Test AUC</div>
                    <div
                      className="font-mono tabular-nums mt-1"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: isActive ? ACCENT : 'var(--color-text-primary)',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {entry.auc.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-text-muted">High-risk rate</div>
                    <div
                      className="font-mono tabular-nums mt-1"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {entry.hr.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Narrative */}
                <p
                  className="text-text-secondary max-w-3xl"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontSize: '0.98rem',
                    lineHeight: 1.65,
                  }}
                >
                  {entry.change}
                </p>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Reproducibility — footnote aside */}
      <section
        className="pl-5 py-5 max-w-3xl"
        style={{ borderLeft: `2px solid ${ACCENT}` }}
      >
        <p
          className="text-[10px] font-mono uppercase tracking-[0.2em] mb-3"
          style={{ color: ACCENT }}
        >
          Reproducibility · run ID CAL-v6.1-202603251039
        </p>
        <p
          className="text-text-secondary leading-[1.7]"
          style={{ fontFamily: 'var(--font-family-serif)', fontSize: '0.98rem' }}
        >
          Training hyperparameters fixed via Optuna TPE (150 trials, vendor-stratified 70/30 split):
          {' '}
          <span className="font-mono text-text-primary text-sm">C = 0.0100</span>,{' '}
          <span className="font-mono text-text-primary text-sm">l1_ratio = 0.9673</span>,{' '}
          PU correction <span className="font-mono text-text-primary text-sm">c = 0.3000</span>{' '}
          (floor). Full training manifest and coefficient matrix archived in{' '}
          <span className="font-mono text-text-primary text-sm">model_calibration</span>.
        </p>
      </section>
    </div>
  )
}

// ============================================================================
// Main page
// ============================================================================

export default function ModelTransparency() {
  const { t } = useTranslation('methodology')
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
      <header className="pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-text-secondary">RUBLI</span>
          </span>
          <span className="text-text-primary">·</span>
          <span>{t('hero.breadcrumb')}</span>
          <span className="text-text-primary">·</span>
          <span className="font-mono tabular-nums">{modelMeta?.version ?? CURRENT_MODEL_VERSION}</span>
          <span className="text-text-primary">·</span>
          <span>{t('hero.modelType')}</span>
        </div>
        <p className="text-kicker text-kicker--investigation mb-3">{t('hero.kicker')}</p>
        <h1
          className="text-text-primary leading-[1.05]"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
          }}
        >
          {t('hero.headline')}
        </h1>
        <p
          className="mt-3 max-w-3xl text-text-secondary"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1rem, 1.3vw, 1.2rem)',
            lineHeight: 1.55,
          }}
        >
          {t('hero.subtitle', { n: formatNumber(nContracts) })}
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-5">
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
          <span className="text-[11px] font-mono uppercase tracking-wide text-text-muted">
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
