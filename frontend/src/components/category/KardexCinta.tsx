/**
 * KardexCinta — § "LA CINTA KARDEX" of the category dossier.
 *
 * A kardex is the Mexican accounting-office ledger card: one line per
 * movement, nothing omitted, gaps as informative as entries. PARALLAX D11b
 * folds the 24-row ledger into one compact instrument:
 *
 *   (a) the tape strip — 24 year columns 2002–2025, LINEAR value bars (the
 *       strip shows shape; a nonzero year keeps ≥ 2px) on a common baseline, grouped by administration (from @/lib/administrations,
 *       clamped to the data window). Zero years draw a hairline; repricing
 *       years (†) carry a dagger. Each bar is a button that selects its term.
 *   (b) the selector — All · Fox · Calderón · Peña Nieto · AMLO · Sheinbaum.
 *   (c) the readout — All: one row per term (years, value, entries, average
 *       ticket, risk /100), each row selects its term. A term: its year rows
 *       (year · √ bar · value · entries · ticket † · risk) under a one-line
 *       term total.
 *
 * Ticket = value ÷ entries; flagged † when ≥ 2× the category's median yearly
 * ticket (a repricing tell, computed live). Risk prints as an integer of 100
 * (contract-weighted per term); a null avg_risk prints "—". 2025 is
 * a partial year (feed frozen 2025-09-28) and carries an asterisk. The A/B/C/D
 * structure ruler keeps the tape from over-claiming.
 *
 * State is local (useState); selection never refetches — everything comes
 * from the `trend` prop. ponytail: no URL key; add `?term=` if someone needs
 * to share a term.
 *
 * Hex colours ONLY via style={{}} (className hex is silently stripped).
 */
import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { ADMINISTRATIONS, ADMIN_DISPLAY_ACCENTED, getAdministrationByYear, type AdministrationKey } from '@/lib/administrations'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

const YEAR_START = 2002
const YEAR_END = 2025
const STRIP_H = 64
const TERM_GAP = 8 // px between administrations (bars inside a term: 2px)
const PARTIAL_NOTE = { en: '* data to 28 Sep 2025', es: '* datos al 28 sep 2025' } // the COMPRANET feed froze 2025-09-28
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'

export interface KardexYearPoint {
  year: number
  total_value: number
  total_contracts: number
  avg_risk: number | null
}

export interface KardexCintaProps {
  trend: KardexYearPoint[]
  accent: string
  lang: 'en' | 'es'
}

interface YearRow {
  year: number
  totalValue: number
  totalContracts: number
  avgRisk: number | null
  ticket: number | null
  flagged: boolean
  isZero: boolean
  admin: AdministrationKey
}

interface Term {
  key: AdministrationKey
  name: string
  from: number
  to: number
  years: YearRow[]
  totalValue: number
  totalContracts: number
  avgRisk: number | null
}

// COMPRANET structure bands — the data-quality honesty ruler. Widths are
// proportional to each band's year span (flex-grow), not pixel-exact.
const STRUCTURE_BANDS: { code: string; yearStart: number; yearEnd: number; rfc: number }[] = [
  { code: 'A', yearStart: 2002, yearEnd: 2010, rfc: 0.1 },
  { code: 'B', yearStart: 2010, yearEnd: 2017, rfc: 15.7 },
  { code: 'C', yearStart: 2018, yearEnd: 2022, rfc: 30.3 },
  { code: 'D', yearStart: 2023, yearEnd: 2025, rfc: 47.4 },
]

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const entriesLabel = (n: number, isEs: boolean) =>
  `${formatNumber(n)} ${n === 1 ? (isEs ? 'entrada' : 'entry') : (isEs ? 'entradas' : 'entries')}`

// ─── ValorBar — √-scaled horizontal bar on a fixed-width track (term view). ──
function ValorBar({ ratio, color }: { ratio: number; color: string }) {
  const pct = Math.max(0, Math.min(100, ratio * 100))
  return (
    <div
      className="relative overflow-hidden shrink-0 w-full max-w-[64px] sm:max-w-[110px] md:max-w-[170px] lg:max-w-[220px]"
      style={{ height: 9, background: 'var(--color-border)', borderRadius: 2 }}
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: color, borderRadius: 2 }} />
    </div>
  )
}

