/**
 * InstitutionStarGraph — Phase C of La Trama (/network), institution lens.
 *
 * "El Sitio" (the siege): one federal buyer at the center, its top-30
 * vendors orbiting by contracted value. Spoke width = value share;
 * node fill = risk band (platform language, low = zinc, never green);
 * outer arc stroke = co-bidding clan (Louvain community) so recurring
 * clusters around the same buyer become visible; dashed red ring =
 * SFP sanction.
 *
 * Named precedent: OCCRP shell-company hub diagrams (institution →
 * intermediary web). Static layout (golden-angle orbit) — a printed
 * plate, not a simulation.
 */
import { useMemo, useState } from 'react'
import type { InstitutionStarResponse } from '@/api/client'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { formatEntityName } from '@/lib/entity/format'

const VIEW_W = 920
const VIEW_H = 600
const CX = VIEW_W / 2
const CY = VIEW_H / 2

/** Categorical clan palette — archival, muted; NOT risk semantics.
 *  Distinct from RISK_COLORS / SECTOR_COLORS on purpose: clans are
 *  identity, not severity. */
const CLAN_PALETTE = ['#0f4c5c', '#5f0f40', '#e36414', '#4f772d', '#735d78', '#9a031e']
const NO_CLAN = 'var(--color-border)'

