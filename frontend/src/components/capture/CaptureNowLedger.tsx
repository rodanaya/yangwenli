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
import type { CaptureLandscapeResponse } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { SortHeaderTh } from '@/components/ui/SortHeaderTh'

// In-house DOJ/FTC threshold — keep in sync with RedesKnownDossier.tsx
const HHI_CONCENTRATED = 2500

type LedgerSort = 'share' | 'value' | 'hhi'

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
  const [sort, setSort] = useState<LedgerSort>('share')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [showAll, setShowAll] = useState(false)
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

  const visible = filtering ? rows : showAll ? rows : rows.slice(0, 12)
  const total = landscape.captured_now_count

  const onSort = (field: LedgerSort) => {
    if (field === sort) setOrder(order === 'desc' ? 'asc' : 'desc')
    else {
      setSort(field)
      setOrder('desc')
    }
  }

  return (
    <section className="mt-12">
      <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
        {lang === 'en' ? `§ THE LEDGER · ${total}` : `§ EL REGISTRO · ${total}`}
      </p>
      <p
        className="mb-4"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'normal',
          fontSize: 13,
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
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lang === 'en' ? 'Is your institution here? Search…' : '¿Está tu institución aquí? Busque…'
          }
          aria-label={lang === 'en' ? 'Search the ledger' : 'Buscar en el registro'}
          className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-background-card focus:outline-none"
          style={{ fontFamily: '"EB Garamond", Georgia, serif' }}
        />
        {fieldHint && (
          <p className="mt-1.5 text-[13px] text-text-secondary leading-snug">
            {lang === 'en'
              ? `${fieldHint.name} is not in the captured majority — one vendor holds ${fieldHint.share}% of its record.`
              : `${fieldHint.name} no está en la mayoría capturada — un proveedor tiene el ${fieldHint.share}% de su registro.`}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-background-card">
        <table className="w-full text-[13px]" style={{ minWidth: 640 }}>
          <thead>
            <tr className="border-b border-border font-mono text-[13px] uppercase tracking-[0.12em] text-text-muted">
              <th className="px-3 py-2 text-left w-8">#</th>
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
                    <span className="inline-flex items-center gap-1.5 max-w-[220px]">
                      {sector && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[sector.code] }} aria-hidden="true" />
                      )}
                      <EntityIdentityChip type="institution" id={r.institution_id} name={r.name} size="xs" className="min-w-0" />
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <EntityIdentityChip type="vendor" id={r.top1_vendor_id} name={r.top1_vendor_name} size="xs" className="max-w-[200px]" />
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
                          <span className="ml-1.5 text-[8.5px] uppercase tracking-wider" style={{ color: 'var(--color-risk-critical)' }}>
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
      {!filtering && !showAll && rows.length > 12 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 font-mono text-[12px] font-bold uppercase tracking-[0.14em] hover:opacity-80 transition-opacity"
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
              <EntityIdentityChip key={a.institution_id} type="institution" id={a.institution_id} name={a.name} size="xs" />
            ))}
          </span>
        </p>
      )}
    </section>
  )
}
