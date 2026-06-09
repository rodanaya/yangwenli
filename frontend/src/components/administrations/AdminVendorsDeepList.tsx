/**
 * AdminVendorsDeepList — §IV TOP-100 DRILL-DOWN
 *
 * Lazy-fetched (mounts on open) ranked ledger of the top 100 beneficiaries for
 * a given administration era. Sortable by value / risk / contracts. Per-vendor
 * hand-rolled SVG sparkline (party hex, fixed width). EntityIdentityChip for
 * clickable dossier navigation.
 *
 * Props:
 *   era            — era slug (fox / calderon / pena_nieto / amlo / sheinbaum)
 *   eraColor       — party hex (passed from page's selectedMeta.color)
 *   isEs           — true → Spanish strings
 *   selectedDisplay — administration display name (for footer / aria)
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { Skeleton } from '@/components/ui/skeleton'
import { TableExportButton } from '@/components/TableExportButton'
import { formatCompactMXN } from '@/lib/utils'
import type { AdminVendorDeep } from '@/api/types'

// ── Token-or-hex guard (verbatim copy from AdminVendorBreakdown lines 53–56) ─
function resolveColor(color: string): string {
  return /^[a-z][a-z0-9-]*$/i.test(color) && !color.startsWith('#') && !color.startsWith('var(')
    ? `var(--color-${color})`
    : color
}

// ── Hand-rolled fixed-width sparkline (party hex, per-vendor min/max scale) ──
function TermSparkline({
  yearly,
  color,
  isEs,
}: {
  yearly: { year: number; total_mxn: number }[]
  color: string
  isEs: boolean
}) {
  if (yearly.length < 2) {
    return (
      <span className="block w-[56px] text-center text-[10px] font-mono text-text-muted">
        ·
      </span>
    )
  }
  const W = 56
  const H = 18
  const pad = 2
  const xs = yearly.map((y) => y.year)
  const vs = yearly.map((y) => y.total_mxn)
  const minV = Math.min(...vs)
  const maxV = Math.max(...vs)
  const span = maxV - minV || 1
  const xCoord = (i: number) => pad + (i / (yearly.length - 1)) * (W - 2 * pad)
  const yCoord = (v: number) => pad + (1 - (v - minV) / span) * (H - 2 * pad)
  const d = yearly
    .map((y, i) => `${i ? 'L' : 'M'}${xCoord(i).toFixed(1)} ${yCoord(y.total_mxn).toFixed(1)}`)
    .join(' ')
  const titleText = `${xs[0]}–${xs[xs.length - 1]}`
  const ariaLabel = isEs
    ? `Trayectoria anual ${titleText}`
    : `Yearly trajectory ${titleText}`
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="shrink-0 w-[56px]"
      role="img"
      aria-label={ariaLabel}
    >
      <title>{titleText}</title>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Sort key type ─────────────────────────────────────────────────────────────
type SortKey = 'value' | 'risk' | 'contracts'

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  era: string
  eraColor: string
  isEs: boolean
  selectedDisplay: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AdminVendorsDeepList({ era, eraColor, isEs, selectedDisplay }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('value')

  const eraColorResolved = resolveColor(eraColor)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analysis', 'admin-vendors-deep', era],
    queryFn: () => analysisApi.getAdminVendorsDeep(era, 100),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const vendors = data?.vendors ?? []
  const vendorCount = data?.vendor_count ?? 0
  const termTotalMxn = data?.term_total_mxn ?? 0

  // Stable max for DotBar — uses raw value, not re-sorted position
  const valueMax = useMemo(
    () => (vendors.length > 0 ? Math.max(...vendors.map((v) => v.total_mxn)) : 1),
    [vendors]
  )

  const sorted = useMemo((): AdminVendorDeep[] => {
    const copy = [...vendors]
    if (sortKey === 'value') {
      copy.sort((a, b) => b.total_mxn - a.total_mxn)
    } else if (sortKey === 'risk') {
      copy.sort((a, b) => {
        const riskDiff = b.high_risk_pct - a.high_risk_pct
        if (riskDiff !== 0) return riskDiff
        return (b.avg_risk ?? 0) - (a.avg_risk ?? 0)
      })
    } else {
      copy.sort((a, b) => b.contracts - a.contracts)
    }
    return copy
  }, [vendors, sortKey])

  // ── CSV data (full sorted set, deterministic column order) ─────────────────
  const csvData = useMemo(
    () =>
      sorted.map((v, i) => ({
        [isEs ? 'rango' : 'rank']: i + 1,
        vendor_id: v.vendor_id,
        [isEs ? 'proveedor' : 'vendor']: v.vendor_name,
        [isEs ? 'valor_mxn' : 'value_mxn']: Math.round(v.total_mxn),
        [isEs ? 'pct_del_periodo' : 'share_pct']: v.share_pct.toFixed(2),
        [isEs ? 'contratos' : 'contracts']: v.contracts,
        [isEs ? 'riesgo_prom' : 'avg_risk']: (v.avg_risk ?? 0).toFixed(3),
        [isEs ? 'alto_riesgo_pct' : 'high_risk_pct']: v.high_risk_pct.toFixed(1),
        [isEs ? 'adj_directa_pct' : 'direct_award_pct']: v.direct_award_pct.toFixed(1),
      })),
    [sorted, isEs]
  )

  const csvColumns = isEs
    ? ['rango', 'vendor_id', 'proveedor', 'valor_mxn', 'pct_del_periodo', 'contratos', 'riesgo_prom', 'alto_riesgo_pct', 'adj_directa_pct']
    : ['rank', 'vendor_id', 'vendor', 'value_mxn', 'share_pct', 'contracts', 'avg_risk', 'high_risk_pct', 'direct_award_pct']

  // ── Sort tab config ─────────────────────────────────────────────────────────
  const sortTabs: { key: SortKey; es: string; en: string }[] = [
    { key: 'value', es: 'valor', en: 'Value' },
    { key: 'risk', es: 'riesgo', en: 'Risk' },
    { key: 'contracts', es: 'contratos', en: 'Contracts' },
  ]

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="text-sm text-text-muted py-6 text-center">
        {isEs ? 'No se pudo cargar el padrón completo.' : 'Could not load the full ledger.'}
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!vendors.length) {
    return (
      <div className="text-sm text-text-muted py-6 text-center">
        {isEs
          ? 'Sin proveedores registrados para este periodo.'
          : 'No vendors recorded for this term.'}
      </div>
    )
  }

  return (
    <div>
      {/* Header row — provenance + sort control + export */}
      <div className="flex items-center justify-between gap-3 py-2 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted tabular-nums">
          {vendorCount.toLocaleString()}{' '}
          {isEs ? 'proveedores activos' : 'active vendors'} ·{' '}
          {vendors.length}{' '}
          {isEs ? 'mostrados' : 'shown'}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {/* Sort segmented control */}
          <div
            role="group"
            aria-label={isEs ? 'Ordenar por' : 'Sort by'}
            className="inline-flex rounded-sm border border-border/60 overflow-hidden"
          >
            {sortTabs.map((tab, idx) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSortKey(tab.key)}
                aria-pressed={sortKey === tab.key}
                className={[
                  'px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors',
                  idx > 0 ? 'border-l border-border/40' : '',
                  sortKey === tab.key
                    ? 'bg-background-elevated font-semibold'
                    : 'text-text-muted hover:bg-background-elevated/40',
                ].join(' ')}
                style={sortKey === tab.key ? { color: eraColorResolved } : undefined}
              >
                {isEs ? tab.es : tab.en}
              </button>
            ))}
          </div>
          <TableExportButton
            data={csvData}
            columns={csvColumns}
            filename={`rubli-${era}-beneficiarios-top100`}
            className="shrink-0"
          />
        </div>
      </div>

      {/* Scrollable rows */}
      <div className="max-h-[560px] overflow-y-auto pr-1" role="list">
        {sorted.map((v, i) => {
          const isTopThree = i < 3
          return (
            <div
              key={v.vendor_id}
              role="listitem"
              className="group hover:bg-background-elevated/30 transition-colors"
            >
              {/* Main grid row */}
              <div className="grid grid-cols-[1.6rem_minmax(0,1fr)_56px_auto] items-center gap-x-3 py-2 border-b border-border/30 last:border-0">
                {/* 1. Rank */}
                <span
                  className={[
                    'w-[1.6rem] text-right text-[10px] font-mono tabular-nums',
                    isTopThree ? 'font-semibold' : 'text-text-muted/70',
                  ].join(' ')}
                  style={isTopThree ? { color: eraColorResolved } : undefined}
                >
                  {i + 1}
                </span>

                {/* 2. Identity + sub-facts */}
                <div className="min-w-0">
                  <EntityIdentityChip
                    type="vendor"
                    id={v.vendor_id}
                    name={v.vendor_name}
                    size="xs"
                    riskScore={v.avg_risk ?? undefined}
                    hideIcon={false}
                    className="min-w-0"
                  />
                  <div className="text-[10px] text-text-muted mt-0.5 font-mono tabular-nums">
                    {v.contracts.toLocaleString()}{' '}
                    {isEs ? 'contratos' : 'contracts'}
                    {' · '}
                    {v.high_risk_pct.toFixed(0)}%{' '}
                    {isEs ? 'alto riesgo' : 'high risk'}
                    {' · '}
                    {v.direct_award_pct.toFixed(0)}%{' '}
                    {isEs ? 'adj. dir.' : 'direct'}
                  </div>
                </div>

                {/* 3. Sparkline */}
                <TermSparkline yearly={v.yearly} color={eraColorResolved} isEs={isEs} />

                {/* 4. Share + value cluster */}
                <div className="w-[92px] text-right shrink-0">
                  <div
                    className="text-[13px] tabular-nums text-text-primary"
                    style={{ fontFamily: 'var(--font-family-serif)', fontStyle: 'italic', fontWeight: 700 }}
                  >
                    {formatCompactMXN(v.total_mxn)}
                  </div>
                  <div
                    className="text-[10px] font-mono tabular-nums text-text-muted"
                    title={isEs ? 'del periodo' : 'of term'}
                  >
                    {v.share_pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Value bar — indented under identity */}
              <div className="mt-1 ml-[1.6rem] pb-1">
                <DotBar
                  value={v.total_mxn}
                  max={valueMax}
                  color={eraColorResolved}
                  emptyColor="var(--color-background-elevated)"
                  emptyStroke="var(--color-border)"
                  dots={28}
                  dotR={2}
                  dotGap={5}
                  ariaLabel={`${formatCompactMXN(v.total_mxn)} · ${v.share_pct.toFixed(1)}% ${isEs ? 'del periodo' : 'of term'}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer legend */}
      <p className="text-[9px] font-mono text-text-muted/70 mt-2 leading-relaxed">
        {isEs
          ? `Participación = % del gasto del sexenio (${formatCompactMXN(termTotalMxn)} total, atípicos excluidos). La trayectoria autoescala por proveedor — compare la forma, no la altura entre filas.`
          : `Share = % of term spend (${formatCompactMXN(termTotalMxn)} total, outliers excluded). The trajectory auto-scales per vendor — compare the shape, not height across rows.`}
      </p>

      {/* Total / shown footer */}
      <p className="text-[9px] font-mono text-text-muted mt-1">
        {isEs
          ? `${vendors.length} de ${vendorCount.toLocaleString()} proveedores · ${selectedDisplay}`
          : `${vendors.length} of ${vendorCount.toLocaleString()} vendors · ${selectedDisplay}`}
      </p>
    </div>
  )
}
