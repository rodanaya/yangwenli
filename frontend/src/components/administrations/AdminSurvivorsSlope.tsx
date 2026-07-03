/**
 * AdminSurvivorsSlope — §A LOS SOBREVIVIENTES / THE SURVIVORS.
 *
 * FT slope-chart exhibit: 5 era columns (Fox→Sheinbaum) × top-6 supplier
 * roster. A cubic-Bézier connector joins two occurrences of the same
 * normalized vendor name in different eras — the connector IS the datum
 * (persistence across a change of government). Ochre = the joined eras
 * belong to different parties; zinc = same party. Zero fetch — the page
 * hands this component the 30-slot roster it already holds in memory.
 *
 * Named precedent: FT Visual Vocabulary slope chart + NYT Upshot named-
 * outlier discipline (names printed ON the chart, not in a legend).
 * See docs § .claude/designus/administrations-2026-07-02/proposals/data-first.md §6.
 */

import { useState } from 'react'
import { formatDualCurrency, formatCompactMXN } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'

export interface SurvivorSeat {
  name: string
  totalMxn: number
  contracts: number
  riskPct: number
}

export interface SurvivorColumn {
  adminName: string
  displayName: string
  yearsLabel: string
  party: string
  color: string
  seats: SurvivorSeat[]
}

export interface AdminSurvivorsSlopeProps {
  columns: SurvivorColumn[]
  isEs: boolean
  onSelectAdmin: (adminName: string) => void
}

export interface SurvivorBridge {
  norm: string
  displayName: string
  adminNames: string[]
  crossParty: boolean
  totalMxn: number
}

// ── Geometry (verbatim per approved spec §A) ──────────────────────────────
const VIEW_W = 1040
const VIEW_H = 280
const COL_W = 140
const GUTTER = 85
const COL_STEP = COL_W + GUTTER // 225
const HEADER_H = 34
const ROW_H = 38
const N_ROWS = 6

const OCHRE = 'var(--color-accent)'
const ZINC = '#71717a'

const SERIF = '"EB Garamond", "Playfair Display", Georgia, serif'
const MONO_ARCHIVAL = '"IBM Plex Mono", "JetBrains Mono", monospace'
const MONO_DATA = '"JetBrains Mono", monospace'

/**
 * Normalize a raw COMPRANET vendor name for cross-era matching: uppercase,
 * strip accents, strip punctuation, strip common corporate suffixes,
 * collapse whitespace. Two seats with equal norm() in different eras are
 * the same supplier surviving a government change.
 */
