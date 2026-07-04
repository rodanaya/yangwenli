/**
 * PairLedger — «LÁMINA · EL FLUJO DEL PAR» / "PLATE · THE PAIR'S FLOW".
 *
 * Act II centerpiece exhibit for the contract dossier («La Prueba»). Replaces
 * RelationRibbon's per-contract spike thumbnail with a per-YEAR ledger: one
 * linear-peso column per year (Reuters *Time of Evidence* accumulation
 * grammar), a cumulative step-line climbing to the pair total, and this
 * contract inked as a named bottom slice inside its own year column (NYT
 * Upshot named-outlier mechanic). Each year column is a fused drill-in
 * trigger — clicking it expands that year's register rows directly beneath
 * the plate, zero new fetch (rows arrive via props from the mount-time pair
 * register query already fired by RelationSection).
 *
 * Amendment 1 (audit fix — encoding-math): year columns, the cumulative
 * step-line, and the peso gridlines all share ONE LINEAR peso y-axis.
 * `colH = MAX_H * (yearSum / maxYearSum)` — no sqrt anywhere on this plate.
 *
 * Amendment 2 (graft from El Libro Mayor): the register lives INSIDE the
 * exhibit. Each year column is `<button aria-expanded>`; one year open at a
 * time, subject pinned + highlighted, `max-h-[240px] overflow-y-auto`. A
 * `⌄ Ver los N contratos` control expands the full top-100 list as the
 * all-years fallback.
 *
 * Zero <circle> by design (platform dot-grid ban) — rects, lines, and H/V-only
 * <path> segments for the step-line.
 *
 * Spec: contract-dossier-2026-07-04 spec-draft.md §II + narrative-first.md §II.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Props contract (frozen for the orchestrator wiring `RelationSection`):
 *
 *   rows           ContractListItem[]   the pair register (top-100 by amount,
 *                                       already fetched mount-time by the
 *                                       parent in relationship mode). Used for
 *                                       year aggregation AND the drill-in rows.
 *   subject        ContractDetail       the contract this dossier page is for.
 *   pair           ContractContextResponse['pair']
 *   p99            number | null        sector p99 (unused directly here —
 *                                       carried for future gridline parity
 *                                       with RatioBullet fallback; kept in the
 *                                       interface so the caller doesn't branch).
 *   sizeVsP99      number | null        ditto.
 *   sectorAccent   string               hex — subject slice + leader fill.
 *   sectorName     string               unused directly (parity w/ ribbon
 *                                       interface); kept for caller symmetry.
 *   captionProse   string               rankProse, built upstream (verbatim
 *                                       honesty clauses) — rendered as the
 *                                       figcaption, with the linear-scale note
 *                                       appended here.
 *   lang           'en' | 'es'
 * ─────────────────────────────────────────────────────────────────────────
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { ContractContextResponse, ContractDetail, ContractListItem } from '@/api/types'
import { getRiskLevelFromScore, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

export interface PairLedgerProps {
  rows: ContractListItem[]
  subject: ContractDetail
  pair: ContractContextResponse['pair']
  p99: number | null
  sizeVsP99: number | null
  sectorAccent: string
  sectorName: string
  captionProse: string
  lang: 'en' | 'es'
}

// ── geometry ─────────────────────────────────────────────────────────────
const MOBILE_BREAK = 640
const ZINC = '#71717a'
const OCHRE = '#a06820'
const MONO = '"IBM Plex Mono", "JetBrains Mono", monospace'

function dateOf(c: { contract_date?: string; contract_year?: number }): Date | null {
  if (c.contract_date) {
    const d = new Date(c.contract_date)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (c.contract_year) {
    return new Date(Date.UTC(c.contract_year, 6, 1)) // Jul 1 mid-year fallback
  }
  return null
}

interface YearAgg {
  year: number
  sum: number
  count: number
  level: 'critical' | 'high' | 'medium' | 'low'
  cumulative: number
}

export function PairLedger({
  rows,
  subject,
  pair,
  sectorAccent,
  captionProse,
  lang,
}: PairLedgerProps) {
  const isEs = lang === 'es'
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [openYear, setOpenYear] = useState<number | null>(null)
  const [allOpen, setAllOpen] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = width < MOBILE_BREAK
  const HEIGHT = isMobile ? 240 : 380
  const PAD_L = isMobile ? 34 : 48
  const PAD_R = isMobile ? 16 : 24
  const BASELINE_Y = HEIGHT - 36
  const TOP_PAD = 30
  const MAX_H = BASELINE_Y - TOP_PAD - 34

  const subjectYear = subject.contract_year ?? dateOf(subject)?.getUTCFullYear() ?? new Date().getUTCFullYear()
  const subjectAmount = subject.amount_mxn ?? 0
  const subjectInRows = rows.some((r) => r.id === subject.id)
  const pairTotal = pair.total_contracts ?? 0
  const pairRank = pair.this_rank ?? null

  const layout = useMemo(() => {
    // Aggregate register rows by year; ensure the subject's own year is present
    // even when the subject fell below the top-100 register cut.
    const byYear = new Map<number, { sum: number; count: number; maxRisk: 'critical' | 'high' | 'medium' | 'low' }>()
    for (const r of rows) {
      const d = dateOf(r)
      const year = r.contract_year ?? d?.getUTCFullYear()
      if (year == null) continue
      const level = r.risk_score != null ? getRiskLevelFromScore(r.risk_score) : 'low'
      const entry = byYear.get(year) ?? { sum: 0, count: 0, maxRisk: 'low' as const }
      entry.sum += r.amount_mxn ?? 0
      entry.count += 1
      const rank: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 }
      if (rank[level] > rank[entry.maxRisk]) entry.maxRisk = level
      byYear.set(year, entry)
    }
    if (!byYear.has(subjectYear)) {
      byYear.set(subjectYear, { sum: 0, count: 0, maxRisk: 'low' })
    }
    // Subject slice is always inked even if its year sum (from the top-100
    // register cut) undercounts it — pad the year sum to include it.
    const subjectEntry = byYear.get(subjectYear)!
    if (!subjectInRows) {
      subjectEntry.sum += subjectAmount
      subjectEntry.count += 1
    }

    const years = Array.from(byYear.keys()).sort((a, b) => a - b)
    const maxYearSum = Math.max(...years.map((y) => byYear.get(y)!.sum), 1)

    let running = 0
    const aggs: YearAgg[] = years.map((year) => {
      const e = byYear.get(year)!
      running += e.sum
      return { year, sum: e.sum, count: e.count, level: e.maxRisk, cumulative: running }
    })

    const nYears = years.length
    const innerW = Math.max(80, width - PAD_L - PAD_R)
    const slotW = innerW / Math.max(1, nYears)

    const dominantYear = aggs.find((a) => a.sum / maxYearSum >= 0.6)

    // Year ticks — all when <=12, else thinned; first/last always present.
    const tickEvery = nYears <= 12 ? 1 : Math.ceil(nYears / 8)

    return { aggs, maxYearSum, nYears, innerW, slotW, dominantYear, tickEvery }
  }, [rows, subjectYear, subjectAmount, subjectInRows, width, PAD_L, PAD_R])

  const { aggs, maxYearSum, nYears, slotW, dominantYear, tickEvery } = layout

  const xOf = (i: number) => PAD_L + i * layout.slotW + layout.slotW / 2
  const colHOf = (sum: number) => Math.max(3, MAX_H * (sum / maxYearSum))

  const subjectIdx = aggs.findIndex((a) => a.year === subjectYear)
  const subjectColH = subjectIdx >= 0 ? colHOf(aggs[subjectIdx].sum) : 0
  const subjectYearSum = subjectIdx >= 0 ? aggs[subjectIdx].sum : 1
  const sliceH = Math.max(3, subjectColH * (subjectAmount / Math.max(subjectYearSum, 1)))
  const subjectX = subjectIdx >= 0 ? xOf(subjectIdx) : PAD_L
  const overflowRight = subjectX > width - PAD_R - 60

  // Cumulative step-line honesty gate — only when the register is complete.
  const registerComplete = rows.length >= pairTotal && pairTotal > 0
  const grandTotal = aggs.length > 0 ? aggs[aggs.length - 1].cumulative : 0

  const stepPath = useMemo(() => {
    if (!registerComplete || aggs.length === 0) return ''
    const yOf = (cum: number) => {
      const frac = grandTotal > 0 ? cum / grandTotal : 0
      return (BASELINE_Y - 8) - frac * ((BASELINE_Y - 8) - TOP_PAD)
    }
    let d = ''
    aggs.forEach((a, i) => {
      const x = xOf(i)
      const y = yOf(a.cumulative)
      if (i === 0) {
        const xStart = PAD_L
        d += `M ${xStart} ${BASELINE_Y - 8} H ${x} V ${y}`
      } else {
        d += ` H ${x} V ${y}`
      }
    })
    return d
  }, [aggs, registerComplete, grandTotal, BASELINE_Y, TOP_PAD, PAD_L, slotW])

  const lastX = nYears > 0 ? xOf(nYears - 1) : PAD_L
  const lastY = registerComplete && grandTotal > 0
    ? (BASELINE_Y - 8) - ((BASELINE_Y - 8) - TOP_PAD)
    : BASELINE_Y - 8

  // Gridlines — 2 dashed lines at maxYearSum and maxYearSum/2, on the same
  // linear peso axis as the columns.
  const gridTop = BASELINE_Y - MAX_H
  const gridMid = BASELINE_Y - MAX_H / 2

  const vendorName = subject.vendor_name || (isEs ? 'el proveedor' : 'the vendor')
  const instName = subject.institution_name || (isEs ? 'la institución' : 'the institution')
  const ariaLabel = isEs
    ? `El flujo del par ${vendorName} ↔ ${instName}: ${nYears} años, ${pairTotal.toLocaleString('es-MX')} contratos, ${formatCompactMXN(grandTotal || pair.total_amount_mxn)} acumulados. Este contrato, ${formatCompactMXN(subjectAmount)}, es el #${pairRank ?? '—'} por monto.`
    : `The ${vendorName} ↔ ${instName} pair's flow: ${nYears} years, ${pairTotal.toLocaleString('en-US')} contracts, ${formatCompactMXN(grandTotal || pair.total_amount_mxn)} accumulated. This contract, ${formatCompactMXN(subjectAmount)}, ranks #${pairRank ?? '—'} by value.`

  const subjectLabel1 = `${isEs ? 'ESTE' : 'THIS'} · ${formatCompactMXN(subjectAmount)}`
  const subjectLabel2 = pairRank != null ? `#${pairRank}/${pairTotal}` : null

  const scaleNote = dominantYear
    ? isEs
      ? ` · escala lineal — ${dominantYear.year} domina el flujo`
      : ` · linear scale — ${dominantYear.year} dominates the flow`
    : ''

  const yearRows = openYear != null ? aggs.find((a) => a.year === openYear) : null
  const drillInRows = useMemo(() => {
    if (openYear == null) return []
    return rows
      .filter((r) => {
        const d = dateOf(r)
        const year = r.contract_year ?? d?.getUTCFullYear()
        return year === openYear
      })
      .sort((a, b) => (b.amount_mxn ?? 0) - (a.amount_mxn ?? 0))
  }, [rows, openYear])
  const showSyntheticInYear = openYear === subjectYear && !subjectInRows

  const allRows = useMemo(() => [...rows].sort((a, b) => (b.amount_mxn ?? 0) - (a.amount_mxn ?? 0)), [rows])

  return (
    <figure
      className="relative"
      style={{
        padding: '30px 20px 18px',
        background: 'var(--color-background-elevated, var(--color-background))',
        border: '1px solid var(--color-border)',
        boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
      }}
    >
      <CropMark position="tl" />
      <CropMark position="tr" />
      <CropMark position="bl" />
      <CropMark position="br" />

      <div
        className="mb-3 flex items-center gap-2 flex-wrap"
        style={{
          fontFamily: MONO,
          fontSize: '9.5px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 400,
        }}
      >
        <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
          {isEs ? 'LÁMINA · EL FLUJO DEL PAR' : "PLATE · THE PAIR'S FLOW"}
        </span>
      </div>

      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          style={{ display: 'block' }}
        >
          {/* peso gridlines — shared linear axis */}
          <g>
            <line x1={PAD_L} x2={width - PAD_R} y1={gridTop} y2={gridTop} stroke="var(--color-text-muted)" strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
            <text x={PAD_L - 6} y={gridTop + 3} textAnchor="end" fontFamily={MONO} fontSize={8.5} fill="var(--color-text-muted)">
              {formatCompactMXN(maxYearSum)}
            </text>
            {!isMobile && (
              <>
                <line x1={PAD_L} x2={width - PAD_R} y1={gridMid} y2={gridMid} stroke="var(--color-text-muted)" strokeWidth={1} strokeDasharray="3,3" opacity={0.35} />
                <text x={PAD_L - 6} y={gridMid + 3} textAnchor="end" fontFamily={MONO} fontSize={8.5} fill="var(--color-text-muted)">
                  {formatCompactMXN(maxYearSum / 2)}
                </text>
              </>
            )}
          </g>

          {/* baseline */}
          <line x1={PAD_L} x2={width - PAD_R} y1={BASELINE_Y} y2={BASELINE_Y} stroke="var(--color-border)" strokeWidth={1} />

          {/* year columns */}
          {aggs.map((a, i) => {
            const x = xOf(i)
            const colW = slotW * 0.62
            const h = colHOf(a.sum)
            const isSubjectCol = a.year === subjectYear
            const capColor = a.level === 'critical' || a.level === 'high' ? RISK_COLORS[a.level] : ZINC
            const isHover = hoverYear === a.year
            const isOpen = openYear === a.year
            return (
              <g key={a.year}>
                <rect
                  x={x - colW / 2}
                  y={BASELINE_Y - h}
                  width={colW}
                  height={h}
                  fill={ZINC}
                  opacity={isHover || isOpen ? 0.42 : 0.3}
                />
                <rect x={x - colW / 2} y={BASELINE_Y - h} width={colW} height={3} fill={capColor} opacity={0.9} />
                {isSubjectCol && (
                  <rect
                    x={x - colW / 2}
                    y={BASELINE_Y - sliceH}
                    width={colW}
                    height={sliceH}
                    fill={sectorAccent}
                    opacity={0.95}
                  />
                )}
              </g>
            )
          })}

          {/* cumulative step-line — honesty gated */}
          {registerComplete && stepPath && (
            <>
              <path d={stepPath} fill="none" stroke={OCHRE} strokeWidth={1.5} opacity={0.85} />
              <text
                x={overflowRight ? lastX - 6 : Math.min(lastX + 6, width - PAD_R)}
                y={Math.max(lastY - 6, TOP_PAD + 8)}
                textAnchor={lastX > width - PAD_R - 70 ? 'end' : 'start'}
                fontFamily={MONO}
                fontSize={12.5}
                fontWeight={700}
                fill={OCHRE}
                paintOrder="stroke"
                stroke="var(--color-background-elevated)"
                strokeWidth={3}
              >
                {formatCompactMXN(grandTotal)}
              </text>
              <text
                x={overflowRight ? lastX - 6 : Math.min(lastX + 6, width - PAD_R)}
                y={Math.max(lastY - 6, TOP_PAD + 8) + 12}
                textAnchor={lastX > width - PAD_R - 70 ? 'end' : 'start'}
                fontFamily={MONO}
                fontSize={9}
                letterSpacing={0.08}
                fill={OCHRE}
                paintOrder="stroke"
                stroke="var(--color-background-elevated)"
                strokeWidth={3}
              >
                {isEs ? 'ACUMULADO' : 'CUMULATIVE'}
              </text>
            </>
          )}

          {/* subject leader + halo label */}
          {subjectIdx >= 0 && (
            <g>
              <line
                x1={subjectX}
                x2={subjectX}
                y1={BASELINE_Y - subjectColH}
                y2={BASELINE_Y - subjectColH - 22}
                stroke="var(--color-accent)"
                strokeWidth={0.75}
                opacity={0.5}
              />
              <text
                x={overflowRight ? subjectX - 4 : subjectX}
                y={BASELINE_Y - subjectColH - 26}
                textAnchor={overflowRight ? 'end' : 'middle'}
                fontFamily={MONO}
                fontSize={12}
                fill="var(--color-text-secondary)"
                paintOrder="stroke"
                stroke="var(--color-background-elevated)"
                strokeWidth={3}
              >
                {subjectLabel1}
              </text>
              {subjectLabel2 && (
                <text
                  x={overflowRight ? subjectX - 4 : subjectX}
                  y={BASELINE_Y - subjectColH - 14}
                  textAnchor={overflowRight ? 'end' : 'middle'}
                  fontFamily={MONO}
                  fontSize={12}
                  fontWeight={700}
                  fill={RISK_COLORS.critical}
                  paintOrder="stroke"
                  stroke="var(--color-background-elevated)"
                  strokeWidth={3}
                >
                  {subjectLabel2}
                </text>
              )}
            </g>
          )}

          {/* year axis ticks */}
          {aggs.map((a, i) =>
            i % tickEvery === 0 || i === aggs.length - 1 ? (
              <text
                key={a.year}
                x={xOf(i)}
                y={BASELINE_Y + 18}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={isMobile ? 10 : 12}
                fill="var(--color-text-muted)"
              >
                {a.year}
              </text>
            ) : null,
          )}

          {/* hit targets — one per year column, keyboard + pointer */}
          {aggs.map((a, i) => (
            <rect
              key={`hit-${a.year}`}
              x={PAD_L + i * slotW}
              y={TOP_PAD}
              width={slotW}
              height={BASELINE_Y - TOP_PAD + 20}
              fill="transparent"
              onPointerEnter={() => setHoverYear(a.year)}
              onPointerLeave={() => setHoverYear((v) => (v === a.year ? null : v))}
              onClick={() => setOpenYear((v) => (v === a.year ? null : a.year))}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>

        {/* pointer tooltip */}
        {hoverYear != null && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border border-border bg-background px-2.5 py-2 text-[13px] shadow-lg"
            style={{
              left: Math.min(Math.max(xOf(aggs.findIndex((a) => a.year === hoverYear)), 90), width - 90),
              top: 4,
              transform: 'translateX(-50%)',
              fontFamily: MONO,
              minWidth: 150,
            }}
            role="status"
          >
            {(() => {
              const a = aggs.find((x) => x.year === hoverYear)
              if (!a) return null
              return (
                <p className="text-text-primary">
                  {a.year} · {a.count.toLocaleString(isEs ? 'es-MX' : 'en-US')} {isEs ? 'contratos' : 'contracts'} · {formatCompactMXN(a.sum)}
                </p>
              )
            })()}
          </div>
        )}
      </div>

      {/* year column accessible triggers (visually hidden hit already handled by SVG; these give a11y + visible affordance row) */}
      <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label={isEs ? 'Años del par' : 'Years of the pair'}>
        {aggs.map((a) => {
          const isOpen = openYear === a.year
          return (
            <button
              key={a.year}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenYear((v) => (v === a.year ? null : a.year))}
              className="font-mono hover:opacity-80 transition-opacity cursor-pointer rounded-sm"
              style={{
                fontSize: 10.5,
                padding: '2px 6px',
                border: `1px solid ${isOpen ? sectorAccent : 'var(--color-border)'}`,
                color: isOpen ? sectorAccent : 'var(--color-text-muted)',
                background: isOpen ? `${sectorAccent}14` : 'transparent',
              }}
            >
              {a.year}
            </button>
          )
        })}
      </div>

      {/* fused year drill-in */}
      {openYear != null && yearRows && (
        <div className="mt-2 border border-border rounded-sm overflow-hidden">
          <div
            className="px-3 py-1.5 font-mono flex items-baseline justify-between"
            style={{ fontSize: 11.5, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}
          >
            <span>{openYear} · {yearRows.count.toLocaleString(isEs ? 'es-MX' : 'en-US')} {isEs ? 'contratos' : 'contracts'}</span>
            <span>{formatCompactMXN(yearRows.sum)}</span>
          </div>
          <div className="max-h-[240px] overflow-y-auto divide-y divide-border/30">
            {showSyntheticInYear && pairRank != null && (
              <RegisterRow rank={pairRank} c={subject as unknown as ContractListItem} isSubject sectorAccent={sectorAccent} lang={lang} />
            )}
            {drillInRows.map((c, i) => (
              <RegisterRow key={c.id} rank={i + 1} c={c} isSubject={c.id === subject.id} sectorAccent={sectorAccent} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* all-years fallback disclosure */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setAllOpen((v) => !v)}
          aria-expanded={allOpen}
          className="font-mono uppercase tracking-[0.10em] hover:opacity-70 transition-opacity cursor-pointer"
          style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: '4px 0' }}
        >
          {allOpen
            ? (isEs ? '⌃ Ocultar el registro' : '⌃ Hide the register')
            : (isEs ? `⌄ Ver los ${pairTotal.toLocaleString('es-MX')} contratos` : `⌄ See the ${pairTotal.toLocaleString('en-US')} contracts`)}
        </button>
        {allOpen && (
          <div className="mt-2 border border-border rounded-sm overflow-hidden">
            {allRows.length > 0 ? (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-border/30">
                {!subjectInRows && pairRank != null && (
                  <>
                    <RegisterRow rank={pairRank} c={subject as unknown as ContractListItem} isSubject sectorAccent={sectorAccent} lang={lang} />
                    <div className="px-3 py-1 text-center font-mono" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      ⋮ {isEs ? 'mayores del par' : 'largest of the pair'}
                    </div>
                  </>
                )}
                {allRows.map((c, i) => (
                  <RegisterRow key={c.id} rank={i + 1} c={c} isSubject={c.id === subject.id} sectorAccent={sectorAccent} lang={lang} />
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center font-mono" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {isEs ? 'Sin contratos comparables.' : 'No comparable contracts.'}
              </div>
            )}
          </div>
        )}
      </div>

      <figcaption
        className="mt-3 pt-2.5"
        style={{
          borderTop: '1px solid rgba(160, 104, 32, 0.18)',
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: '12.5px',
          lineHeight: 1.5,
          color: 'var(--color-text-secondary, var(--color-text-muted))',
        }}
      >
        {captionProse}
        {scaleNote}
        {!registerComplete && pairTotal > 100
          ? ''
          : registerComplete
            ? ''
            : isEs
              ? ' · línea acumulada omitida — registro incompleto'
              : ' · cumulative line omitted — incomplete register'}
      </figcaption>
    </figure>
  )
}

// ── RegisterRow — grafted verbatim (RelationSection.tsx L130–186) ──────────
function RegisterRow({
  rank,
  c,
  isSubject,
  sectorAccent,
  lang,
}: {
  rank: number
  c: ContractListItem
  isSubject: boolean
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const flags: string[] = []
  if (c.is_direct_award) flags.push(isEs ? 'AD' : 'DA')
  if (c.is_single_bid) flags.push(isEs ? 'UP' : 'SB')
  const year = c.contract_year ?? (c.contract_date ? new Date(c.contract_date).getUTCFullYear() : '—')

  const inner = (
    <div
      className="flex items-baseline gap-3 px-3 py-1.5"
      style={{
        borderLeft: `2px solid ${isSubject ? sectorAccent : 'transparent'}`,
        background: isSubject ? `${sectorAccent}0f` : undefined,
      }}
    >
      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 13, color: 'var(--color-text-muted)', minWidth: 38 }}>
        #{rank}
      </span>
      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 13, color: 'var(--color-text-secondary)', minWidth: 36 }}>
        {year}
      </span>
      <span
        className="font-mono tabular-nums flex-1 text-right"
        style={{ fontSize: 12, color: isSubject ? sectorAccent : 'var(--color-text-primary)', fontWeight: isSubject ? 700 : 400 }}
      >
        {formatCompactMXN(c.amount_mxn ?? 0)}
      </span>
      <span className="font-mono flex-shrink-0" style={{ fontSize: 13, letterSpacing: '0.06em', color: 'var(--color-text-muted)', minWidth: 44, textAlign: 'right' }}>
        {flags.join(' ')}
      </span>
      {isSubject && (
        <span className="font-mono flex-shrink-0" style={{ fontSize: 13, letterSpacing: '0.10em', textTransform: 'uppercase', color: sectorAccent, fontWeight: 700 }}>
          {isEs ? '◀ este' : '◀ this'}
        </span>
      )}
    </div>
  )

  if (isSubject) return inner
  return (
    <Link to={`/contracts/${c.id}`} className="block hover:bg-background-elevated/60 transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]">
      {inner}
    </Link>
  )
}

// ── corner crop marks — copied locally (folio chrome, same pattern as RelationRibbon). ─
type CropPos = 'tl' | 'tr' | 'bl' | 'br'

function CropMark({ position }: { position: CropPos }) {
  const inset = 8
  const size = 14
  const stroke = 'rgba(160, 104, 32, 0.55)'
  const baseStyle: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    pointerEvents: 'none',
  }
  const positions: Record<CropPos, CSSProperties> = {
    tl: { top: inset, left: inset, borderTop: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    tr: { top: inset, right: inset, borderTop: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
    bl: { bottom: inset, left: inset, borderBottom: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    br: { bottom: inset, right: inset, borderBottom: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
  }
  return <span aria-hidden="true" style={{ ...baseStyle, ...positions[position] }} />
}
