import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { InstitutionBadge } from '@/components/InstitutionBadge'
import { ArrowLeft, ExternalLink, ArrowUpRight } from 'lucide-react'
import { RISK_COLORS, getRiskLevelFromScore, SECTORS } from '@/lib/constants'
import { DotBar } from '@/components/ui/DotBar'
import type { FraudType, LinkedVendor, ScandalDetail } from '@/api/types'
import { slideUp } from '@/lib/animations'

// ─────────────────────────────────────────────────────────────────────────────
// Bible §2: cream page + white cards + warm border + dark ink.
// Named palette tokens kept for minimal-diff refactor; mapped to CSS vars.
// ─────────────────────────────────────────────────────────────────────────────
const BG = 'var(--color-background)'
const PANEL = 'var(--color-background-card)'
const PANEL_2 = 'var(--color-background-elevated)'
const BORDER = 'var(--color-border)'
const BORDER_STRONG = 'var(--color-border-hover)'
const TEXT_PRIMARY = 'var(--color-text-primary)'
const TEXT_SECONDARY = 'var(--color-text-secondary)'
const TEXT_MUTED = 'var(--color-text-muted)'
const TEXT_FAINT = 'var(--color-text-muted)'
const CRIMSON_HI = 'var(--color-risk-critical)'
const AMBER = 'var(--color-risk-high)'
const EMERALD = 'var(--color-accent)'  // bible: no green; use amber gold for positive signal
const CYAN = 'var(--color-oecd)'

// Local DotBar replaced by the canonical primitive from @/components/ui/DotBar.
// See marathon Batch B critique — page-local empty-dot fill `#2d2926` was
// dark-mode residue on the cream base. Cream-mode tokens for the empty-dot
// states still used by the timeline + risk grid below:
const DOT_EMPTY_FILL = 'var(--color-background-elevated)'
const DOT_EMPTY_STROKE = 'var(--color-border-hover)'

// ─────────────────────────────────────────────────────────────────────────────
// Fraud-type accent colors
// ─────────────────────────────────────────────────────────────────────────────
const FRAUD_ACCENT: Record<string, string> = {
  ghost_company: CRIMSON_HI,
  bid_rigging: '#a78bfa',
  overpricing: '#fb923c',
  conflict_of_interest: '#c084fc',
  embezzlement: AMBER,
  bribery: '#fb7185',
  procurement_fraud: '#facc15',
  monopoly: '#60a5fa',
  emergency_fraud: CYAN,
  tender_rigging: '#818cf8',
  other: '#94a3b8',
}

const FRAUD_LABEL_EN: Record<string, string> = {
  ghost_company: 'Ghost Company',
  bid_rigging: 'Bid Rigging',
  overpricing: 'Overpricing',
  conflict_of_interest: 'Conflict of Interest',
  embezzlement: 'Embezzlement',
  bribery: 'Bribery',
  procurement_fraud: 'Procurement Fraud',
  monopoly: 'Monopoly',
  emergency_fraud: 'Emergency Fraud',
  tender_rigging: 'Tender Rigging',
  other: 'Other',
}

const ADMIN_LABEL_EN: Record<string, string> = {
  fox: 'Fox (2000–2006)',
  calderon: 'Calderón (2006–2012)',
  epn: 'Peña Nieto (2012–2018)',
  amlo: 'López Obrador (2018–2024)',
  sheinbaum: 'Sheinbaum (2024–)',
}