function norm(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\b(S\s?A(\s?P\s?I)?|DE|C\s?V|S\s?DE\s?R\s?L|SA|CV|SAPI|SRL)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Client-side O(30²) intersection — a bridge is a norm() name appearing in ≥2 columns. */
export function computeSurvivorBridges(columns: SurvivorColumn[]): SurvivorBridge[] {
  const byNorm = new Map<
    string,
    { displayName: string; admins: Set<string>; parties: Set<string>; totalMxn: number }
  >()

  for (const col of columns) {
    for (const seat of col.seats) {
      const key = norm(seat.name)
      if (!key) continue
      let entry = byNorm.get(key)
      if (!entry) {
        entry = { displayName: seat.name, admins: new Set(), parties: new Set(), totalMxn: 0 }
        byNorm.set(key, entry)
      }
      if (!entry.admins.has(col.adminName)) {
        entry.admins.add(col.adminName)
        entry.totalMxn += seat.totalMxn
      }
      entry.parties.add(col.party)
    }
  }

  const bridges: SurvivorBridge[] = []
  for (const [key, entry] of byNorm) {
    if (entry.admins.size >= 2) {
      bridges.push({
        norm: key,
        displayName: entry.displayName,
        adminNames: Array.from(entry.admins),
        crossParty: entry.parties.size >= 2,
        totalMxn: entry.totalMxn,
      })
    }
  }
  return bridges
}

interface Edge {
  key: string
  colA: number
  rowA: number
  colB: number
  rowB: number
  crossParty: boolean
  isSkip: boolean
}

export function AdminSurvivorsSlope({ columns, isEs, onSelectAdmin }: AdminSurvivorsSlopeProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  if (!columns.length) return null

  const bridges = computeSurvivorBridges(columns)
  const bridgeByKey = new Map(bridges.map((b) => [b.norm, b]))

  // Column index of each occurrence, per norm key, in chronological (array) order.
  const occurrences = new Map<string, { col: number; row: number }[]>()
  columns.forEach((col, ci) => {
    col.seats.slice(0, N_ROWS).forEach((seat, ri) => {
      const key = norm(seat.name)
      if (!bridgeByKey.has(key)) return
      const list = occurrences.get(key) ?? []
      list.push({ col: ci, row: ri })
      occurrences.set(key, list)
    })
  })

  // One connector per CONSECUTIVE pair of occurrences — a name appearing in
  // 3 eras chains into 2 edges, exactly matching the slope-chart mechanic.
  const edges: Edge[] = []
  for (const [key, occ] of occurrences) {
    const sorted = [...occ].sort((a, b) => a.col - b.col)
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      edges.push({
        key,
        colA: a.col,
        rowA: a.row,
        colB: b.col,
        rowB: b.row,
        crossParty: columns[a.col].party !== columns[b.col].party,
        isSkip: b.col - a.col > 1,
      })
    }
  }

  const bridgedKeysBySeat = new Set(
    [...occurrences.entries()].flatMap(([key, occ]) => occ.map((o) => `${o.col}:${o.row}:${key}`))
  )
  function isSeatBridged(ci: number, ri: number): string | null {
    for (const key of occurrences.keys()) {
      if (bridgedKeysBySeat.has(`${ci}:${ri}:${key}`)) return key
    }
    return null
  }

  const seatsCount = 30
  const N = bridges.length
  const M = bridges.filter((b) => b.crossParty).length

  const sheinbaumIdx = columns.findIndex((c) => c.adminName.toLowerCase() === 'sheinbaum')
  const hasSheinbaumBridge =
    sheinbaumIdx >= 0 && bridges.some((b) => b.adminNames.includes(columns[sheinbaumIdx].adminName))

  // Largest survivor — the bridge with the biggest combined value.
  const topBridge = bridges.length
    ? [...bridges].sort((a, b) => b.totalMxn - a.totalMxn)[0]
    : null
  let topBridgeEraA = ''
  let topBridgeEraB = ''
  if (topBridge) {
    const idxs = columns
      .map((c, i) => (topBridge.adminNames.includes(c.adminName) ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)
    topBridgeEraA = columns[idxs[0]]?.displayName ?? ''
    topBridgeEraB = columns[idxs[idxs.length - 1]]?.displayName ?? ''
  }

  const ariaLabel = isEs
    ? `Padrón de los seis mayores proveedores por sexenio; ${N} nombres se repiten entre administraciones.`
    : `Roster of the six largest suppliers per term; ${N} names repeat across administrations.`

  return (
    <div>
      {/* Anchor + sub-anchor — computed live, one ochre normal-weight fragment. */}
      <p
        style={{
          fontFamily: SERIF,
          fontStyle: 'normal',
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1.25,
          color: 'var(--color-text-primary)',
        }}
      >
        {N === 0 ? (
          isEs
            ? 'Ninguno de los seis mayores proveedores se repite entre sexenios en el padrón actual.'
            : 'None of the six largest suppliers repeats across terms in the current roster.'
        ) : (
          <>
            {isEs ? `De ${seatsCount} asientos en cinco gobiernos, ` : `Of ${seatsCount} seats across five governments, `}
            <span style={{ fontStyle: 'normal', fontWeight: 600, color: OCHRE }}>
              {isEs
                ? `${N} nombres se repiten — ${M} a través de un cambio de partido`
                : `${N} names repeat — ${M} across a change of party`}
            </span>
            .
          </>
        )}
      </p>
      {topBridge && (
        <p className="mt-1 text-sm text-text-muted" style={{ fontFamily: SERIF, fontStyle: 'normal' }}>
          {isEs
            ? `El mayor: ${formatVendorName(topBridge.displayName, 48)}, ${formatDualCurrency(topBridge.totalMxn)} entre ${topBridgeEraA} y ${topBridgeEraB}.`
            : `The largest: ${formatVendorName(topBridge.displayName, 48)}, ${formatDualCurrency(topBridge.totalMxn)} across ${topBridgeEraA} and ${topBridgeEraB}.`}
        </p>
      )}

      {/* Desktop — SVG slope chart. */}
      <div className="hidden md:block mt-4 overflow-x-auto">
        <div style={{ minWidth: 880 }}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            width="100%"
            role="img"
            aria-label={ariaLabel}
          >
            {/* Connectors — drawn first so row text sits on top. */}
            {edges.map((edge, i) => {
              const x1 = edge.colA * COL_STEP + COL_W - 4
              const x2 = edge.colB * COL_STEP + 4
              const y1 = HEADER_H + edge.rowA * ROW_H + 19
              const y2 = HEADER_H + edge.rowB * ROW_H + 19
              const bow = edge.isSkip ? -10 : 0
              const isHovered = hoveredKey === edge.key
              const dimmed = hoveredKey !== null && !isHovered
              const stroke = edge.crossParty ? OCHRE : ZINC
              const path = `M${x1},${y1} C${x1 + 32},${y1 + bow} ${x2 - 32},${y2 + bow} ${x2},${y2}`
              const mainWidth = edge.crossParty ? (isHovered ? 3 : 2.25) : 1.5
              const mainOpacity = edge.crossParty ? 1 : 0.6
              const dotR = edge.crossParty ? (isHovered ? 4 : 2.75) : 2.25
              const dotOpacity = edge.crossParty ? 1 : 0.7
              return (
                // Group opacity dims the whole edge (halo + line + dots) to 20%
                // when another bridge is hovered — Reuters highlight isolation.
                <g key={`${edge.key}-${i}`} opacity={dimmed ? 0.2 : 1}>
                  {edge.crossParty && (
                    <path d={path} fill="none" style={{ stroke: OCHRE }} strokeWidth={7} opacity={0.14} />
                  )}
                  <path
                    d={path}
                    fill="none"
                    style={{ stroke }}
                    strokeWidth={mainWidth}
                    opacity={mainOpacity}
                  />
                  <circle cx={x1} cy={y1} r={dotR} style={{ fill: stroke }} opacity={dotOpacity} />
                  <circle cx={x2} cy={y2} r={dotR} style={{ fill: stroke }} opacity={dotOpacity} />
                </g>
              )
            })}

            {/* Columns — header button + 6-row roster. */}
            {columns.map((col, ci) => {
              const colX = ci * COL_STEP
              return (
                <g key={col.adminName}>
                  <foreignObject x={colX} y={0} width={COL_W} height={HEADER_H}>
                    <div style={{ width: '100%', height: '100%' }}>
                      <button
                        type="button"
                        onClick={() => onSelectAdmin(col.adminName)}
                        className="w-full h-full flex flex-col justify-center gap-0.5 text-left"
                        style={{ cursor: 'pointer' }}
                        aria-label={isEs ? `Ver expediente de ${col.displayName}` : `Open ${col.displayName}'s file`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="flex-shrink-0"
                            style={{ width: 8, height: 8, backgroundColor: col.color }}
                          />
                          <span
                            className="truncate"
                            style={{ fontFamily: SERIF, fontStyle: 'normal', fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.1 }}
                          >
                            {col.displayName}
                          </span>
                        </span>
                        <span style={{ fontFamily: MONO_ARCHIVAL, fontSize: 13, color: 'var(--color-text-muted)' }}>
                          {col.yearsLabel}
                        </span>
                      </button>
                    </div>
                  </foreignObject>

                  {col.seats.slice(0, N_ROWS).map((seat, ri) => {
                    const bridgeKey = isSeatBridged(ci, ri)
                    const bridge = bridgeKey ? bridgeByKey.get(bridgeKey) : undefined
                    const rowY = HEADER_H + ri * ROW_H + 19
                    const isBridged = bridgeKey != null
                    const tickColor = bridge?.crossParty ? OCHRE : ZINC
                    const isHovered = bridgeKey != null && hoveredKey === bridgeKey
                    const isSheinbaumCol = col.adminName.toLowerCase() === 'sheinbaum'
                    const showDagger = isBridged && isSheinbaumCol

                    return (
                      <g
                        key={`${col.adminName}-${ri}`}
                        onMouseEnter={() => bridgeKey && setHoveredKey(bridgeKey)}
                        onMouseLeave={() => setHoveredKey(null)}
                      >
                        <title>
                          {isBridged ? seat.name : `${seat.name} · ${formatCompactMXN(seat.totalMxn)}`}
                        </title>
                        {isBridged ? (
                          <>
                            {/* Survivor — full-height tick + promoted two-line label. */}
                            <rect
                              x={colX}
                              y={rowY - 13}
                              width={3}
                              height={26}
                              style={{ fill: tickColor }}
                              opacity={isHovered ? 1 : 0.85}
                            />
                            <text
                              x={colX + 6}
                              y={rowY - 3}
                              fontFamily={MONO_DATA}
                              fontSize={11}
                              style={{ fontWeight: 700, fill: 'var(--color-text-primary)' }}
                            >
                              {formatVendorName(seat.name, 19)}
                              {showDagger && (
                                <tspan dy={-4} fontSize={7}>†</tspan>
                              )}
                            </text>
                            <text
                              x={colX + 6}
                              y={rowY + 10}
                              fontFamily={MONO_DATA}
                              fontSize={9.5}
                              style={{ fill: 'var(--color-text-secondary)' }}
                            >
                              {formatCompactMXN(seat.totalMxn)}
                            </text>
                          </>
                        ) : (
                          /* Non-survivor — muted single name line; amount lives in the title. */
                          <text
                            x={colX + 6}
                            y={rowY + 2}
                            fontFamily={MONO_DATA}
                            fontSize={10}
                            style={{ fontWeight: 400, fill: 'var(--color-text-muted)', opacity: 0.5 }}
                          >
                            {formatVendorName(seat.name, 20)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Visually-hidden bridge list — the SVG is role="img" and opaque to a screen reader. */}
        <ul className="sr-only">
          {bridges.map((b) => {
            const idxs = columns
              .map((c, i) => (b.adminNames.includes(c.adminName) ? i : -1))
              .filter((i) => i >= 0)
              .sort((x, y) => x - y)
            const eraLabels = idxs.map((i) => columns[i].displayName).join(isEs ? ' y ' : ' and ')
            return (
              <li key={b.norm}>
                {formatVendorName(b.displayName, 60)}
                {' — '}
                {eraLabels}
                {' · '}
                {formatCompactMXN(b.totalMxn)}
                {b.crossParty ? (isEs ? ' (cambio de partido)' : ' (change of party)') : ''}
              </li>
            )
          })}
        </ul>

        {/* Legend — desktop only, directly under the plate. */}
        <p className="mt-2 text-text-muted" style={{ fontFamily: MONO_ARCHIVAL, fontSize: 9 }}>
          {isEs
            ? '— ocre = sobrevive un cambio de partido · gris = mismo partido'
            : '— ochre = survives a change of party · grey = same party'}
        </p>
      </div>

      {/* Mobile — computed bridge cards, same data as the slope chart. */}
      <div className="md:hidden mt-4 space-y-2">
        {bridges.length === 0 && (
          <p className="text-xs text-text-muted">
            {isEs
              ? 'Ninguno de los seis mayores proveedores se repite entre sexenios en el padrón actual.'
              : 'None of the six largest suppliers repeats across terms in the current roster.'}
          </p>
        )}
        {bridges
          .slice()
          .sort((a, b) => b.totalMxn - a.totalMxn)
          .map((b) => {
            const idxs = columns
              .map((c, i) => (b.adminNames.includes(c.adminName) ? i : -1))
              .filter((i) => i >= 0)
              .sort((x, y) => x - y)
            const eraA = columns[idxs[0]]?.displayName ?? ''
            const eraB = columns[idxs[idxs.length - 1]]?.displayName ?? ''
            const isSheinbaumBridge = idxs.includes(sheinbaumIdx) && sheinbaumIdx >= 0
            return (
              <div
                key={b.norm}
                className="pl-2.5 py-1.5"
                style={{ borderLeft: `2px solid ${b.crossParty ? 'var(--color-accent)' : ZINC}` }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  {idxs.map((i) => (
                    <span
                      key={columns[i].adminName}
                      className="rounded-full flex-shrink-0"
                      style={{ width: 6, height: 6, backgroundColor: columns[i].color }}
                    />
                  ))}
                </div>
                <div className="text-xs font-medium text-text-primary">
                  {formatVendorName(b.displayName, 40)}
                  {isSheinbaumBridge && <span style={{ color: OCHRE }}>†</span>}
                </div>
                <div className="text-[13px] font-mono text-text-muted mt-0.5">
                  {eraA} → {eraB} · {formatCompactMXN(b.totalMxn)}
                </div>
              </div>
            )
          })}
      </div>

      {hasSheinbaumBridge && (
        <p className="mt-2 text-[12px] text-text-muted" style={{ fontFamily: MONO_ARCHIVAL }}>
          {isEs ? '† Sexenio en curso — padrón parcial.' : '† Term in progress — partial roster.'}
        </p>
      )}
    </div>
  )
}

export default AdminSurvivorsSlope
