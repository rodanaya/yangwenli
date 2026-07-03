import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  bucketStatus,
  DISPOSITION_META,
  DRIVER_META,
  driverTag,
  ipsMills,
} from '@/components/aria/disposition'
import type { AriaQueueItem } from '@/api/types'
import { cn, formatCompactMXN } from '@/lib/utils'

/**
 * RegisterRow — one vendor, one 40px agate line (ProPublica Bailout Tracker
 * column discipline + FT agate mills). Replaces the 2-line InvestigationRow
 * card. The row's ONLY state color is the disposition rail (graft from
 * «El Despacho»); IPS renders in single ink (W9: a priority ordering, not a
 * risk scale — no color, no ladder). Row click expands EL DESGLOSE in place;
 * navigation out lives only in the EntityIdentityChip and the expand's exit.
 */

interface RegisterRowProps {
  item: AriaQueueItem
  isEs: boolean
  rank: number
  expanded: boolean
  onToggle: () => void
}

const PATTERN_CHIP: Record<string, string> = {
  P1: 'text-risk-critical border-risk-critical/30 bg-risk-critical/10',
  P6: 'text-risk-critical border-risk-critical/30 bg-risk-critical/10',
  P2: 'text-risk-high border-risk-high/30 bg-risk-high/10',
  P3: 'text-risk-high border-risk-high/30 bg-risk-high/10',
  P7: 'text-risk-high border-risk-high/30 bg-risk-high/10',
  P4: 'text-text-secondary border-border bg-background-elevated',
  P5: 'text-text-secondary border-border bg-background-elevated',
}

/** Fixed-slot corroboration tick (graft from «El Tamiz») — presence/absence read down the column. */
function Tick({ on, color, code, title }: { on: boolean; color: string; code: string; title: string }) {
  return (
    <span
      role="img"
      aria-label={`${code}: ${on ? title : '—'}`}
      title={on ? title : undefined}
      className="inline-block w-[9px] h-[9px] rounded-[1px] border"
      style={{
        background: on ? color : 'transparent',
        borderColor: on ? color : 'var(--color-border)',
        opacity: on ? 1 : 0.5,
      }}
    />
  )
}

