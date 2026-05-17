/**
 * ConcentricConstellation — vendor reach topology, three rings.
 * Extracted from RedThread.tsx.
 *
 *   • OUTER RING: N institutional dots evenly placed.
 *   • INNER RING: up to 8 co-bidder nodes sized by co_bid_count.
 *   • CENTER: pulsing vendor node.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'

// ─── Local helpers ────────────────────────────────────────────────────────────

export function classifyRole(
  coBidder: { win_count: number; co_bid_count: number },
  t: (key: string) => string
): { label: string; color: string; bg: string } {
  const winRate = coBidder.co_bid_count > 0 ? coBidder.win_count / coBidder.co_bid_count : 0
  if (winRate < 0.15) return { label: t('roles.possibleDecoy'),     color: 'var(--color-risk-critical)', bg: 'rgba(239,68,68,0.12)' }
  if (winRate >= 0.3 && winRate <= 0.7) return { label: t('roles.rotationPattern'),  color: 'var(--color-risk-high)', bg: 'rgba(245,158,11,0.12)' }
  if (winRate > 0.6)  return { label: t('roles.possibleAccomplice'), color: 'var(--color-risk-medium)', bg: 'rgba(161,98,7,0.12)' }
  return { label: t('roles.coBidder'), color: 'var(--color-text-muted)', bg: 'rgba(148,163,184,0.10)' }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ConcentricConstellationProps {
  subjectName: string
  sectorName: string | null
  totalInstitutions: number
  sectorsCount: number
  coBidders: Array<{
    vendor_id: number
    vendor_name: string
    co_bid_count: number
    win_count: number
    loss_count: number
    same_winner_ratio: number
    relationship_strength: string
  }>
  /** Unused — component calls useTranslation internally. Accepted for call-site compatibility. */
  t?: unknown
  /** Unused — component calls useTranslation internally. Accepted for call-site compatibility. */
  i18n?: unknown
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConcentricConstellation({
  subjectName,
  sectorName,
  totalInstitutions,
  sectorsCount,
  coBidders,
}: ConcentricConstellationProps) {
  const { t, i18n } = useTranslation('redThread')

  const W = 720
  const H = 340
  const cx = W / 2
  const cy = H / 2 + 6
  const innerR = 78
  const outerR = 144

  const sectorColor = sectorName ? (SECTOR_COLORS[sectorName.toLowerCase()] ?? '#a06820') : '#a06820'

  const visibleInst = Math.min(totalInstitutions, 24)
  const top = [...coBidders].sort((a, b) => b.co_bid_count - a.co_bid_count).slice(0, 8)
  const maxCoBids = Math.max(...top.map((c) => c.co_bid_count), 1)
  const hasCoBidders = top.length > 0

  // Stable IDs scoped to this instance
  const idSuffix = `${subjectName.length}-${subjectName.charCodeAt(0) || 0}`
  const bgGradId = `constellation-bg-${idSuffix}`
  const dotGlowId = `constellation-glow-${idSuffix}`
  const centerGlowId = `constellation-core-${idSuffix}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Vendor reach constellation">
      <defs>
        <radialGradient id={bgGradId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={sectorColor} stopOpacity={0.14} />
          <stop offset="50%" stopColor={sectorColor} stopOpacity={0.06} />
          <stop offset="100%" stopColor={sectorColor} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={dotGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={sectorColor} stopOpacity={1} />
          <stop offset="55%" stopColor={sectorColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={sectorColor} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={centerGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-risk-critical)" stopOpacity={0.45} />
          <stop offset="60%" stopColor="var(--color-risk-critical)" stopOpacity={0.10} />
          <stop offset="100%" stopColor="var(--color-risk-critical)" stopOpacity={0} />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill={`url(#${bgGradId})`} />

      {/* Sector petal arcs */}
      {sectorsCount >= 2 && Array.from({ length: sectorsCount }).map((_, i) => {
        const angle = (i / sectorsCount) * Math.PI * 2 - Math.PI / 2
        const xEnd = cx + Math.cos(angle) * (outerR + 8)
        const yEnd = cy + Math.sin(angle) * (outerR + 8)
        return (
          <line key={`sector-divider-${i}`} x1={cx} y1={cy} x2={xEnd} y2={yEnd} stroke={sectorColor} strokeWidth={0.4} strokeDasharray="2 6" opacity={0.25} />
        )
      })}

      {/* Radial spokes */}
      {Array.from({ length: visibleInst }).map((_, i) => {
        const angle = (i / visibleInst) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * outerR
        const y = cy + Math.sin(angle) * outerR
        return <line key={`spoke-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={sectorColor} strokeWidth={0.5} opacity={0.18} />
      })}

      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={sectorColor} strokeWidth={0.7} strokeDasharray="1 5" opacity={0.5} />

      {/* Outer ring nodes */}
      {Array.from({ length: visibleInst }).map((_, i) => {
        const angle = (i / visibleInst) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * outerR
        const y = cy + Math.sin(angle) * outerR
        return (
          <g key={`inst-${i}`}>
            <circle cx={x} cy={y} r={9} fill={`url(#${dotGlowId})`} opacity={0.6} />
            <circle cx={x} cy={y} r={3.6} fill={sectorColor} stroke="var(--color-background)" strokeWidth={0.8} />
          </g>
        )
      })}

      {/* Inner ring guide */}
      <circle
        cx={cx} cy={cy} r={innerR} fill="none"
        stroke={hasCoBidders ? 'var(--color-border)' : 'var(--color-text-muted)'}
        strokeWidth={hasCoBidders ? 0.8 : 1}
        strokeDasharray={hasCoBidders ? '0' : '3 5'}
        opacity={hasCoBidders ? 0.55 : 0.5}
      />

      {/* Inner ring: co-bidder nodes + edges */}
      {hasCoBidders && top.map((cb, i) => {
        const angle = (i / top.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8
        const x = cx + Math.cos(angle) * innerR
        const y = cy + Math.sin(angle) * innerR
        const role = classifyRole(cb, t)
        const strokeW = 0.6 + (cb.co_bid_count / maxCoBids) * 2.2
        const nodeR = 4 + (cb.co_bid_count / maxCoBids) * 4
        const labelR = innerR + 18
        const lx = cx + Math.cos(angle) * labelR
        const ly = cy + Math.sin(angle) * labelR + 3
        const anchor: 'start' | 'middle' | 'end' = Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle'
        return (
          <g key={`cb-${cb.vendor_id}`}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={role.color} strokeWidth={strokeW} opacity={0.55} />
            <Link to={`/thread/${cb.vendor_id}`}>
              <title>{cb.vendor_name} · {cb.co_bid_count} co-bids · {role.label}</title>
              <circle cx={x} cy={y} r={nodeR + 8} fill="transparent" />
              <circle cx={x} cy={y} r={nodeR + 4} fill={role.color} opacity={0.18} />
              <circle cx={x} cy={y} r={nodeR} fill={role.color} stroke="var(--color-background)" strokeWidth={1.4} />
              <text x={lx} y={ly} textAnchor={anchor} fontSize={9} fontFamily="var(--font-family-mono)" fill="var(--color-text-secondary)">
                {formatVendorName(cb.vendor_name, 16)}
              </text>
            </Link>
          </g>
        )
      })}

      {/* Empty inner-ring annotation */}
      {!hasCoBidders && (
        <g>
          <text x={cx} y={cy - innerR + 14} textAnchor="middle" fontSize={9} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" letterSpacing={1.2}>
            {t('network.noCoordinatedBidding')}
          </text>
          <text x={cx} y={cy - innerR + 26} textAnchor="middle" fontSize={8} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.6}>
            {t('network.noCoordinatedBiddingNote')}
          </text>
        </g>
      )}

      {/* Subject — multi-layered halo at center */}
      <circle cx={cx} cy={cy} r={32} fill={`url(#${centerGlowId})`} />
      <circle cx={cx} cy={cy} r={22} fill="var(--color-risk-critical)" opacity={0.18}>
        <animate attributeName="r" values="22;28;22" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.32;0.18" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={11} fill="var(--color-risk-critical)" stroke="var(--color-background)" strokeWidth={1.8} />
      <circle cx={cx} cy={cy} r={4} fill="var(--color-background)" opacity={0.85} />

      <text x={cx} y={cy + 36} textAnchor="middle" fontSize={12} fontFamily="var(--font-family-serif)" fontStyle="italic" fontWeight={700} fill="var(--color-text-primary)">
        {formatVendorName(subjectName, 28)}
      </text>

      {/* Ring labels */}
      <text x={W - 14} y={28} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing={1.2} fill="var(--color-text-muted)">
        {totalInstitutions} {t('network.ringLabels.institutions')}
        {totalInstitutions > visibleInst && ` (${visibleInst} ${t('network.ringLabels.shown')})`}
      </text>
      <text x={W - 14} y={42} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing={1.2} fill="var(--color-text-muted)">
        {sectorsCount} {sectorsCount === 1 ? t('network.ringLabels.sector') : t('network.ringLabels.sectors')}
        {sectorName ? ` · ${sectorName.toUpperCase()}` : ''}
      </text>
      <text x={14} y={28} textAnchor="start" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing={1.2} fill={hasCoBidders ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'}>
        {coBidders.length} {coBidders.length === 1 ? t('network.ringLabels.coBidder') : t('network.ringLabels.coBidders')}
      </text>

      {/* Bottom-edge legend */}
      <text x={W - 14} y={H - 8} textAnchor="end" fontSize={8.5} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.55}>
        {i18n.language.startsWith('es')
          ? 'ANILLO EXTERIOR = INSTITUCIONES · ANILLO INTERIOR = CO-LICITANTES'
          : 'OUTER RING = INSTITUTIONS · INNER RING = CO-BIDDERS'}
      </text>
    </svg>
  )
}
