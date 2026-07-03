/**
 * ArqueoMesa — «La Mesa del Arqueo» / "The Counting Table" — the WHO
 * Marimekko hero for the /sectors redesign (Act I).
 *
 * Named precedent: FT Visual Vocabulary Marimekko/mosaic (two variables —
 * size AND proportion — in one part-to-whole geometry), NYT Upshot federal
 * spending "area = money" discipline, Reuters *Forever Pollution* annotation
 * discipline (exactly two named callouts, computed).
 *
 * One full-width rectangle = the entire till. Twelve vertical slices, width
 * proportional to each sector's total spend. Inside each slice a fine 45°
 * ink hatch rises from the baseline to the sector's own-spend saturation
 * (ownSpendShare); a denser hatch (critical-only) rises to the critical
 * share. Because width × hatch-height = flagged pesos, the hatched AREA of
 * each column IS the flagged value — no separate bar, no dot, no circle.
 *
 * Pure SVG, ResizeObserver-driven width (like CategorySectorSwimlane), no
 * recharts. Self-contained: no shared chart primitives, no dots.
 *
 * Spec: docs/../.claude/designs/sectors-fable-2026-07-02-spec.md
 *   §2.1 Act I «La Mesa del Arqueo» + §3 NEW 1 — ArqueoMesa.tsx
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LedgerRow } from './ExposureLedger'
import { ownSpendShare } from './confoundScales'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { PlateFrame } from '@/components/atlas/PlateFrame'

interface ArqueoMesaProps {
  rows: LedgerRow[]
  lang: 'en' | 'es'
}

// ── Geometry constants ──────────────────────────────────────────────────────
const READOUT_H = 20
const BAND_H = 300
const STRIP_H = 4
const LABEL_H = 18
const GUTTER_W = 34
const RIGHT_PAD = 8
const MIN_COL_W = 3
const NARROW_LABEL_THRESHOLD = 48
const MOBILE_BREAKPOINT = 768
const MOBILE_ROW_MIN_H = 18

const OCHRE_STRONG = 'rgba(160, 104, 32, 0.7)'
const OCHRE_FAINT = 'rgba(160, 104, 32, 0.35)'

function sectorFill(code: string): string {
  return SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
}
function sectorText(code: string): string {
  return SECTOR_TEXT_COLORS[code] ?? SECTOR_TEXT_COLORS.otros ?? '#475569'
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫']

// ── Component ────────────────────────────────────────────────────────────────
export function ArqueoMesa({ rows, lang }: ArqueoMesaProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [isMobile, setIsMobile] = useState(false)
  const [hoverId, setHoverId] = useState<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) {
        setWidth(w)
        setIsMobile(w < MOBILE_BREAKPOINT)
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Spend-descending order (columns/rows).
  const ordered = useMemo(() => [...rows].sort((a, b) => b.totalMxn - a.totalMxn), [rows])
  const totalSpend = useMemo(() => ordered.reduce((acc, r) => acc + r.totalMxn, 0), [ordered])
  const totalVar = useMemo(() => ordered.reduce((acc, r) => acc + r.varMxn, 0), [ordered])
  const overallSharePct = totalSpend > 0 ? (totalVar / totalSpend) * 100 : 0
  // Share of contracts that ARE the flagged (high+critical) ones — the count
  // denominator behind the flagged VALUE. Pairs honestly with overallSharePct
  // (55.9% of value) and matches the page's Fe de arqueo countPct (~10.9%).
  const overallFlaggedRate = useMemo(() => {
    const contracts = ordered.reduce((acc, r) => acc + r.contracts, 0)
    const flagged = ordered.reduce((acc, r) => acc + (r.highCount ?? 0) + r.criticalCount, 0)
    return contracts > 0 ? (flagged / contracts) * 100 : 0
  }, [ordered])

  // Widest column (largest spend) and tallest-hatch column (largest own-spend share) — argmax, computed.
  const widest = useMemo(() => ordered.reduce((a, b) => (b.totalMxn > (a?.totalMxn ?? -Infinity) ? b : a), ordered[0]), [ordered])
  const tallest = useMemo(
    () => ordered.reduce((a, b) => (ownSpendShare(b) > ownSpendShare(a ?? b) ? b : a), ordered[0]),
    [ordered],
  )

  // Narrow columns (below label threshold at current width) → circled-number legend.
  const bandW = Math.max(0, width - GUTTER_W - RIGHT_PAD)
  const colWidths = useMemo(() => {
    if (totalSpend <= 0) return ordered.map(() => 0)
    return ordered.map((r) => Math.max(MIN_COL_W, (r.totalMxn / totalSpend) * bandW))
  }, [ordered, totalSpend, bandW])

  const narrowSet = useMemo(
    () => ordered.map((r, i) => ({ row: r, w: colWidths[i] })).filter((d) => d.w < NARROW_LABEL_THRESHOLD),
    [ordered, colWidths],
  )

  const readoutText = useMemo(() => {
    if (!hoverId) {
      return lang === 'es'
        ? 'pase el cursor por una columna · clic → dossier del sector'
        : 'hover a column · click → sector dossier'
    }
    const r = ordered.find((x) => x.sectorId === hoverId)
    if (!r) return ''
    const share = ownSpendShare(r) * 100
    const criticalPct = r.totalMxn > 0 ? (r.criticalMxn / r.totalMxn) * 100 : 0
    return lang === 'es'
      ? `${r.name} · total ${formatCompactMXN(r.totalMxn)} · observado ${formatCompactMXN(r.varMxn)} (${share.toFixed(0)}%) · crítico ${criticalPct.toFixed(0)}% · AD ${r.daPct.toFixed(0)}%`
      : `${r.name} · total ${formatCompactMXN(r.totalMxn)} · flagged ${formatCompactMXN(r.varMxn)} (${share.toFixed(0)}%) · critical ${criticalPct.toFixed(0)}% · DA ${r.daPct.toFixed(0)}%`
  }, [hoverId, ordered, lang])

  const goToSector = useCallback((sectorId: number) => navigate(`/sectors/${sectorId}`), [navigate])

  const caption =
    lang === 'es'
      ? `Lámina — La mesa completa: el ancho de cada columna es el gasto del sector; el achurado sube hasta la parte observada de su propio gasto. El área achurada son los pesos observados — ${overallSharePct.toFixed(1)}% de la mesa. Achurado denso = solo crítico. La bandera de ½ marca la mitad del gasto propio.`
      : `Plate — The whole table: each column's width is the sector's spend; the hatch rises to the flagged share of its own spend. Hatched area is flagged pesos — ${overallSharePct.toFixed(1)}% of the table. Dense hatch = critical only. The ½ flag marks half of own spend.`

  const headline =
    lang === 'es' ? (
      <>
        El modelo observa <strong style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCompactMXN(totalVar)} de {formatCompactMXN(totalSpend)}</strong> sobre la mesa — el {overallSharePct.toFixed(1)}% del valor, cargado por apenas el {overallFlaggedRate.toFixed(0)}% de los contratos.
      </>
    ) : (
      <>
        The model flags <strong style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCompactMXN(totalVar)} of {formatCompactMXN(totalSpend)}</strong> on the table — {overallSharePct.toFixed(1)}% of value, carried by just {overallFlaggedRate.toFixed(0)}% of contracts.
      </>
    )

  return (
    <div ref={containerRef} className="w-full">
      <p
        className="font-mono mb-1"
        style={{ fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
      >
        {lang === 'es' ? '§ LA MESA DEL ARQUEO · DOCE SECTORES, UN SOLO CORTE' : '§ THE COUNTING TABLE · TWELVE SECTORS, ONE COUNT'}
      </p>
      <h2
        className="mb-4"
        style={{
          fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
          fontWeight: 700,
          fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
          lineHeight: 1.3,
          color: 'var(--color-text-primary)',
        }}
      >
        {headline}
      </h2>

      <PlateFrame
        lang={lang}
        folio="II·a"
        contextLabel={{ en: 'The counting table', es: 'La mesa del arqueo' }}
        caption={caption}
      >
        {isMobile ? (
          <MobileMesa rows={ordered} lang={lang} onSelect={goToSector} readoutText={readoutText} hoverId={hoverId} setHoverId={setHoverId} />
        ) : (
          <DesktopMesa
            rows={ordered}
            colWidths={colWidths}
            width={width}
            lang={lang}
            hoverId={hoverId}
            setHoverId={setHoverId}
            onSelect={goToSector}
            readoutText={readoutText}
            widest={widest}
            tallest={tallest}
            narrowSet={narrowSet}
          />
        )}
      </PlateFrame>
    </div>
  )
}

// ── Desktop Marimekko ────────────────────────────────────────────────────────
function DesktopMesa({
  rows,
  colWidths,
  width,
  lang,
  hoverId,
  setHoverId,
  onSelect,
  readoutText,
  widest,
  tallest,
  narrowSet,
}: {
  rows: LedgerRow[]
  colWidths: number[]
  width: number
  lang: 'en' | 'es'
  hoverId: number | null
  setHoverId: (id: number | null) => void
  onSelect: (sectorId: number) => void
  readoutText: string
  widest: LedgerRow
  tallest: LedgerRow
  narrowSet: { row: LedgerRow; w: number }[]
}) {
  const bandW = Math.max(0, width - GUTTER_W - RIGHT_PAD)
  const yTicks = [0, 25, 50, 75, 100]
  const patternId = 'arqueo-fine'
  const denseId = 'arqueo-dense'

  // x-offsets per column
  const xOffsets: number[] = []
  {
    let acc = GUTTER_W
    for (const w of colWidths) {
      xOffsets.push(acc)
      acc += w
    }
  }

  // Waterline points (stepped): top of fine hatch per column.
  const waterlinePoints = rows
    .map((r, i) => {
      const share = ownSpendShare(r)
      const x0 = xOffsets[i]
      const x1 = xOffsets[i] + colWidths[i]
      const y = READOUT_H + BAND_H * (1 - share)
      return `${x0.toFixed(1)},${y.toFixed(1)} ${x1.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const legendLine =
    narrowSet.length > 0
      ? narrowSet
          .map((d, i) => `${CIRCLED[i] ?? '·'} ${d.row.name} ${(ownSpendShare(d.row) * 100).toFixed(0)}%`)
          .join(' · ')
      : ''

  return (
    <div>
      {/* Fixed readout strip — hover data on the left, persistent axis label on the right */}
      <div
        className="font-mono tabular-nums"
        style={{ height: READOUT_H, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{readoutText}</span>
        <span style={{ flexShrink: 0, fontSize: 8, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          {lang === 'es' ? '% del gasto propio observado' : '% of own spend flagged'}
        </span>
      </div>

      <svg width={width} height={BAND_H + STRIP_H + LABEL_H} style={{ display: 'block', overflow: 'visible' }} role="img"
        aria-label={lang === 'es' ? 'Mosaico Marimekko: ancho por gasto sectorial, achurado por saturación observada' : 'Marimekko mosaic: width by sector spend, hatch by flagged saturation'}
      >
        <defs>
          <pattern id={patternId} width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1={0} y1={0} x2={0} y2={4} stroke="var(--color-text-primary)" strokeOpacity={0.38} strokeWidth={1} />
          </pattern>
          <pattern id={denseId} width={2} height={2} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1={0} y1={0} x2={0} y2={2} stroke="var(--color-text-primary)" strokeOpacity={0.5} strokeWidth={1} />
          </pattern>
        </defs>

        {/* y-axis ticks + label */}
        {yTicks.map((t) => (
          <g key={t}>
            <text
              x={GUTTER_W - 6}
              y={BAND_H * (1 - t / 100) + 3}
              textAnchor="end"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={8.5}
              fill="var(--color-text-muted)"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Columns */}
        {rows.map((r, i) => {
          const x = xOffsets[i]
          const w = colWidths[i]
          const share = ownSpendShare(r)
          const critShare = r.totalMxn > 0 ? Math.max(0, Math.min(1, r.criticalMxn / r.totalMxn)) : 0
          const hatchY = BAND_H * (1 - share)
          const denseY = BAND_H * (1 - critShare)
          const isHover = hoverId === r.sectorId
          const isDimmed = hoverId !== null && !isHover
          const fill = sectorFill(r.sectorCode)
          const text = sectorText(r.sectorCode)
          const showLabel = w >= NARROW_LABEL_THRESHOLD
          const narrowIdx = narrowSet.findIndex((d) => d.row.sectorId === r.sectorId)

          const ariaLabel =
            lang === 'es'
              ? `${r.name} — ${formatCompactMXN(r.totalMxn)} de gasto, ${formatCompactMXN(r.varMxn)} observado (${(share * 100).toFixed(0)}% del gasto propio)`
              : `${r.name} — ${formatCompactMXN(r.totalMxn)} spend, ${formatCompactMXN(r.varMxn)} flagged (${(share * 100).toFixed(0)}% of own spend)`

          return (
            <g key={r.sectorId}>
              {/* separator */}
              {i > 0 && <line x1={x} y1={0} x2={x} y2={BAND_H} stroke="var(--color-border)" strokeWidth={1} />}

              {/* fine hatch (own-spend share) */}
              <rect
                x={x}
                y={hatchY}
                width={w}
                height={BAND_H - hatchY}
                fill={`url(#${patternId})`}
                opacity={isHover ? 1.3 : isDimmed ? 0.55 : 1}
              />
              {/* dense hatch (critical-only), layered on top */}
              {critShare > 0 && (
                <rect
                  x={x}
                  y={denseY}
                  width={w}
                  height={BAND_H - denseY}
                  fill={`url(#${denseId})`}
                  opacity={isHover ? 1.3 : isDimmed ? 0.55 : 1}
                />
              )}

              {/* sector baseline strip */}
              <rect x={x} y={BAND_H} width={w} height={STRIP_H} fill={fill} opacity={isDimmed ? 0.55 : 1} />

              {/* label or circled tick */}
              {showLabel ? (
                <text
                  x={x + w / 2}
                  y={BAND_H + STRIP_H + 12}
                  textAnchor="middle"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={13}
                  letterSpacing="0.04em"
                  fill={text}
                  style={{ textTransform: 'uppercase' }}
                >
                  {r.name}
                </text>
              ) : (
                <text
                  x={x + w / 2}
                  y={BAND_H + STRIP_H + 12}
                  textAnchor="middle"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={13}
                  fill="var(--color-text-muted)"
                >
                  {CIRCLED[narrowIdx] ?? '·'}
                </text>
              )}

              {/* hit target */}
              <rect
                x={x}
                y={0}
                width={Math.max(w, 8)}
                height={BAND_H}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={ariaLabel}
                style={{ cursor: 'pointer', outline: 'none' }}
                onMouseEnter={() => setHoverId(r.sectorId)}
                onFocus={() => setHoverId(r.sectorId)}
                onMouseLeave={() => setHoverId(null)}
                onBlur={() => setHoverId(null)}
                onClick={() => onSelect(r.sectorId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(r.sectorId)
                  }
                }}
              />
            </g>
          )
        })}

        {/* Ruled flags */}
        <line x1={GUTTER_W} y1={BAND_H * 0.5} x2={GUTTER_W + bandW} y2={BAND_H * 0.5} stroke={OCHRE_STRONG} strokeWidth={1} />
        <text x={GUTTER_W + 4} y={BAND_H * 0.5 - 4} fontFamily="'EB Garamond', Georgia, serif" fontStyle="normal" fontSize={12} fill={OCHRE_STRONG}>
          ½
        </text>
        <text x={GUTTER_W + 16} y={BAND_H * 0.5 - 4} fontFamily="'IBM Plex Mono', monospace" fontSize={8.5} fill={OCHRE_STRONG}>
          {lang === 'es' ? 'gasto propio' : 'own spend'}
        </text>

        <line x1={GUTTER_W} y1={BAND_H * 0.2} x2={GUTTER_W + bandW} y2={BAND_H * 0.2} stroke={OCHRE_FAINT} strokeWidth={1} />
        <text x={GUTTER_W + 4} y={BAND_H * 0.2 - 4} fontFamily="'IBM Plex Mono', monospace" fontSize={8.5} fill={OCHRE_FAINT}>
          80%
        </text>

        {/* Waterline */}
        <polyline points={waterlinePoints} fill="none" stroke={RISK_COLORS.critical} strokeWidth={1.5} />

        {/* Two computed annotations */}
        <AnnotationWidest row={widest} xOffsets={xOffsets} colWidths={colWidths} rows={rows} lang={lang} />
        <AnnotationTallest row={tallest} xOffsets={xOffsets} colWidths={colWidths} rows={rows} lang={lang} />
      </svg>

      {legendLine && (
        <p className="mt-2 font-mono" style={{ fontSize: 13, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
          {legendLine}
        </p>
      )}
    </div>
  )
}

// ── Annotations (Reuters discipline: exactly two, computed, argmax) ────────
function AnnotationWidest({
  row,
  xOffsets,
  colWidths,
  rows,
  lang,
}: {
  row: LedgerRow
  xOffsets: number[]
  colWidths: number[]
  rows: LedgerRow[]
  lang: 'en' | 'es'
}) {
  const idx = rows.findIndex((r) => r.sectorId === row.sectorId)
  if (idx < 0) return null
  const x = xOffsets[idx] + colWidths[idx] / 2
  const y = 30
  const label =
    lang === 'es'
      ? `mayor volumen — ${row.name} · ${formatCompactMXN(row.totalMxn)} observado ${formatCompactMXN(row.varMxn)}`
      : `largest volume — ${row.name} · ${formatCompactMXN(row.varMxn)} of ${formatCompactMXN(row.totalMxn)} flagged`
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 10} stroke="var(--color-text-muted)" strokeWidth={0.8} />
      <text
        x={x}
        y={y - 2}
        textAnchor="middle"
        fontFamily="'IBM Plex Mono', monospace"
        fontStyle="normal"
        fontSize={8.5}
        fill="var(--color-text-secondary)"
      >
        {label}
      </text>
    </g>
  )
}

function AnnotationTallest({
  row,
  xOffsets,
  colWidths,
  rows,
  lang,
}: {
  row: LedgerRow
  xOffsets: number[]
  colWidths: number[]
  rows: LedgerRow[]
  lang: 'en' | 'es'
}) {
  const idx = rows.findIndex((r) => r.sectorId === row.sectorId)
  if (idx < 0) return null
  const share = ownSpendShare(row)
  const x = xOffsets[idx] + colWidths[idx] / 2
  const yTop = READOUT_H + BAND_H * (1 - share)
  const labelY = Math.max(READOUT_H + 10, yTop - 14)
  const pct = (share * 100).toFixed(0)
  const label =
    lang === 'es'
      ? `mayor saturación — ${row.name} · ${pct}% de su propio gasto`
      : `highest saturation — ${row.name} · ${pct}% of its own spend`
  return (
    <g>
      <line x1={x} y1={labelY + 2} x2={x} y2={yTop} stroke="var(--color-text-muted)" strokeWidth={0.8} />
      <text
        x={x}
        y={labelY - 2}
        textAnchor="middle"
        fontFamily="'IBM Plex Mono', monospace"
        fontStyle="normal"
        fontSize={8.5}
        fill="var(--color-text-secondary)"
      >
        {label}
      </text>
    </g>
  )
}

// ── Mobile rotated mesa ──────────────────────────────────────────────────────
function MobileMesa({
  rows,
  lang,
  onSelect,
  readoutText,
  hoverId,
  setHoverId,
}: {
  rows: LedgerRow[]
  lang: 'en' | 'es'
  onSelect: (sectorId: number) => void
  readoutText: string
  hoverId: number | null
  setHoverId: (id: number | null) => void
}) {
  const totalSpend = rows.reduce((acc, r) => acc + r.totalMxn, 0)
  const rowW = 280
  const rows2 = rows.map((r) => {
    const spendShare = totalSpend > 0 ? r.totalMxn / totalSpend : 0
    const h = Math.max(MOBILE_ROW_MIN_H, spendShare * 440)
    return { row: r, h, spendShare }
  })
  const narrowSet = rows2

  return (
    <div>
      <div
        className="font-mono tabular-nums mb-2"
        style={{ height: READOUT_H, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}
      >
        {readoutText}
      </div>
      <div>
        {rows2.map(({ row, h, spendShare }) => {
          const share = ownSpendShare(row)
          const isHover = hoverId === row.sectorId
          const fill = sectorFill(row.sectorCode)
          const ariaLabel =
            lang === 'es'
              ? `${row.name} — ${formatCompactMXN(row.totalMxn)} de gasto, ${formatCompactMXN(row.varMxn)} observado (${(share * 100).toFixed(0)}% del gasto propio)`
              : `${row.name} — ${formatCompactMXN(row.totalMxn)} spend, ${formatCompactMXN(row.varMxn)} flagged (${(share * 100).toFixed(0)}% of own spend)`
          return (
            <div
              key={row.sectorId}
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              style={{ height: h, position: 'relative', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
              onClick={() => onSelect(row.sectorId)}
              onMouseEnter={() => setHoverId(row.sectorId)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(row.sectorId)}
              onBlur={() => setHoverId(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(row.sectorId)
                }
              }}
            >
              <svg width="100%" height={h} style={{ display: 'block' }} preserveAspectRatio="none" viewBox={`0 0 ${rowW} ${h}`}>
                <defs>
                  <pattern id={`arqueo-m-fine-${row.sectorId}`} width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1={0} y1={0} x2={0} y2={4} stroke="var(--color-text-primary)" strokeOpacity={0.38} strokeWidth={1} />
                  </pattern>
                </defs>
                <rect x={0} y={0} width={rowW * share} height={h} fill={`url(#arqueo-m-fine-${row.sectorId})`} opacity={isHover ? 1.3 : 1} />
                {/* ½ vertical rule */}
                <line x1={rowW * 0.5} y1={0} x2={rowW * 0.5} y2={h} stroke={OCHRE_STRONG} strokeWidth={1} />
                <rect x={0} y={0} width={3} height={h} fill={fill} />
              </svg>
              <span
                className="absolute"
                style={{
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                }}
              >
                {row.name} · {(share * 100).toFixed(0)}%
              </span>
              <span
                className="absolute font-mono"
                style={{ right: 6, top: 2, fontSize: 8, color: 'var(--color-text-muted)' }}
              >
                {(spendShare * 100).toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
      {narrowSet.length > 0 && (
        <p className="mt-2 font-mono" style={{ fontSize: 13, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
          {narrowSet
            .map(({ row }, i) => `${CIRCLED[i] ?? '·'} ${row.name} ${(ownSpendShare(row) * 100).toFixed(0)}%`)
            .join(' · ')}
        </p>
      )}
    </div>
  )
}
