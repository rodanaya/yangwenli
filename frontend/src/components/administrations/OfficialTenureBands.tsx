/**
 * OfficialTenureBands — §C ACTO III of the /administrations remake:
 * "Los itinerantes" redrawn from a flat 6-column table into tenure bands
 * on a 2018–2025 axis, crossing the two sexenio-handover rules. A band
 * whose [first,last] crosses a rule is a career that survived a change
 * of government — legible with zero text (cover-the-captions test).
 *
 * Named precedent: Reuters "Time of Evidence" annotated timeline (dated
 * vertical rules at editorial moments) + ProPublica Bailout Tracker
 * (hard accountability columns kept beside the geometry, not hidden in
 * tooltips). Zero fetch — the page hands this component the movers
 * payload it already holds in memory (first/last_contract_year were
 * fetched and dropped by the old table).
 * See .claude/designus/administrations-2026-07-02/proposals/data-first.md §C.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { OfficialMover } from '@/api/types'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { cn, formatCompactMXN, toTitleCase } from '@/lib/utils'
import { DotBar } from '@/components/ui/DotBar'

export interface OfficialTenureBandsProps {
  movers: OfficialMover[]
  isEs: boolean
}

// Axis window — the movers endpoint only covers Structure C/D (2018+); no
// claim is made beyond it (the provenance note below states this).
const AXIS_START = 2018
const AXIS_END = 2025
const AXIS_SPAN = AXIS_END - AXIS_START // 7

// The two sexenio handovers inside the window, placed mid-year so the rule
// sits between the outgoing and incoming administration's contract years.
const RULE_YEARS = [2018.5, 2024.5] as const
const RULE_X = RULE_YEARS.map((y) => ((y - AXIS_START) / AXIS_SPAN) * 100)

/**
 * Shared column template — Name · band track · Value · AD% · ×Inst. Every
 * row, the header, the rule-label strip and the year-tick strip all use
 * this exact template so the track column lines up pixel-for-pixel and the
 * per-row rule segments stack into one continuous line. <sm the Value cell
 * hides (kept in the row aria-label) and the template drops to 4 columns.
 */
const ROW_GRID =
  'grid grid-cols-[minmax(110px,140px)_1fr_40px_34px] sm:grid-cols-[minmax(150px,190px)_1fr_76px_40px_34px] gap-x-2 items-center'

type SortMode = 'default' | 'institutions' | 'value' | 'directAward'

/** A career crosses a handover rule if its span straddles either boundary year. */
function crossesRule(m: OfficialMover): boolean {
  const first = m.first_contract_year
  const last = m.last_contract_year
  if (first == null || last == null) return false
  return (first <= 2018 && last >= 2019) || (first <= 2024 && last >= 2025)
}

function spanYears(m: OfficialMover): number {
  if (m.first_contract_year == null || m.last_contract_year == null) return -1
  return m.last_contract_year - m.first_contract_year
}

function sortMovers(movers: OfficialMover[], mode: SortMode): OfficialMover[] {
  const arr = [...movers]
  if (mode === 'institutions') {
    arr.sort((a, b) => b.institution_count - a.institution_count)
  } else if (mode === 'value') {
    arr.sort((a, b) => b.total_value_mxn - a.total_value_mxn)
  } else if (mode === 'directAward') {
    arr.sort((a, b) => b.direct_award_pct - a.direct_award_pct)
  } else {
    // Default: crossers first, then longest span, then most institutions.
    arr.sort((a, b) => {
      const crossDelta = (crossesRule(b) ? 1 : 0) - (crossesRule(a) ? 1 : 0)
      if (crossDelta !== 0) return crossDelta
      const spanDelta = spanYears(b) - spanYears(a)
      if (spanDelta !== 0) return spanDelta
      return b.institution_count - a.institution_count
    })
  }
  return arr
}

const SORT_OPTIONS: { key: SortMode; es: string; en: string }[] = [
  { key: 'institutions', es: 'instituciones', en: 'institutions' },
  { key: 'value', es: 'valor', en: 'value' },
  { key: 'directAward', es: 'adj. directa', en: 'direct award' },
]

