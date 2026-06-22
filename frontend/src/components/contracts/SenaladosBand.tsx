/**
 * SenaladosBand — "LOS SEÑALADOS / THE FLAGGED": the editorial band that leads
 * /contracts (El Archivo). Shows the most-concerning contracts matching the
 * CURRENT filter — documented corruption cases first, then high+critical risk —
 * named, sourced, each linking to its full dossier.
 *
 * Honesty rules (folio): a non-accusatory framing line; an explicit calm state
 * when nothing is flagged (never dress low-risk rows as alarming); hidden during
 * a free-text search (the band is for filter/preset browsing, not lookup).
 */
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ScrollText } from 'lucide-react'
import { contractApi } from '@/api/client'
import type { ContractFilterParams, ContractListItem } from '@/api/types'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { VerdictSeal } from './VerdictSeal'
import { cn, formatCompactMXN, toTitleCase } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'

// ---------------------------------------------------------------------------
// Shared bits (reused by ContractRow)
// ---------------------------------------------------------------------------

/** Documented-case seal — strong-evidence GT contract tied to a named scandal. */
export function CaseSeal({
  contract,
  lang,
  className,
}: {
  contract: ContractListItem
  lang: string
  className?: string
}) {
  if (!contract.is_documented_case || !contract.case_slug) return null
  const name =
    (lang === 'es' ? contract.case_name_es : contract.case_name_en) ||
    contract.case_name_en ||
    contract.case_name_es ||
    ''
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border border-risk-critical/40 bg-risk-critical/10 px-1.5 py-0.5 text-[10px] font-medium text-risk-critical',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      title={
        lang === 'es'
          ? 'Aparece en un caso de corrupción documentado — un vínculo, no prueba de delito.'
          : 'Appears in a documented corruption case — a link, not proof of a crime.'
      }
    >
      <ScrollText className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">
        {lang === 'es' ? 'Caso documentado' : 'Documented case'}
      </span>
      {name && (
        <>
          <ArrowRight className="h-2.5 w-2.5 shrink-0 opacity-60" aria-hidden="true" />
          <EntityIdentityChip type="case" id={contract.case_slug} name={name} size="xs" />
        </>
      )}
    </span>
  )
}

