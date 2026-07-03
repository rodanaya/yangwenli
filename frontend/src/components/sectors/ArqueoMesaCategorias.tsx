/**
 * ArqueoMesaCategorias — WHAT-view Marimekko hero, "La Mesa · por categoría"
 *
 * Same band geometry as its WHO sibling ArqueoMesa.tsx, but a different
 * y-semantic: hatch height is a MEAN-RISK INDICATOR (avg_risk × 100), not a
 * spend share. Width is still money (total_value).
 *
 * Slices: top 14 categories by total_value + one aggregated remainder column
 * (the other 58). Rule at RISK_THRESHOLDS.medium (25%), amber, dashed —
 * the model's medium floor, never an OECD line. Waterline colored per column
 * by getRiskLevelFromScore (low -> muted, never green).
 *
 * Pure SVG. No <circle>, no dots, no d3-force. Bilingual inline ternaries.
 *
 * Named precedent: FT Visual Vocabulary Marimekko (see
 * docs/designs/sectors-fable-2026-07-02-spec.md §2.2 Act I / §3 NEW 2).
 */

import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SECTOR_COLORS,
  SECTOR_TEXT_COLORS,
  RISK_COLORS,
  RISK_THRESHOLDS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { PlateFrame } from '@/components/atlas/PlateFrame'

// ── Types ────────────────────────────────────────────────────────────────

interface MesaCategory {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number | null
  sector_code: string | null
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
}

interface ArqueoMesaCategoriasProps {
  categories: MesaCategory[]
  lang: 'en' | 'es'
}

interface Column {
  key: string
  category_id: number | null // null = remainder (not clickable)
  name_es: string
  name_en: string
  sector_code: string | null
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  isRemainder: boolean
}

// ── Constants ────────────────────────────────────────────────────────────

const BAND_H = 300
const LEFT_GUTTER = 34
const RIGHT_PAD = 8
const READOUT_H = 20
const STRIP_H = 4
const LABEL_H = 18
const LEGEND_H = 16
const MIN_LABEL_W = 56
const TOP_N = 14

const RISK_LEVEL_COLOR: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'var(--color-text-muted)',
  medium: RISK_COLORS.medium,
  high: RISK_COLORS.high,
  critical: RISK_COLORS.critical,
}

