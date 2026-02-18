/**
 * Executive Intelligence Summary
 *
 * The flagship report page — reads like a NYT investigation or OECD annual report.
 * Long-scroll editorial format with rich narrative, supporting data, and qualitative insights.
 * Every section has a thesis statement, evidence, and contextual analysis.
 * Fully internationalized (ES/EN) via react-i18next 'executive' namespace.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation, Trans } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import type { ExecutiveSummaryResponse } from '@/api/types'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
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
  Network,
  CheckCircle,
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
      <KeyFindings />
      <Divider />
      <SectionThreat data={data} />
      <Divider />
      <SectionProof data={data} />
      <Divider />
      <SectionSectors data={data} navigate={navigate} />
      <Divider />
      <SectionVendors data={data} navigate={navigate} />
      <Divider />
      <SectionNetwork />
      <Divider />
      <SectionData />
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
  const { t } = useTranslation('executive')
  const { headline } = data
  const totalValueUSD = headline.total_value / 17.5

  return (
    <header className="pt-4">
      {/* Small caps label */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-4 w-4 text-accent" />
        <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
          {t('header.badge')}
        </span>
      </div>

      {/* Date line */}
      <p className="text-xs text-text-muted font-mono tracking-wide mb-3">
        {t('header.dateline')}
      </p>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight leading-tight mb-2">
        {t('header.title')}
      </h1>
      <p className="text-lg text-text-secondary italic mb-8">
        {t('header.subtitle')}
      </p>

      {/* Lead paragraph */}
      <div className="border-l-2 border-accent/40 pl-5 mb-10">
        <p className="text-sm leading-relaxed text-text-secondary">
          <Trans
            t={t}
            i18nKey="header.lead"
            values={{
              totalContracts: formatNumber(headline.total_contracts),
              totalValue: formatCompactMXN(headline.total_value),
              totalValueUSD: formatCompactMXN(totalValueUSD).replace('MXN', 'USD'),
              valueAtRisk: formatCompactMXN(data.risk.value_at_risk),
              pct: data.risk.value_at_risk_pct,
            }}
          />
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <HeadlineStat value={formatNumber(headline.total_contracts)} label={t('header.contracts')} />
        <HeadlineStat value={formatCompactMXN(headline.total_value)} label={t('header.totalValue')} />
        <HeadlineStat value={formatNumber(headline.total_vendors)} label={t('header.vendors')} />
        <HeadlineStat value={formatNumber(headline.total_institutions)} label={t('header.institutions')} />
      </div>
    </header>
  )
}

// ============================================================================
// Key Findings Hero Card
// ============================================================================