// ─────────────────────────────────────────────────────────────────────────────
// Legal status styling
// ─────────────────────────────────────────────────────────────────────────────
function legalStatusMeta(status: string): {
  accent: string
  bg: string
  border: string
  headline: string
  subline: string
  label: string
} {
  switch (status) {
    case 'convicted':
      return {
        accent: EMERALD,
        bg: 'rgba(16,185,129,0.08)',
        border: 'rgba(16,185,129,0.25)',
        headline: 'Criminal conviction obtained',
        subline: 'A court of law returned a guilty verdict against at least one actor tied to this case.',
        label: 'Convicted',
      }
    case 'prosecuted':
      return {
        accent: '#fb923c',
        bg: 'rgba(251,146,60,0.08)',
        border: 'rgba(251,146,60,0.25)',
        headline: 'Prosecution in progress',
        subline: 'Formal charges have been filed; trial proceedings are under way.',
        label: 'Prosecuted',
      }
    case 'investigation':
      return {
        accent: AMBER,
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
        headline: 'Under active investigation',
        subline: 'An administrative or criminal inquiry is open; no charges have been filed.',
        label: 'Investigation',
      }
    case 'acquitted':
      return {
        accent: '#60a5fa',
        bg: 'rgba(96,165,250,0.08)',
        border: 'rgba(96,165,250,0.25)',
        headline: 'Defendants acquitted',
        subline: 'The court returned a not-guilty verdict. The factual record remains in the public domain.',
        label: 'Acquitted',
      }
    case 'dismissed':
      return {
        accent: TEXT_MUTED,
        bg: 'rgba(120,113,108,0.08)',
        border: 'rgba(120,113,108,0.25)',
        headline: 'Case dismissed',
        subline: 'Proceedings were dismissed without a conviction. See notes for jurisdictional context.',
        label: 'Dismissed',
      }
    case 'impunity':
      return {
        accent: CRIMSON_HI,
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.28)',
        headline: 'No convictions recorded in public court records',
        subline:
          'Despite documented evidence, no criminal sanctions have been obtained — a signature feature of Mexican procurement scandals.',
        label: 'Impunity',
      }
    default:
      return {
        accent: TEXT_MUTED,
        bg: 'rgba(120,113,108,0.06)',
        border: 'rgba(120,113,108,0.25)',
        headline: 'Legal outcome unresolved',
        subline: 'Public records do not yet document a final judicial disposition.',
        label: 'Unresolved',
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatMXN(n?: number | null): string {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

function formatCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Format a date string (ISO 'YYYY-MM-DD' or 'YYYY-MM') to 'Mon YYYY' in locale
function formatDateShort(raw: string | null | undefined, lang: string): string {
  if (!raw) return ''
  // Accept '2024-03' or '2024-03-15T...' — take first 7 chars
  const ym = raw.slice(0, 7)
  const parts = ym.split('-')
  if (parts.length < 2) return raw
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (!year || !month || month < 1 || month > 12) return raw
  const locale = lang === 'es' ? 'es-MX' : 'en-US'
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
      new Date(year, month - 1, 1),
    )
  } catch {
    return ym
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared typography
// ─────────────────────────────────────────────────────────────────────────────
const OVERLINE: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: TEXT_FAINT,
  fontWeight: 700,
}

const SERIF_HEAD: React.CSSProperties = {
  fontFamily: '"Playfair Display", var(--font-family-serif, Georgia, serif)',
  fontWeight: 800,
  letterSpacing: '-0.015em',
  color: TEXT_PRIMARY,
}

const MONO: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
}

// ─────────────────────────────────────────────────────────────────────────────
// Small pieces
// ─────────────────────────────────────────────────────────────────────────────
function Pill({
  children,
  color = TEXT_MUTED,
  border,
  bg,
}: {
  children: React.ReactNode
  color?: string
  border?: string
  bg?: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '5px 10px',
        borderRadius: 2,
        color,
        border: `1px solid ${border ?? 'rgba(255,255,255,0.1)'}`,
        background: bg ?? 'transparent',
      }}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper — numbered acts, compact
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  index,
  label,
  title,
  subtitle,
  children,
}: {
  index: string
  label: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section style={{ borderTop: `1px solid ${BORDER}`, padding: '48px 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ ...OVERLINE, color: CRIMSON_HI }}>
          {index} · {label}
        </span>
      </div>
      <h2 style={{ ...SERIF_HEAD, fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)', margin: '0 0 10px', lineHeight: 1.15 }}>
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            color: TEXT_SECONDARY,
            fontSize: 13,
            maxWidth: 680,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 1 — Contract timeline bar: shows fraud period on a 2002–2025 axis
// ─────────────────────────────────────────────────────────────────────────────
function YearRangeBar({
  yearStart,
  yearEnd,
  discoveryYear,
  axisStart = 2002,
  axisEnd = 2025,
}: {
  yearStart?: number
  yearEnd?: number
  discoveryYear?: number
  axisStart?: number
  axisEnd?: number
}) {
  const width = 980
  const height = 120
  const paddingX = 40
  const innerW = width - paddingX * 2
  const years = axisEnd - axisStart + 1
  const yearWidth = innerW / years

  const fraudStart = yearStart ?? axisStart
  const fraudEnd = yearEnd ?? fraudStart
  const clampStart = Math.max(axisStart, Math.min(axisEnd, fraudStart))
  const clampEnd = Math.max(axisStart, Math.min(axisEnd, fraudEnd))

  const bandX = paddingX + (clampStart - axisStart) * yearWidth
  const bandW = Math.max(yearWidth, (clampEnd - clampStart + 1) * yearWidth)
  const baselineY = 72
  const tickH = 14

  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        padding: '24px 20px 20px',
        overflowX: 'auto',
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height={height}
        style={{ display: 'block' }}
        aria-hidden
      >
        {/* Axis grid — ticks every year */}
        {Array.from({ length: years }, (_, i) => {
          const year = axisStart + i
          const x = paddingX + i * yearWidth
          const isMajor = year % 5 === 0 || year === axisEnd
          return (
            <line
              key={year}
              x1={x}
              x2={x}
              y1={baselineY}
              y2={baselineY + (isMajor ? tickH : tickH / 2)}
              stroke={isMajor ? DOT_EMPTY_STROKE : 'var(--color-border)'}
              strokeWidth={1}
            />
          )
        })}

        {/* Baseline */}
        <line
          x1={paddingX}
          x2={paddingX + innerW}
          y1={baselineY}
          y2={baselineY}
          stroke={DOT_EMPTY_STROKE}
          strokeWidth={1}
        />

        {/* Fraud period amber band */}
        <rect
          x={bandX}
          y={baselineY - 26}
          width={bandW}
          height={26}
          fill={AMBER}
          opacity={0.18}
        />
        <rect
          x={bandX}
          y={baselineY - 26}
          width={bandW}
          height={26}
          fill="none"
          stroke={AMBER}
          strokeWidth={1}
          opacity={0.6}
        />
        <line
          x1={bandX}
          x2={bandX}
          y1={baselineY - 30}
          y2={baselineY - 26}
          stroke={AMBER}
          strokeWidth={1.5}
        />
        <line
          x1={bandX + bandW}
          x2={bandX + bandW}
          y1={baselineY - 30}
          y2={baselineY - 26}
          stroke={AMBER}
          strokeWidth={1.5}
        />
        <text
          x={bandX + bandW / 2}
          y={baselineY - 34}
          fill={AMBER}
          fontSize={10}
          fontFamily='ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace'
          fontWeight={700}
          letterSpacing="0.12em"
          textAnchor="middle"
        >
          {clampStart === clampEnd
            ? `FRAUD · ${clampStart}`
            : `FRAUD PERIOD · ${clampStart}–${clampEnd}`}
        </text>

        {/* Discovery marker */}
        {discoveryYear && discoveryYear >= axisStart && discoveryYear <= axisEnd && (
          <g>
            <line
              x1={paddingX + (discoveryYear - axisStart) * yearWidth + yearWidth / 2}
              x2={paddingX + (discoveryYear - axisStart) * yearWidth + yearWidth / 2}
              y1={baselineY - 6}
              y2={baselineY + tickH + 4}
              stroke={CYAN}
              strokeWidth={1.5}
            />
            <circle
              cx={paddingX + (discoveryYear - axisStart) * yearWidth + yearWidth / 2}
              cy={baselineY}
              r={4}
              fill={CYAN}
            />
          </g>
        )}

        {/* Year labels at majors */}
        {Array.from({ length: years }, (_, i) => {
          const year = axisStart + i
          if (year % 5 !== 0 && year !== axisEnd && year !== axisStart) return null
          const x = paddingX + i * yearWidth
          return (
            <text
              key={`lbl-${year}`}
              x={x}
              y={baselineY + tickH + 14}
              fill={TEXT_MUTED}
              fontSize={10}
              fontFamily='ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace'
              textAnchor="middle"
            >
              {year}
            </text>
          )
        })}

        {/* Discovery label */}
        {discoveryYear && (
          <text
            x={paddingX + (discoveryYear - axisStart) * yearWidth + yearWidth / 2}
            y={baselineY + tickH + 26}
            fill={CYAN}
            fontSize={9}
            fontFamily='ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace'
            fontWeight={700}
            letterSpacing="0.12em"
            textAnchor="middle"
          >
            DISCOVERED
          </text>
        )}
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 12,
          fontSize: 10,
          ...MONO,
          color: TEXT_MUTED,
          letterSpacing: '0.08em',
        }}
      >
        <span>
          <span style={{ color: TEXT_FAINT }}>AXIS · </span>
          <span>{axisStart}–{axisEnd}</span>
        </span>
        <span>
          <span style={{ color: TEXT_FAINT }}>FRAUD WINDOW · </span>
          <span style={{ color: AMBER }}>
            {clampStart === clampEnd ? `${clampStart}` : `${clampStart}–${clampEnd}`}
          </span>
          {discoveryYear && (
            <>
              <span style={{ color: TEXT_FAINT, marginLeft: 16 }}>DISCLOSED · </span>
              <span style={{ color: CYAN }}>{discoveryYear}</span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 2 — Risk distribution dot-matrix (derived from linked vendor scores)
// ─────────────────────────────────────────────────────────────────────────────
interface RiskDist {
  critical: number
  high: number
  medium: number
  low: number
  totalVendors: number
  hasData: boolean
}

function computeRiskDistribution(vendors: LinkedVendor[]): RiskDist {
  const scored = vendors.filter((v) => v.avg_risk_score != null)
  if (scored.length === 0) {
    return { critical: 0, high: 0, medium: 0, low: 0, totalVendors: 0, hasData: false }
  }
  let c = 0, h = 0, m = 0, l = 0
  for (const v of scored) {
    const lvl = getRiskLevelFromScore(v.avg_risk_score!)
    if (lvl === 'critical') c++
    else if (lvl === 'high') h++
    else if (lvl === 'medium') m++
    else l++
  }
  const t = scored.length
  return {
    critical: (c / t) * 100,
    high: (h / t) * 100,
    medium: (m / t) * 100,
    low: (l / t) * 100,
    totalVendors: t,
    hasData: true,
  }
}

function RiskDistribution({ dist }: { dist: RiskDist }) {
  if (!dist.hasData) {
    return (
      <div
        style={{
          background: PANEL,
          border: `1px dashed ${BORDER_STRONG}`,
          borderRadius: 2,
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: 12,
          color: TEXT_MUTED,
          lineHeight: 1.6,
        }}
      >
        <div style={{ ...OVERLINE, color: AMBER, marginBottom: 8 }}>Data unavailable</div>
        Risk distribution requires matched vendors with model scores.
        Vendor identification for this case is in progress.
      </div>
    )
  }

  const rows: Array<{ label: string; pct: number; color: string; sev: string }> = [
    { label: 'Critical', pct: dist.critical, color: RISK_COLORS.critical, sev: '≥ 0.60' },
    { label: 'High', pct: dist.high, color: RISK_COLORS.high, sev: '≥ 0.40' },
    { label: 'Medium', pct: dist.medium, color: RISK_COLORS.medium, sev: '≥ 0.25' },
    { label: 'Low', pct: dist.low, color: '#52525b', sev: '< 0.25' },
  ]

  const DOT = 8
  const GAP = 4
  const N = 20

  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        padding: '22px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ ...OVERLINE, color: TEXT_MUTED }}>
          Risk level · {dist.totalVendors} scored {dist.totalVendors === 1 ? 'vendor' : 'vendors'}
        </div>
        <div style={{ fontSize: 10, color: TEXT_FAINT, ...MONO, letterSpacing: '0.12em' }}>
          EACH DOT = 5 % OF MATCHED VENDORS
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((r) => {
          const filled = Math.max(0, Math.min(N, Math.round((r.pct / 100) * N)))
          return (
            <div
              key={r.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px minmax(0, 1fr) 70px',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: TEXT_PRIMARY, fontWeight: 600, letterSpacing: '0.02em' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 9, ...MONO, color: TEXT_FAINT, letterSpacing: '0.1em' }}>
                  {r.sev}
                </div>
              </div>
              <svg
                width={N * (DOT + GAP) - GAP}
                height={DOT}
                style={{ display: 'block' }}
                aria-hidden
              >
                {Array.from({ length: N }, (_, i) => (
                  <circle
                    key={i}
                    cx={i * (DOT + GAP) + DOT / 2}
                    cy={DOT / 2}
                    r={DOT / 2}
                    fill={i < filled ? r.color : DOT_EMPTY_FILL}
                    stroke={i < filled ? undefined : DOT_EMPTY_STROKE}
                    strokeWidth={i < filled ? 0 : 0.5}
                  />
                ))}
              </svg>
              <div
                style={{
                  ...MONO,
                  fontSize: 14,
                  fontWeight: 700,
                  color: r.pct > 0 ? r.color : TEXT_FAINT,
                  textAlign: 'right',
                  letterSpacing: '-0.02em',
                }}
              >
                {r.pct.toFixed(0)}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence strength badge
// ─────────────────────────────────────────────────────────────────────────────
function evidenceBadgeColor(strength: string): { color: string; bg: string; border: string } {
  switch (strength) {
    case 'strong':
      return { color: EMERALD, bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.28)' }
    case 'medium':
      return { color: AMBER, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.28)' }
    case 'weak':
      return { color: TEXT_MUTED, bg: 'rgba(120,113,108,0.06)', border: 'rgba(120,113,108,0.25)' }
    default:
      return { color: TEXT_MUTED, bg: 'transparent', border: BORDER_STRONG }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat cell in hero stats bar
// ─────────────────────────────────────────────────────────────────────────────
function HeroStat({
  label,
  value,
  unit,
  foot,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  foot?: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderLeft: `1px solid ${BORDER}`,
        minWidth: 0,
      }}
    >
      <div style={{ ...OVERLINE, marginBottom: 8 }}>{label}</div>
      <div
        style={{
          ...MONO,
          fontSize: 22,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
        }}
      >
        <span>{value}</span>
        {unit && (
          <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 400, letterSpacing: 0 }}>
            {unit}
          </span>
        )}
      </div>
      {foot && (
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 5, ...MONO, letterSpacing: '0.04em' }}>
          {foot}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function CaseDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { i18n } = useTranslation('cases')
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'detail', slug],
    queryFn: slug ? () => caseLibraryApi.getBySlug(slug) : () => Promise.reject(new Error('No slug')),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    retry: (count, err) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      return status !== 404 && count < 2
    },
  })

  const { data: allCases } = useQuery({
    queryKey: ['cases', 'list', {}],
    queryFn: () => caseLibraryApi.getAll({}),
    staleTime: 10 * 60 * 1000,
    enabled: !!data,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '48px 32px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ ...OVERLINE, marginBottom: 20 }}>Case file · Loading</div>
          <div
            style={{
              height: 80,
              background: PANEL,
              borderRadius: 2,
              marginBottom: 16,
              border: `1px solid ${BORDER}`,
            }}
          />
          <div
            style={{
              height: 240,
              background: PANEL,
              borderRadius: 2,
              border: `1px solid ${BORDER}`,
            }}
          />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <p style={{ ...OVERLINE, marginBottom: 16 }}>Cases · Not Found</p>
          <h1 style={{ ...SERIF_HEAD, fontSize: 32, marginBottom: 12 }}>Case not found</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 32 }}>
            "{slug}" does not exist in the case library, or could not be loaded.
          </p>
          <button
            onClick={() => navigate('/cases')}
            style={{
              fontSize: 11,
              ...MONO,
              color: CRIMSON_HI,
              border: `1px solid ${CRIMSON_HI}4d`,
              padding: '8px 16px',
              borderRadius: 2,
              cursor: 'pointer',
              background: 'transparent',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            ← Browse all cases
          </button>
        </div>
      </div>
    )
  }

  return <CaseBody data={data} allCases={allCases} lang={i18n.language} navigate={navigate} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Body — split out to keep hooks ergonomics sane
// ─────────────────────────────────────────────────────────────────────────────
function CaseBody({
  data,
  allCases,
  lang,
  navigate,
}: {
  data: ScandalDetail
  allCases: ScandalDetail[] | import('@/api/types').ScandalListItem[] | undefined
  lang: string
  navigate: ReturnType<typeof useNavigate>
}) {
  const name = lang === 'es' && data.name_es ? data.name_es : data.name_en
  const summary = lang === 'es' && data.summary_es ? data.summary_es : data.summary_en
  const fraudLabel = FRAUD_LABEL_EN[data.fraud_type] ?? titleCase(data.fraud_type)
  const adminLabel = ADMIN_LABEL_EN[data.administration] ?? titleCase(data.administration)
  const accent = FRAUD_ACCENT[data.fraud_type] ?? FRAUD_ACCENT.other
  const legal = legalStatusMeta(data.legal_status)

  const linkedVendors: LinkedVendor[] = data.linked_vendors ?? []
  const totalContracts = linkedVendors.reduce((s, v) => s + (v.contract_count ?? 0), 0)
  const institutions = (data.key_actors ?? []).filter((a) => a.role === 'institution')
  const officials = (data.key_actors ?? []).filter(
    (a) => a.role !== 'vendor' && a.role !== 'institution',
  )
  const fallbackVendorActors = (data.key_actors ?? []).filter((a) => a.role === 'vendor')

  const sectorLabels = (data.sector_ids ?? [])
    .map((sid) => SECTORS.find((s) => s.id === sid))
    .filter(Boolean)
    .map((s) => s!.nameEN)

  const riskDist = computeRiskDistribution(linkedVendors)
  const avgRiskScore =
    linkedVendors
      .filter((v) => v.avg_risk_score != null)
      .reduce((s, v) => s + (v.avg_risk_score ?? 0), 0) /
    Math.max(1, linkedVendors.filter((v) => v.avg_risk_score != null).length)

  const yearStart = data.contract_year_start ?? undefined
  const yearEnd = data.contract_year_end ?? data.contract_year_start ?? undefined
  const yearSpan =
    yearStart && yearEnd
      ? yearEnd === yearStart
        ? String(yearStart)
        : `${yearStart}–${yearEnd}`
      : '—'
  const yearsActive = yearStart && yearEnd ? yearEnd - yearStart + 1 : null

  const similarCases = allCases
    ? (allCases as import('@/api/types').ScandalListItem[])
        .filter((c) => c.fraud_type === data.fraud_type && c.slug !== data.slug)
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 3)
    : []

  // Confidence level — derived from severity (1..4)
  const confidenceLabel =
    data.severity >= 4 ? 'Confirmed' : data.severity >= 3 ? 'High confidence' : 'Medium confidence'
  const confidenceColor =
    data.severity >= 4 ? EMERALD : data.severity >= 3 ? AMBER : TEXT_MUTED

  const sourceCount = (data.sources ?? []).length

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT_PRIMARY }}>
      {/* BACK NAV */}
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 32px 0' }}>
        <button
          onClick={() => navigate('/cases')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            ...MONO,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: TEXT_MUTED,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = CRIMSON_HI)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED)}
        >
          <ArrowLeft size={12} /> {lang === 'es' ? 'Volver al archivo' : 'Back to case library'}
        </button>
      </div>

      {/* HERO: fraud type pill + headline + meta + stats bar + lede */}
      <motion.header
        variants={slideUp}
        initial="initial"
        animate="animate"
        style={{
          borderTop: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          background: PANEL,
          padding: '36px 32px 0',
          marginTop: 24,
        }}
      >
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <Pill color={accent} border={`${accent}55`} bg={`${accent}12`}>
              {fraudLabel}
            </Pill>
            <span style={{ color: TEXT_FAINT }}>·</span>
            <span style={{ ...OVERLINE, color: TEXT_MUTED }}>
              {adminLabel}
            </span>
            <span style={{ color: TEXT_FAINT }}>·</span>
            <span style={{ ...OVERLINE, color: TEXT_MUTED }}>{yearSpan}</span>
            {data.ground_truth_case_id != null && (
              <>
                <span style={{ color: TEXT_FAINT }}>·</span>
                <Link to="/methodology" style={{ ...OVERLINE, color: CYAN, textDecoration: 'none' }}>
                  ML-linked ground truth
                </Link>
              </>
            )}
          </div>

          {/* Headline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
              marginBottom: 22,
            }}
          >
            <h1
              style={{
                ...SERIF_HEAD,
                fontSize: 'clamp(2rem, 4.2vw, 2.75rem)',
                lineHeight: 1.06,
                margin: 0,
                maxWidth: 860,
              }}
            >
              {name}
            </h1>
            <div style={{ flexShrink: 0 }}>
              <AddToDossierButton entityType="note" entityId={data.id} entityName={data.name_en} />
            </div>
          </div>

          {/* STATS BAR — 5 numbers, all mono */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              borderTop: `1px solid ${BORDER}`,
              borderBottom: `1px solid ${BORDER}`,
              marginBottom: 28,
            }}
          >
            <HeroStat
              label="Contracts"
              value={totalContracts > 0 ? formatCompact(totalContracts) : '—'}
              foot={totalContracts > 0 ? 'linked in COMPRANET' : undefined}
            />
            <HeroStat
              label="Total value"
              value={data.amount_mxn_low ? formatMXN(data.amount_mxn_low) : '—'}
              unit="MXN"
              foot={
                data.amount_mxn_high && data.amount_mxn_high !== data.amount_mxn_low
                  ? `up to ${formatMXN(data.amount_mxn_high)}`
                  : undefined
              }
            />
            <HeroStat
              label="Vendors"
              value={linkedVendors.length > 0 ? linkedVendors.length : '—'}
              foot={linkedVendors.length > 0 ? 'matched' : 'identification pending'}
            />
            <HeroStat
              label="Institutions"
              value={institutions.length > 0 ? institutions.length : '—'}
              foot={institutions.length > 0 ? 'affected' : undefined}
            />
            <HeroStat
              label="Years active"
              value={yearsActive ?? '—'}
              foot={yearSpan !== '—' ? yearSpan : undefined}
            />
          </div>

          {/* LEDE — editorial opening paragraph */}
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: TEXT_SECONDARY,
              maxWidth: 780,
              marginBottom: 36,
              fontFamily: 'var(--font-family-serif, Georgia, serif)',
            }}
          >
            {summary}
          </p>
        </div>
      </motion.header>

      {/* BODY */}
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px 80px' }}>
        {/* VISUAL 1 — Contract timeline */}
        <Section
          index="01"
          label="Timeline"
          title="When the scheme operated"
          subtitle={
            yearStart && data.discovery_year
              ? `Contracts ran from ${yearStart}${
                  yearEnd && yearEnd !== yearStart ? `–${yearEnd}` : ''
                }. The case was publicly disclosed in ${data.discovery_year}${
                  yearStart ? ` — ${data.discovery_year - yearStart} year${data.discovery_year - yearStart === 1 ? '' : 's'} after contracts began` : ''
                }.`
              : 'Procurement timing against Mexico\'s full COMPRANET record (2002–2025).'
          }
        >
          <YearRangeBar
            yearStart={yearStart}
            yearEnd={yearEnd}
            discoveryYear={data.discovery_year}
          />
        </Section>

        {/* VISUAL 2 — Risk distribution */}
        <Section
          index="02"
          label="Risk Signature"
          title="How the model sees this case"
          subtitle={
            riskDist.hasData
              ? `Average RUBLI score across matched vendors: ${(avgRiskScore * 100).toFixed(0)}%. The distribution below shows where those vendors fall on the v0.6.5 risk scale.`
              : 'Risk distribution appears once ARIA has matched vendors to procurement records.'
          }
        >
          {riskDist.hasData && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 18,
                padding: '18px 22px',
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderLeft: `3px solid ${RISK_COLORS[getRiskLevelFromScore(avgRiskScore)] ?? CRIMSON_HI}`,
                borderRadius: 2,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ ...OVERLINE, color: TEXT_MUTED, marginBottom: 4 }}>Avg RUBLI score</div>
                <div
                  style={{
                    ...MONO,
                    fontSize: 44,
                    fontWeight: 700,
                    color: RISK_COLORS[getRiskLevelFromScore(avgRiskScore)] ?? CRIMSON_HI,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {Math.round(avgRiskScore * 100)}
                  <span style={{ fontSize: 18, color: TEXT_MUTED, fontWeight: 400 }}>%</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220, fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.55 }}>
                Across {riskDist.totalVendors} {riskDist.totalVendors === 1 ? 'vendor' : 'vendors'}{' '}
                with COMPRANET contracts. The v0.6.5 model uses 9 features — price volatility,
                vendor concentration, institution diversity — calibrated against 1,363 confirmed
                corruption cases.
                {avgRiskScore < 0.3 && (
                  <span style={{ color: AMBER, display: 'block', marginTop: 6, fontSize: 11 }}>
                    Low score flag: this pattern is structurally different from the training set.
                    See methodology.
                  </span>
                )}
              </div>
            </div>
          )}

          <RiskDistribution dist={riskDist} />
        </Section>

        {/* VISUAL 3 — Vendor evidence cards */}
        <Section
          index="03"
          label="Evidence"
          title={
            linkedVendors.length > 0
              ? 'Vendors on the record'
              : fallbackVendorActors.length > 0
              ? 'Vendors named in public reporting'
              : 'Vendor identification in progress'
          }
          subtitle={
            linkedVendors.length > 0
              ? `${linkedVendors.length} ${
                  linkedVendors.length === 1 ? 'vendor' : 'vendors'
                } matched from ground-truth evidence — ${formatCompact(totalContracts)} contracts on record.`
              : fallbackVendorActors.length > 0
              ? 'These vendors have been named in press or audit reports but have not yet been matched to specific COMPRANET procurement records.'
              : 'This case exists in the narrative record but has not yet been matched to specific procurement vendors via ARIA.'
          }
        >
          {linkedVendors.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {linkedVendors.map((vendor, i) => {
                const score = vendor.avg_risk_score
                const scoreLevel = score != null ? getRiskLevelFromScore(score) : null
                const scoreColor = scoreLevel ? RISK_COLORS[scoreLevel] : TEXT_MUTED
                const evBadge = evidenceBadgeColor(vendor.evidence_strength)
                return (
                  <div
                    key={i}
                    style={{
                      background: PANEL,
                      border: `1px solid ${BORDER}`,
                      borderLeft: `3px solid ${scoreColor}`,
                      borderRadius: 2,
                      padding: '18px 22px',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 20,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      {/* Name + role + evidence */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          marginBottom: 10,
                        }}
                      >
                        {vendor.vendor_id ? (
                          <Link
                            to={`/vendors/${vendor.vendor_id}`}
                            style={{
                              fontFamily: 'var(--font-family-serif, Georgia, serif)',
                              fontSize: 17,
                              fontWeight: 700,
                              color: TEXT_PRIMARY,
                              textDecoration: 'none',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {vendor.vendor_name}
                          </Link>
                        ) : (
                          <span
                            style={{
                              fontFamily: 'var(--font-family-serif, Georgia, serif)',
                              fontSize: 17,
                              fontWeight: 700,
                              color: TEXT_PRIMARY,
                            }}
                          >
                            {vendor.vendor_name}
                          </span>
                        )}
                        <Pill color={accent} border={`${accent}44`} bg={`${accent}0e`}>
                          {titleCase(vendor.role)}
                        </Pill>
                        {vendor.evidence_strength && (
                          <Pill color={evBadge.color} border={evBadge.border} bg={evBadge.bg}>
                            {titleCase(vendor.evidence_strength)} evidence
                          </Pill>
                        )}
                      </div>

                      {/* Stats row */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 20,
                          flexWrap: 'wrap',
                          fontSize: 11,
                          ...MONO,
                          color: TEXT_MUTED,
                          marginBottom: 10,
                          letterSpacing: '0.03em',
                        }}
                      >
                        <span>
                          <span style={{ color: TEXT_FAINT }}>CONTRACTS · </span>
                          <span style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>
                            {vendor.contract_count.toLocaleString()}
                          </span>
                        </span>
                        {vendor.match_method && (
                          <span>
                            <span style={{ color: TEXT_FAINT }}>MATCH · </span>
                            <span style={{ color: TEXT_SECONDARY }}>{vendor.match_method}</span>
                          </span>
                        )}
                      </div>

                      {/* DotBar risk viz */}
                      {score != null && (
                        <div style={{ maxWidth: 340 }}>
                          <DotBar value={score} max={1} color={scoreColor} />
                        </div>
                      )}

                      {/* Action links */}
                      <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
                        {vendor.vendor_id && (
                          <Link
                            to={`/contracts?vendor_id=${vendor.vendor_id}&sort_by=risk_score&sort_order=desc`}
                            style={{
                              fontSize: 10,
                              ...MONO,
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: TEXT_MUTED,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <ExternalLink size={10} /> View contracts
                          </Link>
                        )}
                        {vendor.vendor_id && (
                          <Link
                            to={`/thread/${vendor.vendor_id}`}
                            style={{
                              fontSize: 10,
                              ...MONO,
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: CRIMSON_HI,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            Investigation thread <ArrowUpRight size={10} />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Score on the right */}
                    {score != null && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ ...OVERLINE, fontSize: 9, marginBottom: 4 }}>RUBLI</div>
                        <div
                          style={{
                            ...MONO,
                            fontSize: 32,
                            fontWeight: 700,
                            color: scoreColor,
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {Math.round(score * 100)}
                          <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 400 }}>%</span>
                        </div>
                        <div style={{ fontSize: 9, ...MONO, color: TEXT_FAINT, marginTop: 4, letterSpacing: '0.1em' }}>
                          {scoreLevel?.toUpperCase()}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : fallbackVendorActors.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {fallbackVendorActors.map((actor, i) => (
                <div
                  key={i}
                  style={{
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 2,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-family-serif, Georgia, serif)',
                        fontSize: 16,
                        fontWeight: 700,
                        color: TEXT_PRIMARY,
                      }}
                    >
                      {actor.name}
                    </span>
                    <Pill color={accent} border={`${accent}44`} bg={`${accent}0e`}>
                      Vendor
                    </Pill>
                  </div>
                  {actor.title && (
                    <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>{actor.title}</div>
                  )}
                  {actor.note && (
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 6, lineHeight: 1.55 }}>
                      {actor.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: PANEL,
                border: `1px dashed ${BORDER_STRONG}`,
                borderRadius: 2,
                padding: '28px 24px',
                textAlign: 'center',
              }}
            >
              <div style={{ ...OVERLINE, color: AMBER, marginBottom: 8 }}>In progress</div>
              <div
                style={{
                  fontSize: 13,
                  color: TEXT_SECONDARY,
                  lineHeight: 1.6,
                  maxWidth: 480,
                  margin: '0 auto',
                }}
              >
                Vendor identification in progress via ARIA. This case exists in the narrative record but has
                not yet been matched to specific procurement vendors.
              </div>
            </div>
          )}

          {/* Institutions affected */}
          {institutions.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ ...OVERLINE, marginBottom: 12 }}>Institutions affected</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {institutions.map((actor, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: PANEL,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 2,
                      padding: '10px 14px',
                    }}
                  >
                    <InstitutionBadge name={actor.name} size={24} showTooltip={false} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: 600 }}>
                        {actor.name}
                      </div>
                      {actor.title && <div style={{ fontSize: 10, color: TEXT_MUTED }}>{actor.title}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key figures */}
          {officials.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ ...OVERLINE, marginBottom: 12 }}>Key figures</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {officials.map((actor, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 14,
                      background: PANEL,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 2,
                      padding: '14px 18px',
                    }}
                  >
                    <Pill color={TEXT_SECONDARY} border={BORDER_STRONG}>
                      {titleCase(actor.role)}
                    </Pill>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: TEXT_PRIMARY, fontWeight: 600 }}>{actor.name}</div>
                      {actor.title && (
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{actor.title}</div>
                      )}
                      {actor.note && (
                        <div
                          style={{
                            fontSize: 12,
                            color: TEXT_SECONDARY,
                            marginTop: 4,
                            lineHeight: 1.55,
                          }}
                        >
                          {actor.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* VISUAL 4 — Methodology & sources */}
        <Section
          index="04"
          label="Methodology"
          title="Sources and confidence"
          subtitle="Every claim in this file is traceable to a named public source — journalism, audit, or legal record."
        >
          {/* Source + confidence summary bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              background: PANEL,
              border: `1px solid ${BORDER}`,
              borderRadius: 2,
              marginBottom: 18,
            }}
          >
            <HeroStat
              label="Sources"
              value={sourceCount}
              foot={sourceCount === 1 ? 'record' : 'records'}
            />
            <HeroStat
              label="Confidence"
              value={
                <span style={{ color: confidenceColor, fontSize: 15 }}>{confidenceLabel}</span>
              }
              foot={`severity ${data.severity}/4`}
            />
            <HeroStat
              label="Sector"
              value={
                <span style={{ fontSize: 14 }}>
                  {sectorLabels.length > 0 ? sectorLabels.join(' · ') : '—'}
                </span>
              }
            />
            <HeroStat
              label="COMPRANET"
              value={
                <span style={{ fontSize: 14 }}>
                  {data.compranet_visibility && data.compranet_visibility !== 'none'
                    ? titleCase(data.compranet_visibility)
                    : 'Not visible'}
                </span>
              }
            />
          </div>

          {/* Source pills grid */}
          {sourceCount === 0 ? (
            <div
              style={{
                padding: '24px',
                border: `1px dashed ${BORDER_STRONG}`,
                borderRadius: 2,
                fontSize: 12,
                color: TEXT_MUTED,
                textAlign: 'center',
              }}
            >
              No sources recorded for this case yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {(data.sources ?? []).map((src, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0,1fr)',
                    gap: 14,
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 2,
                    padding: '12px 16px',
                    alignItems: 'start',
                  }}
                >
                  <Pill color={TEXT_SECONDARY} border={BORDER_STRONG}>
                    {titleCase(src.type)}
                  </Pill>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>
                      {src.url ? (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: TEXT_PRIMARY,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {src.title}
                          <ExternalLink size={11} style={{ color: TEXT_MUTED }} />
                        </a>
                      ) : (
                        src.title
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3, ...MONO, letterSpacing: '0.03em' }}>
                      {src.outlet}
                      {src.date ? ` · ${formatDateShort(src.date, lang)}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes grid */}
          {(data.amount_note || data.compranet_note) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 0,
                marginTop: 16,
                border: `1px solid ${BORDER}`,
                borderRadius: 2,
                background: PANEL,
              }}
            >
              {data.amount_note && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRight: data.compranet_note ? `1px solid ${BORDER}` : undefined,
                  }}
                >
                  <div style={{ ...OVERLINE, marginBottom: 6 }}>Amount notes</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.55 }}>
                    {data.amount_note}
                  </div>
                </div>
              )}
              {data.compranet_note && (
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ ...OVERLINE, marginBottom: 6 }}>COMPRANET visibility</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.55 }}>
                    {data.compranet_note}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div
            style={{
              marginTop: 18,
              padding: '14px 18px',
              border: `1px solid ${BORDER}`,
              borderLeft: `2px solid ${TEXT_FAINT}`,
              borderRadius: 2,
              background: PANEL_2,
              fontSize: 11,
              color: TEXT_MUTED,
              lineHeight: 1.6,
              ...MONO,
              letterSpacing: '0.01em',
            }}
          >
            <span style={{ color: TEXT_FAINT, fontWeight: 700, letterSpacing: '0.15em' }}>NOTE · </span>
            RUBLI risk scores are statistical indicators of similarity to documented corruption patterns —
            not probabilities of guilt. A high score means a contract's procurement characteristics
            resemble those from known corruption cases. Use for investigation triage only.
          </div>
        </Section>

        {/* VISUAL 5 — Legal status */}
        <Section
          index="05"
          label="Legal status"
          title="Judicial disposition"
          subtitle="The outcome — or absence of one — based on public court records."
        >
          <div
            style={{
              background: legal.bg,
              border: `1px solid ${legal.border}`,
              borderLeft: `3px solid ${legal.accent}`,
              borderRadius: 2,
              padding: '22px 26px',
            }}
          >
            <div style={{ ...OVERLINE, color: legal.accent, marginBottom: 10 }}>
              Status · {legal.label}
            </div>
            <h3
              style={{
                ...SERIF_HEAD,
                fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)',
                marginBottom: 10,
                lineHeight: 1.25,
              }}
            >
              {legal.headline}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: TEXT_SECONDARY,
                lineHeight: 1.65,
                maxWidth: 720,
                margin: 0,
              }}
            >
              {legal.subline}
            </p>
            {data.legal_status_note && (
              <p
                style={{
                  fontSize: 12,
                  color: TEXT_MUTED,
                  lineHeight: 1.6,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid ${BORDER}`,
                  maxWidth: 720,
                }}
              >
                <span style={{ ...OVERLINE, fontSize: 9, marginRight: 6 }}>Note</span>
                {data.legal_status_note}
              </p>
            )}
          </div>
        </Section>

        {/* Similar cases */}
        {similarCases.length > 0 && (
          <Section
            index="06"
            label="See also"
            title={`Similar ${fraudLabel.toLowerCase()} cases`}
            subtitle="Other documented cases of the same fraud pattern."
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 10,
              }}
            >
              {similarCases.map((cas) => {
                const sAccent = FRAUD_ACCENT[cas.fraud_type as FraudType] ?? FRAUD_ACCENT.other
                const sName =
                  lang === 'es' && (cas as unknown as { name_es?: string }).name_es
                    ? (cas as unknown as { name_es: string }).name_es
                    : cas.name_en
                return (
                  <button
                    key={cas.slug}
                    onClick={() => navigate(`/cases/${cas.slug}`)}
                    style={{
                      textAlign: 'left',
                      background: PANEL,
                      border: `1px solid ${BORDER}`,
                      borderLeft: `2px solid ${sAccent}`,
                      borderRadius: 2,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      color: 'inherit',
                      transition: 'background 160ms',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.background = PANEL_2
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.background = PANEL
                    }}
                  >
                    <div style={{ ...OVERLINE, fontSize: 9, color: sAccent, marginBottom: 8 }}>
                      Severity {cas.severity}/4
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-family-serif, Georgia, serif)',
                        fontSize: 15,
                        fontWeight: 700,
                        color: TEXT_PRIMARY,
                        lineHeight: 1.3,
                        marginBottom: 8,
                      }}
                    >
                      {sName}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        ...MONO,
                        color: TEXT_MUTED,
                      }}
                    >
                      <span>{FRAUD_LABEL_EN[cas.fraud_type] ?? titleCase(cas.fraud_type)}</span>
                      {cas.amount_mxn_low && <span>{formatMXN(cas.amount_mxn_low)} MXN</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <button
                onClick={() => navigate(`/cases?fraud_type=${data.fraud_type}`)}
                style={{
                  fontSize: 10,
                  ...MONO,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: TEXT_MUTED,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = CRIMSON_HI)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED)}
              >
                View all {fraudLabel} cases →
              </button>
            </div>
          </Section>
        )}
      </main>
    </div>
  )
}
