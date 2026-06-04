/**
 * ConcentricConstellation — Chapter III of the vendor dossier narrative.
 *
 * Redesigned 2026-05-25 (DESIGNUS round 6, component 4/10). Argument:
 * THE NETWORK. Who does this vendor share procurement space with?
 * Institutional ties + co-bidding cluster + sector spread.
 *
 * Self-contained chapter. Composition:
 *   1. Chapter heading (III · NETWORK · The web of relationships)
 *   2. Lede — data-driven (handles dense + sparse cases)
 *   3. THE CONSTELLATION — simplified two-ring SVG, vendor at center
 *   4. CO-BIDDERS list (when any) OR "No co-bidding pattern" callout
 *   5. INSTITUTIONAL FOOTPRINT — top 6 institutions by spend with bars
 *
 * Drops the previous file's heavy radial gradients + multiple glow layers;
 * keeps the two-ring constellation idea but in editorial register.
 *
 * `classifyRole` export preserved (RedThread call-site uses it).
 */

import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  FadeIn,
} from '@/components/dossier/primitives'

// ─── classifyRole — exported, used by the RedThread caller for the top-co-bidder line

export function classifyRole(
  coBidder: { win_count: number; co_bid_count: number },
  t: (key: string) => string,
): { label: string; color: string; bg: string } {
  const winRate = coBidder.co_bid_count > 0 ? coBidder.win_count / coBidder.co_bid_count : 0
  if (winRate < 0.15) return { label: t('roles.possibleDecoy'),       color: RISK_COLORS.critical, bg: 'rgba(239,68,68,0.12)' }
  if (winRate >= 0.3 && winRate <= 0.7) return { label: t('roles.rotationPattern'), color: RISK_COLORS.high, bg: 'rgba(245,158,11,0.12)' }
  if (winRate > 0.6) return { label: t('roles.possibleAccomplice'), color: RISK_COLORS.medium, bg: 'rgba(161,98,7,0.12)' }
  return { label: t('roles.coBidder'), color: 'var(--color-text-muted)', bg: 'rgba(148,163,184,0.10)' }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface CoBidder {
  vendor_id: number
  vendor_name: string
  co_bid_count: number
  win_count: number
  loss_count: number
  same_winner_ratio: number
  relationship_strength: string
}

interface InstitutionTie {
  institution_id: number
  institution_name: string
  institution_type?: string
  contract_count: number
  total_value_mxn: number
  avg_risk_score?: number | null
  first_year?: number
  last_year?: number
}

interface ConcentricConstellationProps {
  subjectName: string
  sectorName: string | null
  totalInstitutions: number
  sectorsCount: number
  coBidders: CoBidder[]
  institutions?: InstitutionTie[]
  vendorId?: number
  t?: unknown
  i18n?: unknown
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ConcentricConstellation({
  subjectName,
  sectorName,
  totalInstitutions,
  sectorsCount,
  coBidders,
  institutions,
  vendorId,
}: ConcentricConstellationProps) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorCode = sectorName?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#a06820'

  const hasCoBidders = coBidders.length > 0
  const topCoBidders = [...coBidders]
    .sort((a, b) => b.co_bid_count - a.co_bid_count)
    .slice(0, 6)
  const topInstitutions = institutions
    ? [...institutions].sort((a, b) => b.total_value_mxn - a.total_value_mxn).slice(0, 6)
    : []
  const institutionsTotal = institutions
    ? institutions.reduce((s, i) => s + i.total_value_mxn, 0)
    : 0

  const lede = buildNetworkLede({
    subjectName,
    totalInstitutions,
    sectorsCount,
    coBidderCount: coBidders.length,
    topCoBidder: topCoBidders[0] ?? null,
    topInstitution: topInstitutions[0] ?? null,
    institutionsTotal,
    lang,
  })

  return (
    <ChapterShell id="chapter-network">
      <ChapterHeading
        numeral="III"
        title={lang === 'es' ? 'La Red' : 'Network'}
        subtitle={lang === 'es' ? 'La trama de relaciones' : 'The web of relationships'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      {/* THE CONSTELLATION */}
      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'La constelación' : 'The constellation'} />
        <div className="mt-7 flex justify-center">
          <ConstellationSvg
            subjectName={subjectName}
            sectorAccent={sectorAccent}
            totalInstitutions={totalInstitutions}
            coBidders={topCoBidders}
            lang={lang}
          />
        </div>
      </FadeIn>

      {/* CO-BIDDERS or EMPTY CALLOUT */}
      <FadeIn className="mt-12">
        <SubheadRule label={lang === 'es' ? 'Co-licitantes' : 'Co-bidders'} />
        {hasCoBidders ? (
          <ul className="mt-6 max-w-3xl mx-auto space-y-2 list-none p-0">
            {topCoBidders.map((cb) => {
              const winRate = cb.co_bid_count > 0 ? cb.win_count / cb.co_bid_count : 0
              const roleLabel = roleLabelFor(winRate, lang)
              const roleColor = roleColorFor(winRate)
              return (
                <li key={cb.vendor_id}>
                  <Link
                    to={`/thread/${cb.vendor_id}`}
                    className="flex items-baseline gap-3 px-3 py-2 rounded-sm hover:bg-background-card/60 transition-colors"
                    style={{ borderLeft: `2px solid ${roleColor}`, textDecoration: 'none' }}
                  >
                    <span
                      className="font-mono tabular-nums flex-shrink-0"
                      style={{ fontSize: 11, color: roleColor, fontWeight: 700, minWidth: 32 }}
                    >
                      {cb.co_bid_count}
                    </span>
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{
                        fontFamily: '"EB Garamond", Georgia, serif',
                        fontSize: 14,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {formatVendorName(cb.vendor_name, 80)}
                    </span>
                    <span
                      className="font-mono flex-shrink-0"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: roleColor,
                        fontWeight: 700,
                        padding: '2px 6px',
                        background: `${roleColor}1f`,
                        border: `1px solid ${roleColor}44`,
                        borderRadius: 2,
                      }}
                    >
                      {roleLabel}
                    </span>
                    <span
                      className="font-mono tabular-nums flex-shrink-0"
                      style={{ fontSize: 10, color: 'var(--color-text-muted)', minWidth: 52, textAlign: 'right' }}
                    >
                      {Math.round(winRate * 100)}% win
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div
            className="mt-7 max-w-2xl mx-auto px-4 py-3"
            style={{
              borderLeft: `2px solid ${sectorAccent}`,
              paddingLeft: 16,
            }}
          >
            <div
              className="font-mono mb-2"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: sectorAccent,
                fontWeight: 700,
              }}
            >
              {lang === 'es' ? 'Sin co-licitación' : 'No co-bidding pattern'}
            </div>
            <p
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 15,
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
              }}
            >
              {lang === 'es'
                ? 'Este proveedor no ha participado en un solo procedimiento junto a otro postor en el registro COMPRANET. O todos sus contratos fueron por adjudicación directa, o todos los procedimientos competitivos tuvieron un único postor válido. Ambas son señales.'
                : 'This vendor has not participated in a single procedure alongside another bidder in the COMPRANET record. Either every contract was awarded by direct adjudication, or every competitive procedure had only one valid bidder. Both are signals.'}
            </p>
          </div>
        )}
      </FadeIn>

      {/* INSTITUTIONAL FOOTPRINT */}
      {topInstitutions.length > 0 && institutionsTotal > 0 && (
        <FadeIn className="mt-12">
          <SubheadRule label={lang === 'es' ? 'Huella institucional' : 'Institutional footprint'} />
          <ul className="mt-6 max-w-3xl mx-auto space-y-3 list-none p-0">
            {topInstitutions.map((inst) => {
              const share = (inst.total_value_mxn / institutionsTotal) * 100
              return (
                <li key={inst.institution_id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className="font-mono uppercase tracking-[0.12em] truncate"
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-secondary)',
                        fontWeight: 500,
                        maxWidth: '60%',
                      }}
                    >
                      {inst.institution_name.length > 56
                        ? inst.institution_name.slice(0, 56).trim() + '…'
                        : inst.institution_name}
                    </span>
                    <span className="font-mono tabular-nums" style={{ fontSize: 11, color: sectorAccent, fontWeight: 700 }}>
                      {share.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="relative w-full"
                    style={{
                      height: 4,
                      background: 'var(--color-background-elevated)',
                      border: '1px solid var(--color-border)',
                    }}
                    aria-hidden="true"
                  >
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${Math.min(100, share)}%`, background: sectorAccent, opacity: 0.85 }}
                    />
                  </div>
                  <div
                    className="mt-1 flex justify-between font-mono tabular-nums"
                    style={{ fontSize: 9, color: 'var(--color-text-muted)' }}
                  >
                    <span>{formatNumber(inst.contract_count)} {lang === 'es' ? 'contratos' : 'contracts'}</span>
                    <span>{formatCompactMXN(inst.total_value_mxn)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </FadeIn>
      )}

      {/* Outbound link */}
      {vendorId && (
        <FadeIn className="mt-10">
          <div className="text-center">
            <a
              href={`/network?vendor=${vendorId}`}
              className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
              style={{
                fontSize: 11,
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
              }}
            >
              {lang === 'es' ? 'Ver la red completa' : 'Open the full network'} ↗
            </a>
          </div>
        </FadeIn>
      )}
    </ChapterShell>
  )
}

// ─── ConstellationSvg — simplified two-ring constellation ────────────────────

function ConstellationSvg({
  subjectName,
  sectorAccent,
  totalInstitutions,
  coBidders,
  lang,
}: {
  subjectName: string
  sectorAccent: string
  totalInstitutions: number
  coBidders: CoBidder[]
  lang: 'en' | 'es'
}) {
  const navigate = useNavigate()
  const W = 720
  const H = 320
  const cx = W / 2
  const cy = H / 2
  const innerR = 78
  const outerR = 142

  const visibleInst = Math.min(Math.max(totalInstitutions, 0), 24)
  const hasCoBidders = coBidders.length > 0
  const maxCoBids = Math.max(...coBidders.map((c) => c.co_bid_count), 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-3xl" role="img" aria-label="Vendor relationship constellation">
      {/* Outer ring (institutions) — single hairline */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={sectorAccent} strokeWidth={0.8} strokeDasharray="1 5" opacity={0.5} />
      {/* Inner ring (co-bidders) — single hairline */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke={hasCoBidders ? 'var(--color-border)' : 'var(--color-text-muted)'}
        strokeWidth={hasCoBidders ? 0.8 : 1}
        strokeDasharray={hasCoBidders ? '0' : '3 5'}
        opacity={hasCoBidders ? 0.6 : 0.45}
      />

      {/* Subject — single small filled core at center */}
      <circle cx={cx} cy={cy} r={9} fill={sectorAccent} stroke="var(--color-background)" strokeWidth={2} />

      {/* Subject name caption */}
      <text
        x={cx}
        y={cy + 32}
        textAnchor="middle"
        fontSize={11}
        fontFamily='"EB Garamond", Georgia, serif'
        fontStyle="italic"
        fontWeight={600}
        fill="var(--color-text-primary)"
      >
        {formatVendorName(subjectName, 32)}
      </text>

      {/* Outer ring nodes — institutions */}
      {Array.from({ length: visibleInst }).map((_, i) => {
        const angle = (i / Math.max(1, visibleInst)) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * outerR
        const y = cy + Math.sin(angle) * outerR
        return (
          <g key={`inst-${i}`}>
            {/* Faint spoke from center */}
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={sectorAccent} strokeWidth={0.4} opacity={0.15} />
            <circle cx={x} cy={y} r={3.2} fill={sectorAccent} stroke="var(--color-background)" strokeWidth={0.8} />
          </g>
        )
      })}

      {/* Inner ring nodes — co-bidders, with role-colored edges */}
      {hasCoBidders &&
        coBidders.map((cb, i) => {
          const angle = (i / coBidders.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8
          const x = cx + Math.cos(angle) * innerR
          const y = cy + Math.sin(angle) * innerR
          const winRate = cb.co_bid_count > 0 ? cb.win_count / cb.co_bid_count : 0
          const roleColor = roleColorFor(winRate)
          const strokeW = 0.6 + (cb.co_bid_count / maxCoBids) * 1.8
          const nodeR = 4 + (cb.co_bid_count / maxCoBids) * 3
          const labelR = innerR + 18
          const lx = cx + Math.cos(angle) * labelR
          const ly = cy + Math.sin(angle) * labelR + 3
          const anchor: 'start' | 'middle' | 'end' =
            Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle'
          return (
            <g key={`cb-${cb.vendor_id}`} className="cursor-pointer" onClick={() => navigate(`/thread/${cb.vendor_id}`)}>
              <title>{cb.vendor_name} · {cb.co_bid_count} co-bids · {Math.round(winRate * 100)}% win</title>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={roleColor} strokeWidth={strokeW} opacity={0.55} />
              <circle cx={x} cy={y} r={nodeR + 8} fill="transparent" />
              <circle cx={x} cy={y} r={nodeR} fill={roleColor} stroke="var(--color-background)" strokeWidth={1.4} />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fill="var(--color-text-secondary)"
              >
                {formatVendorName(cb.vendor_name, 16)}
              </text>
            </g>
          )
        })}

      {/* Empty inner-ring note */}
      {!hasCoBidders && (
        <text
          x={cx}
          y={cy - innerR + 4}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          fill="var(--color-text-muted)"
          letterSpacing={1.4}
          style={{ textTransform: 'uppercase' }}
        >
          {lang === 'es' ? 'sin co-licitación' : 'no co-bidding'}
        </text>
      )}

      {/* Ring labels (top-right) */}
      <text
        x={W - 14}
        y={26}
        textAnchor="end"
        fontSize={9}
        fontFamily="var(--font-family-mono)"
        letterSpacing={1.2}
        fill="var(--color-text-muted)"
      >
        {totalInstitutions} {lang === 'es' ? 'instituciones' : 'institutions'}
        {totalInstitutions > visibleInst && ` (${visibleInst} ${lang === 'es' ? 'mostradas' : 'shown'})`}
      </text>
      <text
        x={14}
        y={26}
        textAnchor="start"
        fontSize={9}
        fontFamily="var(--font-family-mono)"
        letterSpacing={1.2}
        fill={hasCoBidders ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'}
      >
        {coBidders.length} {lang === 'es'
          ? (coBidders.length === 1 ? 'co-licitante' : 'co-licitantes')
          : (coBidders.length === 1 ? 'co-bidder' : 'co-bidders')}
      </text>

      {/* Bottom-edge legend */}
      <text
        x={W / 2}
        y={H - 6}
        textAnchor="middle"
        fontSize={8.5}
        fontFamily="var(--font-family-mono)"
        fill="var(--color-text-muted)"
        opacity={0.6}
        letterSpacing={1.2}
        style={{ textTransform: 'uppercase' }}
      >
        {lang === 'es'
          ? 'anillo exterior · instituciones    ·    anillo interior · co-licitantes'
          : 'outer ring · institutions    ·    inner ring · co-bidders'}
      </text>
    </svg>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildNetworkLede({
  subjectName,
  totalInstitutions,
  sectorsCount,
  coBidderCount,
  topCoBidder,
  topInstitution,
  institutionsTotal,
  lang,
}: {
  subjectName: string
  totalInstitutions: number
  sectorsCount: number
  coBidderCount: number
  topCoBidder: CoBidder | null
  topInstitution: InstitutionTie | null
  institutionsTotal: number
  lang: 'en' | 'es'
}): string {
  const name = formatVendorName(subjectName, 300)
  const topInstShare = topInstitution && institutionsTotal > 0
    ? (topInstitution.total_value_mxn / institutionsTotal) * 100
    : 0
  const topInstName = topInstitution
    ? institutionAcronym(topInstitution.institution_name)
    : null

  // Frame 1: SOLO — no co-bidders, single source
  if (coBidderCount === 0 && totalInstitutions <= 5) {
    if (topInstName && topInstShare >= 50) {
      return lang === 'es'
        ? `${name} operó como proveedor único: ${totalInstitutions} ${totalInstitutions === 1 ? 'institución' : 'instituciones'}, ninguna licitación compartida con otro postor. ${topInstName} concentra el ${topInstShare.toFixed(0)}% del gasto.`
        : `${name} operated as a single source: ${totalInstitutions} ${totalInstitutions === 1 ? 'institution' : 'institutions'}, no procedures shared with another bidder. ${topInstName} concentrates ${topInstShare.toFixed(0)}% of the spend.`
    }
    return lang === 'es'
      ? `${name} operó como proveedor único: ${totalInstitutions} ${totalInstitutions === 1 ? 'institución' : 'instituciones'}, ninguna licitación compartida con otro postor.`
      : `${name} operated as a single source: ${totalInstitutions} ${totalInstitutions === 1 ? 'institution' : 'institutions'}, no procedures shared with another bidder.`
  }
  // Frame 2: BROAD SINGLE-SOURCE — no co-bidders but many institutions
  if (coBidderCount === 0) {
    return lang === 'es'
      ? `${name} vendió a ${formatNumber(totalInstitutions)} instituciones a través de ${sectorsCount} ${sectorsCount === 1 ? 'sector' : 'sectores'}, pero nunca participó en una licitación junto a otro postor.`
      : `${name} sold to ${formatNumber(totalInstitutions)} institutions across ${sectorsCount} ${sectorsCount === 1 ? 'sector' : 'sectors'} but never participated in a procedure alongside another bidder.`
  }
  // Frame 3: TIGHT NETWORK — a few co-bidders, dominant institutional partner
  if (coBidderCount <= 3 && topInstName && topInstShare >= 35) {
    return lang === 'es'
      ? `${name} compartió procedimientos con ${coBidderCount} ${coBidderCount === 1 ? 'co-licitante' : 'co-licitantes'}, casi siempre con ${topInstName} como cliente dominante (${topInstShare.toFixed(0)}% del gasto).`
      : `${name} shared procedures with ${coBidderCount} ${coBidderCount === 1 ? 'co-bidder' : 'co-bidders'}, almost always with ${topInstName} as the dominant client (${topInstShare.toFixed(0)}% of the spend).`
  }
  // Frame 4: DENSE NETWORK — many co-bidders
  if (coBidderCount > 5) {
    const topName = topCoBidder ? formatVendorName(topCoBidder.vendor_name, 60) : ''
    return lang === 'es'
      ? `${name} se mueve en una red activa: ${formatNumber(coBidderCount)} co-licitantes y ${formatNumber(totalInstitutions)} instituciones${topName ? `, con vínculos más fuertes a ${topName}` : ''}.`
      : `${name} moves in an active network: ${formatNumber(coBidderCount)} co-bidders and ${formatNumber(totalInstitutions)} institutions${topName ? `, with the strongest ties to ${topName}` : ''}.`
  }
  // Frame 5: STANDARD
  return lang === 'es'
    ? `${name} comparte procedimientos con ${coBidderCount} ${coBidderCount === 1 ? 'co-licitante' : 'co-licitantes'} y vende a ${formatNumber(totalInstitutions)} instituciones.`
    : `${name} shares procedures with ${coBidderCount} ${coBidderCount === 1 ? 'co-bidder' : 'co-bidders'} and sells to ${formatNumber(totalInstitutions)} institutions.`
}

function roleColorFor(winRate: number): string {
  if (winRate < 0.15) return RISK_COLORS.critical
  if (winRate >= 0.3 && winRate <= 0.7) return RISK_COLORS.high
  if (winRate > 0.6) return RISK_COLORS.medium
  return 'var(--color-text-muted)'
}

function roleLabelFor(winRate: number, lang: 'en' | 'es'): string {
  if (winRate < 0.15) return lang === 'es' ? 'POSIBLE SEÑUELO' : 'POSSIBLE DECOY'
  if (winRate >= 0.3 && winRate <= 0.7) return lang === 'es' ? 'PATRÓN ROTACIÓN' : 'ROTATION'
  if (winRate > 0.6) return lang === 'es' ? 'POSIBLE CÓMPLICE' : 'POSSIBLE ACCOMPLICE'
  return lang === 'es' ? 'CO-LICITANTE' : 'CO-BIDDER'
}

function institutionAcronym(name: string): string {
  const STOP = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'EN'])
  const letters = name
    .toUpperCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map((w) => w[0])
    .slice(0, 5)
    .join('')
  return letters || name.slice(0, 4).toUpperCase()
}