function KeyFindings() {
  const { t } = useTranslation('executive')
  const items = t('keyFindings.items', { returnObjects: true }) as string[]

  return (
    <div className="border border-accent/30 rounded-lg bg-accent/5 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent font-mono">
          {t('keyFindings.title')}
        </h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
            <span className="text-sm text-text-secondary leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// S1: The Threat Assessment
// ============================================================================

function SectionThreat({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { risk, procedures } = data
  const totalValue = data.headline.total_value || 1

  const criticalPctValue = (risk.critical_value / totalValue) * 100
  const highPctValue = (risk.high_value / totalValue) * 100
  const mediumPctValue = (risk.medium_value / totalValue) * 100
  const lowPctValue = (risk.low_value / totalValue) * 100

  return (
    <section>
      <SectionHeading number="01" title={t('s1.title')} icon={AlertTriangle} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s1.p1"
          values={{
            totalValue: formatCompactMXN(data.headline.total_value),
            valueAtRisk: formatCompactMXN(risk.value_at_risk),
            pct: risk.value_at_risk_pct,
            years: Math.round(risk.value_at_risk / 400_000_000_000),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s1.p2"
          values={{ remainingPct: (100 - risk.value_at_risk_pct).toFixed(0) }}
        />
      </p>

      {/* Risk distribution bar */}
      <div className="mb-4">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-2">
          {t('s1.riskDistLabel')}
        </p>
        <div className="h-8 rounded-md overflow-hidden flex">
          <div
            style={{ width: `${criticalPctValue}%`, background: RISK_COLORS.critical }}
            className="transition-all"
            title={`${t('s1.riskLevel.critical')}: ${criticalPctValue.toFixed(1)}%`}
          />
          <div
            style={{ width: `${highPctValue}%`, background: RISK_COLORS.high }}
            className="transition-all"
            title={`${t('s1.riskLevel.high')}: ${highPctValue.toFixed(1)}%`}
          />
          <div
            style={{ width: `${mediumPctValue}%`, background: RISK_COLORS.medium }}
            className="transition-all"
            title={`${t('s1.riskLevel.medium')}: ${mediumPctValue.toFixed(1)}%`}
          />
          <div
            style={{ width: `${lowPctValue}%`, background: RISK_COLORS.low }}
            className="transition-all"
            title={`${t('s1.riskLevel.low')}: ${lowPctValue.toFixed(1)}%`}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-muted font-mono">
          <span style={{ color: RISK_COLORS.critical }}>{t('s1.riskLevel.critical')} {criticalPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.high }}>{t('s1.riskLevel.high')} {highPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.medium }}>{t('s1.riskLevel.medium')} {mediumPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.low }}>{t('s1.riskLevel.low')} {lowPctValue.toFixed(0)}%</span>
        </div>
      </div>

      {/* 4 stat callouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCallout
          value={formatNumber(risk.critical_count)}
          label={t('s1.criticalContracts')}
          color={RISK_COLORS.critical}
        />
        <StatCallout
          value={formatNumber(risk.high_count)}
          label={t('s1.highRiskContracts')}
          color={RISK_COLORS.high}
        />
        <StatCallout
          value={`${procedures.direct_award_pct}%`}
          label={t('s1.directAwards')}
          color="var(--color-text-secondary)"
        />
        <StatCallout
          value={`${procedures.single_bid_pct}%`}
          label={t('s1.singleBidders')}
          color="var(--color-text-secondary)"
        />
      </div>

      {/* Counterintuitive finding */}
      <p className="text-sm leading-relaxed text-text-secondary">
        <Trans
          t={t}
          i18nKey="s1.p3"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>
    </section>
  )
}

// ============================================================================
// S2: The Proof — Ground Truth Validation
// ============================================================================

function SectionProof({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { ground_truth: gt } = data
  const sortedCases = useMemo(
    () => [...gt.case_details].sort((a, b) => b.high_plus_pct - a.high_plus_pct),
    [gt.case_details]
  )

  return (
    <section>
      <SectionHeading number="02" title={t('s2.title')} icon={Target} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s2.p1"
          values={{
            cases: gt.cases,
            contracts: formatNumber(gt.contracts),
            vendors: gt.vendors,
          }}
        />
      </p>

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s2.p2"
          values={{
            detectionRate: gt.detection_rate,
            auc: gt.auc,
            aucPct: (gt.auc * 100).toFixed(0),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Detection rate bars */}
      <div className="space-y-2 mb-6">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-2">
          {t('s2.detectionLabel')}
        </p>
        {sortedCases.map((c) => (
          <div key={c.name} className="flex items-center gap-3">
            <div className="w-52 sm:w-64 text-right">
              <span className="text-xs text-text-secondary truncate block">{c.name}</span>
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
              <span className="absolute right-2 top-0 bottom-0 flex items-center text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] font-mono">
                {c.high_plus_pct}%
              </span>
            </div>
            <span className="text-xs text-text-muted w-20 text-right font-mono">
              {t('s2.nContracts', { count: formatNumber(c.contracts) })}
            </span>
          </div>
        ))}
      </div>

      {/* Early warning callout */}
      <div className="border-l-2 border-accent/50 bg-accent/[0.03] rounded-r-md px-5 py-4 mb-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          <Trans
            t={t}
            i18nKey="s2.earlyWarning"
            components={{
              accent: <strong className="text-accent" />,
              italic: <em />,
            }}
          />
        </p>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        <Trans
          t={t}
          i18nKey="s2.p3"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
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
  const { t } = useTranslation(['executive', 'sectors'])
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

  const healthSector = data.sectors.find((s) => s.code === 'salud')

  return (
    <section>
      <SectionHeading number="03" title={t('s3.title')} icon={Scale} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s3.p1"
          values={{
            healthContracts: formatNumber(healthSector?.contracts ?? 0),
            healthValue: formatCompactMXN(healthSector?.value ?? 0),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Sector bars sorted by value at risk */}
      <div className="space-y-1.5 mb-8">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-2">
          {t('s3.riskLabel')}
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
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                  {t(s.code, { ns: 'sectors' })}
                </span>
              </div>
              <div className="flex-1 h-4 bg-surface-raised rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${Math.max(pct, 1)}%`, background: color }}
                />
              </div>
              <span className="text-xs text-text-muted w-24 text-right font-mono">
                {formatCompactMXN(riskValue)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sector callouts */}
      <div className="space-y-4">
        <SectorCallout
          name={t('s3.health.name')}
          color={SECTOR_COLORS.salud}
          text={t('s3.health.text')}
        />
        <SectorCallout
          name={t('s3.infrastructure.name')}
          color={SECTOR_COLORS.infraestructura}
          text={t('s3.infrastructure.text')}
        />
        <SectorCallout
          name={t('s3.agriculture.name')}
          color={SECTOR_COLORS.agricultura}
          text={t('s3.agriculture.text')}
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
  const { t } = useTranslation('executive')
  const knownBadIds = new Set([4335, 13885])

  return (
    <section>
      <SectionHeading number="04" title={t('s4.title')} icon={Users} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s4.p1"
          values={{
            totalValue: formatCompactMXN(data.top_vendors.reduce((sum, v) => sum + v.value_billions * 1e9, 0)),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Editorial table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.rank')}
              </th>
              <th className="text-left py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.vendor')}
              </th>
              <th className="text-right py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.value')}
              </th>
              <th className="text-right py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.contracts')}
              </th>
              <th className="text-right py-2 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.avgRisk')}
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
                  <td className="py-2 pr-3 text-text-muted font-mono text-xs">
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
                  <td className="py-2 pr-3 text-right text-text-secondary font-mono text-xs">
                    {v.value_billions}B
                  </td>
                  <td className="py-2 pr-3 text-right text-text-muted font-mono text-xs">
                    {formatNumber(v.contracts)}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold font-mono"
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

      <p className="text-sm leading-relaxed text-text-secondary">
        <Trans
          t={t}
          i18nKey="s4.p2"
          values={{ topValue: data.top_vendors[0]?.value_billions }}
          components={{
            bold: <strong className="text-text-primary" />,
            shield: <Shield className="h-3 w-3 inline text-risk-critical" />,
          }}
        />
      </p>
    </section>
  )
}

// ============================================================================
// S5: The Network — Co-bidding and Collusion Patterns
// ============================================================================

function SectionNetwork() {
  const { t } = useTranslation('executive')

  return (
    <section>
      <SectionHeading number="05" title={t('s5.title')} icon={Network} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s5.p1"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s5.p2"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCallout value="8,701" label={t('s5.suspiciousVendors')} color="var(--color-risk-high)" />
        <StatCallout value="1M+" label={t('s5.affectedContracts')} color="var(--color-risk-medium)" />
        <StatCallout value="50%+" label={t('s5.coBidThreshold')} color="var(--color-text-secondary)" />
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        {t('s5.p3')}
      </p>
    </section>
  )
}

// ============================================================================
// S6: The Data — COMPRANET Data Quality
// ============================================================================

function SectionData() {
  const { t } = useTranslation('executive')

  return (
    <section>
      <SectionHeading number="06" title={t('s6.title')} icon={Database} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        {t('s6.p1')}
      </p>

      <div className="space-y-3 mb-6">
        <DataStructureRow period="A" years="2002-2010" quality={t('s6.structures.a.quality')} rfcCoverage="0.1%" note={t('s6.structures.a.note')} />
        <DataStructureRow period="B" years="2010-2017" quality={t('s6.structures.b.quality')} rfcCoverage="15.7%" note={t('s6.structures.b.note')} />
        <DataStructureRow period="C" years="2018-2022" quality={t('s6.structures.c.quality')} rfcCoverage="30.3%" note={t('s6.structures.c.note')} />
        <DataStructureRow period="D" years="2023-2025" quality={t('s6.structures.d.quality')} rfcCoverage="47.4%" note={t('s6.structures.d.note')} />
      </div>

      <div className="border-l-2 border-accent/50 bg-accent/[0.03] rounded-r-md px-5 py-4 mb-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          <Trans
            t={t}
            i18nKey="s6.trillionLesson"
            components={{ accent: <strong className="text-accent" /> }}
          />
        </p>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        {t('s6.p2')}
      </p>
    </section>
  )
}

function DataStructureRow({ period, years, quality, rfcCoverage, note }: { period: string; years: string; quality: string; rfcCoverage: string; note: string }) {
  const { t } = useTranslation('executive')
  const qualityLower = quality.toLowerCase()
  const qualityColor = qualityLower.includes('lowest') || qualityLower.includes('baja') ? RISK_COLORS.critical : qualityLower.includes('better') || qualityLower.includes('mejor') ? RISK_COLORS.medium : qualityLower.includes('good') || qualityLower.includes('buena') ? RISK_COLORS.low : 'var(--color-accent)'
  return (
    <div className="flex items-start gap-3 border border-border/30 rounded-lg p-4 bg-surface-raised/20">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-elevated text-sm font-bold text-text-primary font-mono flex-shrink-0">
        {period}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-text-primary">{years}</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-bold font-mono" style={{ color: qualityColor, background: `color-mix(in srgb, ${qualityColor} 15%, transparent)` }}>
            {quality}
          </span>
          <span className="text-xs text-text-muted font-mono">{t('s6.rfc')}: {rfcCoverage}</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">{note}</p>
      </div>
    </div>
  )
}

// ============================================================================
// S7: Across Administrations — Political Timeline
// ============================================================================

function SectionAdministrations({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')

  return (
    <section>
      <SectionHeading number="07" title={t('s7.title')} icon={Landmark} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s7.p1"
          components={{ italic: <em /> }}
        />
      </p>

      <div className="space-y-4">
        {data.administrations.map((admin) => (
          <div
            key={admin.name}
            className="border border-border/30 rounded-lg p-5 bg-surface-raised/30"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-text-primary">{admin.full_name}</h4>
                <p className="text-xs text-text-muted font-mono">
                  {admin.years} &middot; {admin.party}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
              <MiniStat label={t('s7.labels.contracts')} value={formatNumber(admin.contracts)} />
              <MiniStat label={t('s7.labels.value')} value={formatCompactMXN(admin.value)} />
              <MiniStat
                label={t('s7.labels.highRisk')}
                value={`${admin.high_risk_pct}%`}
                color={admin.high_risk_pct >= 4.5 ? RISK_COLORS.high : undefined}
              />
              <MiniStat
                label={t('s7.labels.directAward')}
                value={`${admin.direct_award_pct}%`}
                color={admin.direct_award_pct >= 75 ? RISK_COLORS.medium : undefined}
              />
            </div>

            {/* Narrative */}
            <p className="text-sm leading-relaxed text-text-muted">
              {t(`s7.narratives.${admin.name}`, '')}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// S8: How We Know — Model Transparency
// ============================================================================

function SectionModel({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { model } = data
  const maxBeta = Math.max(...model.top_predictors.map((p) => Math.abs(p.beta)))

  return (
    <section>
      <SectionHeading number="08" title={t('s8.title')} icon={Brain} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s8.p1"
          values={{ contracts: formatNumber(data.ground_truth.contracts) }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Metric badges */}
      <div className="flex flex-wrap gap-3 mb-8">
        <MetricBadge label="AUC-ROC" value={model.auc.toFixed(3)} description={t('s8.discriminationPower')} />
        <MetricBadge label="Brier Score" value={model.brier.toFixed(3)} description={t('s8.calibrationQuality')} />
        <MetricBadge label="Lift" value={`${model.lift}x`} description={t('s8.vsRandom')} />
      </div>

      {/* Coefficient chart */}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-3">
          {t('s8.coeffLabel')}
        </p>
        <div className="space-y-2">
          {model.top_predictors.map((p) => {
            const isPositive = p.beta > 0
            const width = (Math.abs(p.beta) / maxBeta) * 100
            return (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-40 text-right">
                  <span className="text-xs text-text-secondary">
                    {t(`predictors.${p.name}`, p.name)}
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
                <span className="text-xs font-bold text-text-secondary font-mono w-14 text-right">
                  {isPositive ? '+' : ''}{p.beta.toFixed(3)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-text-muted font-mono">
          <span className="pl-44">{t('s8.reducesRisk')}</span>
          <span>{t('s8.increasesRisk')}</span>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        <Trans
          t={t}
          i18nKey="s8.p2"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>
    </section>
  )
}

// ============================================================================
// S9: What We Cannot See — Limitations
// ============================================================================

function SectionLimitations() {
  const { t } = useTranslation('executive')

  const limitations = [
    { icon: Database, key: 'groundTruth' },
    { icon: Search, key: 'dataQuality' },
    { icon: Scale, key: 'correlation' },
    { icon: HelpCircle, key: 'unknowns' },
  ]

  return (
    <section>
      <SectionHeading number="09" title={t('s9.title')} icon={EyeOff} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        {t('s9.p1')}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {limitations.map((lim) => {
          const Icon = lim.icon
          return (
            <div
              key={lim.key}
              className="border border-border/30 rounded-lg p-5 bg-surface-raised/20"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className="h-4 w-4 text-text-muted flex-shrink-0" />
                <h4 className="text-sm font-bold text-text-primary">
                  {t(`s9.limitations.${lim.key}.title`)}
                </h4>
              </div>
              <p className="text-sm leading-relaxed text-text-muted">
                {t(`s9.limitations.${lim.key}.text`)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================================
// S10: What Comes Next — Recommendations
// ============================================================================

function SectionRecommendations({ navigate }: { navigate: (path: string) => void }) {
  const { t } = useTranslation('executive')

  const actions = [
    { icon: Search, key: 'investigate', href: '/investigation' },
    { icon: Compass, key: 'safeguards', href: '/patterns' },
    { icon: Shield, key: 'diversify', href: '/ground-truth' },
  ]

  return (
    <section>
      <SectionHeading number="10" title={t('s10.title')} icon={ArrowRight} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        {t('s10.p1')}
      </p>

      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={() => navigate(action.href)}
              className="w-full text-left border border-border/30 rounded-lg p-5 bg-surface-raised/20 hover:bg-surface-raised/50 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">
                    {t(`s10.actions.${action.key}.title`)}
                  </h4>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {t(`s10.actions.${action.key}.description`)}
                  </p>
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
  const { t, i18n } = useTranslation('executive')
  const locale = i18n.language === 'es' ? 'es-MX' : 'en-US'

  return (
    <footer className="pt-12 pb-8 text-center space-y-3">
      <div className="h-px bg-border/30 mb-8" />
      <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
        {t('footer.platform')}
      </p>
      <p className="text-xs text-text-secondary font-mono">
        {new Date(data.generated_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
        {' '}&middot; {t('footer.compranet')} &middot; Model v5.0 (AUC {data.model.auc})
      </p>
      <p className="text-xs text-text-secondary font-mono">
        {formatNumber(data.headline.total_contracts)} {t('header.contracts').toLowerCase()}
        {' '}&middot; {formatCompactMXN(data.headline.total_value)}
        {' '}&middot; {formatNumber(data.headline.total_vendors)} {t('header.vendors').toLowerCase()}
        {' '}&middot; {t('footer.sectors')}
      </p>
      <p className="text-sm italic text-text-muted mt-6">
        {t('footer.quote')}
      </p>
      <p className="text-xs text-text-muted font-mono mt-4 tracking-wide">
        {t('footer.copyright', { year: new Date().getFullYear() })}
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
        <span className="text-text-muted font-mono text-sm mr-2">{number} —</span>
        {title}
      </h2>
    </div>
  )
}

function HeadlineStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center py-4 px-2 border border-border/20 rounded-lg bg-surface-raised/20">
      <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono tracking-tight">
        {value}
      </div>
      <div className="text-xs text-text-muted uppercase tracking-wider font-mono mt-1">
        {label}
      </div>
    </div>
  )
}

function StatCallout({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center py-2">
      <div className="text-lg font-bold font-mono" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted uppercase tracking-wider font-mono">
        {label}
      </div>
      <div
        className="text-sm font-bold font-mono"
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
        <div className="text-lg font-bold text-accent font-mono">{value}</div>
        <div className="text-xs text-text-muted font-mono uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div className="text-xs text-text-secondary max-w-[80px] leading-tight">{description}</div>
    </div>
  )
}

function SectorCallout({ name, color, text }: { name: string; color: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-0.5">{name}</h4>
        <p className="text-sm leading-relaxed text-text-muted">{text}</p>
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
