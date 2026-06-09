/**
 * AdminBuyersSection — §V LOS COMPRADORES / THE BUYERS
 *
 * Eager-fetched (no enabled gate) ranked list of the top spending institutions
 * for a given administration era. Concentration lede + share DotBars +
 * EntityIdentityChip with sector dot + FED marker. No risk scores on chips
 * (this is a spend map, not a corruption verdict on a ministry).
 *
 * Props:
 *   era            — era slug (fox / calderon / pena_nieto / amlo / sheinbaum)
 *   eraColor       — party hex (passed from page's selectedMeta.color)
 *   folderColor    — same party hex (explicit name for the concentration footer)
 *   adminTag       — display label e.g. "AMLO · 2018–2024"
 *   isEs           — true → Spanish strings
 *   selectedDisplay — administration display name
 *
 * The component renders the section BODY only. The integrator supplies the
 * outer ChapterKicker wrapper + h3 title.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { Skeleton } from '@/components/ui/skeleton'
import { TableExportButton } from '@/components/TableExportButton'
import { formatCompactMXN } from '@/lib/utils'
import { formatEntityName } from '@/lib/entity/format'
import type { AdminInstitutionBuyer } from '@/api/types'

// ── Token-or-hex guard (verbatim copy from AdminVendorBreakdown lines 53–56) ─
function resolveColor(color: string): string {
  return /^[a-z][a-z0-9-]*$/i.test(color) && !color.startsWith('#') && !color.startsWith('var(')
    ? `var(--color-${color})`
    : color
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  era: string
  eraColor: string
  folderColor: string
  adminTag: string
  isEs: boolean
  selectedDisplay: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AdminBuyersSection({
  era,
  eraColor,
  folderColor,
  isEs,
  selectedDisplay,
}: Props) {
  const eraColorResolved = resolveColor(eraColor)
  const folderColorResolved = resolveColor(folderColor)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analysis', 'admin-institutions', era],
    queryFn: () => analysisApi.getAdminInstitutions(era, 12),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const institutions = data?.institutions ?? []
  const institutionCount = data?.institution_count ?? 0
  const topNSharePct = data?.top_n_share_pct ?? 0

  // CSV data (full 12, deterministic column order)
  const csvData = useMemo(
    () =>
      institutions.map((inst: AdminInstitutionBuyer, i: number) => ({
        [isEs ? 'rango' : 'rank']: i + 1,
        institution_id: inst.institution_id,
        [isEs ? 'dependencia' : 'institution']: inst.institution_name,
        [isEs ? 'siglas' : 'acronym']: inst.siglas ?? '',
        [isEs ? 'federal' : 'federal']: inst.is_federal === 1 ? (isEs ? 'Sí' : 'Yes') : (isEs ? 'No' : 'No'),
        [isEs ? 'valor_mxn' : 'value_mxn']: Math.round(inst.total_mxn),
        [isEs ? 'pct_del_periodo' : 'share_pct']: inst.share_pct.toFixed(2),
        [isEs ? 'contratos' : 'contracts']: inst.contracts,
        [isEs ? 'adj_directa_pct' : 'direct_award_pct']: inst.direct_award_pct.toFixed(1),
        [isEs ? 'sector' : 'top_sector']: inst.top_sector_code ?? '',
      })),
    [institutions, isEs]
  )

  const csvColumns = isEs
    ? ['rango', 'institution_id', 'dependencia', 'siglas', 'federal', 'valor_mxn', 'pct_del_periodo', 'contratos', 'adj_directa_pct', 'sector']
    : ['rank', 'institution_id', 'institution', 'acronym', 'federal', 'value_mxn', 'share_pct', 'contracts', 'direct_award_pct', 'top_sector']

  // ── Concentration lede ─────────────────────────────────────────────────────
  const topInst = institutions[0]
  const topSiglasOrName = topInst
    ? (topInst.siglas ?? formatEntityName('institution', topInst.institution_name, 'sm'))
    : ''

  // Share-of-leader max for DotBar
  const shareMax = institutions[0]?.share_pct ?? 1

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="text-sm text-text-muted py-4 text-center">
        {isEs ? 'No se pudo cargar a los compradores.' : 'Could not load the buyers.'}
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!institutions.length) {
    return (
      <div className="text-sm text-text-muted py-4 text-center">
        {isEs
          ? 'Sin compradores registrados para este periodo.'
          : 'No buyers recorded for this term.'}
      </div>
    )
  }

  return (
    <div>
      {/* Export button — placed top-right, mirrors §II pattern */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          {/* Concentration lede — only when we have meaningful data */}
          {topNSharePct > 0 && (
            <p className="text-[11px] font-mono leading-relaxed text-text-secondary">
              {isEs ? (
                <>
                  Las {institutions.length} principales dependencias concentran el{' '}
                  <span style={{ color: folderColorResolved }} className="font-semibold tabular-nums">
                    {topNSharePct.toFixed(0)}%
                  </span>{' '}
                  del gasto del periodo — encabezadas por {topSiglasOrName}.
                </>
              ) : (
                <>
                  The top {institutions.length} agencies concentrate{' '}
                  <span style={{ color: folderColorResolved }} className="font-semibold tabular-nums">
                    {topNSharePct.toFixed(0)}%
                  </span>{' '}
                  of term spending — led by {topSiglasOrName}.
                </>
              )}
            </p>
          )}
        </div>
        <TableExportButton
          data={csvData}
          columns={csvColumns}
          filename={`rubli-${era}-compradores`}
          className="shrink-0"
        />
      </div>

      {/* Institution rows */}
      <ul className="space-y-2" role="list">
        {institutions.map((inst: AdminInstitutionBuyer, i: number) => {
          const isTopThree = i < 3
          return (
            <li key={inst.institution_id}>
              {/* Main grid row */}
              <div className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-x-3 group hover:bg-background-elevated/30 transition-colors">
                {/* 1. Rank */}
                <span
                  className={[
                    'text-[10px] font-mono tabular-nums text-right',
                    isTopThree ? 'font-semibold' : 'text-text-muted/70',
                  ].join(' ')}
                  style={isTopThree ? { color: eraColorResolved } : undefined}
                >
                  {i + 1}
                </span>

                {/* 2. Identity — chip + FED marker */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <EntityIdentityChip
                      type="institution"
                      id={inst.institution_id}
                      name={inst.siglas || inst.institution_name}
                      size="xs"
                      sectorCode={inst.top_sector_code ?? undefined}
                      className="min-w-0"
                    />
                    {inst.is_federal === 1 && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted/70 border border-border/50 rounded-sm px-1 leading-tight shrink-0"
                        title={isEs ? 'Dependencia federal' : 'Federal entity'}
                      >
                        FED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 font-mono tabular-nums">
                    {inst.contracts.toLocaleString()}{' '}
                    {isEs ? 'contratos' : 'contracts'}
                    {' · '}
                    {inst.direct_award_pct.toFixed(0)}%{' '}
                    {isEs ? 'adj. dir.' : 'direct'}
                  </div>
                </div>

                {/* 3. Share + value */}
                <div className="w-[92px] text-right shrink-0">
                  <div
                    className="text-[13px] tabular-nums text-text-primary"
                    style={{ fontFamily: 'var(--font-family-serif)', fontStyle: 'italic', fontWeight: 700 }}
                  >
                    {formatCompactMXN(inst.total_mxn)}
                  </div>
                  <div
                    className="text-[10px] font-mono tabular-nums text-text-muted"
                    title={isEs ? 'del gasto del periodo' : 'of term spending'}
                  >
                    {inst.share_pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Share bar — indented under identity */}
              <div className="mt-1 ml-[1.6rem]">
                <DotBar
                  value={inst.share_pct}
                  max={shareMax}
                  color={eraColorResolved}
                  emptyColor="var(--color-background-elevated)"
                  emptyStroke="var(--color-border)"
                  dots={24}
                  dotR={2.5}
                  dotGap={6}
                  ariaLabel={`${inst.share_pct.toFixed(1)}% ${isEs ? 'del gasto del periodo' : 'of term spending'}`}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {/* Concentration footer */}
      <div className="mt-3 pt-2 border-t border-border/30 flex items-baseline justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-muted">
          {isEs
            ? `Concentración · top ${institutions.length}`
            : `Concentration · top ${institutions.length}`}
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className="text-base tabular-nums"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontStyle: 'italic',
              fontWeight: 700,
              color: folderColorResolved,
            }}
          >
            {topNSharePct.toFixed(0)}%
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            {isEs ? 'del gasto' : 'of spend'}
          </span>
        </div>
      </div>
      <p className="text-[9px] font-mono text-text-muted/70">
        {institutionCount.toLocaleString()}{' '}
        {isEs ? 'dependencias compradoras en el periodo' : 'buying agencies in the term'}
      </p>

      {/* Footer legend */}
      <p className="text-[9px] font-mono text-text-muted/70 mt-2">
        {isEs
          ? '● = sector dominante · FED = dependencia federal · barra = % del gasto del periodo'
          : '● = agency top sector · FED = federal agency · bar = % of term spend'}
      </p>

      {/* Source attribution */}
      <p className="text-[9px] font-mono text-text-muted/70 mt-1">
        {selectedDisplay}
      </p>
    </div>
  )
}
