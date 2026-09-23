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
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { InstitutionStarResponse } from '@/api/client'
import { RISK_COLORS, RISK_TEXT_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { formatEntityName } from '@/lib/entity/format'
import { placeLabels, measureLabel, type LabelBox, type LabelCandidate } from '@/lib/plateLabels'

const VIEW_W = 920
const VIEW_H = 600
const CX = VIEW_W / 2
const CY = VIEW_H / 2
// D4 § 1 — HTML owns glyphs, SVG owns geometry (see CommunityForceGraph).
const LABEL_FS = 11
const LABEL_LH = 13
const LABEL_FAMILY = '"IBM Plex Mono", "JetBrains Mono", monospace'
const LABEL_FONT = `${LABEL_FS}px ${LABEL_FAMILY}`
const CENTRE_FS = 12
const CENTRE_FONT = `700 ${CENTRE_FS}px ${LABEL_FAMILY}`
const HALO_PAD = 4
const NARROW_PLATE = 640

/** Categorical clan palette — archival, muted; NOT risk semantics.
 *  Distinct from RISK_COLORS / SECTOR_COLORS on purpose: clans are
 *  identity, not severity. */
const CLAN_PALETTE = ['#0f4c5c', '#5f0f40', '#e36414', '#4f772d', '#735d78', '#9a031e']
const NO_CLAN = 'var(--color-border)'

function riskFill(score: number | null): string {
  if (score == null) return 'var(--color-text-muted)'
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

/** AA-safe risk color for small TEXT (RISK_COLORS fail WCAG as numerals). */
function riskText(score: number | null): string {
  if (score == null) return 'var(--color-text-muted)'
  return RISK_TEXT_COLORS[getRiskLevelFromScore(score)]
}

interface InstitutionStarGraphProps {
  data: InstitutionStarResponse
  lang: 'en' | 'es'
  selectedVendorId?: number | null
  onSelectVendor?: (vendorId: number | null) => void
}

export const InstitutionStarGraph = memo(function InstitutionStarGraph({
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
  const cardNode =
    hoverNode ?? (selectedVendorId != null ? (placed.find((p) => p.v.vendor_id === selectedVendorId) ?? null) : null)
  const activeId = hoverId ?? selectedVendorId

  // ── Rendered geometry — glyphs are HTML, so they never scale with viewBox.
  const containerRef = useRef<HTMLDivElement>(null)
  const [plateW, setPlateW] = useState(0)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setPlateW(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [fontsReady, setFontsReady] = useState(
    () => typeof document !== 'undefined' && document.fonts?.status === 'loaded',
  )
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) setFontsReady(true)
    })
    return () => {
      alive = false
    }
  }, [])
  const [coarsePointer, setCoarsePointer] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia?.('(hover: none)')
    if (!mq) return
    setCoarsePointer(mq.matches)
    const on = () => setCoarsePointer(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  const scale = plateW > 0 ? plateW / VIEW_W : 0
  const plateH = VIEW_H * scale
  const narrow = plateW > 0 && plateW < NARROW_PLATE

  /** The buyer's own name, centred under the hub — an obstacle for the
   *  orbit callouts, never something they may sit on. */
  const centreLabel = useMemo(() => {
    if (scale <= 0) return null
    const text = formatEntityName('institution', data.name, 'full')
    const maxW = Math.min(plateW - 24, narrow ? 200 : 320)
    const m = measureLabel(text, CENTRE_FONT, maxW, CENTRE_FS + 3)
    const x = CX * scale
    const y = (CY + 36) * scale
    const box: LabelBox = { x0: x - m.width / 2 - 2, y0: y, x1: x + m.width / 2 + 2, y1: y + m.height + 2 }
    return { text, box }
  }, [data.name, scale, plateW, narrow, fontsReady])

  /** Top-5 by value (top-3 on a narrow plate), full names, rendered px. */
  const labels = useMemo(() => {
    if (scale <= 0) return []
    const cap = narrow ? 3 : 5
    const maxW = narrow ? 120 : 160
    const text = new Map<number, string>()
    const candidates: LabelCandidate[] = placed.slice(0, cap).map((p) => {
      const t = formatEntityName('vendor', p.v.vendor_name, 'full')
      text.set(p.v.vendor_id, t)
      const m = measureLabel(t, LABEL_FONT, maxW - HALO_PAD, LABEL_LH)
      return {
        id: p.v.vendor_id,
        x: p.x * scale,
        y: p.y * scale,
        width: m.width + HALO_PAD,
        height: m.height + 4,
        above: p.r * scale + 6,
        below: p.r * scale + 6,
      }
    })
    const obstacles = centreLabel ? [centreLabel.box] : []
    return placeLabels(candidates, obstacles, { x0: 1, y0: 1, x1: plateW - 1, y1: plateH - 1 }).map((p) => ({
      placed: p,
      label: text.get(p.id as number) ?? '',
    }))
  }, [placed, scale, plateW, plateH, narrow, centreLabel, fontsReady])

  // ── Roving tabindex (D4 § 6) — one tab stop for the whole siege; arrows walk
  // the orbit in value order (the order it is drawn in), Enter selects.
  const descId = useId()
  const order = useMemo(() => placed.map((p) => p.v.vendor_id), [placed])
  const [rovingId, setRovingId] = useState<number | null>(null)
  const focusTarget =
    rovingId != null && order.includes(rovingId)
      ? rovingId
      : selectedVendorId != null && order.includes(selectedVendorId)
        ? selectedVendorId
        : (order[0] ?? null)
  const nodeRefs = useRef(new Map<number, SVGGElement | null>())

  const select = useCallback(
    (id: number) => onSelectVendor?.(id === selectedVendorId ? null : id),
    [onSelectVendor, selectedVendorId],
  )

  const handleNodeKey = useCallback(
    (ev: ReactKeyboardEvent<SVGGElement>, id: number) => {
      const idx = order.indexOf(id)
      let next: number | undefined
      switch (ev.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = order[Math.min(order.length - 1, idx + 1)]
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          next = order[Math.max(0, idx - 1)]
          break
        case 'Home':
          next = order[0]
          break
        case 'End':
          next = order[order.length - 1]
          break
        case 'Enter':
        case ' ':
          ev.preventDefault()
          select(id)
          return
        default:
          return
      }
      ev.preventDefault()
      if (next != null && next !== id) {
        setRovingId(next)
        nodeRefs.current.get(next)?.focus()
      }
    },
    [order, select],
  )

  return (
    <div className="relative" ref={containerRef}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto block"
        role="group"
        aria-label={
          isEs
            ? `Telaraña de captura: ${data.vendors.length} proveedores principales orbitan ${data.name}`
            : `Capture web: ${data.vendors.length} top vendors orbit ${data.name}`
        }
        aria-describedby={descId}
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
        </g>

        {/* Vendor orbit */}
        <g>
          {placed.map((p) => {
            const dimmed = activeId != null && activeId !== p.v.vendor_id
            const clan = p.v.community_id != null ? clanColor.get(p.v.community_id) : undefined
            return (
              <g
                key={p.v.vendor_id}
                ref={(el) => {
                  nodeRefs.current.set(p.v.vendor_id, el)
                }}
                transform={`translate(${p.x},${p.y})`}
                opacity={dimmed ? 0.3 : 1}
                tabIndex={p.v.vendor_id === focusTarget ? 0 : -1}
                role="button"
                aria-label={p.v.vendor_name}
                className="cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                onMouseEnter={() => setHoverId(p.v.vendor_id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(p.v.vendor_id)}
                onBlur={() => setHoverId(null)}
                onClick={() => select(p.v.vendor_id)}
                onKeyDown={(ev) => handleNodeKey(ev, p.v.vendor_id)}
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

      </svg>

      {/* Buyer name + orbit callouts — HTML, full names, 11px/12px. */}
      {centreLabel && (
        <span
          className="pointer-events-none absolute font-bold text-text-primary"
          style={{
            fontFamily: LABEL_FAMILY,
            left: centreLabel.box.x0,
            top: centreLabel.box.y0,
            width: centreLabel.box.x1 - centreLabel.box.x0,
            boxSizing: 'border-box',
            padding: '1px 2px',
            fontSize: CENTRE_FS,
            lineHeight: `${CENTRE_FS + 3}px`,
            textAlign: 'center',
            textWrap: 'balance',
            background: 'color-mix(in srgb, var(--color-background) 85%, transparent)',
          }}
        >
          {centreLabel.text}
        </span>
      )}
      {labels
        .filter(({ placed: pl }) => pl.id !== hoverId)
        .map(({ placed: pl, label }) => (
          <span
            key={`lbl-${pl.id}`}
            className="pointer-events-none absolute text-text-secondary"
            style={{
              fontFamily: LABEL_FAMILY,
              left: pl.box.x0,
              top: pl.box.y0,
              width: pl.box.x1 - pl.box.x0,
              boxSizing: 'border-box',
              padding: '1px 2px',
              fontSize: LABEL_FS,
              lineHeight: `${LABEL_LH}px`,
              textAlign: pl.align === 'right' ? 'right' : pl.align === 'left' ? 'left' : 'center',
              textWrap: 'balance',
              background: 'color-mix(in srgb, var(--color-background) 85%, transparent)',
            }}
          >
            {label}
          </span>
        ))}
      <p id={descId} className="sr-only">
        {isEs
          ? 'Usa las flechas para moverte entre proveedores; Enter selecciona.'
          : 'Use the arrow keys to move between vendors; Enter selects.'}
      </p>

      {/* Dossier card — on a touch plate it follows the selected node. */}
      {cardNode && (
        <div
          className="absolute z-10 pointer-events-none rounded-sm border border-border bg-background px-3 py-2.5 shadow-sm"
          style={{
            left: `${Math.min(92, Math.max(2, (cardNode.x / VIEW_W) * 100))}%`,
            top: `${Math.min(86, Math.max(2, ((cardNode.y + cardNode.r + 12) / VIEW_H) * 100))}%`,
            transform: 'translateX(-50%)',
            maxWidth: 260,
            boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
          }}
        >
          <p
            className="text-[12.5px] text-text-primary leading-snug mb-1"
            style={{ fontFamily: 'var(--font-family-serif)', fontWeight: 600 }}
          >
            {formatEntityName('vendor', cardNode.v.vendor_name, 'full')}
          </p>
          <div className="space-y-0.5 text-[12px] font-mono text-text-muted">
            <p>
              {formatCompactMXN(cardNode.v.total_value_mxn)} ·{' '}
              {Math.round(cardNode.share * 1000) / 10}% {isEs ? 'del gasto del comprador' : 'of buyer spend'}
            </p>
            <p>
              {isEs ? 'Indicador de riesgo' : 'Risk indicator'}{' '}
              <span style={{ color: riskText(cardNode.v.avg_risk_score), fontWeight: 700 }}>
                {cardNode.v.avg_risk_score != null ? `${Math.round(cardNode.v.avg_risk_score * 100)}%` : '—'}
              </span>
              {cardNode.v.community_id != null && (
                <span> · {isEs ? 'clan' : 'clan'} C-{cardNode.v.community_id}</span>
              )}
              {cardNode.v.is_sanctioned && (
                <span style={{ color: RISK_TEXT_COLORS.critical }}> · {isEs ? 'SANCIONADO' : 'SANCTIONED'}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-mono uppercase tracking-[0.14em] text-text-muted">
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
      {labels.length < Math.min(narrow ? 3 : 5, placed.length) && (
        <p className="mt-1.5 text-[11px] font-mono text-text-muted">
          {coarsePointer
            ? isEs ? 'Toca un nodo para leerlo' : 'Tap a node to read it'
            : isEs ? 'Pasa el cursor o enfoca un nodo para leer el resto' : 'Hover or focus a node to read the rest'}
        </p>
      )}
    </div>
  )
})