function riskFill(score: number | null): string {
  if (score == null) return 'var(--color-text-muted)'
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

interface InstitutionStarGraphProps {
  data: InstitutionStarResponse
  lang: 'en' | 'es'
  selectedVendorId?: number | null
  onSelectVendor?: (vendorId: number | null) => void
}

export function InstitutionStarGraph({
  data,
  lang,
  selectedVendorId = null,
  onSelectVendor,
}: InstitutionStarGraphProps) {
  const isEs = lang === 'es'
  const [hoverId, setHoverId] = useState<number | null>(null)

  const { placed, clanColor } = useMemo(() => {
    const vendors = [...data.vendors].sort(
      (a, b) => b.total_value_mxn - a.total_value_mxn,
    )
    const maxV = Math.max(...vendors.map((v) => v.total_value_mxn), 1)

    // Clan colors by frequency among the orbit (≥2 members get a color).
    const counts = new Map<number, number>()
    vendors.forEach((v) => {
      if (v.community_id != null) counts.set(v.community_id, (counts.get(v.community_id) ?? 0) + 1)
    })
    const ranked = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])
    const clanColorMap = new Map<number, string>()
    ranked.slice(0, CLAN_PALETTE.length).forEach(([cid], i) => clanColorMap.set(cid, CLAN_PALETTE[i]))

    // Golden-angle orbit, radius grows with value rank (biggest closest).
    const GOLDEN = Math.PI * (3 - Math.sqrt(5))
    const placedNodes = vendors.map((v, i) => {
      const angle = i * GOLDEN
      const t = vendors.length > 1 ? i / (vendors.length - 1) : 0
      const orbit = 130 + 130 * t
      return {
        v,
        x: CX + orbit * Math.cos(angle),
        y: CY + orbit * Math.sin(angle) * 0.78, // gentle ellipse for the 920×600 plate
        r: 6 + 15 * Math.sqrt(v.total_value_mxn / maxV),
        share: v.total_value_mxn / Math.max(data.total_value_mxn, 1),
      }
    })
    return { placed: placedNodes, clanColor: clanColorMap }
  }, [data])

  const hoverNode = hoverId != null ? placed.find((p) => p.v.vendor_id === hoverId) : null
  const activeId = hoverId ?? selectedVendorId

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto block"
        role="group"
        aria-label={
          isEs
            ? `Telaraña de captura: ${data.vendors.length} proveedores principales orbitan ${data.name}`
            : `Capture web: ${data.vendors.length} top vendors orbit ${data.name}`
        }
      >
        {/* Spokes */}
        <g>
          {placed.map((p) => (
            <line
              key={p.v.vendor_id}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="var(--color-border)"
              strokeWidth={0.5 + 3.5 * Math.sqrt(p.share)}
              strokeOpacity={activeId != null && activeId !== p.v.vendor_id ? 0.12 : 0.4}
            />
          ))}
        </g>

        {/* Institution center */}
        <g>
          <circle cx={CX} cy={CY} r={30} fill="var(--color-background-card)" stroke="var(--color-accent)" strokeWidth={1.4} />
          <circle cx={CX} cy={CY} r={24} fill="none" stroke="var(--color-accent)" strokeWidth={0.5} strokeOpacity={0.5} strokeDasharray="3 3" />
          <text
            x={CX}
            y={CY + 48}
            textAnchor="middle"
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              fill: 'var(--color-text-primary)',
              paintOrder: 'stroke',
              stroke: 'var(--color-background)',
              strokeWidth: 3,
            }}
          >
            {formatEntityName('institution', data.name, 'sm')}
          </text>
        </g>

        {/* Vendor orbit */}
        <g>
          {placed.map((p) => {
            const dimmed = activeId != null && activeId !== p.v.vendor_id
            const clan = p.v.community_id != null ? clanColor.get(p.v.community_id) : undefined
            return (
              <g
                key={p.v.vendor_id}
                transform={`translate(${p.x},${p.y})`}
                opacity={dimmed ? 0.3 : 1}
                tabIndex={0}
                role="button"
                aria-label={p.v.vendor_name}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setHoverId(p.v.vendor_id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(p.v.vendor_id)}
                onBlur={() => setHoverId(null)}
                onClick={() => onSelectVendor?.(p.v.vendor_id === selectedVendorId ? null : p.v.vendor_id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    onSelectVendor?.(p.v.vendor_id === selectedVendorId ? null : p.v.vendor_id)
                  }
                }}
              >
                {p.v.vendor_id === selectedVendorId && (
                  <circle r={p.r + 6.5} fill="none" stroke="var(--color-accent)" strokeWidth={1.4} />
                )}
                {/* clan arc — identity channel */}
                <circle r={p.r + 3} fill="none" stroke={clan ?? NO_CLAN} strokeWidth={clan ? 2.2 : 0.8} strokeOpacity={clan ? 0.9 : 0.5} />
                {/* risk fill — severity channel */}
                <circle r={p.r} fill={riskFill(p.v.avg_risk_score)} fillOpacity={0.82} stroke="var(--color-background)" strokeWidth={1} />
                {p.v.is_sanctioned && (
                  <circle r={p.r + 5} fill="none" stroke={RISK_COLORS.critical} strokeWidth={1.1} strokeDasharray="2.5 2" />
                )}
              </g>
            )
          })}
        </g>

        {/* Top-5 named callouts */}
        <g style={{ pointerEvents: 'none' }}>
          {placed.slice(0, 5).map((p) =>
            p.v.vendor_id === hoverId ? null : (
              <text
                key={p.v.vendor_id}
                x={p.x}
                y={p.y - p.r - 7}
                textAnchor="middle"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '9.5px',
                  letterSpacing: '0.04em',
                  fill: 'var(--color-text-secondary)',
                  paintOrder: 'stroke',
                  stroke: 'var(--color-background)',
                  strokeWidth: 3,
                }}
              >
                {formatEntityName('vendor', p.v.vendor_name, 'xs')}
              </text>
            ),
          )}
        </g>
      </svg>

      {/* Hover dossier card */}
      {hoverNode && (
        <div
          className="absolute z-10 pointer-events-none rounded-sm border border-border bg-background px-3 py-2.5 shadow-sm"
          style={{
            left: `${Math.min(92, Math.max(2, (hoverNode.x / VIEW_W) * 100))}%`,
            top: `${Math.min(86, Math.max(2, ((hoverNode.y + hoverNode.r + 12) / VIEW_H) * 100))}%`,
            transform: 'translateX(-50%)',
            maxWidth: 260,
            boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
          }}
        >
          <p
            className="text-[12.5px] text-text-primary leading-snug mb-1"
            style={{ fontFamily: 'var(--font-family-serif)', fontWeight: 600 }}
          >
            {formatEntityName('vendor', hoverNode.v.vendor_name, 'sm')}
          </p>
          <div className="space-y-0.5 text-[10px] font-mono text-text-muted">
            <p>
              {formatCompactMXN(hoverNode.v.total_value_mxn)} ·{' '}
              {Math.round(hoverNode.share * 1000) / 10}% {isEs ? 'del gasto del comprador' : 'of buyer spend'}
            </p>
            <p>
              {isEs ? 'Indicador de riesgo' : 'Risk indicator'}{' '}
              <span style={{ color: riskFill(hoverNode.v.avg_risk_score), fontWeight: 700 }}>
                {hoverNode.v.avg_risk_score != null ? `${Math.round(hoverNode.v.avg_risk_score * 100)}%` : '—'}
              </span>
              {hoverNode.v.community_id != null && (
                <span> · {isEs ? 'clan' : 'clan'} C-{hoverNode.v.community_id}</span>
              )}
              {hoverNode.v.is_sanctioned && (
                <span style={{ color: RISK_COLORS.critical }}> · {isEs ? 'SANCIONADO' : 'SANCTIONED'}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border" style={{ borderColor: 'var(--color-accent)' }} />
          {isEs ? 'Comprador (centro)' : 'Buyer (center)'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: RISK_COLORS.critical }} />
          {isEs ? 'Relleno = riesgo' : 'Fill = risk'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: CLAN_PALETTE[0] }} />
          {isEs ? 'Aro = clan de co-licitación' : 'Ring = co-bidding clan'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: RISK_COLORS.critical }} />
          {isEs ? 'Sancionado SFP' : 'SFP sanctioned'}
        </span>
        <span>{isEs ? 'Grosor del rayo = participación en el gasto' : 'Spoke width = share of spend'}</span>
      </div>
    </div>
  )
}
