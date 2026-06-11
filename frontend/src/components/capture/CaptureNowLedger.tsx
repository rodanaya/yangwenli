/**
 * CaptureNowLedger — § LOS 119 · the cumulative-majority ledger
 *
 * ProPublica Bailout-Tracker completeness: EVERY institution whose №1 vendor
 * holds ≥50% of its recorded spend, not a top-N teaser. Honest tense — this
 * is a photograph of the RECORD ("mayoría acumulada"), never "today", and it
 * is explicitly NOT the strict monotonic definition. Default-collapsed
 * <details>; zero extra fetches (rides the landscape payload).
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

  const rows = useMemo(() => {
    const r = [...landscape.captured_now]
    const dir = order === 'desc' ? -1 : 1
    if (sort === 'value')
      r.sort((a, b) => dir * (a.window_total_mxn - b.window_total_mxn))
    else if (sort === 'hhi')
      r.sort((a, b) => dir * ((a.latest_hhi ?? 0) - (b.latest_hhi ?? 0)))
    else r.sort((a, b) => dir * (a.share_pct - b.share_pct))
    return r
  }, [landscape.captured_now, sort, order])

  const visible = showAll ? rows : rows.slice(0, 12)
  const total = landscape.captured_now_count

  const onSort = (field: LedgerSort) => {
    if (field === sort) setOrder(order === 'desc' ? 'asc' : 'desc')
    else {
      setSort(field)
      setOrder('desc')
    }
  }

  return (
    <details className="mt-6 group">
      <summary className="cursor-pointer list-none select-none">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
          <span className="inline-block mr-1.5 transition-transform group-open:rotate-90">
            ▸
          </span>
          {lang === 'en'
            ? `§ THE ${total} · CUMULATIVE MAJORITY`
            : `§ LOS ${total} · MAYORÍA ACUMULADA`}
        </span>
      </summary>
      <p
        className="mt-2 mb-4"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13,
          lineHeight: 1.55,
          maxWidth: '72ch',
          color: 'var(--color-text-secondary)',
        }}
      >
        {lang === 'en'
          ? `These ${total} institutions have handed at least half of all their recorded spend to a single vendor. A snapshot of the full record, not a trajectory — and not the strict monotonic definition above.`
          : `Estas ${total} instituciones han entregado al menos la mitad de todo su gasto registrado a un solo proveedor. Fotografía del registro completo, no trayectoria — y no es la definición monótona estricta de arriba.`}
      </p>
      <div className="overflow-x-auto rounded-sm border border-border bg-background-card">
        <table className="w-full text-[11px]" style={{ minWidth: 640 }}>
          <thead>
            <tr className="border-b border-border font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">
                {lang === 'en' ? 'Institution' : 'Institución'}
              </th>
              <th className="px-3 py-2 text-left">
                {lang === 'en' ? '№1 vendor' : 'Proveedor №1'}
              </th>
              <SortHeaderTh
                field="share"
                label={lang === 'en' ? 'Share' : 'Participación'}
                activeField={sort}
                order={order}
                onSort={onSort}
                className="px-3 py-2"
              />
              <SortHeaderTh
                field="value"
                label={lang === 'en' ? 'Recorded' : 'Registrado'}
                activeField={sort}
                order={order}
                onSort={onSort}
                className="px-3 py-2"
              />
              <SortHeaderTh
                field="hhi"
                label="HHI"
                activeField={sort}
                order={order}
                onSort={onSort}
                className="px-3 py-2 hidden md:table-cell"
              />
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const sector = SECTORS.find((s) => s.id === r.sector_id)
              return (
                <tr
                  key={r.institution_id}
                  className="border-b border-border last:border-b-0 hover:bg-background-elevated"
                >
                  <td className="px-3 py-2 font-mono text-[10px] text-text-muted tabular-nums">
                    {String(i + 1).padStart(3, '0')}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 max-w-[220px]">
                      {sector && (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ background: SECTOR_COLORS[sector.code] }}
                          aria-hidden="true"
                        />
                      )}
                      <EntityIdentityChip
                        type="institution"
                        id={r.institution_id}
                        name={r.name}
                        size="xs"
                        className="min-w-0"
                      />
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <EntityIdentityChip
                      type="vendor"
                      id={r.top1_vendor_id}
                      name={r.top1_vendor_name}
                      size="xs"
                      className="max-w-[200px]"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <DotBar
                        value={r.share_pct}
                        max={100}
                        color="var(--color-risk-critical)"
                      />
                      <span className="font-mono text-[10px] tabular-nums">
                        {r.share_pct}%
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] tabular-nums whitespace-nowrap">
                    {formatCompactMXN(r.window_total_mxn)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] tabular-nums hidden md:table-cell whitespace-nowrap">
                    {r.latest_hhi != null ? (
                      <>
                        {Math.round(r.latest_hhi).toLocaleString()}
                        {r.latest_hhi >= HHI_CONCENTRATED && (
                          <span
                            className="ml-1.5 text-[8.5px] uppercase tracking-wider"
                            style={{ color: 'var(--color-risk-critical)' }}
                          >
                            {lang === 'en' ? 'conc.' : 'conc.'}
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
          </tbody>
        </table>
      </div>
      {!showAll && rows.length > 12 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-accent)' }}
        >
          {lang === 'en' ? `See all ${total} →` : `Ver las ${total} →`}
        </button>
      )}
      {landscape.antesala_count > 0 && (
        <p className="mt-4 text-[12px] text-text-secondary leading-snug">
          {lang === 'en' ? (
            <>
              Another{' '}
              <strong className="font-mono tabular-nums">{landscape.antesala_count}</strong>{' '}
              institutions sit between 40–50% — in the anteroom:
            </>
          ) : (
            <>
              Otras{' '}
              <strong className="font-mono tabular-nums">{landscape.antesala_count}</strong>{' '}
              instituciones están entre 40–50% — en la antesala:
            </>
          )}{' '}
          <span className="inline-flex flex-wrap gap-1.5 align-middle ml-1">
            {landscape.antesala_top.slice(0, 3).map((a) => (
              <EntityIdentityChip
                key={a.institution_id}
                type="institution"
                id={a.institution_id}
                name={a.name}
                size="xs"
              />
            ))}
          </span>
        </p>
      )}
    </details>
  )
}
