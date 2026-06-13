/**
 * ContractCotejo — §3 EL COTEJO, the size-in-context centerpiece (W6).
 *
 * Replaces the boilerplate "this is one of many" paragraph + 2 duplicate
 * buttons. Three movements, all from GET /contracts/{id}/context (eager) + ONE
 * lazy pair-register fetch:
 *
 *   1. RatioBullet — log-scaled deviation vs the sector 99th percentile
 *      (FT *Deviation*). NOT BenchmarkRow (it saturates at the cap; 50× and
 *      500× would look identical — FATAL-1/audit-B). The literal ×N is the label.
 *   2. Rank prose — this contract's place in the vendor↔institution relationship
 *      and the vendor's own history (counts/total all live-consistent, no drift).
 *   3. Pair register (lazy, Reuters accumulate-and-mark-the-subject) — the
 *      ranked siblings with THIS contract pinned at its true rank. Rows are
 *      readable inline (read 50 without a page load) and clickable to jump.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { contractApi } from '@/api/client'
import type { ContractContextResponse, ContractDetail, ContractListItem } from '@/api/types'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'

const CRIMSON = RISK_COLORS.critical
const REF_ZINC = '#71717a'
const LOG_CAP = 1000 // ×1000 of p99 fills the track; the ×1 origin sits at the left

// ── RatioBullet ───────────────────────────────────────────────────────────────

function RatioBullet({
  mult,
  p99,
  sectorName,
  lang,
}: {
  mult: number
  p99: number
  sectorName: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const above = mult >= 1
  // Log position from the ×1 = p99 origin (left). Capped so ×1000 = full track.
  const frac = above ? Math.min(Math.log10(mult) / Math.log10(LOG_CAP), 1) : 0
  const pct = Math.max(frac * 100, above ? 2 : 0)
  const multLabel = mult >= 100 ? `×${Math.round(mult)}` : mult >= 10 ? `×${mult.toFixed(0)}` : `×${mult.toFixed(1)}`

  return (
    <div className="max-w-2xl">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
        >
          {isEs ? 'Tamaño vs. el percentil 99 del sector' : 'Size vs. the sector 99th percentile'}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 22,
            lineHeight: 1,
            color: above ? CRIMSON : 'var(--color-text-secondary)',
          }}
        >
          {above ? multLabel : (isEs ? 'bajo el p99' : 'below p99')}
        </span>
      </div>
      {/* Track */}
      <div className="relative" style={{ height: 16 }}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full" style={{ height: 4, background: 'var(--color-border)' }} />
        {above && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
            style={{ width: `${pct}%`, height: 6, background: CRIMSON, opacity: 0.85 }}
            aria-hidden="true"
          />
        )}
        {/* ×1 = p99 reference origin tick at the left edge */}
        <div className="absolute left-0 top-0 bottom-0" style={{ width: 2, background: REF_ZINC }} aria-hidden="true" />
      </div>
      <div className="flex items-baseline justify-between gap-3 mt-1.5">
        <span className="font-mono tabular-nums" style={{ fontSize: 9.5, color: REF_ZINC, letterSpacing: '0.06em' }}>
          {isEs ? `×1 = p99 ${sectorName} · ${formatCompactMXN(p99)}` : `×1 = ${sectorName} p99 · ${formatCompactMXN(p99)}`}
        </span>
      </div>
    </div>
  )
}

// ── Pair register row ─────────────────────────────────────────────────────────

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
      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 38 }}>
        #{rank}
      </span>
      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 36 }}>
        {year}
      </span>
      <span
        className="font-mono tabular-nums flex-1 text-right"
        style={{ fontSize: 12, color: isSubject ? sectorAccent : 'var(--color-text-primary)', fontWeight: isSubject ? 700 : 400 }}
      >
        {formatCompactMXN(c.amount_mxn ?? 0)}
      </span>
      <span className="font-mono flex-shrink-0" style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)', minWidth: 44, textAlign: 'right' }}>
        {flags.join(' ')}
      </span>
      {isSubject && (
        <span className="font-mono flex-shrink-0" style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: sectorAccent, fontWeight: 700 }}>
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

// ── Main ──────────────────────────────────────────────────────────────────────

