/**
 * RelationSection — §2 LA RELACIÓN, the time-ribbon centerpiece (P5).
 *
 * Replaces ContractCotejo as the §2 body. Two modes:
 *   - Relationship mode: the vendor↔institution pair register is hoisted to
 *     fetch ON MOUNT (not behind a disclosure) and feeds RelationRibbon — the
 *     plate itself is the primary body now. The register table (RegisterRow,
 *     lifted verbatim from ContractCotejo) is demoted to a collapsed
 *     disclosure below the plate.
 *   - Size-only fallback: RatioBullet (lifted verbatim) + a single prose line,
 *     used when the pair has <=1 contract or party ids are missing.
 *
 * Spec: contract-el-cotejo-fable-2026-07-02-spec.md §2.3 · §5-P5.
 */
import { useQuery } from '@tanstack/react-query'
import { contractApi } from '@/api/client'
import type { ContractContextResponse, ContractDetail } from '@/api/types'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { PairLedger } from '@/components/contract/PairLedger'

const CRIMSON = RISK_COLORS.critical
const REF_ZINC = '#71717a'
const LOG_CAP = 1000 // ×1000 of p99 fills the track; the ×1 origin sits at the left

// ── Section title/meta helper — page reads this to build DossierSectionHeader ──
export interface RelationSectionMeta {
  mode: 'relationship' | 'fallback' | 'none'
  eyebrow: { es: string; en: string }
  title: { es: string; en: string }
  meta: { es: string; en: string } | null
}

export function getRelationSectionMeta(context: ContractContextResponse | undefined): RelationSectionMeta {
  const pair = context?.pair
  const hasRelationship = !!pair && pair.total_contracts > 1 && !!pair.vendor_id && !!pair.institution_id
  const hasFallback = context?.sector_p99_mxn != null && context?.size_vs_p99 != null
  const eyebrow = { es: 'La prueba', en: 'The exhibit' }
  if (hasRelationship) {
    const nYears = pair!.first_year != null && pair!.last_year != null
      ? pair!.last_year - pair!.first_year + 1
      : null
    const total = formatCompactMXN(pair!.total_amount_mxn ?? 0)
    return {
      mode: 'relationship',
      eyebrow,
      title: nYears != null
        ? { es: `${total} en ${nYears} años`, en: `${total} across ${nYears} years` }
        : { es: 'La relación en el tiempo', en: 'The relationship in time' },
      meta: {
        es: `${pair!.total_contracts.toLocaleString('es-MX')} contratos · ${pair!.first_year ?? '—'}–${pair!.last_year ?? '—'}`,
        en: `${pair!.total_contracts.toLocaleString('en-US')} contracts · ${pair!.first_year ?? '—'}–${pair!.last_year ?? '—'}`,
      },
    }
  }
  if (hasFallback) {
    return {
      mode: 'fallback',
      eyebrow,
      title: { es: 'El tamaño en contexto', en: 'Size in context' },
      meta: null,
    }
  }
  return { mode: 'none', eyebrow, title: { es: '', en: '' }, meta: null }
}

