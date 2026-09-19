/**
 * CommunityForceGraph — RUNG 1 of La Trama (/network).
 *
 * The REAL co-bidding mesh of one Louvain community: every node is a
 * vendor, every edge is a co_bidding_stats pair (vendors that appeared
 * in the same procurement procedures). Unlike the Atlas constellation
 * (a Halton-attractor metaphor), positions here are force-directed from
 * actual relational data.
 *
 * Named precedent: ICIJ Aleph entity-flow / OCCRP shell-company
 * diagrams — labeled hub entities, weighted ties, sanction marks.
 *
 * Engineering notes:
 *   - Layout is computed SYNCHRONOUSLY (simulation.tick() × 300 in a
 *     useMemo) — a static printed plate, not an animated toy. No rAF
 *     loop, no re-render churn (React #301 hygiene).
 *   - Node budget ≤ ~100 (backend truncates giants to top-100 pagerank),
 *     so plain SVG is fine; no canvas needed.
 *   - Keyboard: every node is focusable (tabIndex=0, Enter/Space
 *     selects) — the a11y gap flagged on Atlas bubbles.
 */
import { memo, useEffect, useId, useMemo, useRef, useState, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force'
import type { CommunityGraphResponse, CommunityGraphNode } from '@/api/client'
import { RISK_COLORS, RISK_TEXT_COLORS, PATTERN_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { formatEntityName } from '@/lib/entity/format'
import type { EvidenceMark } from '@/lib/network/evidence'
import { placeLabels, measureLabel, type LabelCandidate } from './plateLabels'

const VIEW_W = 920
const VIEW_H = 600
const MARGIN = 36
// D4 § 1 — HTML owns glyphs, SVG owns geometry. Labels are measured and drawn
// in RENDERED px, so they never inherit the viewBox scale (at 390 that scale
// was 0.33, which rendered a 9.5px callout at 3.2px).
const LABEL_FS = 11
const LABEL_LH = 13
const LABEL_FAMILY = '"IBM Plex Mono", "JetBrains Mono", monospace'
const LABEL_FONT = `${LABEL_FS}px ${LABEL_FAMILY}`
const HALO_PAD = 4
const TENT = 16
const NARROW_PLATE = 640

interface SimNode extends SimulationNodeDatum {
  id: number
  node: CommunityGraphNode
  r: number
}

interface SimEdge {
  source: SimNode
  target: SimNode
  shared: number
  collusion: boolean
}

interface CommunityForceGraphProps {
  data: CommunityGraphResponse
  lang: 'en' | 'es'
  selectedVendorId?: number | null
  onSelectVendor?: (vendorId: number | null) => void
  /**
   * Optional forensic evidence marks (El Croquis §3.4). Additive, default-off:
   * when undefined, the graph renders exactly as before. Each mark pins a
   * numbered ochre "tent" to a node (vendorId) or an edge midpoint (edge),
   * decoded by the EvidenceIndex strip below the plate.
   */
  evidence?: EvidenceMark[]
}

/** Risk fill — low band renders neutral zinc, never green (Bible §3.10). */
function riskFill(score: number | null): string {
  if (score == null) return 'var(--color-text-muted)'
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

/** AA-safe risk color for small TEXT (RISK_COLORS fail WCAG as numerals). */
function riskText(score: number | null): string {
  if (score == null) return 'var(--color-text-muted)'
  return RISK_TEXT_COLORS[getRiskLevelFromScore(score)]
}

export const CommunityForceGraph = memo(function CommunityForceGraph({
  data,
  lang,
  selectedVendorId = null,
  onSelectVendor,
  evidence,
}: CommunityForceGraphProps) {
  const isEs = lang === 'es'
  const [hoverId, setHoverId] = useState<number | null>(null)

  // ------------------------------------------------------------------
  // Static force layout — recomputed only when the community changes.
  // ------------------------------------------------------------------
  const { nodes, edges } = useMemo(() => {
    const maxPr = Math.max(...data.nodes.map((n) => n.pagerank), 1e-9)
    const simNodes: SimNode[] = data.nodes.map((n) => ({
      id: n.vendor_id,
      node: n,
      // sqrt-of-normalized-pagerank radius: hubs read as hubs without
      // drowning the plate. 5px floor keeps singleton vendors visible.
      r: 5 + 13 * Math.sqrt(n.pagerank / maxPr),
    }))
    const byId = new Map(simNodes.map((n) => [n.id, n]))

    const simEdges = data.edges
      .filter((e) => byId.has(e.a) && byId.has(e.b))
      .map((e) => ({
        source: byId.get(e.a) as SimNode,
        target: byId.get(e.b) as SimNode,
        shared: e.shared_procedures,
        collusion: e.is_potential_collusion,
      }))

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimEdge>(simEdges as SimEdge[])
          .distance((e) => 46 + 70 / Math.sqrt(e.shared))
          .strength((e) => Math.min(0.9, 0.25 + e.shared / 20)),
      )
      .force('charge', forceManyBody().strength(-120))
      .force('center', forceCenter(VIEW_W / 2, VIEW_H / 2))
      .force('collide', forceCollide<SimNode>((n) => n.r + 3))
      .force('x', forceX(VIEW_W / 2).strength(0.06))
      .force('y', forceY(VIEW_H / 2).strength(0.08))
      .stop()
    for (let i = 0; i < 300; i++) sim.tick()

    // Clamp into the plate margins.
    simNodes.forEach((n) => {
      n.x = Math.max(MARGIN, Math.min(VIEW_W - MARGIN, n.x ?? VIEW_W / 2))
      n.y = Math.max(MARGIN, Math.min(VIEW_H - MARGIN, n.y ?? VIEW_H / 2))
    })

    return { nodes: simNodes, edges: simEdges as SimEdge[] }
  }, [data])

  const activeId = hoverId ?? selectedVendorId
  const neighborIds = useMemo(() => {
    if (activeId == null) return null
    const set = new Set<number>([activeId])
    edges.forEach((e) => {
      if (e.source.id === activeId) set.add(e.target.id)
      if (e.target.id === activeId) set.add(e.source.id)
    })
    return set
  }, [activeId, edges])

  const handleSelect = useCallback(
    (vendorId: number) => {
      onSelectVendor?.(vendorId === selectedVendorId ? null : vendorId)
    },
    [onSelectVendor, selectedVendorId],
  )

  const hoverNode = hoverId != null ? nodes.find((n) => n.id === hoverId) : null
  const maxShared = Math.max(...edges.map((e) => e.shared), 1)

  // ── Rendered geometry: the SVG scales with its viewBox, the glyphs do not.
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
  // On a touch plate there is no hover, so the dossier card opens on tap:
  // the node's onClick already selects it.
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

  /** Evidence tents in rendered px — 16px squares with a 10px numeral. */
  const tents = useMemo(() => {
    if (scale <= 0 || !evidence || evidence.length === 0) return []
    const out: { id: EvidenceMark['id']; ax: number; ay: number; x: number; y: number }[] = []
    for (const m of evidence) {
      let ax: number
      let ay: number
      if (m.edge) {
        const na = nodes.find((n) => n.id === m.edge![0])
        const nb = nodes.find((n) => n.id === m.edge![1])
        if (!na || !nb) continue
        ax = (((na.x ?? 0) + (nb.x ?? 0)) / 2) * scale
        ay = (((na.y ?? 0) + (nb.y ?? 0)) / 2) * scale
      } else {
        const n = nodes.find((x) => x.id === m.vendorId)
        if (!n) continue
        ax = ((n.x ?? 0) + n.r * 0.7) * scale
        ay = ((n.y ?? 0) - n.r * 0.7) * scale
      }
      out.push({
        id: m.id,
        ax,
        ay,
        x: Math.min(plateW - TENT - 2, Math.max(2, ax + 6)),
        y: Math.max(2, ay - TENT - 6),
      })
    }
    return out
  }, [evidence, nodes, scale, plateW])

  /** Hub callouts — top-5 pagerank (top-3 on a narrow plate), full names,
   *  seated in rendered px. Placement waits for the first ResizeObserver tick
   *  so there is no flash of mis-placed labels. */
  const labels = useMemo(() => {
    if (scale <= 0) return []
    const cap = narrow ? 3 : 5
    const maxW = narrow ? 120 : 160
    const text = new Map<number, string>()
    const candidates: LabelCandidate[] = [...nodes]
      .sort((a, b) => b.node.pagerank - a.node.pagerank)
      .slice(0, cap)
      .map((n) => {
        const t = formatEntityName('vendor', n.node.name, 'full')
        text.set(n.id, t)
        const m = measureLabel(t, LABEL_FONT, maxW - HALO_PAD, LABEL_LH)
        return {
          id: n.id,
          x: (n.x ?? 0) * scale,
          y: (n.y ?? 0) * scale,
          width: m.width + HALO_PAD,
          height: m.height + 4,
          above: n.r * scale + 5,
          below: n.r * scale + 5,
        }
      })
    // The evidence tents are pinned to their marks, so they are obstacles:
    // a hub name must never sit under a numbered tent.
    const obstacles = tents.map((t) => ({ x0: t.x - 1, y0: t.y - 1, x1: t.x + TENT + 1, y1: t.y + TENT + 1 }))
    return placeLabels(candidates, obstacles, { x0: 1, y0: 1, x1: plateW - 1, y1: plateH - 1 }).map((p) => ({
      placed: p,
      label: text.get(p.id as number) ?? '',
    }))
    // fontsReady re-runs the measurement once the web fonts land.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, scale, plateW, plateH, narrow, tents, fontsReady])



  // ── Roving tabindex (D4 § 6) — the mesh is ONE tab stop; arrows walk the
  // vendors in pagerank order, Enter selects. The roster below stays the
  // assistive-technology path; this makes the plate itself operable without
  // dropping 100 tab stops into the page.
  const descId = useId()
  const order = useMemo(
    () => [...nodes].sort((a, b) => b.node.pagerank - a.node.pagerank).map((n) => n.id),
    [nodes],
  )
  const [rovingId, setRovingId] = useState<number | null>(null)
  const focusTarget =
    rovingId != null && order.includes(rovingId)
      ? rovingId
      : selectedVendorId != null && order.includes(selectedVendorId)
        ? selectedVendorId
        : (order[0] ?? null)
  const nodeRefs = useRef(new Map<number, SVGGElement | null>())

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
          handleSelect(id)
          return
        default:
          return
      }
      ev.preventDefault()
      // focus() lives in the key handler, never in an effect that depends on
      // the state it sets (React #301 hygiene).
      if (next != null && next !== id) {
        setRovingId(next)
        nodeRefs.current.get(next)?.focus()
      }
    },
    [order, handleSelect],
  )

  return (
    <div className="relative" ref={containerRef}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto block"
        role="group"
        aria-label={
          isEs
            ? `Grafo de co-licitación: ${data.rendered_members} proveedores, ${data.edges.length} aristas`
            : `Co-bidding graph: ${data.rendered_members} vendors, ${data.edges.length} edges`
        }
        aria-describedby={descId}
      >
        {/* Edges underneath — weight by shared procedures; collusion pairs in critical red */}
        <g>
          {edges.map((e, i) => {
            const dimmed = neighborIds != null && !(neighborIds.has(e.source.id) && neighborIds.has(e.target.id))
            return (
              <line
                key={i}
                x1={e.source.x}
                y1={e.source.y}
                x2={e.target.x}
                y2={e.target.y}
                stroke={e.collusion ? RISK_COLORS.critical : 'var(--color-border)'}
                strokeWidth={0.6 + 2.2 * Math.sqrt(e.shared / maxShared)}
                strokeOpacity={dimmed ? 0.08 : e.collusion ? 0.55 : 0.45}
              />
            )
          })}
        </g>

        {/* Nodes — risk fill, sanction dashed ring, GT solid ring */}
        <g>
          {nodes.map((n) => {
            const dimmed = neighborIds != null && !neighborIds.has(n.id)
            const isActive = n.id === activeId
            return (
              <g
                key={n.id}
                ref={(el) => {
                  nodeRefs.current.set(n.id, el)
                }}
                transform={`translate(${n.x},${n.y})`}
                opacity={dimmed ? 0.25 : 1}
                tabIndex={n.id === focusTarget ? 0 : -1}
                role="button"
                aria-label={`${n.node.name}${n.node.is_sanctioned ? (isEs ? ' · sancionado' : ' · sanctioned') : ''}`}
                className="cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(n.id)}
                onBlur={() => setHoverId(null)}
                onClick={() => handleSelect(n.id)}
                onKeyDown={(ev) => handleNodeKey(ev, n.id)}
              >
                {isActive && (
                  <circle r={n.r + 5} fill="none" stroke="var(--color-accent)" strokeWidth={1.4} strokeOpacity={0.9} />
                )}
                <circle
                  r={n.r}
                  fill={riskFill(n.node.risk_score)}
                  fillOpacity={0.82}
                  stroke="var(--color-background)"
                  strokeWidth={1}
                />
                {n.node.is_sanctioned && (
                  <circle r={n.r + 2.5} fill="none" stroke={RISK_COLORS.critical} strokeWidth={1.1} strokeDasharray="2.5 2" />
                )}
                {n.node.gt_case_count > 0 && (
                  <circle r={Math.max(1.8, n.r * 0.28)} cy={-n.r * 0.05} fill="var(--color-background)" fillOpacity={0.95} />
                )}
              </g>
            )
          })}
        </g>

        {/* Evidence marks (El Croquis §3.4) — numbered ochre tents pinned to
            the scene. Additive + default-off: renders nothing when `evidence`
            is undefined. Each mark reads from the memoized layout, so it
            re-resolves automatically per community. pointer-events off. */}
        {tents.length > 0 && scale > 0 && (
          <g style={{ pointerEvents: 'none' }}>
            {tents.map((t) => (
              <line
                key={t.id}
                x1={t.ax / scale}
                y1={t.ay / scale}
                x2={(t.x + TENT / 2) / scale}
                y2={(t.y + TENT) / scale}
                stroke="var(--color-accent)"
                strokeWidth={0.75}
                strokeOpacity={0.85}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Hub callouts — HTML, full names, seated by placeLabels in px. */}
      {labels
        .filter(({ placed }) => placed.id !== hoverId)
        .map(({ placed, label }) => (
          <span
            key={`lbl-${placed.id}`}
            className="pointer-events-none absolute text-text-secondary"
            style={{
              fontFamily: LABEL_FAMILY,
              left: placed.box.x0,
              top: placed.box.y0,
              width: placed.box.x1 - placed.box.x0,
              boxSizing: 'border-box',
              padding: '1px 2px',
              fontSize: LABEL_FS,
              lineHeight: `${LABEL_LH}px`,
              textAlign: placed.align === 'right' ? 'right' : placed.align === 'left' ? 'left' : 'center',
              textWrap: 'balance',
              background: 'color-mix(in srgb, var(--color-background) 85%, transparent)',
            }}
          >
            {label}
          </span>
        ))}

      {/* Evidence tents — 16px HTML squares, 10px numerals. */}
      {tents.map((t) => (
        <span
          key={`tent-${t.id}`}
          aria-hidden="true"
          className="pointer-events-none absolute inline-flex items-center justify-center font-bold"
          style={{
            left: t.x,
            top: t.y,
            width: TENT,
            height: TENT,
            borderRadius: 1,
            background: 'var(--color-accent)',
            color: '#ffffff',
            fontFamily: LABEL_FAMILY,
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          {t.id}
        </span>
      ))}
      <p id={descId} className="sr-only">
        {isEs
          ? 'Usa las flechas para moverte entre proveedores; Enter selecciona.'
          : 'Use the arrow keys to move between vendors; Enter selects.'}
      </p>

      {/* Hover dossier card — editorial sidebar voice, not chart-help tooltip */}
      {hoverNode && (
        <div
          className="absolute z-10 pointer-events-none rounded-sm border border-border bg-background px-3 py-2.5 shadow-sm"
          style={{
            left: `${Math.min(92, Math.max(2, ((hoverNode.x ?? 0) / VIEW_W) * 100))}%`,
            top: `${Math.min(86, Math.max(2, (((hoverNode.y ?? 0) + hoverNode.r + 10) / VIEW_H) * 100))}%`,
            transform: 'translateX(-50%)',
            maxWidth: 260,
            boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
          }}
        >
          <p
            className="text-[12.5px] text-text-primary leading-snug mb-1"
            style={{ fontFamily: 'var(--font-family-serif)', fontWeight: 600 }}
          >
            {formatEntityName('vendor', hoverNode.node.name, 'sm')}
          </p>
          <div className="space-y-0.5 text-[12px] font-mono text-text-muted">
            <p>
              {isEs ? 'Indicador de riesgo' : 'Risk indicator'}{' '}
              <span style={{ color: riskText(hoverNode.node.risk_score), fontWeight: 700 }}>
                {hoverNode.node.risk_score != null ? `${Math.round(hoverNode.node.risk_score * 100)}%` : '—'}
              </span>
              {hoverNode.node.primary_pattern && (
                <>
                  {' · '}
                  <span style={{ color: PATTERN_COLORS[hoverNode.node.primary_pattern] ?? 'var(--color-text-muted)', fontWeight: 700 }}>
                    {hoverNode.node.primary_pattern}
                  </span>
                </>
              )}
            </p>
            <p>
              {hoverNode.node.total_value_mxn != null ? formatCompactMXN(hoverNode.node.total_value_mxn) : '—'}
              {hoverNode.node.contract_count != null && (
                <> · {hoverNode.node.contract_count.toLocaleString(isEs ? 'es-MX' : 'en-US')} {isEs ? 'contratos' : 'contracts'}</>
              )}
            </p>
            <p>
              {isEs ? 'Conexiones' : 'Ties'} {hoverNode.node.degree}
              {hoverNode.node.is_sanctioned && (
                <span style={{ color: RISK_TEXT_COLORS.critical }}> · {isEs ? 'SANCIONADO SFP' : 'SFP SANCTIONED'}</span>
              )}
              {hoverNode.node.gt_case_count > 0 && (
                <span className="text-accent"> · {hoverNode.node.gt_case_count} {isEs ? 'caso(s) GT' : 'GT case(s)'}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Plate legend — mono micro-labels */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-mono uppercase tracking-[0.14em] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: RISK_COLORS.critical }} />
          {isEs ? 'Riesgo crítico' : 'Critical risk'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: RISK_COLORS.high }} />
          {isEs ? 'Alto' : 'High'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: RISK_COLORS.medium }} />
          {isEs ? 'Medio' : 'Medium'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-dashed"
            style={{ borderColor: RISK_COLORS.critical }}
          />
          {isEs ? 'Sancionado SFP' : 'SFP sanctioned'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="14" y2="3" stroke={RISK_COLORS.critical} strokeWidth="2" strokeOpacity="0.55" />
          </svg>
          {isEs ? 'Par señalado por colusión' : 'Flagged collusion pair'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="14" y2="3" stroke="var(--color-border)" strokeWidth="2" />
          </svg>
          {isEs ? 'Co-licitación' : 'Co-bidding tie'}
        </span>
      </div>
      {/* W3 — when the greedy pass withholds colliding callouts, say so:
          the rest are one hover (or one tap) away. */}
      {labels.length < Math.min(narrow ? 3 : 5, nodes.length) && (
        <p className="mt-1.5 text-[11px] font-mono text-text-muted">
          {coarsePointer
            ? isEs ? 'Toca un nodo para leerlo' : 'Tap a node to read it'
            : isEs ? 'Pasa el cursor o enfoca un nodo para leer el resto' : 'Hover or focus a node to read the rest'}
        </p>
      )}
    </div>
  )
})