/** Why-flagged strip: top risk factors + procurement seals + anomaly tick. */
export function WhyFlags({
  contract,
  lang,
  max = 2,
  className,
}: {
  contract: ContractListItem
  lang: string
  max?: number
  className?: string
}) {
  // Drop factor tokens already represented by the DA / single-bid seals below,
  // so a row doesn't show "Direct Award" (factor) AND "Direct award" (seal).
  const DA_SB = /(direct[_\s]?award|single[_\s]?bid|licitante|adjudicaci)/i
  const factors = (contract.risk_factors ?? []).filter(Boolean).filter((f) => !DA_SB.test(f))
  const shown = factors.slice(0, max)
  const extra = factors.length - shown.length
  const seals: { key: string; label: string; tone: string }[] = []
  if (contract.is_direct_award)
    seals.push({
      key: 'da',
      label: lang === 'es' ? 'Adj. directa' : 'Direct award',
      tone: 'border-risk-high/40 bg-risk-high/10 text-risk-high',
    })
  if (contract.is_single_bid)
    seals.push({
      key: 'sb',
      label: lang === 'es' ? 'Licitante único' : 'Single bidder',
      tone: 'border-risk-critical/40 bg-risk-critical/10 text-risk-critical',
    })
  const anomalous = (contract.mahalanobis_distance ?? 0) > 20

  if (shown.length === 0 && seals.length === 0 && !anomalous) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {shown.map((raw) => {
        const parsed = parseFactorLabel(raw)
        const color = getFactorCategoryColor(parsed.category)
        return (
          <span
            key={raw}
            className="rounded-sm border px-1 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${color}14`, color, borderColor: `${color}30` }}
            title={raw}
          >
            {parsed.label}
          </span>
        )
      })}
      {seals.map((s) => (
        <span
          key={s.key}
          className={cn('rounded-sm border px-1 py-0.5 text-[10px] font-medium', s.tone)}
        >
          {s.label}
        </span>
      ))}
      {anomalous && (
        <span
          className="rounded-sm border border-risk-high/40 bg-risk-high/10 px-1 py-0.5 text-[10px] font-medium text-risk-high tabular-nums"
          title={
            lang === 'es'
              ? `Anomalía multivariada (D²=${contract.mahalanobis_distance?.toFixed(1)})`
              : `Multivariate anomaly (D²=${contract.mahalanobis_distance?.toFixed(1)})`
          }
        >
          △ D²
        </span>
      )}
      {extra > 0 && (
        <span className="text-[10px] text-text-muted">
          {lang === 'es' ? `+${extra} más` : `+${extra} more`}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The band
// ---------------------------------------------------------------------------

function SenaladoEntry({
  contract,
  rank,
  lang,
}: {
  contract: ContractListItem
  rank: number
  lang: string
}) {
  const { t: ts } = useTranslation('sectors')
  const navigate = useNavigate()
  const sector = contract.sector_id ? SECTORS.find((s) => s.id === contract.sector_id) : null
  const title =
    toTitleCase(contract.title || '') ||
    contract.contract_number ||
    (lang === 'es' ? `Contrato #${contract.id}` : `Contract #${contract.id}`)
  // A clickable div (NOT an <a>) so the inner EntityIdentityChip links aren't
  // nested anchors (invalid HTML / hydration error).
  const go = () => navigate(`/contracts/${contract.id}`, { state: { from: 'archive' } })

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); go() } }}
      aria-label={lang === 'es' ? `Abrir expediente: ${title}` : `Open dossier: ${title}`}
      className="group grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-1.5 border-b border-border/60 px-1 py-3 transition-colors last:border-b-0 hover:bg-background-elevated/40"
    >
      <span className="pt-0.5 font-mono text-[11px] tabular-nums text-text-muted">
        {String(rank).padStart(2, '0')}
      </span>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary group-hover:text-accent" title={title}>
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
          {contract.vendor_id ? (
            <span onClick={(e) => e.stopPropagation()}>
              <EntityIdentityChip type="vendor" id={contract.vendor_id} name={contract.vendor_name || ''} size="xs" />
            </span>
          ) : (
            <span className="truncate">{toTitleCase(contract.vendor_name || '—')}</span>
          )}
          {contract.institution_id && (
            <>
              <ArrowRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
              <span onClick={(e) => e.stopPropagation()}>
                <EntityIdentityChip
                  type="institution"
                  id={contract.institution_id}
                  name={contract.institution_name || ''}
                  size="xs"
                />
              </span>
            </>
          )}
          {sector && (
            <span className="font-medium" style={{ color: sector.color }}>
              · {ts(sector.code)}
            </span>
          )}
          {contract.contract_date && (
            <span className="font-mono tabular-nums">· {contract.contract_date.slice(0, 7)}</span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <CaseSeal contract={contract} lang={lang} />
          <WhyFlags contract={contract} lang={lang} max={2} />
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 text-right">
        <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
          {formatCompactMXN(contract.amount_mxn)}
        </span>
        <VerdictSeal score={contract.risk_score} level={contract.risk_level} align="right" />
      </div>
    </div>
  )
}

export function SenaladosBand({
  filters,
  lang,
}: {
  filters: ContractFilterParams
  lang: string
}) {
  const { t } = useTranslation('contracts')
  const active = !filters.search // hidden during free-text search

  const { data, isLoading } = useQuery({
    queryKey: ['contracts-highlights', filters],
    queryFn: () => contractApi.getHighlights(filters, 4),
    staleTime: 2 * 60 * 1000,
    enabled: active,
  })

  if (!active) return null
  const items = (data ?? []).slice(0, 4)

  return (
    <section
      className="rounded-sm border border-border bg-background-card"
      aria-label={t('senalados.kicker', 'The flagged')}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <ScrollText className="h-3.5 w-3.5 self-center text-risk-high" aria-hidden="true" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-primary">
            {t('senalados.kicker', 'THE FLAGGED')}
          </h2>
        </div>
        <p className="hidden text-[10px] leading-tight text-text-muted sm:block">
          {t('senalados.honesty', 'Flagged by the model and documented cases — not an accusation.')}
        </p>
      </header>

      <div className="px-3">
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-background-elevated/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-text-muted">
            {t('senalados.empty', 'No standout flags in this filter.')}
          </p>
        ) : (
          items.map((c, i) => <SenaladoEntry key={c.id} contract={c} rank={i + 1} lang={lang} />)
        )}
      </div>
    </section>
  )
}
