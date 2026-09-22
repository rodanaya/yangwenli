/**
 * CaptureNowLedger — § EL REGISTRO · 119 + ¿Y LA TUYA? / FIND YOURS
 *
 * ProPublica Bailout-Tracker completeness: EVERY institution whose №1 vendor
 * holds ≥50% of its recorded spend. Honest tense — a photograph of the RECORD
 * ("mayoría acumulada"), never "today". Rendered OPEN at rest (no longer a
 * collapsed <details>), but the 12-row truncation is KEPT (a "See all" expander)
 * so the section stays ~one viewport. The salvaged typeahead (from the retired
 * rug) lets a reader find their own institution.
 */

import { useMemo, useRef, useState } from 'react'
import { useQueryStates, parseAsStringLiteral, createParser } from 'nuqs'
import type { CaptureLandscapeResponse } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS, HHI_CONCENTRATED } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { SortHeaderTh } from '@/components/ui/SortHeaderTh'

const LEDGER_SORTS = ['share', 'value', 'hhi'] as const
type LedgerSort = (typeof LEDGER_SORTS)[number]
const LEDGER_ORDERS = ['asc', 'desc'] as const

/**
 * `?all=1` — parseAsBoolean only reads the literal "true", and the shipped URL
 * shape is `1`. Both spellings read as on; a write is always `1`.
 */
const parseAsFlag = createParser({
  parse: (v: string) => v === '1' || v.toLowerCase() === 'true',
  serialize: () => '1',
})