export function ContractCotejo({
  context,
  contract,
  sectorName,
  sectorAccent,
  lang,
}: {
  context: ContractContextResponse | undefined
  contract: ContractDetail
  sectorName: string
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const [open, setOpen] = useState(false)

  const vendorName = contract.vendor_name?.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase()) || (isEs ? 'el proveedor' : 'the vendor')
  const instName = contract.institution_name?.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase()) || (isEs ? 'la institución' : 'the institution')

  const pair = context?.pair
  const pairCount = pair?.total_contracts ?? 0
  const pairRank = pair?.this_rank ?? null
  const vendorRank = context?.vendor_rank ?? null
  const vendorTotal = context?.vendor_total_contracts ?? 0

  // Lazy pair register — vendor-index-backed, fired only on expand.
  const { data: register, isLoading: registerLoading } = useQuery({
    queryKey: ['contract-cotejo', contract.vendor_id, contract.institution_id, 'pair'],
    queryFn: () =>
      contractApi.getAll({
        vendor_id: contract.vendor_id ?? undefined,
        institution_id: contract.institution_id ?? undefined,
        per_page: 100,
        sort_by: 'amount_mxn',
        sort_order: 'desc',
      }),
    enabled: open && !!contract.vendor_id && !!contract.institution_id,
    staleTime: 10 * 60 * 1000,
  })

  const rows = register?.data ?? []
  const subjectInTop = rows.some((r) => r.id === contract.id)

  // ── Rank prose ────────────────────────────────────────────────────────────
  const rankProse = (() => {
    if (!pair || pairCount === 0) return null
    const parts: string[] = []
    if (pairRank === 1) {
      parts.push(
        isEs
          ? `El mayor de los ${pairCount.toLocaleString('es-MX')} contratos entre ${vendorName} e ${instName}`
          : `The largest of the ${pairCount.toLocaleString('en-US')} contracts between ${vendorName} and ${instName}`,
      )
    } else if (pairRank != null) {
      parts.push(
        isEs
          ? `El contrato #${pairRank.toLocaleString('es-MX')} por monto de los ${pairCount.toLocaleString('es-MX')} entre ${vendorName} e ${instName}`
          : `Contract #${pairRank.toLocaleString('en-US')} by value of the ${pairCount.toLocaleString('en-US')} between ${vendorName} and ${instName}`,
      )
    }
    if (pair.total_amount_mxn > 0 && pair.first_year) {
      parts.push(
        isEs
          ? `${formatCompactMXN(pair.total_amount_mxn)} desde ${pair.first_year}`
          : `${formatCompactMXN(pair.total_amount_mxn)} since ${pair.first_year}`,
      )
    }
    let prose = parts.join(' — ') + '.'
    if (vendorRank === 1 && vendorTotal > 0) {
      prose += isEs
        ? ` Y el mayor de los ${vendorTotal.toLocaleString('es-MX')} contratos de su historia.`
        : ` And the largest of its ${vendorTotal.toLocaleString('en-US')} contracts on record.`
    }
    return prose
  })()

  const hasBullet = context?.sector_p99_mxn != null && context?.size_vs_p99 != null

  return (
    <div className="space-y-6">
      {hasBullet && (
        <RatioBullet mult={context!.size_vs_p99!} p99={context!.sector_p99_mxn!} sectorName={sectorName} lang={lang} />
      )}

      {rankProse && (
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 16,
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
            borderLeft: `2px solid ${sectorAccent}`,
            paddingLeft: 16,
            maxWidth: '64ch',
          }}
        >
          {rankProse}
        </p>
      )}

      {/* Lazy pair register */}
      {pairCount > 1 && contract.vendor_id && contract.institution_id && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="font-mono uppercase tracking-[0.10em] hover:opacity-70 transition-opacity cursor-pointer"
            style={{ fontSize: 10, color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: '4px 0' }}
          >
            {open
              ? (isEs ? '⌃ Ocultar la relación' : '⌃ Hide the relationship')
              : (isEs ? `⌄ Ver la relación · ${pairCount.toLocaleString('es-MX')} contratos` : `⌄ See the relationship · ${pairCount.toLocaleString('en-US')} contracts`)}
          </button>

          {open && (
            <div className="mt-2 border border-border rounded-sm overflow-hidden">
              {registerLoading ? (
                <div className="px-3 py-6 text-center font-mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {isEs ? 'Cargando la relación…' : 'Loading the relationship…'}
                </div>
              ) : rows.length > 0 ? (
                <div className="max-h-[420px] overflow-y-auto divide-y divide-border/30">
                  {/* Synthetic pinned subject row when it falls below the top-100 cut */}
                  {!subjectInTop && pairRank != null && (
                    <>
                      <RegisterRow
                        rank={pairRank}
                        c={contract as unknown as ContractListItem}
                        isSubject
                        sectorAccent={sectorAccent}
                        lang={lang}
                      />
                      <div className="px-3 py-1 text-center font-mono" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        ⋮ {isEs ? 'mayores del par' : 'largest of the pair'}
                      </div>
                    </>
                  )}
                  {rows.map((c, i) => (
                    <RegisterRow
                      key={c.id}
                      rank={i + 1}
                      c={c}
                      isSubject={c.id === contract.id}
                      sectorAccent={sectorAccent}
                      lang={lang}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-3 py-6 text-center font-mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {isEs ? 'Sin contratos comparables.' : 'No comparable contracts.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
