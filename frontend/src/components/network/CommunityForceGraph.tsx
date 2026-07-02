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
import { useMemo, useState, useCallback } from 'react'
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

const VIEW_W = 920
const VIEW_H = 600
const MARGIN = 36

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

export function CommunityForceGraph({
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
  const { nodes, edges, labeled } = useMemo(() => {
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

    // Named-outlier callouts (NYT Upshot, greedy non-overlap): top-5 by pagerank,
    // each accepted only if its label box clears every already-placed box (AABB).
    // x/y/r are final + clamped here, so placement is exact and runs once per
    // community (no per-frame cost, no #301). 'xs' (16) labels stay short BY
    // DESIGN — widening to sm/md re-triggers the collision this pass resolves;
    // the full name is one hover away in the dossier card.
    const CH_W = 6.2   // ~9.5px mono advance + 0.04em tracking + stroke halo
    const LABEL_H = 13 // cap-height + the 3px paint-order stroke halo
    const PAD = 2
    const candidates = [...simNodes].sort((a, b) => b.node.pagerank - a.node.pagerank).slice(0, 5)
    const placedBoxes: { x0: number; y0: number; x1: number; y1: number }[] = []
    const labeledIds = new Set<number>()
    for (const n of candidates) {
      const txt = formatEntityName('vendor', n.node.name, 'xs')
      const w = txt.length * CH_W
      const cx = n.x as number
      const cy = (n.y as number) - n.r - 6
      const box = { x0: cx - w / 2 - PAD, y0: cy - LABEL_H, x1: cx + w / 2 + PAD, y1: cy + PAD }
      const clear = placedBoxes.every((b) => box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1)
      if (clear) {
        placedBoxes.push(box)
        labeledIds.add(n.id)
      }
    }
    return { nodes: simNodes, edges: simEdges as SimEdge[], labeled: labeledIds }
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

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto block"
        role="group"
        aria-label={
          isEs
            ? `Grafo de co-licitación: ${data.rendered_members} proveedores, ${data.edges.length} aristas`
            : `Co-bidding graph: ${data.rendered_members} vendors, ${data.edges.length} edges`
        }
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
                transform={`translate(${n.x},${n.y})`}
                opacity={dimmed ? 0.25 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${n.node.name}${n.node.is_sanctioned ? (isEs ? ' · sancionado' : ' · sanctioned') : ''}`}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(n.id)}
                onBlur={() => setHoverId(null)}
                onClick={() => handleSelect(n.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    handleSelect(n.id)
                  }
                }}
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

        {/* Hub callouts — top-5 pagerank, NYT Upshot named outliers */}
        <g style={{ pointerEvents: 'none' }}>
          {nodes
            .filter((n) => labeled.has(n.id) && n.id !== hoverId)
            .map((n) => (
              <text
                key={n.id}
                x={n.x}
                y={(n.y ?? 0) - n.r - 6}
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
                {formatEntityName('vendor', n.node.name, 'xs')}
              </text>
            ))}
        </g>

        {/* Evidence marks (El Croquis §3.4) — numbered ochre tents pinned to
            the scene. Additive + default-off: renders nothing when `evidence`
            is undefined. Each mark reads from the memoized layout, so it
            re-resolves automatically per community. pointer-events off. */}
        {evidence && evidence.length > 0 && (
          <g style={{ pointerEvents: 'none' }}>
            {evidence.map((m) => {
              let ax: number
              let ay: number
              if (m.edge) {
                const na = nodes.find((n) => n.id === m.edge![0])
                const nb = nodes.find((n) => n.id === m.edge![1])
                if (!na || !nb) return null
                ax = ((na.x ?? 0) + (nb.x ?? 0)) / 2
                ay = ((na.y ?? 0) + (nb.y ?? 0)) / 2
              } else {
                const n = nodes.find((x) => x.id === m.vendorId)
                if (!n) return null
                ax = (n.x ?? 0) + n.r * 0.7
                ay = (n.y ?? 0) - n.r * 0.7
              }
              // Tent sits up-and-right of the anchor, clamped into the plate.
              const tx = Math.min(VIEW_W - MARGIN - 11, ax + 6)
              const ty = Math.max(MARGIN, ay - 16)
              return (
                <g key={m.id}>
                  <line
                    x1={ax}
                    y1={ay}
                    x2={tx + 5.5}
                    y2={ty + 11}
                    stroke="var(--color-accent)"
                    strokeWidth={0.75}
                    strokeOpacity={0.85}
                  />
                  <rect x={tx} y={ty} width={11} height={11} rx={1} fill="var(--color-accent)" />
                  <text
                    x={tx + 5.5}
                    y={ty + 8.4}
                    textAnchor="middle"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '7px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      fill: 'var(--color-background)',
                    }}
                  >
                    {m.id}
                  </text>
                </g>
              )
            })}
          </g>
        )}
      </svg>

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
          <div className="space-y-0.5 text-[10px] font-mono text-text-muted">
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
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/70">
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
          the rest are one hover away. */}
      {labeled.size < Math.min(5, data.nodes.length) && (
        <p className="mt-1.5 text-[8.5px] font-mono text-text-muted/45">
          {isEs ? 'pasa el cursor para leer el resto' : 'hover to read the rest'}
        </p>
      )}
    </div>
  )
}