/** Rows shown before "See all"; ?all=1 lifts the cap. */
const TRUNCATE_AT = 12

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function CaptureNowLedger({
  landscape,
  lang,
}: {
  landscape: CaptureLandscapeResponse
  lang: 'en' | 'es'
}) {
  // The film owns ?sort / ?open; the ledger owns ?ledger / ?ledger_order /
  // ?all — two registers on one page, never a shared key. nuqs writes the
  // three together, so a column change that also resets the direction is one
  // URL write rather than two that race through the same closure.
  const [{ ledger: sort, ledger_order: order, all: showAll }, setLedgerState] = useQueryStates(
    {
      ledger: parseAsStringLiteral(LEDGER_SORTS).withDefault('share'),
      ledger_order: parseAsStringLiteral(LEDGER_ORDERS).withDefault('desc'),
      all: parseAsFlag.withDefault(false),
    },
    { history: 'replace', clearOnDefault: true },
  )
  const [query, setQuery] = useState('')
  // "See all" unmounts itself, and activeElement fell to <body>. The wrapper
  // the click just filled takes the focus instead.
  const tableWrap = useRef<HTMLDivElement>(null)

  const q = normalize(query.trim())
  const filtering = q.length >= 2

  const rows = useMemo(() => {
    let r = [...landscape.captured_now]
    if (filtering) r = r.filter((x) => normalize(x.name).includes(q))
    const dir = order === 'desc' ? -1 : 1
    if (sort === 'value') r.sort((a, b) => dir * (a.window_total_mxn - b.window_total_mxn))
    else if (sort === 'hhi') r.sort((a, b) => dir * ((a.latest_hhi ?? 0) - (b.latest_hhi ?? 0)))
    else r.sort((a, b) => dir * (a.share_pct - b.share_pct))
    return r
  }, [landscape.captured_now, sort, order, filtering, q])

  // Field-but-not-captured hint: institution exists in the field but not the 119.
  const fieldHint = useMemo(() => {
    if (!filtering || rows.length > 0) return null
    const tick = landscape.ticks.find((t) => normalize(t[1]).includes(q))
    return tick ? { name: tick[1], share: tick[3] } : null
  }, [filtering, rows.length, landscape.ticks, q])

  const visible = filtering || showAll ? rows : rows.slice(0, TRUNCATE_AT)
  const total = landscape.captured_now_count

  const onSort = (field: LedgerSort) => {
    if (field === sort) setLedgerState({ ledger_order: order === 'desc' ? 'asc' : 'desc' })
    // A new column starts descending.
    else setLedgerState({ ledger: field, ledger_order: 'desc' })
  }

  return (
    <section className="mt-12">
      <h2 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
        {lang === 'en' ? `§ THE LEDGER · ${total}` : `§ EL REGISTRO · ${total}`}
      </h2>
      <p
        className="mb-4 lg:max-w-[640px]"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'normal',
          fontSize: 15,
          lineHeight: 1.55,
          color: 'var(--color-text-secondary)',
        }}
      >
        {lang === 'en'
          ? `These ${total} institutions have handed at least half of all their recorded spend to a single vendor — a snapshot of the full record, not the strict monotonic climb above.`
          : `Estas ${total} instituciones han entregado al menos la mitad de todo su gasto registrado a un solo proveedor — una fotografía del registro completo, no el ascenso monótono estricto de arriba.`}
      </p>

      {/* ¿Y la tuya? — salvaged typeahead, now a table filter */}
      <div className="mb-3 max-w-md">
        <input
          type="search"
          name="ledger-search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lang === 'en' ? 'Is your institution here? Search…' : '¿Está tu institución aquí? Busca…'
          }
          aria-label={lang === 'en' ? 'Search the ledger' : 'Buscar en el registro'}
          className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-background-card placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent"
          style={{ fontFamily: '"EB Garamond", Georgia, serif' }}
        />
        {/* The filter result is announced, not just repainted. */}
        <p className="sr-only" aria-live="polite">
          {filtering
            ? lang === 'en'
              ? `${rows.length} of ${total} institutions match`
              : `${rows.length} de ${total} instituciones coinciden`
            : ''}
        </p>
        {fieldHint && (
          <p className="mt-1.5 text-[13px] text-text-secondary leading-snug">
            {lang === 'en'
              ? `${fieldHint.name} is not in the captured majority — one vendor holds ${fieldHint.share}% of its record.`
              : `${fieldHint.name} no está en la mayoría capturada — un proveedor tiene el ${fieldHint.share}% de su registro.`}
          </p>
        )}
      </div>

      {/* The table needs 760px for its six columns; the container only clears
          that at lg. Below it the table keeps its floor and scrolls, and says
          so (D6 C5 — the Day 2 /gap decision). Releasing at md let the two
          name columns fall to 97px between 768 and ~900, which broke names
          mid-word. */}
      <div
        ref={tableWrap}
        id="registro-tabla"
        tabIndex={-1}
        className="overflow-x-auto lg:overflow-visible rounded-sm border border-border bg-background-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <table className="w-full table-fixed text-[13px] min-w-[824px] lg:min-w-0">
          <caption className="sr-only">
            {lang === 'en'
              ? 'Institutions where one vendor holds the majority of recorded spend'
              : 'Instituciones donde un proveedor concentra la mayoría del gasto registrado'}
          </caption>
          <colgroup>
            <col style={{ width: 44 }} />
            <col />
            <col />
            <col style={{ width: 168 }} />
            <col style={{ width: 112 }} />
            <col className="hidden md:table-column" style={{ width: 168 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border font-mono text-[13px] uppercase tracking-[0.12em] text-text-muted">
              {/* "#" is the row number in the current order, not a rank that
                  survives a re-sort — say so. */}
              <th scope="col" className="px-3 py-2 text-left">{lang === 'en' ? 'Row' : 'Fila'}</th>
              <th scope="col" className="px-3 py-2 text-left">{lang === 'en' ? 'Institution' : 'Institución'}</th>
              <th scope="col" className="px-3 py-2 text-left">{lang === 'en' ? '№1 vendor' : 'Proveedor №1'}</th>
              <SortHeaderTh field="share" label={lang === 'en' ? 'Share' : 'Participación'} activeField={sort} order={order} onSort={onSort} className="px-3 py-2" />
              <SortHeaderTh field="value" label={lang === 'en' ? 'Recorded' : 'Registrado'} activeField={sort} order={order} onSort={onSort} className="px-3 py-2 text-right" />
              <SortHeaderTh field="hhi" label={lang === 'en' ? 'HHI · latest yr' : 'HHI · último año'} activeField={sort} order={order} onSort={onSort} className="px-3 py-2 text-right hidden md:table-cell" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const sector = SECTORS.find((s) => s.id === r.sector_id)
              return (
                <tr key={r.institution_id} className="border-b border-border last:border-b-0 hover:bg-background-elevated">
                  <td className="px-3 py-2 font-mono text-[12px] text-text-muted tabular-nums">
                    {String(i + 1).padStart(3, '0')}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {sector && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[sector.code] }} title={sector.name} />
                      )}
                      <EntityIdentityChip type="institution" id={r.institution_id} name={r.name} size="md" fullName />
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <EntityIdentityChip type="vendor" id={r.top1_vendor_id} name={r.top1_vendor_name} size="md" fullName />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <DotBar value={r.share_pct} max={100} color="var(--color-risk-critical)" />
                      <span className="font-mono text-[12px] tabular-nums">{r.share_pct}%</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] tabular-nums whitespace-nowrap text-right">
                    {formatCompactMXN(r.window_total_mxn)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] tabular-nums hidden md:table-cell whitespace-nowrap text-right">
                    {r.latest_hhi != null ? Math.round(r.latest_hhi).toLocaleString() : '—'}
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-[13px] text-text-muted">
                  {lang === 'en' ? 'No match in the 119.' : 'Sin coincidencias en las 119.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p
        aria-hidden="true"
        className="lg:hidden mt-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted"
      >
        {lang === 'en' ? '← scroll →' : '← desliza →'}
      </p>
      {/* The `conc.` tag fired on 99 of the 119 rows, so it flagged the norm.
          The threshold and its basis are stated once instead. */}
      <p className="mt-2 font-mono text-[12px] text-text-muted tabular-nums">
        {lang === 'en'
          ? `HHI ≥ ${HHI_CONCENTRATED.toLocaleString()} = concentrated (US DOJ/FTC line) · latest year, not the record`
          : `HHI ≥ ${HHI_CONCENTRATED.toLocaleString()} = concentrado (línea DOJ/FTC de EE. UU.) · último año, no el registro`}
      </p>
      {!filtering && rows.length > TRUNCATE_AT && (
        <button
          type="button"
          onClick={() => {
            setLedgerState({ all: !showAll })
            // The button that was clicked may unmount; park focus on the table
            // whose row count just changed rather than losing it to <body>.
            requestAnimationFrame(() => tableWrap.current?.focus())
          }}
          className="mt-3 min-h-6 inline-flex items-center font-mono text-[12px] font-bold uppercase tracking-[0.14em] rounded-sm hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          style={{ color: 'var(--color-accent-hover)' }}
        >
          {showAll
            ? lang === 'en'
              ? `← Show ${TRUNCATE_AT}`
              : `← Ver ${TRUNCATE_AT}`
            : lang === 'en'
              ? `See all ${total} →`
              : `Ver las ${total} →`}
        </button>
      )}
      {landscape.antesala_count > 0 && (
        <p className="mt-4 text-[12px] text-text-secondary leading-snug">
          {lang === 'en' ? (
            <>
              Another <strong className="font-mono tabular-nums">{landscape.antesala_count}</strong> institutions sit between 40–50% — in the anteroom:
            </>
          ) : (
            <>
              Otras <strong className="font-mono tabular-nums">{landscape.antesala_count}</strong> instituciones están entre 40–50% — en la antesala:
            </>
          )}{' '}
          <span className="inline-flex flex-wrap gap-1.5 align-middle ml-1">
            {landscape.antesala_top.slice(0, 3).map((a) => (
              <EntityIdentityChip key={a.institution_id} type="institution" id={a.institution_id} name={a.name} size="sm" />
            ))}
          </span>
        </p>
      )}
    </section>
  )
}
