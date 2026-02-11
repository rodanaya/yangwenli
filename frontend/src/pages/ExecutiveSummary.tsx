/**
 * Executive Intelligence Summary
 *
 * The flagship report page — reads like a NYT investigation or OECD annual report.
 * Long-scroll editorial format with rich narrative, supporting data, and qualitative insights.
 * Every section has a thesis statement, evidence, and contextual analysis.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import type { ExecutiveSummaryResponse } from '@/api/types'
import { SECTOR_COLORS, RISK_COLORS, getSectorNameEN } from '@/lib/constants'
import {
  AlertTriangle,
  Target,
  Scale,
  Users,
  Landmark,
  Brain,
  EyeOff,
  ArrowRight,
  Shield,
  Search,
  Database,
  HelpCircle,
  Compass,
} from 'lucide-react'

// ============================================================================
// Data Hook
// ============================================================================

function useExecutiveSummary() {
  return useQuery({
    queryKey: ['executive', 'summary'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: 10 * 60 * 1000,
  })
}

// ============================================================================
// Predictor name labels
// ============================================================================

const PREDICTOR_LABELS: Record<string, string> = {
  vendor_concentration: 'Vendor Concentration',
  industry_mismatch: 'Industry Mismatch',
  same_day_count: 'Same-Day Contracts',
  institution_risk: 'Institution Risk',
  single_bid: 'Single Bidder',
  direct_award: 'Direct Award',
  ad_period_days: 'Ad Period Length',
}

// ============================================================================
// Main Component
// ============================================================================

export function ExecutiveSummary() {
  const navigate = useNavigate()
  const { data, isLoading } = useExecutiveSummary()

  if (isLoading || !data) {
    return <LoadingSkeleton />
  }

  return (
    <article className="max-w-4xl mx-auto pb-20 space-y-16">
      <ReportHeader data={data} />
      <Divider />
      <SectionThreat data={data} />
      <Divider />
      <SectionProof data={data} />
      <Divider />
      <SectionSectors data={data} navigate={navigate} />
      <Divider />
      <SectionVendors data={data} navigate={navigate} />
      <Divider />
      <SectionAdministrations data={data} />
      <Divider />
      <SectionModel data={data} />
      <Divider />
      <SectionLimitations />
      <Divider />
      <SectionRecommendations navigate={navigate} />
      <ReportFooter data={data} />
    </article>
  )
}

export default ExecutiveSummary

// ============================================================================
// S0: Report Header
// ============================================================================

function ReportHeader({ data }: { data: ExecutiveSummaryResponse }) {
  const { headline } = data
  const totalValueUSD = headline.total_value / 17.5 // approximate USD conversion

  return (
    <header className="pt-4">
      {/* Small caps label */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-4 w-4 text-accent" />
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-accent font-[var(--font-family-mono)]">
          EXECUTIVE INTELLIGENCE SUMMARY
        </span>
      </div>

      {/* Date line */}
      <p className="text-[11px] text-text-muted font-[var(--font-family-mono)] tracking-wide mb-3">
        February 2026 &nbsp;|&nbsp; Yang Wen-li Intelligence Platform
      </p>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight leading-tight mb-2">
        9.6 Trillion Pesos Under the Microscope
      </h1>
      <p className="text-lg text-text-secondary italic mb-8">
        A Comprehensive Analysis of Mexican Federal Procurement, 2002-2025
      </p>

      {/* Lead paragraph */}
      <div className="border-l-2 border-accent/40 pl-5 mb-10">
        <p className="text-[15px] leading-relaxed text-text-secondary">
          Between 2002 and 2025, the Mexican federal government awarded {formatNumber(headline.total_contracts)} public
          procurement contracts worth a combined {formatCompactMXN(headline.total_value)} — roughly{' '}
          {formatCompactMXN(totalValueUSD).replace('MXN', 'USD')}. This report presents the findings of a systematic,
          AI-driven analysis of every one of those contracts. Using a 12-feature statistical model validated against nine
          documented corruption cases, we identified patterns consistent with fraud, collusion, and abuse in contracts
          worth an estimated {formatCompactMXN(data.risk.value_at_risk)} — {data.risk.value_at_risk_pct}% of all
          procurement value. These findings do not constitute proof of wrongdoing. They are statistical signals that
          warrant investigation.
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <HeadlineStat value={formatNumber(headline.total_contracts)} label="Contracts" />
        <HeadlineStat value={formatCompactMXN(headline.total_value)} label="Total Value" />
        <HeadlineStat value={formatNumber(headline.total_vendors)} label="Vendors" />
        <HeadlineStat value={formatNumber(headline.total_institutions)} label="Institutions" />
      </div>
    </header>
  )
}