export function OfficialTenureBands({ movers, isEs }: OfficialTenureBandsProps) {
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [expandedName, setExpandedName] = useState<string | null>(null)

  const sorted = useMemo(() => sortMovers(movers, sortMode), [movers, sortMode])
  const crossers = useMemo(() => movers.filter(crossesRule).length, [movers])
  const total = movers.length

  if (total === 0) return null

  return (
    <section className="mt-10 pt-8 border-t border-border" aria-label={isEs ? 'Funcionarios itinerantes' : 'Itinerant officials'}>
      <div className="font-mono mb-1" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
        {isEs ? 'Ventana 2018+ · todas las administraciones' : '2018+ window · across administrations'}
      </div>
      <h2 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 22, color: 'var(--color-text-primary)', letterSpacing: '-0.005em' }}>
        {isEs ? 'Los itinerantes' : 'The itinerants'}
      </h2>

      {/* Computed headline — the fraction that survived a change of government */}
      <p className="mt-1.5" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
        {isEs ? (
          <>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{crossers} de {total}</span>
            {' '}siguieron firmando después de un cambio de gobierno.
          </>
        ) : (
          <>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{crossers} of {total}</span>
            {' '}kept signing after a change of government.
          </>
        )}
      </p>

      {/* 3-way client sort — press again to return to the default (crossers-first) order */}
      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em]">
        <span className="text-text-muted">{isEs ? 'Ordenar por' : 'Sort by'}</span>
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortMode(active ? 'default' : opt.key)}
              aria-pressed={active}
              className={cn(
                'px-1.5 py-0.5 rounded-sm border transition-colors',
                active ? 'border-text-primary text-text-primary' : 'border-border text-text-muted hover:text-text-secondary'
              )}
            >
              {isEs ? opt.es : opt.en}
            </button>
          )
        })}
      </div>

      {/* Rule-label strip — sits above the row stack, aligned to the track column */}
      <div className={cn(ROW_GRID, 'mt-4')} aria-hidden="true">
        <span />
        <span className="relative h-4">
          {RULE_X.map((x, i) => (
            <span
              key={RULE_YEARS[i]}
              className="absolute whitespace-nowrap font-mono"
              style={{
                left: `${x}%`,
                transform: i === 0 ? 'translateX(2px)' : 'translateX(calc(-100% - 2px))',
                fontSize: 9,
                letterSpacing: '0.04em',
                color: 'var(--color-text-muted)',
              }}
            >
              {i === 0
                ? (isEs ? 'CAMBIO DE GOBIERNO — PEÑA→AMLO' : 'CHANGE OF GOVERNMENT — PEÑA→AMLO')
                : 'AMLO→SHEINBAUM'}
            </span>
          ))}
        </span>
        <span className="hidden sm:block" />
        <span />
        <span />
      </div>

      {/* Header row */}
      <div className={cn(ROW_GRID, 'mt-1 pb-1.5 border-b border-border font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted')}>
        <span>{isEs ? 'Funcionario' : 'Officer'}</span>
        <span />
        <span className="hidden sm:block text-right">{isEs ? 'Valor' : 'Value'}</span>
        <span className="text-right">AD%</span>
        <span className="text-right">{isEs ? 'Inst.' : 'Inst.'}</span>
      </div>

      {/* Rows — each h-20; the track column draws its own rule segments, which
          stack into one continuous dashed line across the full row stack. */}
      <div>
        {sorted.map((m) => {
          const isExpanded = expandedName === m.official_name
          const level = getRiskLevelFromScore(m.avg_risk_score)
          const color = RISK_COLORS[level]
          const crosses = crossesRule(m)
          const hasYears = m.first_contract_year != null && m.last_contract_year != null
          const rawLeft = hasYears ? ((m.first_contract_year! - AXIS_START) / AXIS_SPAN) * 100 : 0
          const left = Math.max(0, Math.min(100, rawLeft))
          const rawWidth = hasYears
            ? Math.max(((m.last_contract_year! - m.first_contract_year!) / AXIS_SPAN) * 100, 3)
            : 0
          const width = Math.min(rawWidth, 100 - left)
          const displayName = toTitleCase(m.official_name)
          const locale = isEs ? 'es-MX' : 'en-US'

          const ariaLabel = isEs
            ? `${displayName}, ${hasYears ? `${m.first_contract_year}–${m.last_contract_year}` : 'sin fechas registradas'}, ${m.institution_count} instituciones, cruza cambio de gobierno: ${crosses ? 'sí' : 'no'}`
            : `${displayName}, ${hasYears ? `${m.first_contract_year}–${m.last_contract_year}` : 'no dates on record'}, ${m.institution_count} institutions, crosses change of government: ${crosses ? 'yes' : 'no'}`

          return (
            <div key={m.official_name}>
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={ariaLabel}
                onClick={() => setExpandedName(isExpanded ? null : m.official_name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpandedName(isExpanded ? null : m.official_name)
                  }
                }}
                className={cn(
                  ROW_GRID,
                  'group h-20 cursor-pointer border-b border-border/40 hover:bg-background-elevated/40 transition-colors'
                )}
              >
                <span className="min-w-0 truncate text-[12px] font-medium text-text-primary group-hover:underline">
                  {displayName}
                </span>

                <span className="relative h-full">
                  {RULE_X.map((x, i) => (
                    <span
                      key={RULE_YEARS[i]}
                      aria-hidden="true"
                      className="absolute top-0 bottom-0 border-l border-dashed"
                      style={{ left: `${x}%`, borderColor: 'var(--color-border)' }}
                    />
                  ))}
                  {hasYears ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 -translate-y-1/2 rounded-sm h-2.5 group-hover:!opacity-100 transition-opacity"
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color, opacity: crosses ? 0.9 : 0.35 }}
                    />
                  ) : (
                    <span aria-hidden="true" className="absolute top-1/2 -translate-y-1/2 left-0 font-mono text-[11px] text-text-muted">
                      —
                    </span>
                  )}
                </span>

                <span className="hidden sm:block whitespace-nowrap text-right font-mono text-[11px] tabular-nums text-text-secondary">
                  {formatCompactMXN(m.total_value_mxn)}
                </span>
                <span className="text-right font-mono text-[11px] tabular-nums text-text-secondary">
                  {m.direct_award_pct.toFixed(0)}%
                </span>
                <span className="text-right font-mono text-[11px] tabular-nums text-text-muted">
                  ×{m.institution_count}
                </span>
              </div>

              {isExpanded && (
                <div className="border-b border-border/40 bg-background-elevated/20 px-1 pb-4 pt-3 sm:pl-[158px]">
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <div className="font-mono text-[10px] text-text-muted">
                      <div className="mb-0.5 uppercase tracking-[0.1em]">{isEs ? 'Contratos' : 'Contracts'}</div>
                      <div className="text-[13px] tabular-nums text-text-primary">{m.total_contracts.toLocaleString(locale)}</div>
                    </div>
                    <div className="font-mono text-[10px] text-text-muted">
                      <div className="mb-0.5 uppercase tracking-[0.1em]">{isEs ? 'Valor total' : 'Total value'}</div>
                      <div className="text-[13px] tabular-nums text-text-primary">{formatCompactMXN(m.total_value_mxn)}</div>
                    </div>
                    <div className="min-w-[140px] font-mono text-[10px] text-text-muted">
                      <div className="mb-1 flex items-center justify-between gap-3 uppercase tracking-[0.1em]">
                        <span>{isEs ? 'Adj. directa' : 'Direct award'}</span>
                        <span className="tabular-nums text-text-secondary">{m.direct_award_pct.toFixed(0)}%</span>
                      </div>
                      <DotBar
                        value={m.direct_award_pct}
                        max={100}
                        color="var(--color-accent)"
                        ariaLabel={isEs ? `Adjudicación directa ${m.direct_award_pct.toFixed(0)}%` : `Direct award ${m.direct_award_pct.toFixed(0)}%`}
                      />
                    </div>
                    <div className="font-mono text-[10px] text-text-muted">
                      <div className="mb-0.5 uppercase tracking-[0.1em]">{isEs ? 'Oferta única' : 'Single bid'}</div>
                      <div className="text-[13px] tabular-nums text-text-primary">{m.single_bid_pct.toFixed(0)}%</div>
                    </div>
                    <div className="font-mono text-[10px] text-text-muted">
                      <div className="mb-0.5 uppercase tracking-[0.1em]">{isEs ? 'Indicador de riesgo' : 'Risk indicator'}</div>
                      <div className="flex items-center gap-1.5 text-[13px] tabular-nums">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                        <span style={{ color }}>{m.avg_risk_score.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/officials/${encodeURIComponent(m.official_name)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {isEs ? 'ver ficha' : 'see file'} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Year ticks — under the row stack, aligned to the track column */}
      <div className={cn(ROW_GRID, 'mt-1')} aria-hidden="true">
        <span />
        <span className="relative h-4">
          {Array.from({ length: AXIS_SPAN + 1 }, (_, i) => AXIS_START + i).map((yr) => (
            <span
              key={yr}
              className="absolute font-mono tabular-nums"
              style={{ left: `${((yr - AXIS_START) / AXIS_SPAN) * 100}%`, transform: 'translateX(-50%)', fontSize: 9, color: 'var(--color-text-muted)' }}
            >
              {yr}
            </span>
          ))}
        </span>
        <span className="hidden sm:block" />
        <span />
        <span />
      </div>

      {/* Provenance — kept verbatim from the prior table's caption */}
      <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
        {isEs
          ? 'Responsables de la Unidad Compradora que firmaron en más de una institución · 2018+ (COMPRANET Estructura C/D). Indicador de riesgo del modelo — no es una acusación.'
          : 'Procurement officers of record who signed at more than one institution · 2018+ (COMPRANET Structure C/D). Model risk indicator — not an accusation.'}
      </p>
    </section>
  )
}

export default OfficialTenureBands