// ─── RiskValue — the risk indicator as an integer "of 100" (Day 11 one-scale
//     rule). Null avg_risk prints a muted "—". ──────────────────────────────
function RiskValue({ avgRisk }: { avgRisk: number | null }) {
  return (
    <span className="tabular-nums shrink-0 inline-block text-right" style={{ minWidth: 28, fontSize: 12, color: avgRisk == null ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>
      {avgRisk == null ? '—' : Math.round(avgRisk * 100)}
    </span>
  )
}

export function KardexCinta({ trend, accent, lang }: KardexCintaProps) {
  const isEs = lang === 'es'
  const [selected, setSelected] = useState<AdministrationKey | 'all'>('all')
  // One stable handler for the selector, the 24 bars and the term rows: each
  // carries its key in data-term, so no per-element closure is rebuilt per render.
  const onSelect = useCallback((e: MouseEvent<HTMLElement>) => {
    const key = e.currentTarget.dataset.term as AdministrationKey | 'all' | undefined
    if (key) setSelected(key)
  }, [])

  const rows = useMemo<YearRow[]>(() => {
    const byYear = new Map(trend.map((p) => [p.year, p]))
    const filled: YearRow[] = []
    for (let y = YEAR_START; y <= YEAR_END; y++) {
      const p = byYear.get(y)
      const totalValue = p?.total_value ?? 0
      const totalContracts = p?.total_contracts ?? 0
      filled.push({
        year: y,
        totalValue,
        totalContracts,
        avgRisk: p?.avg_risk ?? null,
        ticket: totalContracts > 0 ? totalValue / totalContracts : null,
        flagged: false,
        isZero: totalContracts === 0,
        admin: getAdministrationByYear(y)?.key ?? 'sheinbaum',
      })
    }
    const med = median(filled.filter((r) => r.ticket != null).map((r) => r.ticket as number))
    if (med > 0) for (const r of filled) if (r.ticket != null && r.ticket >= med * 2) r.flagged = true
    return filled
  }, [trend])

  const terms = useMemo<Term[]>(
    () =>
      ADMINISTRATIONS.filter((a) => a.yearEnd >= YEAR_START && a.yearStart <= YEAR_END).map((a) => {
        const years = rows.filter((r) => r.admin === a.key)
        const totalValue = years.reduce((s, r) => s + r.totalValue, 0)
        const totalContracts = years.reduce((s, r) => s + r.totalContracts, 0)
        // Contract-weighted mean of the yearly risk indicator (years with data only).
        const risked = years.filter((r) => r.avgRisk != null && r.totalContracts > 0)
        const w = risked.reduce((s, r) => s + r.totalContracts, 0)
        const avgRisk = w > 0 ? risked.reduce((s, r) => s + (r.avgRisk as number) * r.totalContracts, 0) / w : null
        return {
          key: a.key,
          name: ADMIN_DISPLAY_ACCENTED[a.key],
          from: Math.max(a.yearStart, YEAR_START),
          to: Math.min(a.yearEnd, YEAR_END),
          years,
          totalValue,
          totalContracts,
          avgRisk,
        }
      }),
    [rows],
  )

  const maxValue = useMemo(() => Math.max(1, ...rows.map((r) => r.totalValue)), [rows])
  const term = selected === 'all' ? null : terms.find((t) => t.key === selected) ?? null
  const inView = term ? term.years : rows
  const hasFlag = inView.some((r) => r.flagged)
  const yearsLabel = (t: Term) => (t.from === t.to ? `${t.from}` : `${t.from}–${t.to}`) + (t.to === YEAR_END ? '*' : '')

  return (
    <div className="font-mono">
      {/* (b) the selector */}
      <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label={isEs ? 'Elegir administración' : 'Choose an administration'}>
        {[{ key: 'all' as const, name: isEs ? 'Todas' : 'All' }, ...terms.map((t) => ({ key: t.key, name: t.name }))].map((opt) => {
          const on = selected === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={on}
              data-term={opt.key}
              onClick={onSelect}
              className={`px-2.5 py-1 rounded-sm border transition-colors ${FOCUS}`}
              style={{
                fontSize: 12,
                letterSpacing: '0.06em',
                borderColor: on ? 'var(--color-text-primary)' : 'var(--color-border)',
                background: on ? 'var(--color-text-primary)' : 'transparent',
                color: on ? 'var(--color-background)' : 'var(--color-text-secondary)',
              }}
            >
              {opt.name}
            </button>
          )
        })}
      </div>

      {/* (a) the tape strip */}
      <div>
        <div className="flex items-end" style={{ gap: TERM_GAP, height: STRIP_H + 12 }}>
          {terms.map((t) => (
            <div
              key={t.key}
              data-term-group={t.key}
              className="flex items-end h-full"
              style={{
                flex: t.years.length,
                gap: 2,
                outline: term?.key === t.key ? '1px solid var(--color-text-secondary)' : undefined,
                outlineOffset: 3,
              }}
            >
              {t.years.map((r) => {
                // Linear: the strip's job is the shape. (The term view's row bars stay √.)
                const h = r.isZero ? 0 : Math.max(2, Math.round((r.totalValue / maxValue) * STRIP_H))
                return (
                  <button
                    key={r.year}
                    type="button"
                    data-year-bar={r.year}
                    data-term={r.admin}
                    onClick={onSelect}
                    aria-label={`${r.year}: ${formatCompactMXN(r.totalValue)}, ${entriesLabel(r.totalContracts, isEs)}${r.flagged ? (isEs ? ', reprecio †' : ', repricing †') : ''}`}
                    className={`relative flex-1 h-full flex flex-col justify-end ${FOCUS}`}
                    style={{ minWidth: 0 }}
                  >
                    {r.flagged && (
                      <span aria-hidden="true" className="absolute left-0 right-0 text-center" style={{ bottom: h + 1, fontSize: 11, lineHeight: 1, color: 'var(--color-text-secondary)' }}>
                        †
                      </span>
                    )}
                    {/* only the bar dims when another term is selected — the † stays legible */}
                    <span aria-hidden="true" style={{ display: 'block', height: r.isZero ? 1 : h, background: r.isZero ? 'var(--color-text-muted)' : accent, opacity: term && term.key !== r.admin ? 0.25 : 1, transition: 'opacity 150ms' }} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {/* baseline, year ticks every 5 years, term names — same column geometry */}
        <div style={{ height: 1, background: 'var(--color-border)' }} aria-hidden="true" />
        <div className="flex" style={{ gap: TERM_GAP }} aria-hidden="true">
          {terms.map((t) => (
            <div key={t.key} className="flex" style={{ flex: t.years.length, gap: 2, minWidth: 0 }}>
              {t.years.map((r) => (
                <div key={r.year} className="flex-1 relative" style={{ minWidth: 0, height: 14 }}>
                  {r.year % 5 === 0 && (
                    <span
                      className="absolute tabular-nums"
                      style={{ top: 3, fontSize: 11, lineHeight: 1, color: 'var(--color-text-muted)', ...(r.year === YEAR_END ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }) }}
                    >
                      {r.year}{r.year === YEAR_END ? '*' : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex" style={{ gap: TERM_GAP }} aria-hidden="true">
          {terms.map((t, i) => (
            <div
              key={t.key}
              data-term-name={t.key}
              className="whitespace-nowrap uppercase"
              style={{
                flex: t.years.length,
                minWidth: 0,
                fontSize: 11,
                lineHeight: 1.1,
                letterSpacing: '0.06em',
                textAlign: i === terms.length - 1 ? 'right' : 'left',
                // the last term (Sheinbaum) is one column wide: right-anchor it so its
                // name overflows leftward over the axis line, never off the section
                ...(i === terms.length - 1 ? { display: 'flex', justifyContent: 'flex-end' } : {}),
                borderTop: '1px solid var(--color-border)',
                paddingTop: 2,
                color: term?.key === t.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontWeight: term?.key === t.key ? 700 : 400,
              }}
            >
              {/* a one-year term: its column is narrow, so abbreviate below sm */}
              {t.key === 'sheinbaum' ? (
                <>
                  <span className="sm:hidden">Sheinb.</span>
                  <span className="hidden sm:inline">{t.name}</span>
                </>
              ) : (
                t.name
              )}
            </div>
          ))}
        </div>
      </div>

      {/* (c) the readout — 16px and a hairline below the strip block */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        {term == null ? (
          <table className="w-full" style={{ borderCollapse: 'collapse', lineHeight: 1.3 }}>
            <caption className="sr-only">
              {isEs ? 'Movimientos por administración, 2002–2025' : 'Movements by administration, 2002–2025'}
            </caption>
            <thead>
              <tr className="uppercase" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
                <th scope="col" className="text-left font-normal pb-0.5">{isEs ? 'Administración' : 'Administration'}</th>
                <th scope="col" className="text-left font-normal pb-1 hidden sm:table-cell">{isEs ? 'Años' : 'Years'}</th>
                <th scope="col" className="text-right font-normal pb-1">{isEs ? 'Valor' : 'Value'}</th>
                <th scope="col" className="text-right font-normal pb-1 hidden md:table-cell">{isEs ? 'Entradas' : 'Entries'}</th>
                <th scope="col" className="text-right font-normal pb-1 hidden md:table-cell">{isEs ? 'Ticket medio' : 'Avg ticket'}</th>
                <th scope="col" className="text-right font-normal pb-1">{isEs ? 'Riesgo /100' : 'Risk /100'}</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr
                  key={t.key}
                  data-term-row={t.key}
                  data-term-value={t.totalValue}
                  data-term-contracts={t.totalContracts}
                  className="cursor-pointer hover:bg-background-elevated"
                  style={{ borderTop: '1px solid var(--color-border)', fontSize: 12 }}
                  data-term={t.key}
                  onClick={onSelect}
                >
                  <td className="py-1">
                    <button type="button" data-term={t.key} onClick={onSelect} className={`text-left ${FOCUS}`} style={{ fontSize: 12, lineHeight: 1.3, color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {t.name}
                    </button>
                  </td>
                  <td className="py-1 tabular-nums hidden sm:table-cell" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{yearsLabel(t)}</td>
                  <td className="py-1 tabular-nums text-right" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{formatCompactMXN(t.totalValue)}</td>
                  <td className="py-1 tabular-nums text-right hidden md:table-cell" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatNumber(t.totalContracts)}</td>
                  <td className="py-1 tabular-nums text-right hidden md:table-cell" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {t.totalContracts > 0 ? formatCompactMXN(t.totalValue / t.totalContracts) : '—'}
                  </td>
                  <td className="py-1 text-right"><RiskValue avgRisk={t.avgRisk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div role="table" aria-label={isEs ? `Movimientos anuales · ${term.name}` : `Yearly movements · ${term.name}`}>
            <div
              data-term-total={term.key}
              data-term-value={term.totalValue}
              data-term-contracts={term.totalContracts}
              className="pb-1.5 tabular-nums"
              style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}
            >
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{term.name}</span> · {yearsLabel(term)} · {formatCompactMXN(term.totalValue)} · {entriesLabel(term.totalContracts, isEs)}
              {/* names the unlabeled right-hand column of the year rows */}
              {term.avgRisk != null && ` · ${isEs ? 'riesgo' : 'risk'} ${Math.round(term.avgRisk * 100)}/100`}
            </div>
            {term.years.map((r) => (
              <div key={r.year} data-year-row={r.year} data-year-value={r.totalValue} data-year-contracts={r.totalContracts}>
                <div role="row" className="flex items-center gap-2 sm:gap-3 py-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span role="rowheader" className="tabular-nums shrink-0" style={{ width: 40, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {r.year}{r.year === YEAR_END ? '*' : ''}
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--color-border)' }}>│</span>
                  {r.isZero ? (
                    <span role="cell" className="flex-1" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {isEs ? 'sin movimientos' : 'no movements'}
                    </span>
                  ) : (
                    <>
                      {/* √ here on purpose: an in-row magnitude bar, not the strip's shape (the strip is linear) */}
                      <ValorBar ratio={Math.sqrt(r.totalValue) / Math.sqrt(maxValue)} color={accent} />
                      <span role="cell" className="tabular-nums shrink-0 text-right" style={{ fontSize: 13, minWidth: 68, color: 'var(--color-text-secondary)' }}>
                        {formatCompactMXN(r.totalValue)}
                      </span>
                      <span aria-hidden="true" className="hidden md:inline" style={{ color: 'var(--color-border)' }}>│</span>
                      <span role="cell" className="tabular-nums shrink-0 hidden md:inline text-right" style={{ fontSize: 12, minWidth: 88, color: 'var(--color-text-muted)' }}>
                        {entriesLabel(r.totalContracts, isEs)}
                      </span>
                      <span aria-hidden="true" className="hidden md:inline" style={{ color: 'var(--color-border)' }}>│</span>
                      <span role="cell" className="tabular-nums shrink-0 hidden md:inline text-right" style={{ fontSize: 12, minWidth: 104, color: r.flagged ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: r.flagged ? 600 : 400 }}>
                        {/* "ticket" is an accepted loanword in Mexican procurement Spanish — same word both languages */}
                        ticket {formatCompactMXN(r.ticket ?? 0)}{r.flagged ? ' †' : ''}
                      </span>
                      <span className="ml-auto" />
                      <RiskValue avgRisk={r.avgRisk} />
                    </>
                  )}
                </div>
                {!r.isZero && (
                  <div className="md:hidden flex items-center gap-3 pb-1.5 pl-11">
                    <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{entriesLabel(r.totalContracts, isEs)}</span>
                    <span className="tabular-nums" style={{ fontSize: 12, color: r.flagged ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: r.flagged ? 600 : 400 }}>
                      ticket {formatCompactMXN(r.ticket ?? 0)}{r.flagged ? ' †' : ''}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2025 is always in the data window, so its partial-year note always shows */}
      <p className="mt-1.5" style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 'none' }}>
        {hasFlag &&
          (isEs
            ? '† reprecio: ticket implícito ≥ 2× la mediana anual de esta categoría — el ticket es valor ÷ entradas, no una observación de precio.'
            : '† repricing: implied ticket ≥ 2× this category’s median yearly ticket — the ticket is value ÷ entries, not a price observation.')}
        {hasFlag && ' '}
        <span className="whitespace-nowrap">{PARTIAL_NOTE[lang]}</span>
      </p>

      {/* Structure ruler — the honesty instrument */}
      <div className="mt-2">
        <div className="flex" style={{ height: 16 }} aria-hidden="true">
          {STRUCTURE_BANDS.map((b, i) => (
            <div
              key={b.code}
              className="flex items-center justify-center overflow-hidden whitespace-nowrap"
              style={{
                flex: b.yearEnd - b.yearStart + 1,
                background: 'var(--color-border)',
                borderRight: i < STRUCTURE_BANDS.length - 1 ? '1px solid var(--color-background)' : undefined,
                color: 'var(--color-text-primary)',
                fontSize: 11,
              }}
            >
              {/* the D band is 3/24 of the width: on a phone print the compact form */}
              <span className="hidden sm:inline">{b.code} · {b.rfc}%</span>
              <span className="sm:hidden">{b.code} {b.rfc < 1 ? '<1' : Math.round(b.rfc)}%</span>
            </div>
          ))}
        </div>
        <p className="mt-1.5" style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-muted)', maxWidth: 'none' }}>
          {isEs
            ? 'La clasificación por Partida es completa solo desde 2023 (Estructura D); los años previos pueden subcontar este anaquel.'
            : 'Partida-code classification is complete only from 2023 onward (Structure D); earlier years may undercount this shelf.'}
        </p>
      </div>
    </div>
  )
}