// ============================================================================
// S1: The Threat Assessment
// ============================================================================

function SectionThreat({ data }: { data: ExecutiveSummaryResponse }) {
  const { risk, procedures } = data
  const totalValue = data.headline.total_value || 1

  // Risk distribution as percentages of value
  const criticalPctValue = (risk.critical_value / totalValue) * 100
  const highPctValue = (risk.high_value / totalValue) * 100
  const mediumPctValue = (risk.medium_value / totalValue) * 100
  const lowPctValue = (risk.low_value / totalValue) * 100

  return (
    <section>
      <SectionHeading number="01" title="The Threat" icon={AlertTriangle} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-4">
        Of the {formatCompactMXN(data.headline.total_value)} in analyzed procurement, an estimated{' '}
        <strong className="text-text-primary">{formatCompactMXN(risk.value_at_risk)}</strong> — {risk.value_at_risk_pct}%
        of all value — sits in contracts flagged as high or critical risk. To put this in context, Mexico's entire
        annual federal education budget is approximately 400 billion pesos. The value at risk in this dataset is roughly
        equivalent to {Math.round(risk.value_at_risk / 400_000_000_000)} years of education spending.
      </p>

      <p className="text-[15px] leading-relaxed text-text-secondary mb-6">
        Risk is not evenly distributed. The bulk of flagged value concentrates in a small number of high-value contracts
        from dominant vendors in health, infrastructure, and energy. The remaining{' '}
        {(100 - risk.value_at_risk_pct).toFixed(0)}% of value falls in medium or low risk categories — not clean, but
        less urgently suspicious.
      </p>

      {/* Risk distribution bar */}
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)] mb-2">
          RISK DISTRIBUTION BY VALUE
        </p>
        <div className="h-8 rounded-md overflow-hidden flex">
          <div
            style={{ width: `${criticalPctValue}%`, background: RISK_COLORS.critical }}
            className="transition-all"
            title={`Critical: ${criticalPctValue.toFixed(1)}%`}
          />
          <div
            style={{ width: `${highPctValue}%`, background: RISK_COLORS.high }}
            className="transition-all"
            title={`High: ${highPctValue.toFixed(1)}%`}
          />
          <div
            style={{ width: `${mediumPctValue}%`, background: RISK_COLORS.medium }}
            className="transition-all"
            title={`Medium: ${mediumPctValue.toFixed(1)}%`}
          />
          <div
            style={{ width: `${lowPctValue}%`, background: RISK_COLORS.low }}
            className="transition-all"
            title={`Low: ${lowPctValue.toFixed(1)}%`}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-text-muted font-[var(--font-family-mono)]">
          <span style={{ color: RISK_COLORS.critical }}>Critical {criticalPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.high }}>High {highPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.medium }}>Medium {mediumPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.low }}>Low {lowPctValue.toFixed(0)}%</span>
        </div>
      </div>

      {/* 4 stat callouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCallout
          value={formatNumber(risk.critical_count)}
          label="Critical contracts"
          color={RISK_COLORS.critical}
        />
        <StatCallout
          value={formatNumber(risk.high_count)}
          label="High-risk contracts"
          color={RISK_COLORS.high}
        />
        <StatCallout
          value={`${procedures.direct_award_pct}%`}
          label="Direct awards"
          color="var(--color-text-secondary)"
        />
        <StatCallout
          value={`${procedures.single_bid_pct}%`}
          label="Single bidders"
          color="var(--color-text-secondary)"
        />
      </div>

      {/* Counterintuitive finding */}
      <p className="text-[15px] leading-relaxed text-text-secondary">
        A counterintuitive finding: <strong className="text-text-primary">direct awards are not the primary risk
        signal</strong>. In our model, direct award procedures carry a{' '}
        <em>negative</em> coefficient ({'\u2212'}0.197), meaning they are statistically <em>less</em> likely to appear in
        documented corruption cases. The real red flag is not how a contract is awarded, but{' '}
        <strong className="text-text-primary">who keeps winning</strong>. Vendor concentration — a single vendor
        capturing disproportionate market share — is 18.7 times more predictive of corruption than random chance.
      </p>
    </section>
  )
}