// ── RatioBullet — lifted verbatim from ContractCotejo ──────────────────────

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
          style={{ fontSize: 12, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
        >
          {isEs ? 'Tamaño vs. el percentil 99 del sector' : 'Size vs. the sector 99th percentile'}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'normal',
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
        <span className="font-mono tabular-nums" style={{ fontSize: 13, color: REF_ZINC, letterSpacing: '0.06em' }}>
          {isEs ? `×1 = p99 ${sectorName} · ${formatCompactMXN(p99)}` : `×1 = ${sectorName} p99 · ${formatCompactMXN(p99)}`}
        </span>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function RelationSection({
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

  const vendorName = contract.vendor_name?.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase()) || (isEs ? 'el proveedor' : 'the vendor')
  const instName = contract.institution_name?.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase()) || (isEs ? 'la institución' : 'the institution')

  const pair = context?.pair
  const pairCount = pair?.total_contracts ?? 0
  const pairRank = pair?.this_rank ?? null
  const vendorRank = context?.vendor_rank ?? null
  const vendorTotal = context?.vendor_total_contracts ?? 0
  const p99 = context?.sector_p99_mxn ?? null
  const sizeVsP99 = context?.size_vs_p99 ?? null

  const isRelationship = pairCount > 1 && !!contract.vendor_id && !!contract.institution_id
  const hasBullet = p99 != null && sizeVsP99 != null

  // Hoisted on-mount register fetch (relationship mode only) — same indexed
  // query the old disclosure fired, now the plate's primary data source.
  const { data: register, isLoading: registerLoading } = useQuery({
    queryKey: ['contract-relation', contract.vendor_id, contract.institution_id, 'pair'],
    queryFn: () =>
      contractApi.getAll({
        vendor_id: contract.vendor_id ?? undefined,
        institution_id: contract.institution_id ?? undefined,
        per_page: 100,
        sort_by: 'amount_mxn',
        sort_order: 'desc',
      }),
    enabled: isRelationship,
    staleTime: 10 * 60 * 1000,
  })

  const rows = register?.data ?? []

  // ── Rank prose (verbatim, becomes the plate caption) ───────────────────────
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
    // Honesty clause — the register endpoint returns top-100 by amount only.
    if (pairCount > 100) {
      prose += isEs ? ` · mostrando los 100 mayores de ${pairCount.toLocaleString('es-MX')}` : ` · showing the 100 largest of ${pairCount.toLocaleString('en-US')}`
    }
    // Below-p99 clause — appended when the gridline can't be drawn (all values under p99).
    if (p99 != null) {
      const maxAmount = Math.max(contract.amount_mxn ?? 0, ...rows.map((r) => r.amount_mxn ?? 0), 1)
      if (p99 > maxAmount) {
        prose += isEs ? ' · todos bajo el p99 del sector' : ' · all below the sector p99'
      }
    }
    return prose
  })()

  // Context entirely absent → render nothing.
  if (!context) return null

  if (isRelationship) {
    if (registerLoading) {
      return (
        <div
          className="relative animate-pulse"
          style={{
            height: 240,
            padding: '30px 20px 18px',
            background: 'var(--color-background-elevated, var(--color-background))',
            border: '1px solid var(--color-border)',
            boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
          }}
        >
          <div
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '9.5px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              fontStyle: 'normal',
              fontWeight: 500,
            }}
          >
            {isEs ? 'LÁMINA · LA RELACIÓN' : 'PLATE · THE RELATIONSHIP'}
          </div>
          <div className="mt-6 h-40 bg-border/20 rounded-sm" />
        </div>
      )
    }

    return (
      <PairLedger
        rows={rows}
        subject={contract}
        pair={context.pair}
        p99={p99}
        sizeVsP99={sizeVsP99}
        sectorAccent={sectorAccent}
        sectorName={sectorName}
        captionProse={rankProse ?? ''}
        lang={lang}
      />
    )
  }

  // ── Size-only fallback mode ─────────────────────────────────────────────
  if (hasBullet) {
    const showSingleLine = !!contract.vendor_id && !!contract.institution_id
    return (
      <div className="space-y-4">
        <RatioBullet mult={sizeVsP99!} p99={p99!} sectorName={sectorName} lang={lang} />
        {showSingleLine && (
          <p
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'normal',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--color-text-secondary)',
              borderLeft: `2px solid ${sectorAccent}`,
              paddingLeft: 16,
              maxWidth: '64ch',
            }}
          >
            {isEs
              ? `El único contrato registrado entre ${vendorName} e ${instName}.`
              : `The only recorded contract between ${vendorName} and ${instName}.`}
          </p>
        )}
      </div>
    )
  }

  return null
}
