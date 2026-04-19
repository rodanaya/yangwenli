import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { InstitutionBadge } from '@/components/InstitutionBadge'
import { ArrowLeft, ExternalLink, Activity } from 'lucide-react'
import { RISK_COLORS, getRiskLevelFromScore, SECTORS } from '@/lib/constants'
import type { FraudType, LinkedVendor } from '@/api/types'
import { slideUp } from '@/lib/animations'

// ─────────────────────────────────────────────────────────────────────────────
// Editorial palette (warm dark)
// ─────────────────────────────────────────────────────────────────────────────
const BG = '#141210'
const PANEL = '#1a1614'
const PANEL_2 = '#201b18'
const BORDER = 'rgba(255,255,255,0.06)'
const BORDER_STRONG = 'rgba(255,255,255,0.12)'
const TEXT_PRIMARY = '#e7e5e1'
const TEXT_SECONDARY = '#a8a29e'
const TEXT_MUTED = '#78716c'
const TEXT_FAINT = '#57534e'
const CRIMSON_HI = '#ef4444'
const AMBER = '#f59e0b'
const EMERALD = '#10b981'
const CYAN = '#22d3ee'

// ─────────────────────────────────────────────────────────────────────────────
// DotBar — particle density encoding for intensities
// ─────────────────────────────────────────────────────────────────────────────
function DotBar({
  value,
  max = 1,
  color = CRIMSON_HI,
  dots = 20,
  size = 7,
  gap = 3,
}: {
  value: number
  max?: number
  color?: string
  dots?: number
  size?: number
  gap?: number
}) {
  const filled = Math.max(0, Math.min(dots, Math.round((value / max) * dots)))
  return (
    <svg
      width={dots * (size + gap) - gap}
      height={size}
      style={{ display: 'block' }}
      aria-hidden
    >
      {Array.from({ length: dots }, (_, i) => (
        <circle
          key={i}
          cx={i * (size + gap) + size / 2}
          cy={size / 2}
          r={size / 2}
          fill={i < filled ? color : '#2a2420'}
        />
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fraud-type accent
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

// ─────────────────────────────────────────────────────────────────────────────
// Legal status styling (editorial, English)
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
// Signals (English editorial wording) + severity intensities per fraud type
// ─────────────────────────────────────────────────────────────────────────────
interface SignalRow {
  label: string
  intensity: number
  severity: 'Critical' | 'High' | 'Moderate'
}

const FRAUD_SIGNALS: Record<string, SignalRow[]> = {
  ghost_company: [
    { label: 'Vendor concentration (sector share controlled)', intensity: 0.92, severity: 'Critical' },
    { label: 'Price volatility vs sector norm', intensity: 0.85, severity: 'Critical' },
    { label: 'Win rate anomaly in competitive procedures', intensity: 0.78, severity: 'High' },
  ],
  bid_rigging: [
    { label: 'Repeated co-bidding — same vendor cluster', intensity: 0.88, severity: 'Critical' },
    { label: 'Alternating wins — rotation pattern', intensity: 0.75, severity: 'High' },
    { label: 'Low price gap between winner and cover bids', intensity: 0.65, severity: 'High' },
  ],
  overpricing: [
    { label: 'Price ratio — 3x+ above sector median', intensity: 0.9, severity: 'Critical' },
    { label: 'IQR statistical outlier test', intensity: 0.82, severity: 'Critical' },
    { label: 'Same-institution repeat awards', intensity: 0.7, severity: 'High' },
  ],
  conflict_of_interest: [
    { label: 'Abnormal single-institution win rate', intensity: 0.85, severity: 'Critical' },
    { label: 'Industry mismatch vs contract category', intensity: 0.72, severity: 'High' },
    { label: 'Short advertisement periods', intensity: 0.55, severity: 'Moderate' },
  ],
  embezzlement: [
    { label: 'Year-end contract clustering (December)', intensity: 0.8, severity: 'Critical' },
    { label: 'Same-day simultaneous contracts', intensity: 0.72, severity: 'High' },
    { label: 'Threshold splitting below bidding caps', intensity: 0.68, severity: 'High' },
  ],
  bribery: [
    { label: 'Industry mismatch — out-of-sector award', intensity: 0.78, severity: 'High' },
    { label: 'Network centrality in co-bidding graph', intensity: 0.7, severity: 'High' },
    { label: 'Win rate far above sector baseline', intensity: 0.82, severity: 'Critical' },
  ],
  procurement_fraud: [
    { label: 'Direct award prevalence', intensity: 0.85, severity: 'Critical' },
    { label: 'Vendor concentration within institution', intensity: 0.78, severity: 'High' },
    { label: 'Price volatility across same contract type', intensity: 0.6, severity: 'Moderate' },
  ],
  monopoly: [
    { label: 'Extreme vendor concentration (>50% of sector)', intensity: 0.95, severity: 'Critical' },
    { label: 'Near-zero real competition in procedures', intensity: 0.88, severity: 'Critical' },
    { label: 'Low institution diversity (1–2 authorities)', intensity: 0.75, severity: 'High' },
  ],
  emergency_fraud: [
    { label: 'Fast-tracked advertisement periods', intensity: 0.88, severity: 'Critical' },
    { label: 'Price ratio outliers above normal benchmarks', intensity: 0.78, severity: 'High' },
    { label: 'Simultaneous direct awards to same vendor', intensity: 0.7, severity: 'High' },
  ],
  tender_rigging: [
    { label: 'Closed vendor pool dominating procedure', intensity: 0.85, severity: 'Critical' },
    { label: 'Sustained high win rate, single institution', intensity: 0.78, severity: 'High' },
    { label: 'Winning bids consistently at ceiling', intensity: 0.7, severity: 'High' },
  ],
  other: [
    { label: 'Statistical anomalies in vendor concentration', intensity: 0.65, severity: 'Moderate' },
    { label: 'Behavioural patterns match known cases', intensity: 0.6, severity: 'Moderate' },
    { label: 'Multiple z-score features above baseline', intensity: 0.7, severity: 'High' },
  ],
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

const SEVERITY_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Critical',
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared style tokens
// ─────────────────────────────────────────────────────────────────────────────
const OVERLINE: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'monospace',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: TEXT_FAINT,
  fontWeight: 700,
}

const ACT_HEADLINE: React.CSSProperties = {
  fontFamily: 'var(--font-family-serif, Georgia, serif)',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: TEXT_PRIMARY,
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
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '5px 10px',
        borderRadius: 3,
        color,
        border: `1px solid ${border ?? 'rgba(255,255,255,0.1)'}`,
        background: bg ?? 'transparent',
      }}
    >
      {children}
    </span>
  )
}

function StatCell({
  overline,
  value,
  foot,
}: {
  overline: string
  value: React.ReactNode
  foot?: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '14px 18px',
        borderLeft: `1px solid ${BORDER}`,
        minWidth: 0,
      }}
    >
      <div style={{ ...OVERLINE, marginBottom: 6 }}>{overline}</div>
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 20,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      {foot && (
        <div
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            marginTop: 4,
          }}
        >
          {foot}
        </div>
      )}
    </div>
  )
}