// ============================================================================
// S2: The Proof — Ground Truth Validation
// ============================================================================

function SectionProof({ data }: { data: ExecutiveSummaryResponse }) {
  const { ground_truth: gt } = data
  const sortedCases = useMemo(
    () => [...gt.case_details].sort((a, b) => b.high_plus_pct - a.high_plus_pct),
    [gt.case_details]
  )

  return (
    <section>
      <SectionHeading number="02" title="The Proof" icon={Target} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-4">
        Any model can flag contracts. The question is whether it flags the right ones. We validated our model against{' '}
        {gt.cases} documented Mexican corruption cases spanning {formatNumber(gt.contracts)} contracts from {gt.vendors}{' '}
        matched vendors. These are not hypothetical — they are cases that led to criminal investigations, arrests, and
        public scandal. The model was asked: would you have flagged these?
      </p>

      <p className="text-[15px] leading-relaxed text-text-secondary mb-6">
        The answer: <strong className="text-text-primary">yes, in {gt.detection_rate}% of cases</strong> (at medium
        risk or above). The model achieves an AUC-ROC of {gt.auc}, meaning it correctly ranks a randomly chosen corrupt
        contract above a clean one {(gt.auc * 100).toFixed(0)}% of the time.
      </p>

      {/* Detection rate bars */}
      <div className="space-y-2 mb-6">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)] mb-2">
          HIGH+ DETECTION RATE BY CASE
        </p>
        {sortedCases.map((c) => (
          <div key={c.name} className="flex items-center gap-3">
            <div className="w-52 sm:w-64 text-right">
              <span className="text-[12px] text-text-secondary truncate block">{c.name}</span>
            </div>
            <div className="flex-1 h-5 bg-surface-raised rounded overflow-hidden relative">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${c.high_plus_pct}%`,
                  background:
                    c.high_plus_pct >= 90
                      ? RISK_COLORS.critical
                      : c.high_plus_pct >= 60
                        ? RISK_COLORS.high
                        : RISK_COLORS.medium,
                }}
              />
              <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] font-bold text-text-primary font-[var(--font-family-mono)]">
                {c.high_plus_pct}%
              </span>
            </div>
            <span className="text-[10px] text-text-muted w-20 text-right font-[var(--font-family-mono)]">
              {formatNumber(c.contracts)} contracts
            </span>
          </div>
        ))}
      </div>

      {/* Early warning callout */}
      <div className="border-l-2 border-accent/50 bg-accent/[0.03] rounded-r-md px-5 py-4 mb-6">
        <p className="text-[14px] leading-relaxed text-text-secondary">
          <strong className="text-accent">Early warning value:</strong> The model would have raised alarms on IMSS ghost
          company contracts as early as 2008 — <em>eight years</em> before the scandal became public in 2016. For
          Segalmex, the earliest flagged contracts predate the 2020 investigation by several years.
        </p>
      </div>

      <p className="text-[15px] leading-relaxed text-text-secondary">
        The strongest detections occur in cases involving <strong className="text-text-primary">concentrated vendors in
        health and agriculture</strong> — IMSS (99.0%), Segalmex (94.3%), COVID-19 procurement (91.8%). These cases
        share a common pattern: a small number of vendors capturing outsized market share. Detection is weakest for cases
        involving <strong className="text-text-primary">bribery and conflict of interest</strong> — Grupo Higa (33.3%),
        Cyber Robotic (43.2%) — where corruption operates through relationships rather than statistical patterns in the
        procurement data itself.
      </p>
    </section>
  )
}

// ============================================================================
// S3: Where the Risk Concentrates — Sectors
// ============================================================================

function SectionSectors({
  data,
  navigate,
}: {
  data: ExecutiveSummaryResponse
  navigate: (path: string) => void
}) {
  const sortedSectors = useMemo(() => {
    return [...data.sectors].sort((a, b) => {
      const aRiskValue = (a.high_plus_pct / 100) * a.value
      const bRiskValue = (b.high_plus_pct / 100) * b.value
      return bRiskValue - aRiskValue
    })
  }, [data.sectors])

  const maxRiskValue = useMemo(() => {
    return Math.max(...sortedSectors.map((s) => (s.high_plus_pct / 100) * s.value))
  }, [sortedSectors])

  return (
    <section>
      <SectionHeading number="03" title="Where the Risk Concentrates" icon={Scale} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-6">
        Three sectors dominate the risk landscape. <strong className="text-text-primary">Health</strong> (Salud)
        accounts for the largest volume — {formatNumber(data.sectors.find((s) => s.code === 'salud')?.contracts ?? 0)}{' '}
        contracts worth {formatCompactMXN(data.sectors.find((s) => s.code === 'salud')?.value ?? 0)}.{' '}
        <strong className="text-text-primary">Infrastructure</strong> carries fewer contracts but enormous per-unit
        values. <strong className="text-text-primary">Energy</strong> combines both volume and value in a sector with
        structural concentration (few vendors can serve Pemex and CFE).
      </p>

      {/* Sector bars sorted by value at risk */}
      <div className="space-y-1.5 mb-8">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)] mb-2">
          ESTIMATED VALUE AT RISK BY SECTOR
        </p>
        {sortedSectors.map((s) => {
          const riskValue = (s.high_plus_pct / 100) * s.value
          const pct = maxRiskValue > 0 ? (riskValue / maxRiskValue) * 100 : 0
          const color = SECTOR_COLORS[s.code] || SECTOR_COLORS.otros
          return (
            <button
              key={s.code}
              className="flex items-center gap-3 w-full group hover:bg-surface-raised/50 rounded px-1 py-0.5 transition-colors text-left"
              onClick={() => {
                const sector = data.sectors.find((x) => x.code === s.code)
                if (sector) navigate(`/sectors/${data.sectors.indexOf(sector) + 1}`)
              }}
            >
              <div className="w-28 text-right">
                <span className="text-[12px] text-text-secondary group-hover:text-text-primary transition-colors">
                  {getSectorNameEN(s.code)}
                </span>
              </div>
              <div className="flex-1 h-4 bg-surface-raised rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${Math.max(pct, 1)}%`, background: color }}
                />
              </div>
              <span className="text-[10px] text-text-muted w-24 text-right font-[var(--font-family-mono)]">
                {formatCompactMXN(riskValue)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sector callouts */}
      <div className="space-y-4">
        <SectorCallout
          name="Health"
          color={SECTOR_COLORS.salud}
          text="The largest sector by contract volume. Home to the IMSS ghost company network and COVID-19 procurement fraud — two of the three largest corruption cases in the dataset. The sheer scale means even a modest risk rate translates to enormous absolute value at risk."
        />
        <SectorCallout
          name="Infrastructure"
          color={SECTOR_COLORS.infraestructura}
          text="Relatively low risk rate, but dominated by mega-contracts from firms like CICSA and ICA. A single flagged infrastructure contract can be worth more than thousands of smaller flagged contracts in other sectors combined."
        />
        <SectorCallout
          name="Agriculture"
          color={SECTOR_COLORS.agricultura}
          text="Only 3.2% of total procurement value but disproportionately represented in high-risk contracts. The Segalmex scandal (LICONSA, DICONSA) exposed systematic fraud in food distribution — a sector where oversight was historically weak."
        />
      </div>
    </section>
  )
}