export function RegisterRow({ item, isEs, rank, expanded, onToggle }: RegisterRowProps) {
  const bucket = bucketStatus(item.review_status)
  const dispo = DISPOSITION_META[bucket]
  const driver = driverTag(item)
  const isDisc = !item.in_ground_truth && (item.ips_tier ?? 4) <= 2

  const lastYear = item.last_contract_year ?? null
  const firstYear = item.first_contract_year ?? null
  const isActive = lastYear != null && lastYear >= 2024
  const isDormant = lastYear != null && lastYear < 2022

  const memoChip =
    item.memo_provenance === 'llm_narrative'
      ? { code: 'LLM', cls: 'text-accent-data border border-accent-data/30', title: isEs ? 'Memo investigativo IA' : 'AI investigation memo' }
      : item.memo_provenance === 'template' || item.memo_provenance === 'duplicate'
        ? { code: 'PLT', cls: 'text-text-muted border border-dashed border-border', title: isEs ? 'Plantilla de búsqueda — no narrativa' : 'Search template — not narrative' }
        : item.memo_provenance === 'stub'
          ? { code: 'STB', cls: 'text-text-muted/60 border border-border/60', title: isEs ? 'Esbozo de analista' : 'Analyst stub' }
          : null

  const webOn =
    item.web_evidence_verdict === 'SANCTION' || item.web_evidence_verdict === 'CORRUPTION_MENTION'

  const vigencia =
    firstYear != null && lastYear != null
      ? `'${String(firstYear).slice(2)}–'${String(lastYear).slice(2)}`
      : '—'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        'group border-b border-border/50 bg-background-card hover:bg-background-elevated/40 transition-colors cursor-pointer',
        'border-l-[3px] px-2.5',
        'flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5',
        'sm:grid sm:items-center sm:gap-x-2.5 sm:py-0 sm:min-h-[40px]',
        'sm:grid-cols-[44px_minmax(0,1fr)_50px_82px_30px_50px_40px_92px_56px_100px_18px]'
      )}
      style={{ borderLeftColor: dispo.railColor }}
    >
      {/* Nº + provenance eyebrow */}
      <span className="order-1 sm:order-none w-9 sm:w-auto shrink-0 leading-tight">
        <span className="block font-mono text-[13px] tabular-nums text-text-primary">
          {String(rank).padStart(3, '0')}
        </span>
        <span
          className="block font-mono text-[7.5px] uppercase tracking-[0.14em]"
          style={{ color: item.in_ground_truth ? 'var(--color-accent)' : isDisc ? 'var(--color-accent-data)' : 'var(--color-text-muted)' }}
          title={
            item.in_ground_truth
              ? isEs ? 'Anclado a caso documentado (GT)' : 'Anchored to documented case (GT)'
              : isDisc
                ? isEs ? 'Descubrimiento del modelo' : 'Model discovery'
                : undefined
          }
        >
          {item.in_ground_truth ? 'GT' : isDisc ? 'DISC' : '—'}
        </span>
      </span>

      {/* Identity */}
      <span className="order-2 sm:order-none min-w-0 flex-1 sm:flex-none" onClick={(e) => e.stopPropagation()}>
        <EntityIdentityChip
          type="vendor"
          id={item.vendor_id}
          name={item.vendor_name}
          size="sm"
          riskScore={item.avg_risk_score}
          sectorCode={item.primary_sector_name ?? null}
          hideIcon
          fullName
        />
      </span>

      {/* ·IPS mills — single ink, no ladder (W9) */}
      <span
        className="order-4 sm:order-none font-mono text-[13px] tabular-nums text-text-primary text-right"
        title={isEs ? `IPS ${item.ips_final?.toFixed(3) ?? '—'} · indicador de prioridad` : `IPS ${item.ips_final?.toFixed(3) ?? '—'} · priority indicator`}
      >
        {ipsMills(item.ips_final)}
      </span>

      {/* Driver tag — dominant IPS component (graft from La Procedencia) */}
      <span
        className="order-5 sm:order-none hidden min-[480px]:inline font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-secondary"
        title={driver ? (isEs ? DRIVER_META[driver].titleEs : DRIVER_META[driver].titleEn) : undefined}
      >
        {driver ? (isEs ? DRIVER_META[driver].es : DRIVER_META[driver].en) : ''}
      </span>

      {/* Pattern */}
      <span className="order-6 sm:order-none">
        {item.primary_pattern && (
          <span
            className={cn(
              'inline-block font-mono text-[13px] font-bold px-1 py-0.5 rounded-sm leading-none border',
              PATTERN_CHIP[item.primary_pattern] ?? PATTERN_CHIP.P5
            )}
          >
            {item.primary_pattern}
          </span>
        )}
      </span>

      {/* Corroboration tick matrix E·S·W */}
      <span className="order-7 sm:order-none inline-flex items-center gap-[5px]">
        <Tick on={!!item.is_efos_definitivo} color="var(--color-risk-critical)" code="E" title={isEs ? 'SAT EFOS definitivo' : 'SAT EFOS definitive'} />
        <Tick on={!!item.is_sfp_sanctioned} color="var(--color-risk-high)" code="S" title={isEs ? 'Sancionado por la SFP' : 'SFP sanctioned'} />
        <Tick on={webOn} color="#a06820" code="W" title={isEs ? 'Prensa CENTINELA' : 'CENTINELA press'} />
      </span>

      {/* Memo provenance */}
      <span className="order-8 sm:order-none">
        {memoChip && (
          <span
            className={cn('inline-block font-mono text-[8px] font-bold uppercase px-1 py-0.5 rounded-sm leading-none', memoChip.cls)}
            title={memoChip.title}
          >
            {memoChip.code}
          </span>
        )}
      </span>

      {/* Valor */}
      <span className="order-3 sm:order-none font-mono text-[13px] tabular-nums text-text-primary text-right whitespace-nowrap">
        {item.total_value_mxn ? formatCompactMXN(item.total_value_mxn) : '—'}
      </span>

      {/* Vigencia */}
      <span className="order-9 sm:order-none font-mono text-[13px] tabular-nums text-right whitespace-nowrap">
        <span className={cn(isActive ? 'text-risk-high' : isDormant ? 'text-text-muted/60' : 'text-text-muted')}>
          {vigencia}
        </span>
      </span>

      {/* Disposición — labeled estado cell, opens the expand's verdict band */}
      <span className="order-10 sm:order-none" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggle}
          className="w-full min-w-[88px] inline-flex items-center justify-center px-1.5 py-1 rounded-sm border border-border font-mono text-[8.5px] font-bold uppercase tracking-[0.08em] hover:border-border-hover transition-colors"
          style={{ color: dispo.color }}
          title={item.review_status ? `review_status: ${item.review_status}` : undefined}
          aria-label={
            isEs
              ? `Disposición de ${item.vendor_name ?? 'proveedor'}: ${dispo.es}. Abrir desglose.`
              : `Disposition of ${item.vendor_name ?? 'vendor'}: ${dispo.en}. Open breakdown.`
          }
        >
          {isEs ? dispo.es : dispo.en}
        </button>
      </span>

      {/* Caret */}
      <span
        className={cn('order-11 sm:order-none text-text-muted text-[12px] transition-transform', expanded && 'rotate-180')}
        aria-hidden="true"
      >
        ▾
      </span>
    </div>
  )
}