function snap5Up(v: number): number {
  return Math.ceil(v / 5) * 5
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// ── Component ────────────────────────────────────────────────────────────

export function ArqueoMesaCategorias({ categories, lang }: ArqueoMesaCategoriasProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const uid = useId()

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = width < 768

  // Top 14 + remainder column
  const columns: Column[] = useMemo(() => {
    if (!categories.length) return []
    const sorted = [...categories].sort((a, b) => b.total_value - a.total_value)
    const top = sorted.slice(0, TOP_N)
    const tail = sorted.slice(TOP_N)

    const topCols: Column[] = top.map(c => ({
      key: `cat-${c.category_id}`,
      category_id: c.category_id,
      name_es: c.name_es,
      name_en: c.name_en,
      sector_code: c.sector_code,
      total_value: c.total_value,
      avg_risk: c.avg_risk,
      direct_award_pct: c.direct_award_pct,
      single_bid_pct: c.single_bid_pct,
      isRemainder: false,
    }))

    if (tail.length) {
      const tailValueSum = tail.reduce((s, c) => s + c.total_value, 0)
      const weightedRiskSum = tail.reduce((s, c) => s + c.avg_risk * c.total_value, 0)
      const tailAvgRisk = tailValueSum > 0 ? weightedRiskSum / tailValueSum : 0
      const tailDaSum = tail.reduce((s, c) => s + c.direct_award_pct * c.total_value, 0)
      const tailSbSum = tail.reduce((s, c) => s + c.single_bid_pct * c.total_value, 0)
      topCols.push({
        key: 'remainder',
        category_id: null,
        name_es: `las otras ${tail.length}`,
        name_en: `the other ${tail.length}`,
        sector_code: 'otros',
        total_value: tailValueSum,
        avg_risk: tailAvgRisk,
        direct_award_pct: tailValueSum > 0 ? tailDaSum / tailValueSum : 0,
        single_bid_pct: tailValueSum > 0 ? tailSbSum / tailValueSum : 0,
        isRemainder: true,
      })
    }

    return topCols
  }, [categories])

  const totalValue = useMemo(() => columns.reduce((s, c) => s + c.total_value, 0), [columns])

  // y-domain: 0..max(50, snap5(maxRisk*100*1.08))
  const domainMax = useMemo(() => {
    if (!columns.length) return 50
    const maxRisk = Math.max(...columns.map(c => c.avg_risk))
    return Math.max(50, snap5Up(maxRisk * 100 * 1.08))
  }, [columns])

  const axisTicks = useMemo(() => {
    const out: number[] = []
    for (let t = 0; t <= domainMax; t += 10) out.push(t)
    return out
  }, [domainMax])

  const bandW = Math.max(0, width - LEFT_GUTTER - RIGHT_PAD)

  const yFor = useCallback((riskPct: number) => BAND_H - (riskPct / domainMax) * BAND_H, [domainMax])

  const mediumRuleY = yFor(RISK_THRESHOLDS.medium * 100)

  // Column x-positions (desktop) / heights (mobile)
  const laidOut = useMemo(() => {
    let cursor = 0
    return columns.map(col => {
      const w = totalValue > 0 ? (col.total_value / totalValue) * bandW : 0
      const x = cursor
      cursor += w
      return { col, x, w }
    })
  }, [columns, totalValue, bandW])

  // Narrow columns (< MIN_LABEL_W) get circled-number ticks + legend
  const narrowSet = useMemo(
    () => laidOut.filter(({ w }) => w < MIN_LABEL_W && w >= 3),
    [laidOut]
  )

  // Two computed annotations: tallest hatch + big-and-hot
  const tallest = useMemo(
    () => {
      // Exclude the aggregate remainder — annotations must name a real, clickable category.
      const real = columns.filter(c => !c.isRemainder)
      return real.length ? [...real].sort((a, b) => b.avg_risk - a.avg_risk)[0] : null
    },
    [columns]
  )
  const bigAndHot = useMemo(() => {
    // Real categories only (never "the other N" aggregate) at/above the medium rule.
    const eligible = columns.filter(c => !c.isRemainder && c.avg_risk >= RISK_THRESHOLDS.medium)
    if (!eligible.length) return null
    return [...eligible].sort((a, b) => b.total_value - a.total_value)[0]
  }, [columns])

  // Dagger: max direct_award_pct among top-14 (exclude remainder)
  const daggerCol = useMemo(() => {
    const top14 = columns.filter(c => !c.isRemainder)
    if (!top14.length) return null
    return [...top14].sort((a, b) => b.direct_award_pct - a.direct_award_pct)[0]
  }, [columns])

  const handleClick = useCallback(
    (col: Column) => {
      if (col.isRemainder || col.category_id === null) return
      navigate(`/categories/${col.category_id}`)
    },
    [navigate]
  )

  const hoveredCol = laidOut.find(({ col }) => col.key === hoveredKey)?.col ?? null

  const readoutText = hoveredCol
    ? lang === 'es'
      ? `${hoveredCol.name_es} · ${formatCompactMXN(hoveredCol.total_value)} · riesgo ${(hoveredCol.avg_risk * 100).toFixed(1)}% · AD ${hoveredCol.direct_award_pct.toFixed(0)}% · un postor ${hoveredCol.single_bid_pct.toFixed(0)}%`
      : `${hoveredCol.name_en} · ${formatCompactMXN(hoveredCol.total_value)} · risk ${(hoveredCol.avg_risk * 100).toFixed(1)}% · AD ${hoveredCol.direct_award_pct.toFixed(0)}% · single bid ${hoveredCol.single_bid_pct.toFixed(0)}%`
    : lang === 'es'
      ? 'pase el cursor por una columna · clic → dossier de la categoría'
      : 'hover a column · click → category dossier'

  const totalHeightDesktop = READOUT_H + BAND_H + STRIP_H + LABEL_H + LEGEND_H

  const caption =
    lang === 'en'
      ? 'Plate — The 14 largest categories plus the rest of the catalog: width is money; the hatch rises with mean risk (a model indicator, not a spend share). The 25% rule is the model’s medium threshold.'
      : 'Lámina — Las 14 categorías de mayor gasto más el resto del catálogo: el ancho es el dinero; el achurado sube con el riesgo promedio (indicador del modelo, no proporción del gasto). La regla de 25% es el umbral medio del modelo.'

  return (
    <PlateFrame
      folio="II·c"
      contextLabel={{ en: 'The table, by category', es: 'La mesa, por categoría' }}
      caption={caption}
      lang={lang}
    >
      <div className="w-full">
        <div className="mb-1">
          <span
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 13,
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {lang === 'es'
              ? '§ LA MESA · POR CATEGORÍA · ANCHO = GASTO, ALTURA = RIESGO'
              : '§ THE TABLE · BY CATEGORY · WIDTH = SPEND, HEIGHT = RISK'}
          </span>
        </div>

        <div ref={containerRef} className="relative w-full">
          {/* Hover readout strip — hover data on the left, persistent axis label on the right */}
          <div
            style={{
              height: READOUT_H,
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 12,
              color: 'var(--color-text-secondary, var(--color-text-muted))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{readoutText}</span>
            <span style={{ flexShrink: 0, fontSize: 8, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              {lang === 'es' ? `riesgo promedio · indicador 0–${domainMax}%` : `mean risk · indicator 0–${domainMax}%`}
            </span>
          </div>

          {!isMobile ? (
            <svg
              width={width}
              height={BAND_H + LABEL_H}
              style={{ display: 'block', overflow: 'visible' }}
              role="img"
              aria-label={
                lang === 'es'
                  ? 'Mesa Marimekko: categorías por gasto y riesgo promedio'
                  : 'Marimekko table: categories by spend and mean risk'
              }
            >
              <defs>
                {laidOut.map(({ col }) => (
                  <pattern
                    key={`hatch-${col.key}`}
                    id={`hatch-${uid}-${col.key}`}
                    patternUnits="userSpaceOnUse"
                    width={4}
                    height={4}
                    patternTransform="rotate(45)"
                  >
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={4}
                      stroke="var(--color-text-primary)"
                      strokeOpacity={0.38}
                      strokeWidth={1}
                    />
                  </pattern>
                ))}
              </defs>

              {/* y-axis ticks */}
              {axisTicks.map(tick => {
                const ty = LEFT_GUTTER ? yFor(tick) : 0
                return (
                  <g key={`tick-${tick}`}>
                    <line
                      x1={LEFT_GUTTER}
                      y1={ty}
                      x2={width - RIGHT_PAD}
                      y2={ty}
                      stroke="currentColor"
                      strokeOpacity={0.06}
                      strokeWidth={1}
                    />
                    <text
                      x={LEFT_GUTTER - 4}
                      y={ty}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={8.5}
                      fontFamily="var(--font-family-mono, monospace)"
                      fill="currentColor"
                      fillOpacity={0.4}
                    >
                      {tick}
                    </text>
                  </g>
                )
              })}


              {/* columns */}
              {laidOut.map(({ col, x, w }) => {
                const hatchTop = yFor(col.avg_risk * 100)
                const level = getRiskLevelFromScore(col.avg_risk)
                const waterColor = RISK_LEVEL_COLOR[level]
                const color = SECTOR_COLORS[col.sector_code ?? 'otros'] ?? '#64748b'
                const textColor = SECTOR_TEXT_COLORS[col.sector_code ?? 'otros'] ?? color
                const isHovered = hoveredKey === col.key
                const isDimmed = hoveredKey !== null && !isHovered
                const name = lang === 'es' ? col.name_es : col.name_en
                const showLabel = w >= MIN_LABEL_W

                return (
                  <g key={col.key}>
                    {/* fine hatch fill */}
                    <rect
                      x={x}
                      y={hatchTop}
                      width={Math.max(0, w - 1)}
                      height={Math.max(0, BAND_H - hatchTop)}
                      fill={`url(#hatch-${uid}-${col.key})`}
                      opacity={isHovered ? 1.3 : isDimmed ? 0.55 : 1}
                    />
                    {/* transparent hit area + interactivity */}
                    <rect
                      x={x}
                      y={0}
                      width={Math.max(0, w - 1)}
                      height={BAND_H}
                      fill="transparent"
                      style={{ cursor: col.isRemainder ? 'default' : 'pointer' }}
                      tabIndex={0}
                      role="button"
                      aria-label={
                        col.isRemainder
                          ? lang === 'es'
                            ? 'agregado — sin dossier'
                            : 'aggregate — no dossier'
                          : lang === 'es'
                            ? `${col.name_es} — ${formatCompactMXN(col.total_value)}, riesgo ${(col.avg_risk * 100).toFixed(1)}%`
                            : `${col.name_en} — ${formatCompactMXN(col.total_value)}, risk ${(col.avg_risk * 100).toFixed(1)}%`
                      }
                      onMouseEnter={() => setHoveredKey(col.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      onFocus={() => setHoveredKey(col.key)}
                      onBlur={() => setHoveredKey(null)}
                      onClick={() => handleClick(col)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') handleClick(col)
                      }}
                    />
                    {/* waterline */}
                    <line
                      x1={x}
                      y1={hatchTop}
                      x2={x + Math.max(0, w - 1)}
                      y2={hatchTop}
                      stroke={waterColor}
                      strokeWidth={1.5}
                    />
                    {/* separator */}
                    <line
                      x1={x + w}
                      y1={0}
                      x2={x + w}
                      y2={BAND_H}
                      stroke="var(--color-border)"
                      strokeWidth={1}
                    />
                    {/* baseline sector strip */}
                    <rect
                      x={x}
                      y={BAND_H}
                      width={Math.max(0, w - 1)}
                      height={STRIP_H}
                      fill={color}
                    />
                    {/* label */}
                    {showLabel && (
                      <text
                        x={x + w / 2}
                        y={BAND_H + STRIP_H + 12}
                        textAnchor="middle"
                        fontSize={8.5}
                        fontFamily="var(--font-family-mono, monospace)"
                        fill={textColor}
                      >
                        {truncate(name, 16)}
                      </text>
                    )}
                    {/* dagger */}
                    {daggerCol && col.key === daggerCol.key && (
                      <text
                        x={x + 3}
                        y={12}
                        fontSize={12}
                        fontFamily="var(--font-family-mono, monospace)"
                        fill="var(--color-text-muted)"
                      >
                        †
                      </text>
                    )}
                  </g>
                )
              })}

              {/* circled-number ticks for narrow columns */}
              {narrowSet.map(({ col, x, w }, idx) => (
                <text
                  key={`narrow-${col.key}`}
                  x={x + w / 2}
                  y={BAND_H + STRIP_H + 12}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                >
                  {String.fromCharCode(9312 + Math.min(idx, 19))}
                </text>
              ))}

              {/* medium threshold rule */}
              <line
                x1={LEFT_GUTTER}
                y1={mediumRuleY}
                x2={width - RIGHT_PAD}
                y2={mediumRuleY}
                stroke={RISK_COLORS.high}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                strokeOpacity={0.85}
              />
              <text
                x={width - RIGHT_PAD}
                y={mediumRuleY - 4}
                textAnchor="end"
                fontSize={8}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight={700}
                fill={RISK_COLORS.high}
                letterSpacing="0.05em"
              >
                {lang === 'es' ? 'UMBRAL MEDIO · 25% (modelo)' : 'MEDIUM THRESHOLD · 25% (model)'}
              </text>

              {/* annotations: tallest + big-and-hot */}
              {tallest && (() => {
                const found = laidOut.find(({ col }) => col.key === tallest.key)
                if (!found) return null
                const name = lang === 'es' ? tallest.name_es : tallest.name_en
                const ty = yFor(tallest.avg_risk * 100)
                return (
                  <g pointerEvents="none">
                    <line
                      x1={found.x + found.w / 2}
                      y1={ty}
                      x2={found.x + found.w / 2}
                      y2={Math.max(0, ty - 14)}
                      stroke="var(--color-text-muted)"
                      strokeWidth={0.8}
                      strokeOpacity={0.7}
                    />
                    <text
                      x={found.x + found.w / 2}
                      y={Math.max(9, ty - 16)}
                      textAnchor="middle"
                      fontSize={8.5}
                      fontStyle="normal"
                      fontFamily="var(--font-family-mono, monospace)"
                      fill="var(--color-text-secondary, var(--color-text-muted))"
                    >
                      {lang === 'es'
                        ? `mayor riesgo — ${name} · ${(tallest.avg_risk * 100).toFixed(1)}%`
                        : `highest risk — ${name} · ${(tallest.avg_risk * 100).toFixed(1)}%`}
                    </text>
                  </g>
                )
              })()}
              {bigAndHot && (() => {
                const found = laidOut.find(({ col }) => col.key === bigAndHot.key)
                if (!found) return null
                const name = lang === 'es' ? bigAndHot.name_es : bigAndHot.name_en
                const ty = yFor(bigAndHot.avg_risk * 100)
                return (
                  <g pointerEvents="none">
                    <text
                      x={found.x + Math.min(8, found.w / 2)}
                      y={Math.max(24, ty + 14)}
                      textAnchor="start"
                      fontSize={8.5}
                      fontStyle="normal"
                      fontFamily="var(--font-family-mono, monospace)"
                      fill="var(--color-text-secondary, var(--color-text-muted))"
                    >
                      {lang === 'es'
                        ? `grande y caliente — ${name}`
                        : `big and hot — ${name}`}
                    </text>
                  </g>
                )
              })()}
            </svg>
          ) : (
            <MobileMesa
              laidOut={laidOut}
              lang={lang}
              hoveredKey={hoveredKey}
              setHoveredKey={setHoveredKey}
              handleClick={handleClick}
              domainMax={domainMax}
            />
          )}

          {/* legend line for narrow columns */}
          {!isMobile && narrowSet.length > 0 && (
            <div
              style={{
                height: LEGEND_H,
                fontFamily: 'var(--font-family-mono, monospace)',
                fontSize: 8.5,
                color: 'var(--color-text-muted)',
              }}
            >
              {narrowSet
                .map(
                  ({ col }, idx) =>
                    `${String.fromCharCode(9312 + Math.min(idx, 19))} ${lang === 'es' ? col.name_es : col.name_en}`
                )
                .join('  ·  ')}
            </div>
          )}
        </div>

        {/* dagger footnote */}
        {daggerCol && (
          <div
            className="mt-1"
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 13,
              color: 'var(--color-text-muted)',
            }}
          >
            {lang === 'es'
              ? `† ${daggerCol.name_es}: ${daggerCol.direct_award_pct.toFixed(0)}% adjudicación directa — la más alta de la mesa`
              : `† ${daggerCol.name_en}: ${daggerCol.direct_award_pct.toFixed(0)}% direct award — the highest on the table`}
          </div>
        )}

        <div style={{ height: isMobile ? 0 : 0 }} />
        <span className="sr-only">{totalHeightDesktop}</span>
      </div>
    </PlateFrame>
  )
}

// ── Mobile (90deg rotation) ─────────────────────────────────────────────

interface LaidOutRow {
  col: Column
  x: number
  w: number
}

function MobileMesa({
  laidOut,
  lang,
  hoveredKey,
  setHoveredKey,
  handleClick,
  domainMax,
}: {
  laidOut: LaidOutRow[]
  lang: 'en' | 'es'
  hoveredKey: string | null
  setHoveredKey: (k: string | null) => void
  handleClick: (col: Column) => void
  domainMax: number
}) {
  const totalW = laidOut.reduce((s, { w }) => s + w, 0) || 1
  const ROW_MIN_H = 18

  return (
    <div className="flex flex-col gap-[1px]">
      {laidOut.map(({ col, w }) => {
        const shareFrac = w / totalW
        const rowH = Math.max(ROW_MIN_H, shareFrac * 420)
        const color = SECTOR_COLORS[col.sector_code ?? 'otros'] ?? '#64748b'
        const level = getRiskLevelFromScore(col.avg_risk)
        const waterColor = RISK_LEVEL_COLOR[level]
        const name = lang === 'es' ? col.name_es : col.name_en
        const isHovered = hoveredKey === col.key
        const saturationPct = ((col.avg_risk * 100) / domainMax) * 100
        const halfwayPct = (RISK_THRESHOLDS.medium * 100 / domainMax) * 100

        return (
          <div
            key={col.key}
            role="button"
            tabIndex={0}
            aria-label={
              col.isRemainder
                ? lang === 'es'
                  ? 'agregado — sin dossier'
                  : 'aggregate — no dossier'
                : `${name} — ${(col.avg_risk * 100).toFixed(1)}%`
            }
            onClick={() => handleClick(col)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') handleClick(col)
            }}
            onTouchStart={() => setHoveredKey(col.key)}
            style={{
              position: 'relative',
              height: rowH,
              cursor: col.isRemainder ? 'default' : 'pointer',
              background: isHovered ? 'rgba(0,0,0,0.03)' : 'transparent',
              borderLeft: `4px solid ${color}`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(100, saturationPct)}%`,
                background: waterColor,
                opacity: 0.28,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(100, halfwayPct)}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: RISK_COLORS.high,
                opacity: 0.7,
              }}
            />
            <div
              className="flex items-center justify-between h-full px-2"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'normal',
                fontWeight: 800,
                fontSize: 13,
                color: 'var(--color-text-primary)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-family-mono, monospace)', fontStyle: 'normal', fontWeight: 600, fontSize: 13 }}>
                {truncate(name, 22)}
              </span>
              <span>{(col.avg_risk * 100).toFixed(1)}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