// ============================================================================
// S4: Who Is Involved — Top Vendors
// ============================================================================

function SectionVendors({
  data,
  navigate,
}: {
  data: ExecutiveSummaryResponse
  navigate: (path: string) => void
}) {
  // Known ground truth vendor IDs
  const knownBadIds = new Set([4335, 13885]) // PISA, DIMM

  return (
    <section>
      <SectionHeading number="04" title="Who Is Involved" icon={Users} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-4">
        The top 10 vendors by contract value collectively hold{' '}
        <strong className="text-text-primary">
          {formatCompactMXN(data.top_vendors.reduce((sum, v) => sum + v.value_billions * 1e9, 0))}
        </strong>{' '}
        in procurement. Among them, two are confirmed participants in documented corruption cases. Several others carry
        risk scores above 0.20, indicating statistical patterns consistent with the corruption cases in our training
        data.
      </p>

      {/* Editorial table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-3 text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)]">
                Rank
              </th>
              <th className="text-left py-2 pr-3 text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)]">
                Vendor
              </th>
              <th className="text-right py-2 pr-3 text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)]">
                Value
              </th>
              <th className="text-right py-2 pr-3 text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)]">
                Contracts
              </th>
              <th className="text-right py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)]">
                Avg Risk
              </th>
            </tr>
          </thead>
          <tbody>
            {data.top_vendors.map((v, i) => {
              const isKnownBad = knownBadIds.has(v.id)
              const riskColor =
                v.avg_risk >= 0.30
                  ? RISK_COLORS.high
                  : v.avg_risk >= 0.20
                    ? RISK_COLORS.medium
                    : 'var(--color-text-muted)'
              return (
                <tr
                  key={v.id}
                  className="border-b border-border/20 hover:bg-surface-raised/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/vendors/${v.id}`)}
                >
                  <td className="py-2 pr-3 text-text-muted font-[var(--font-family-mono)] text-[12px]">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-3 text-text-primary">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[280px]">{v.name}</span>
                      {isKnownBad && (
                        <Shield className="h-3.5 w-3.5 flex-shrink-0 text-risk-critical" />
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right text-text-secondary font-[var(--font-family-mono)] text-[12px]">
                    {v.value_billions}B
                  </td>
                  <td className="py-2 pr-3 text-right text-text-muted font-[var(--font-family-mono)] text-[12px]">
                    {formatNumber(v.contracts)}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[11px] font-bold font-[var(--font-family-mono)]"
                      style={{ color: riskColor, background: `color-mix(in srgb, ${riskColor} 15%, transparent)` }}
                    >
                      {v.avg_risk.toFixed(3)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[15px] leading-relaxed text-text-secondary">
        It is important to distinguish <strong className="text-text-primary">high value from high risk</strong>.
        CICSA (Operadora CICSA) ranks #1 by total contract value with {data.top_vendors[0]?.value_billions}B MXN, but
        carries a moderate risk score. In contrast, vendors with fewer but higher-risk contracts may represent more
        actionable investigation targets. The <Shield className="h-3 w-3 inline text-risk-critical" /> icon marks
        vendors confirmed in documented corruption cases.
      </p>
    </section>
  )
}

// ============================================================================
// S5: Across Administrations — Political Timeline
// ============================================================================

function SectionAdministrations({ data }: { data: ExecutiveSummaryResponse }) {
  const adminNarratives: Record<string, string> = {
    Fox: 'Earliest data period (Structure A) with lowest quality — 0.1% RFC coverage. Risk scores may be underestimated. Direct award data unavailable for this period.',
    Calderon:
      'Contract volume doubled as COMPRANET modernized. The IMSS ghost company network began operations during this period, with earliest contracts dating to 2008.',
    'Pena Nieto':
      'Largest procurement volume of any administration. 73.4% direct awards. Period of the Odebrecht bribery scandal, La Estafa Maestra, and the Grupo Higa conflict of interest case.',
    AMLO: 'Highest observed risk rate and highest direct award percentage at 79.5%. The Segalmex and COVID-19 procurement scandals occurred during this administration.',
    Sheinbaum:
      'Early data only (2025). Slight decrease in both risk rate and direct award percentage compared to predecessor. Too early for conclusive assessment.',
  }

  return (
    <section>
      <SectionHeading number="05" title="Across Administrations" icon={Landmark} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-6">
        Corruption risk has proven remarkably persistent across political transitions. No administration has been immune,
        though the <em>character</em> of risk varies — from data quality limitations in the Fox era, to volume
        concentration under Pena Nieto, to the highest direct award rates under AMLO.
      </p>

      <div className="space-y-4">
        {data.administrations.map((admin) => (
          <div
            key={admin.name}
            className="border border-border/30 rounded-lg p-5 bg-surface-raised/30"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-[15px] font-bold text-text-primary">{admin.full_name}</h4>
                <p className="text-[11px] text-text-muted font-[var(--font-family-mono)]">
                  {admin.years} &middot; {admin.party}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <MiniStat label="Contracts" value={formatNumber(admin.contracts)} />
              <MiniStat label="Value" value={formatCompactMXN(admin.value)} />
              <MiniStat
                label="High Risk"
                value={`${admin.high_risk_pct}%`}
                color={admin.high_risk_pct >= 4.5 ? RISK_COLORS.high : undefined}
              />
              <MiniStat
                label="Direct Award"
                value={`${admin.direct_award_pct}%`}
                color={admin.direct_award_pct >= 75 ? RISK_COLORS.medium : undefined}
              />
            </div>

            {/* Narrative */}
            <p className="text-[13px] leading-relaxed text-text-muted">
              {adminNarratives[admin.name] || ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// S6: How We Know — Model Transparency
// ============================================================================

function SectionModel({ data }: { data: ExecutiveSummaryResponse }) {
  const { model } = data
  const maxBeta = Math.max(...model.top_predictors.map((p) => Math.abs(p.beta)))

  return (
    <section>
      <SectionHeading number="06" title="How We Know" icon={Brain} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-4">
        The v4.0 model transforms procurement analysis from a weighted indicator checklist to a{' '}
        <strong className="text-text-primary">calibrated probability framework</strong>. Every contract receives a score
        representing the estimated probability of corruption, derived from 12 features normalized against sector and year
        baselines using z-scores, with multivariate anomaly detection via Mahalanobis distance and Bayesian logistic
        regression trained on {formatNumber(data.ground_truth.contracts)} known-bad contracts.
      </p>

      {/* Metric badges */}
      <div className="flex flex-wrap gap-3 mb-8">
        <MetricBadge label="AUC-ROC" value={model.auc.toFixed(3)} description="Discrimination power" />
        <MetricBadge label="Brier Score" value={model.brier.toFixed(3)} description="Calibration quality" />
        <MetricBadge label="Lift" value={`${model.lift}x`} description="vs random baseline" />
      </div>

      {/* Coefficient chart */}
      <div className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-text-muted font-[var(--font-family-mono)] mb-3">
          MODEL COEFFICIENTS (TOP PREDICTORS)
        </p>
        <div className="space-y-2">
          {model.top_predictors.map((p) => {
            const isPositive = p.beta > 0
            const width = (Math.abs(p.beta) / maxBeta) * 100
            return (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-40 text-right">
                  <span className="text-[12px] text-text-secondary">
                    {PREDICTOR_LABELS[p.name] || p.name}
                  </span>
                </div>
                <div className="flex-1 flex items-center gap-1">
                  {!isPositive && (
                    <div className="flex-1 flex justify-end">
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${width}%`,
                          background: 'var(--color-accent)',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  )}
                  <div className="w-px h-6 bg-border/50" />
                  {isPositive && (
                    <div className="flex-1">
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${width}%`,
                          background: RISK_COLORS.critical,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  )}
                  {!isPositive && <div className="flex-1" />}
                </div>
                <span className="text-[11px] font-bold text-text-secondary font-[var(--font-family-mono)] w-14 text-right">
                  {isPositive ? '+' : ''}{p.beta.toFixed(3)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-text-muted font-[var(--font-family-mono)]">
          <span className="pl-44">&larr; Reduces risk</span>
          <span>Increases risk &rarr;</span>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed text-text-secondary">
        <strong className="text-text-primary">Vendor concentration is the dominant predictor</strong> — 18.7 times
        more predictive than random chance. This challenges the standard anti-corruption toolkit, which typically
        prioritizes single bidding and direct awards as primary red flags. In Mexican federal procurement, the data
        reveals that documented corruption cases primarily involve{' '}
        <em>large, established vendors winning through competitive procedures</em>, not small firms exploiting direct
        award loopholes.
      </p>
    </section>
  )
}

// ============================================================================
// S7: What We Cannot See — Limitations
// ============================================================================

function SectionLimitations() {
  const limitations = [
    {
      icon: Database,
      title: 'Ground Truth Concentration',
      text: 'Three cases (IMSS, Segalmex, COVID) account for 99% of training data. The model excels at detecting concentration-based fraud but underperforms on bribery, conflict of interest, and novel schemes that don\'t resemble the training cases.',
    },
    {
      icon: Search,
      title: 'Data Quality Degrades with Age',
      text: 'Structure A data (2002-2010) has only 0.1% RFC coverage, making vendor identification unreliable. Risk scores for this period may be underestimated, and network analysis is effectively impossible.',
    },
    {
      icon: Scale,
      title: 'Correlation is Not Causation',
      text: 'A high risk score indicates statistical anomaly consistent with known corruption patterns — it does not constitute proof of wrongdoing. Some sectors (Defense, Energy) have structural reasons for vendor concentration that are not corrupt.',
    },
    {
      icon: HelpCircle,
      title: 'Unknown Unknowns',
      text: 'Novel corruption schemes that do not resemble the 9 documented cases will not be flagged by this model. The model detects what it has been trained to recognize — patterns from the past, not innovation in fraud.',
    },
  ]

  return (
    <section>
      <SectionHeading number="07" title="What We Cannot See" icon={EyeOff} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-6">
        Intellectual honesty demands we state what this analysis cannot do. A risk model is a lens, not an oracle. It
        amplifies patterns from historical data, which means it is blind to anything that doesn't resemble the past.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {limitations.map((lim) => {
          const Icon = lim.icon
          return (
            <div
              key={lim.title}
              className="border border-border/30 rounded-lg p-5 bg-surface-raised/20"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className="h-4 w-4 text-text-muted flex-shrink-0" />
                <h4 className="text-[14px] font-bold text-text-primary">{lim.title}</h4>
              </div>
              <p className="text-[13px] leading-relaxed text-text-muted">{lim.text}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================================
// S8: What Comes Next — Recommendations
// ============================================================================

function SectionRecommendations({ navigate }: { navigate: (path: string) => void }) {
  const actions = [
    {
      icon: Search,
      title: 'Investigate High-Concentration Vendors',
      description:
        'Vendors with critical risk scores collectively hold over 1 trillion MXN in procurement. Start with the top 50 by risk-weighted value.',
      href: '/explore',
      linkLabel: 'Open Explorer',
    },
    {
      icon: Compass,
      title: 'Strengthen Competitive Safeguards',
      description:
        'The problem is not which procedure type is used, but who participates and wins. Focus oversight on vendor concentration rather than procedure classification.',
      href: '/patterns',
      linkLabel: 'View Patterns',
    },
    {
      icon: Shield,
      title: 'Diversify Ground Truth',
      description:
        'The model needs more training cases from infrastructure, defense, and technology sectors. ASF audit reports and Mexicanos Contra la Corrupcion investigations are promising sources.',
      href: '/ground-truth',
      linkLabel: 'Ground Truth',
    },
  ]

  return (
    <section>
      <SectionHeading number="08" title="What Comes Next" icon={ArrowRight} />

      <p className="text-[15px] leading-relaxed text-text-secondary mb-6">
        This analysis is not an endpoint — it is a starting point for investigation. The model has identified where to
        look. The following steps would maximize the platform's impact on procurement integrity.
      </p>

      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.title}
              onClick={() => navigate(action.href)}
              className="w-full text-left border border-border/30 rounded-lg p-5 bg-surface-raised/20 hover:bg-surface-raised/50 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-[13px] leading-relaxed text-text-muted">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors mt-1 flex-shrink-0" />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================================
// Report Footer
// ============================================================================

function ReportFooter({ data }: { data: ExecutiveSummaryResponse }) {
  return (
    <footer className="pt-12 pb-8 text-center space-y-3">
      <div className="h-px bg-border/30 mb-8" />
      <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-text-muted font-[var(--font-family-mono)]">
        Yang Wen-li Intelligence Platform
      </p>
      <p className="text-[10px] text-text-muted/60 font-[var(--font-family-mono)]">
        Generated {new Date(data.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        {' '}&middot; COMPRANET 2002-2025 &middot; Model v4.0 (AUC {data.model.auc})
      </p>
      <p className="text-[10px] text-text-muted/60 font-[var(--font-family-mono)]">
        {formatNumber(data.headline.total_contracts)} contracts &middot; {formatCompactMXN(data.headline.total_value)}
        {' '}&middot; {formatNumber(data.headline.total_vendors)} vendors &middot; 12 sectors
      </p>
      <p className="text-[13px] italic text-text-muted/40 mt-6">
        "There are things that cannot be measured in terms of victory or defeat."
      </p>
      <p className="text-[9px] text-text-muted/30 font-[var(--font-family-mono)] mt-4 tracking-wide">
        &copy; {new Date().getFullYear()} Yang Wen-li Project. All Rights Reserved.
      </p>
    </footer>
  )
}

// ============================================================================
// Shared Sub-Components
// ============================================================================

function SectionHeading({
  number,
  title,
  icon: Icon,
}: {
  number: string
  title: string
  icon: React.ElementType
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Icon className="h-5 w-5 text-text-muted flex-shrink-0" />
      <h2 className="text-xl font-bold text-text-primary">
        <span className="text-text-muted font-[var(--font-family-mono)] text-[14px] mr-2">{number} —</span>
        {title}
      </h2>
    </div>
  )
}

function HeadlineStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center py-4 px-2 border border-border/20 rounded-lg bg-surface-raised/20">
      <div className="text-xl sm:text-2xl font-bold text-text-primary font-[var(--font-family-mono)] tracking-tight">
        {value}
      </div>
      <div className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-[var(--font-family-mono)] mt-1">
        {label}
      </div>
    </div>
  )
}

function StatCallout({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center py-2">
      <div className="text-lg font-bold font-[var(--font-family-mono)]" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-text-muted">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] text-text-muted uppercase tracking-wider font-[var(--font-family-mono)]">
        {label}
      </div>
      <div
        className="text-[14px] font-bold font-[var(--font-family-mono)]"
        style={{ color: color || 'var(--color-text-primary)' }}
      >
        {value}
      </div>
    </div>
  )
}

function MetricBadge({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-center gap-3 border border-border/30 rounded-lg px-4 py-2.5 bg-surface-raised/20">
      <div>
        <div className="text-lg font-bold text-accent font-[var(--font-family-mono)]">{value}</div>
        <div className="text-[10px] text-text-muted font-[var(--font-family-mono)] uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div className="text-[10px] text-text-muted/60 max-w-[80px] leading-tight">{description}</div>
    </div>
  )
}

function SectorCallout({ name, color, text }: { name: string; color: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
      <div>
        <h4 className="text-[14px] font-bold text-text-primary mb-0.5">{name}</h4>
        <p className="text-[13px] leading-relaxed text-text-muted">{text}</p>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border/20" />
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