function SeverityIndicator({ severity }: { severity: number }) {
  const color = severity >= 4 ? CRIMSON_HI : severity >= 3 ? '#fb923c' : severity >= 2 ? AMBER : TEXT_MUTED
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10,
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '5px 10px',
        borderRadius: 3,
        color,
        border: `1px solid ${color}40`,
        background: `${color}10`,
      }}
    >
      <span style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            style={{
              width: 4,
              height: 8,
              background: n <= severity ? color : 'rgba(255,255,255,0.08)',
              borderRadius: 1,
            }}
          />
        ))}
      </span>
      <span>
        Severity {severity}/4 · {SEVERITY_LABEL[severity] ?? '—'}
      </span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Act wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Act({
  number,
  title,
  subtitle,
  children,
}: {
  number: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section style={{ borderTop: `1px solid ${BORDER}`, padding: '56px 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ ...OVERLINE, color: CRIMSON_HI }}>{number}</span>
        <h2 style={{ ...ACT_HEADLINE, fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)', margin: 0 }}>{title}</h2>
      </div>
      {subtitle && (
        <p
          style={{
            color: TEXT_SECONDARY,
            fontSize: 13,
            maxWidth: 620,
            marginBottom: 22,
            lineHeight: 1.55,
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
// Dot timeline (horizontal)
// ─────────────────────────────────────────────────────────────────────────────
interface TimelinePoint {
  label: string
  year: string
  color: string
}

function DotTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) return null
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
        padding: '28px 32px 24px',
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${points.length}, minmax(110px, 1fr))`,
          alignItems: 'end',
          gap: 0,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `calc(${100 / (points.length * 2)}%)`,
            right: `calc(${100 / (points.length * 2)}%)`,
            top: 30,
            height: 1,
            background: BORDER_STRONG,
            zIndex: 0,
          }}
        />
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 1,
              position: 'relative',
            }}
          >
            <div style={{ ...OVERLINE, fontSize: 10, marginBottom: 10, color: TEXT_MUTED }}>{p.year}</div>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 0 4px ${p.color}22, 0 0 0 5px ${BG}`,
                marginBottom: 14,
              }}
            />
            <div
              style={{
                fontSize: 11,
                color: TEXT_PRIMARY,
                textAlign: 'center',
                fontWeight: 600,
                lineHeight: 1.3,
                maxWidth: 140,
              }}
            >
              {p.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
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
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ ...OVERLINE, marginBottom: 20 }}>Cases · Loading</div>
          <div
            style={{
              height: 80,
              background: PANEL,
              borderRadius: 4,
              marginBottom: 16,
              border: `1px solid ${BORDER}`,
            }}
          />
          <div
            style={{
              height: 240,
              background: PANEL,
              borderRadius: 4,
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
          <p
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              color: TEXT_FAINT,
              marginBottom: 16,
              textTransform: 'uppercase',
            }}
          >
            Cases · Not Found
          </p>
          <h1
            style={{
              fontSize: 32,
              fontFamily: 'var(--font-family-serif, Georgia, serif)',
              color: TEXT_PRIMARY,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            Case not found
          </h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 32 }}>
            "{slug}" does not exist in the case library, or could not be loaded.
          </p>
          <button
            onClick={() => navigate('/cases')}
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: CRIMSON_HI,
              border: `1px solid ${CRIMSON_HI}4d`,
              padding: '8px 16px',
              borderRadius: 4,
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

  const name = i18n.language === 'es' && data.name_es ? data.name_es : data.name_en
  const summary = i18n.language === 'es' && data.summary_es ? data.summary_es : data.summary_en

  const accent = FRAUD_ACCENT[data.fraud_type] ?? FRAUD_ACCENT.other
  const signals = FRAUD_SIGNALS[data.fraud_type] ?? FRAUD_SIGNALS.other
  const legal = legalStatusMeta(data.legal_status)

  const linkedVendors: LinkedVendor[] = data.linked_vendors ?? []
  const vendorScores = linkedVendors.filter((v) => v.avg_risk_score != null).map((v) => v.avg_risk_score!)
  const avgDetectionScore =
    vendorScores.length > 0 ? vendorScores.reduce((a, b) => a + b, 0) / vendorScores.length : null
  const totalContractsLinked = linkedVendors.reduce((s, v) => s + (v.contract_count ?? 0), 0)

  const sectorLabels = (data.sector_ids ?? [])
    .map((sid) => SECTORS.find((s) => s.id === sid))
    .filter(Boolean)
    .map((s) => titleCase(s!.code))

  const similarCases = allCases
    ? allCases
        .filter((c) => c.fraud_type === data.fraud_type && c.slug !== data.slug)
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 3)
    : []

  const yearDisplay =
    data.contract_year_start && data.contract_year_end && data.contract_year_end !== data.contract_year_start
      ? `${data.contract_year_start}–${data.contract_year_end}`
      : data.contract_year_start
      ? String(data.contract_year_start)
      : '—'

  const timelinePoints: TimelinePoint[] = []
  if (data.contract_year_start) {
    timelinePoints.push({
      year:
        data.contract_year_end && data.contract_year_end !== data.contract_year_start
          ? `${data.contract_year_start}–${data.contract_year_end}`
          : String(data.contract_year_start),
      label: 'Contracts awarded',
      color: CRIMSON_HI,
    })
  }
  if (data.discovery_year) {
    timelinePoints.push({
      year: String(data.discovery_year),
      label: 'Publicly disclosed',
      color: AMBER,
    })
  }
  if (data.legal_status === 'convicted') {
    timelinePoints.push({ year: 'Resolved', label: 'Conviction obtained', color: EMERALD })
  } else if (data.legal_status === 'prosecuted') {
    timelinePoints.push({ year: 'Pending', label: 'Prosecution under way', color: '#fb923c' })
  } else if (data.legal_status === 'investigation') {
    timelinePoints.push({ year: 'Open', label: 'Under investigation', color: AMBER })
  } else if (data.legal_status === 'impunity') {
    timelinePoints.push({ year: 'No action', label: 'Impunity — no charges filed', color: CRIMSON_HI })
  } else if (data.legal_status === 'dismissed') {
    timelinePoints.push({ year: 'Closed', label: 'Case dismissed', color: TEXT_MUTED })
  } else if (data.legal_status === 'acquitted') {
    timelinePoints.push({ year: 'Resolved', label: 'Defendants acquitted', color: '#60a5fa' })
  }

  const institutions = (data.key_actors ?? []).filter((a) => a.role === 'institution')
  const officials = (data.key_actors ?? []).filter(
    (a) => a.role !== 'vendor' && a.role !== 'institution',
  )
  const fallbackVendorActors = (data.key_actors ?? []).filter((a) => a.role === 'vendor')

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT_PRIMARY }}>
      {/* Back nav */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px 0' }}>
        <button
          onClick={() => navigate('/cases')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontFamily: 'monospace',
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
          <ArrowLeft size={12} /> Back to case library
        </button>
      </div>

      {/* HERO */}
      <motion.header
        variants={slideUp}
        initial="initial"
        animate="animate"
        style={{
          background: PANEL,
          borderTop: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          padding: '40px 32px 0',
          marginTop: 28,
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 22,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: TEXT_SECONDARY,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: CRIMSON_HI,
                  display: 'inline-block',
                }}
              />
              RUBLI
            </span>
            <span style={{ color: TEXT_FAINT }}>·</span>
            <span style={{ ...OVERLINE, color: TEXT_MUTED }}>Case file</span>
            {data.ground_truth_case_id != null && (
              <>
                <span style={{ color: TEXT_FAINT }}>·</span>
                <Link to="/methodology" style={{ ...OVERLINE, color: CYAN, textDecoration: 'none' }}>
                  ML-linked · Ground truth
                </Link>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <Pill color={accent} border={`${accent}55`} bg={`${accent}12`}>
              {FRAUD_LABEL_EN[data.fraud_type] ?? titleCase(data.fraud_type)}
            </Pill>
            <SeverityIndicator severity={data.severity} />
            <Pill color={legal.accent} border={legal.border} bg={legal.bg}>
              {legal.label}
            </Pill>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
              marginBottom: 18,
            }}
          >
            <h1
              style={{
                ...ACT_HEADLINE,
                fontSize: 'clamp(1.875rem, 4vw, 2.75rem)',
                lineHeight: 1.08,
                margin: 0,
                maxWidth: 820,
              }}
            >
              {name}
            </h1>
            <div style={{ flexShrink: 0 }}>
              <AddToDossierButton entityType="note" entityId={data.id} entityName={data.name_en} />
            </div>
          </div>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: TEXT_SECONDARY,
              maxWidth: 820,
              marginBottom: 36,
              fontFamily: 'var(--font-family-serif, Georgia, serif)',
            }}
          >
            {summary}
          </p>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', borderTop: `1px solid ${BORDER}` }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            <StatCell
              overline="Estimated value"
              value={
                data.amount_mxn_low ? (
                  <>
                    {formatMXN(data.amount_mxn_low)}
                    <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 400, marginLeft: 6 }}>
                      MXN
                    </span>
                  </>
                ) : (
                  '—'
                )
              }
              foot={
                data.amount_mxn_high && data.amount_mxn_high !== data.amount_mxn_low
                  ? `up to ${formatMXN(data.amount_mxn_high)} MXN`
                  : undefined
              }
            />
            <StatCell
              overline="Years active"
              value={yearDisplay}
              foot={
                data.discovery_year && data.contract_year_start
                  ? `exposed ${data.discovery_year - data.contract_year_start} yr${
                      data.discovery_year - data.contract_year_start === 1 ? '' : 's'
                    } later`
                  : data.discovery_year
                  ? `exposed ${data.discovery_year}`
                  : undefined
              }
            />
            <StatCell
              overline="Administration"
              value={
                <span style={{ fontSize: 14 }}>
                  {ADMIN_LABEL_EN[data.administration] ?? titleCase(data.administration)}
                </span>
              }
            />
            <StatCell
              overline="Sector"
              value={
                <span style={{ fontSize: 14 }}>
                  {sectorLabels.length > 0 ? sectorLabels.join(' · ') : '—'}
                </span>
              }
              foot={
                data.compranet_visibility && data.compranet_visibility !== 'none'
                  ? `COMPRANET: ${titleCase(data.compranet_visibility)}`
                  : data.compranet_visibility === 'none' && data.compranet_note
                    ? data.compranet_note
                    : undefined
              }
            />
          </div>
        </div>
      </motion.header>

      {/* BODY */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px' }}>
        {/* ACT I */}
        <Act
          number="Act I"
          title="How it happened"
          subtitle="The procurement mechanics and the window of time during which this scheme operated."
        >
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontFamily: 'var(--font-family-serif, Georgia, serif)',
                fontSize: 17,
                lineHeight: 1.75,
                color: TEXT_PRIMARY,
                maxWidth: 720,
              }}
            >
              {summary}
            </div>
          </div>

          <DotTimeline points={timelinePoints} />

          {(data.amount_note || data.compranet_note || data.legal_status_note) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 0,
                marginTop: 28,
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                background: PANEL,
              }}
            >
              {data.amount_note && (
                <div style={{ padding: '18px 22px', borderRight: `1px solid ${BORDER}` }}>
                  <div style={{ ...OVERLINE, marginBottom: 8 }}>Amount notes</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.55 }}>
                    {data.amount_note}
                  </div>
                </div>
              )}
              {data.compranet_note && (
                <div style={{ padding: '18px 22px', borderRight: `1px solid ${BORDER}` }}>
                  <div style={{ ...OVERLINE, marginBottom: 8 }}>COMPRANET visibility</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.55 }}>
                    {data.compranet_note}
                  </div>
                </div>
              )}
              {data.legal_status_note && (
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ ...OVERLINE, marginBottom: 8 }}>Legal notes</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.55 }}>
                    {data.legal_status_note}
                  </div>
                </div>
              )}
            </div>
          )}
        </Act>

        {/* ACT II */}
        <Act
          number="Act II"
          title="What the data revealed"
          subtitle={
            avgDetectionScore != null
              ? 'Signals the RUBLI risk model uses to flag this pattern. Intensity reflects how strongly each signal typically presents.'
              : 'The characteristic fingerprints the RUBLI risk model uses to detect this fraud type in procurement records.'
          }
        >
          {avgDetectionScore != null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
                padding: '20px 24px',
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderLeft: `3px solid ${CRIMSON_HI}`,
                borderRadius: 4,
                marginBottom: 24,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ ...OVERLINE, color: CRIMSON_HI, marginBottom: 4 }}>Detection score</div>
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 48,
                    fontWeight: 700,
                    color: RISK_COLORS[getRiskLevelFromScore(avgDetectionScore)] ?? CRIMSON_HI,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {Math.round(avgDetectionScore * 100)}
                  <span style={{ fontSize: 20, color: TEXT_MUTED, fontWeight: 400 }}>%</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.55 }}>
                  Average RUBLI score across {linkedVendors.length}{' '}
                  {linkedVendors.length === 1 ? 'vendor' : 'vendors'} matched to this case in COMPRANET.
                  {avgDetectionScore < 0.3 && (
                    <span style={{ color: AMBER, display: 'block', marginTop: 4, fontSize: 12 }}>
                      Low score: model underdetects this structural pattern — see methodology.
                    </span>
                  )}
                </div>
              </div>
              {data.ground_truth_case_id != null && (
                <Link
                  to="/methodology"
                  style={{
                    fontSize: 10,
                    fontFamily: 'monospace',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: CYAN,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Activity size={11} /> Model validation →
                </Link>
              )}
            </div>
          )}

          <div
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              background: PANEL,
              overflow: 'hidden',
            }}
          >
            {signals.map((s, i) => {
              const sevColor =
                s.severity === 'Critical' ? CRIMSON_HI : s.severity === 'High' ? '#fb923c' : AMBER
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) auto',
                    alignItems: 'center',
                    gap: 20,
                    padding: '16px 22px',
                    borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                  }}
                >
                  <div>
                    <div style={{ ...OVERLINE, fontSize: 9, color: TEXT_FAINT, marginBottom: 4 }}>
                      Signal {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 13, color: TEXT_PRIMARY, lineHeight: 1.45 }}>{s.label}</div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 6,
                    }}
                  >
                    <DotBar value={s.intensity} color={sevColor} dots={18} size={6} gap={3} />
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: sevColor,
                      }}
                    >
                      {s.severity}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Act>

        {/* ACT III */}
        <Act
          number="Act III"
          title="Who was involved"
          subtitle={
            linkedVendors.length > 0
              ? `${linkedVendors.length} ${
                  linkedVendors.length === 1 ? 'vendor' : 'vendors'
                } matched from ground-truth evidence, with ${formatCompact(totalContractsLinked)} linked contracts on record.`
              : 'Vendor records identified from public reporting. Continuous matching is in progress via ARIA.'
          }
        >
          {linkedVendors.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {linkedVendors.map((vendor, i) => {
                const score = vendor.avg_risk_score
                const scoreLevel = score != null ? getRiskLevelFromScore(score) : null
                const scoreColor = scoreLevel ? RISK_COLORS[scoreLevel] : TEXT_MUTED
                return (
                  <div
                    key={i}
                    style={{
                      background: PANEL,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 4,
                      padding: '18px 22px',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 24,
                      alignItems: 'start',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          marginBottom: 8,
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
                              letterSpacing: '-0.005em',
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
                          <Pill
                            color={
                              vendor.evidence_strength === 'strong'
                                ? EMERALD
                                : vendor.evidence_strength === 'medium'
                                ? AMBER
                                : TEXT_MUTED
                            }
                          >
                            {titleCase(vendor.evidence_strength)} evidence
                          </Pill>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 18,
                          flexWrap: 'wrap',
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: TEXT_MUTED,
                          marginBottom: 12,
                        }}
                      >
                        <span>
                          <span style={{ color: TEXT_FAINT }}>CONTRACTS · </span>
                          <span style={{ color: TEXT_SECONDARY }}>
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
                      {score != null && (
                        <div style={{ maxWidth: 300 }}>
                          <DotBar value={score} max={1} color={scoreColor} dots={20} size={6} gap={3} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                        {vendor.vendor_id && (
                          <Link
                            to={`/contracts?vendor_id=${vendor.vendor_id}&sort_by=risk_score&sort_order=desc`}
                            style={{
                              fontSize: 10,
                              fontFamily: 'monospace',
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
                              fontFamily: 'monospace',
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: CRIMSON_HI,
                              textDecoration: 'none',
                            }}
                          >
                            Investigation thread →
                          </Link>
                        )}
                      </div>
                    </div>
                    {score != null && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ ...OVERLINE, fontSize: 9, marginBottom: 4 }}>RUBLI</div>
                        <div
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: 28,
                            fontWeight: 700,
                            color: scoreColor,
                            lineHeight: 1,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {Math.round(score * 100)}
                          <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 400 }}>%</span>
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
                    borderRadius: 4,
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
                borderRadius: 4,
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

          {institutions.length > 0 && (
            <div style={{ marginTop: 32 }}>
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
                      borderRadius: 4,
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

          {officials.length > 0 && (
            <div style={{ marginTop: 28 }}>
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
                      borderRadius: 4,
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
        </Act>

        {/* ACT IV */}
        <Act
          number="Act IV"
          title="Legal outcome"
          subtitle="The judicial disposition of this case based on public records."
        >
          <div
            style={{
              background: legal.bg,
              border: `1px solid ${legal.border}`,
              borderLeft: `3px solid ${legal.accent}`,
              borderRadius: 4,
              padding: '24px 28px',
            }}
          >
            <div style={{ ...OVERLINE, color: legal.accent, marginBottom: 10 }}>
              Status · {legal.label}
            </div>
            <h3
              style={{
                ...ACT_HEADLINE,
                fontSize: 'clamp(1.125rem, 1.8vw, 1.375rem)',
                marginBottom: 10,
                lineHeight: 1.25,
              }}
            >
              {legal.headline}
            </h3>
            <p style={{ fontSize: 14, color: TEXT_SECONDARY, lineHeight: 1.65, maxWidth: 700, margin: 0 }}>
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
                  maxWidth: 700,
                }}
              >
                <span style={{ ...OVERLINE, fontSize: 9, marginRight: 6 }}>Note</span>
                {data.legal_status_note}
              </p>
            )}
          </div>
        </Act>

        {/* Sources */}
        <Act
          number="Sources"
          title="Public record"
          subtitle="Reporting and audit evidence cited for this case."
        >
          {(data.sources ?? []).length === 0 ? (
            <div
              style={{
                padding: '24px',
                border: `1px dashed ${BORDER_STRONG}`,
                borderRadius: 4,
                fontSize: 12,
                color: TEXT_MUTED,
                textAlign: 'center',
              }}
            >
              No sources recorded for this case yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {(data.sources ?? []).map((src, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0,1fr)',
                    gap: 16,
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 4,
                    padding: '14px 18px',
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
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
                      {src.outlet}
                      {src.date ? ` · ${src.date.slice(0, 7)}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Act>

        {/* Similar cases */}
        {similarCases.length > 0 && (
          <Act
            number="See also"
            title={`Similar ${(
              FRAUD_LABEL_EN[data.fraud_type] ?? titleCase(data.fraud_type)
            ).toLowerCase()} cases`}
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
                  i18n.language === 'es' && (cas as unknown as { name_es?: string }).name_es
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
                      borderRadius: 4,
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
                        fontFamily: 'monospace',
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
                  fontFamily: 'monospace',
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
                View all {FRAUD_LABEL_EN[data.fraud_type] ?? titleCase(data.fraud_type)} cases →
              </button>
            </div>
          </Act>
        )}
      </main>
    </div>
  )
}
