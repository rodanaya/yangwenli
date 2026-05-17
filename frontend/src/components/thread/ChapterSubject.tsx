/**
 * ChapterSubject — Chapter 1: The Subject
 * Extracted from RedThread.tsx.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'

// ─── Local constants ────────────────────────────────────────────────────────

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ChapterLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="editorial-label text-[var(--color-accent)] mb-4 tracking-[0.18em]">
      {children}
    </h2>
  )
}

function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-5 px-4 sm:px-8 max-w-4xl mx-auto">
      {children}
    </section>
  )
}

function StakesPullquote({ totalMxn }: { totalMxn: number }) {
  const equivalents: Array<{ threshold: number; phrase: (mxn: number) => string }> = [
    { threshold: 500_000_000_000, phrase: (m) => `≈ ${(m / 138_000_000_000).toFixed(1)}× Mexico's annual federal Defense budget` },
    { threshold: 100_000_000_000, phrase: (m) => `≈ ${(m / 4_200_000_000).toFixed(0)} years of IMSS pediatric oncology funding` },
    { threshold: 10_000_000_000,  phrase: (m) => `≈ ${(m / 800_000_000).toFixed(0)} new federal hospitals` },
    { threshold: 1_000_000_000,   phrase: (m) => `≈ ${(m / 30_000_000).toFixed(0)} km of federal highway` },
    { threshold: 100_000_000,     phrase: (m) => `≈ ${(m / 800_000).toFixed(0)} school classrooms` },
  ]
  const match = equivalents.find((e) => totalMxn >= e.threshold)
  if (!match) return null
  return (
    <p
      className="text-text-secondary italic mb-6 max-w-2xl"
      style={{
        fontFamily: 'var(--font-family-serif)',
        fontSize: '0.95rem',
        lineHeight: 1.55,
        borderLeft: '2px solid var(--color-accent)',
        paddingLeft: '0.85rem',
      }}
    >
      {match.phrase(totalMxn)}
    </p>
  )
}

function CompactDotBar({
  value,
  dots = 18,
  color,
  referenceMin,
  referenceMax,
}: {
  value: number
  dots?: number
  color: string
  referenceMin?: number
  referenceMax?: number
}) {
  const filled = Math.max(0, Math.min(dots, Math.round(value * dots)))
  const refStart = referenceMin != null ? Math.round(referenceMin * dots) : null
  const refEnd = referenceMax != null ? Math.round(referenceMax * dots) : null
  return (
    <span className="inline-flex items-baseline gap-[2px] align-middle" aria-hidden>
      {Array.from({ length: dots }).map((_, i) => {
        const inRef = refStart != null && refEnd != null && i >= refStart && i < refEnd
        const isFilled = i < filled
        return (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              height: 3,
              backgroundColor: isFilled ? color : (inRef ? 'rgba(0,0,0,0.18)' : 'transparent'),
              border: isFilled || inRef ? 'none' : '1px solid var(--color-border-hover)',
            }}
          />
        )
      })}
    </span>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ChapterSubjectProps {
  vendor: {
    name: string
    total_value_mxn: number
    total_contracts: number
    primary_sector_name?: string
    avg_risk_score?: number
    first_contract_year?: number
    last_contract_year?: number
    high_risk_pct: number
    direct_award_pct: number
  }
  aria: { ips_final: number; ips_tier: number; primary_sector_name?: string | null } | null
  /** Unused — component calls useTranslation internally. Accepted for call-site compatibility. */
  t?: unknown
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChapterSubject({ vendor, aria }: ChapterSubjectProps) {
  const { t } = useTranslation('redThread')
  const { t: tc } = useTranslation('common')

  const sectorName = vendor.primary_sector_name ?? aria?.primary_sector_name ?? null
  const sectorColor = sectorName
    ? SECTOR_COLORS[sectorName.toLowerCase()] ?? '#dc2626'
    : '#dc2626'

  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]
  const riskLevelLabel = tc(riskLevel)

  return (
    <ChapterShell id="chapter-subject">
      <ChapterLabel>{t('chapters.headings.subject')}</ChapterLabel>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif font-bold text-text-primary leading-[1.1] mb-4"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
          letterSpacing: '-0.02em',
        }}
        title={vendor.name}
      >
        {formatVendorName(vendor.name, 70)}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-wrap items-center gap-1.5 mb-6"
      >
        {sectorName && (
          <span
            className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em]"
            style={{ backgroundColor: sectorColor + '14', color: sectorColor, border: `1px solid ${sectorColor}33` }}
          >
            {sectorName}
          </span>
        )}
        <span
          className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em]"
          style={{ backgroundColor: riskColor + '14', color: riskColor, border: `1px solid ${riskColor}33` }}
        >
          {t('subject.riskBadge', { level: riskLevelLabel })}
        </span>
        {aria && (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em] bg-risk-critical/10 text-risk-critical border border-risk-critical/30">
            {t('subject.ariaTier', { tier: aria.ips_tier })}
          </span>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="font-serif font-extrabold tabular-nums leading-[0.95]"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              color: sectorColor,
              letterSpacing: '-0.025em',
            }}
          >
            {formatCompactMXN(vendor.total_value_mxn)}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted self-end pb-2">
            {t('kpi.totalValue')} · {vendor.first_contract_year ?? '?'}–{vendor.last_contract_year ?? '?'}
          </span>
        </div>

        <div className="h-px w-12 my-3" style={{ backgroundColor: sectorColor, opacity: 0.65 }} />

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3 text-sm">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-text-primary tabular-nums text-base">
              {formatNumber(vendor.total_contracts)}
            </span>
            <span className="text-text-muted text-xs">{t('kpi.contracts').toLowerCase()}</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-bold text-text-primary tabular-nums text-base">
              {Math.round(vendor.direct_award_pct)}%
            </span>
            <span className="text-text-muted text-xs">direct</span>
            <CompactDotBar
              value={vendor.direct_award_pct / 100}
              dots={18}
              color="var(--color-text-secondary)"
            />
            <span className="text-text-muted text-[10px] font-mono">vs ~48% nat'l</span>
          </div>

          <div className="flex items-baseline gap-2" title="OECD reference band: 2–15% high-risk">
            <span
              className="font-bold tabular-nums text-base"
              style={{ color: vendor.high_risk_pct > 15 ? 'var(--color-risk-high)' : 'var(--color-text-primary)' }}
            >
              {Math.round(vendor.high_risk_pct)}%
            </span>
            <span className="text-text-muted text-xs">high-risk</span>
            <CompactDotBar
              value={vendor.high_risk_pct / 100}
              dots={18}
              color={vendor.high_risk_pct > 15 ? 'var(--color-risk-high)' : 'var(--color-text-secondary)'}
              referenceMin={0.02}
              referenceMax={0.15}
            />
          </div>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-text-muted text-sm leading-relaxed max-w-2xl mb-4"
        dangerouslySetInnerHTML={{
          __html: t('subject.introText', {
            name: `<strong class="text-text-primary">${formatVendorName(vendor.name, 60)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')}</strong>`,
          }),
        }}
      />

      <StakesPullquote totalMxn={vendor.total_value_mxn} />
    </ChapterShell>
  )
}
