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

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CaptureLandscapeResponse } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS, RISK_TEXT_COLORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { SortHeaderTh } from '@/components/ui/SortHeaderTh'
import { makeSetParam } from './captureParams'

// In-house DOJ/FTC threshold — keep in sync with RedesKnownDossier.tsx
const HHI_CONCENTRATED = 2500

type LedgerSort = 'share' | 'value' | 'hhi'
const LEDGER_SORTS: LedgerSort[] = ['share', 'value', 'hhi']

/** Rows shown before "See all"; ?todas=1 lifts the cap. */
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
  // The film owns ?sort / ?abrir; the ledger owns ?registro / ?dir / ?todas —
  // two vocabularies on one page, never a shared key (D6 C5).
  const [searchParams, setSearchParams] = useSearchParams()
  const setParam = makeSetParam(searchParams, setSearchParams)
  const sortParam = searchParams.get('registro')
  const sort: LedgerSort = (LEDGER_SORTS as string[]).includes(sortParam ?? '')
    ? (sortParam as LedgerSort)
    : 'share'
  const order: 'asc' | 'desc' = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  const showAll = searchParams.get('todas') === '1'
  const [query, setQuery] = useState('')

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
    if (field === sort) setParam('dir', order === 'desc' ? 'asc' : null)
    else {
      const next = new URLSearchParams(searchParams)
      if (field === 'share') next.delete('registro')
      else next.set('registro', field)
      next.delete('dir') // a new column starts descending
      setSearchParams(next, { replace: true })
    }
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
            lang === 'en' ? 'Is your institution here? Search…' : '¿Está tu institución aquí? Busque…'
          }
          aria-label={lang === 'en' ? 'Search the ledger' : 'Buscar en el registro'}
          className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-background-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent"
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
      <div className="overflow-x-auto lg:overflow-visible rounded-sm border border-border bg-background-card">
        <table className="w-full table-fixed text-[13px] min-w-[760px] lg:min-w-0">
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
            <col className="hidden md:table-column" style={{ width: 104 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border font-mono text-[13px] uppercase tracking-[0.12em] text-text-muted">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">{lang === 'en' ? 'Institution' : 'Institución'}</th>
              <th className="px-3 py-2 text-left">{lang === 'en' ? '№1 vendor' : 'Proveedor №1'}</th>
              <SortHeaderTh field="share" label={lang === 'en' ? 'Share' : 'Participación'} activeField={sort} order={order} onSort={onSort} className="px-3 py-2" />
              <SortHeaderTh field="value" label={lang === 'en' ? 'Recorded' : 'Registrado'} activeField={sort} order={order} onSort={onSort} className="px-3 py-2" />
              <SortHeaderTh field="hhi" label="HHI" activeField={sort} order={order} onSort={onSort} className="px-3 py-2 hidden md:table-cell" />
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
                        <span className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[sector.code] }} aria-hidden="true" />
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
                  <td className="px-3 py-2 font-mono text-[12px] tabular-nums whitespace-nowrap">
                    {formatCompactMXN(r.window_total_mxn)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] tabular-nums hidden md:table-cell whitespace-nowrap">
                    {r.latest_hhi != null ? (
                      <>
                        {Math.round(r.latest_hhi).toLocaleString()}
                        {r.latest_hhi >= HHI_CONCENTRATED && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wider" style={{ color: RISK_TEXT_COLORS.critical }}>
                            conc.
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
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
      {!filtering && !showAll && rows.length > TRUNCATE_AT && (
        <button
          type="button"
          onClick={() => setParam('todas', '1')}
          className="mt-3 min-h-6 inline-flex items-center font-mono text-[12px] font-bold uppercase tracking-[0.14em] rounded-sm hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          style={{ color: 'var(--color-accent)' }}
        >
          {lang === 'en' ? `See all ${total} →` : `Ver las ${total} →`}
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
