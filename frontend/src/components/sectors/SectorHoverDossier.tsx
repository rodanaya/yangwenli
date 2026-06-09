/**
 * SectorDossierCard — the §D hover dossier of /sectors WHO (Confounded
 * Ledger redesign). The /categories ConcentrationExhibit pattern, applied to
 * the audited register: own-spend sledgehammer, running-total bar (carrying
 * the crit/high split removed from §B's dot), the old line-2 atoms as
 * separated mono, and a LAZY footer — top contract + GT linkage fetched only
 * when the card is active (react-query `enabled` gate; nothing eager).
 *
 * Rendered two ways by ExposureLedger:
 *   - desktop: inside a floating, edge-flipping, pointer-events-none panel
 *   - mobile:  inline, inside the row's tap-to-expand block
 */
import { useQuery } from '@tanstack/react-query'
import { sectorApi } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import type { LedgerRow } from './ExposureLedger'
import { intensityColor, compactCount } from './ExposureLedger'
import { ownSpendShare } from './confoundScales'

export function SectorDossierCard({
  row,
  rankVar,
  totalRows,
  lang,
  active,
}: {
  row: LedgerRow
  rankVar: number
  totalRows: number
  lang: 'en' | 'es'
  active: boolean
}) {
  const isEs = lang === 'es'
  const share = ownSpendShare(row)
  const sledgeColor = intensityColor(row.avgRiskScore)
  const critFrac = row.varMxn > 0 ? Math.max(0, Math.min(1, row.criticalMxn / row.varMxn)) : 0
  const critPct = row.contracts > 0 ? (row.criticalCount / row.contracts) * 100 : 0
  const sbHot = row.sbPct > 25

  const { data: topContracts, isLoading: tcLoading } = useQuery({
    queryKey: ['sectors', 'top-contracts', row.sectorId],
    queryFn: () => sectorApi.getTopContracts(row.sectorId, 5),
    staleTime: 10 * 60 * 1000,
    enabled: active,
  })
  const { data: gt, isLoading: gtLoading } = useQuery({
    queryKey: ['sectors', 'gt-linkage', row.sectorId],
    queryFn: () => sectorApi.getGtLinkage(row.sectorId),
    staleTime: 10 * 60 * 1000,
    enabled: active,
  })

  const top = topContracts?.contracts?.[0]
  const lazyPending = tcLoading || gtLoading

  return (
    <div>
      {/* header: rank · name · var-rank */}
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span
          className="font-mono truncate"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-primary)' }}
        >
          {String(rankVar).padStart(2, '0')} · {row.name}
        </span>
        <span
          className="font-mono whitespace-nowrap"
          style={{ fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
        >
          VaR {rankVar} / {totalRows}
        </span>
      </div>

      {/* sledgehammer: own-spend share */}
      <div className="flex items-baseline gap-2">
        <span
          className="tabular-nums"
          style={{
            fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 30,
            lineHeight: 1,
            color: sledgeColor,
          }}
        >
          {(share * 100).toFixed(0)}%
        </span>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {isEs ? 'del gasto propio señalado' : 'of own spend model-flagged'}
        </span>
      </div>

      {/* running-total bar: VaR (crit + high tones) within total spend */}
      <div className="mt-2">
        <div className="relative h-[10px] rounded-[1px] overflow-hidden" style={{ background: 'var(--color-background-elevated)' }}>
          <div className="absolute inset-y-0 left-0 flex overflow-hidden" style={{ width: `${Math.min(100, share * 100)}%` }}>
            <span style={{ width: `${critFrac * 100}%`, background: RISK_COLORS.critical }} />
            <span className="flex-1" style={{ background: RISK_COLORS.high, opacity: 0.65 }} />
          </div>
        </div>
        <div className="mt-1 font-mono tabular-nums flex items-center justify-between" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{formatCompactMXN(row.varMxn)}</span>
          <span>{isEs ? 'de' : 'of'} {formatCompactMXN(row.totalMxn)}</span>
        </div>
      </div>

      {/* top institution */}
      {row.topInstitution && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <EntityIdentityChip
            type="institution"
            id={row.topInstitution.id}
            name={row.topInstitution.siglas || row.topInstitution.name}
            size="xs"
            hideIcon
          />
          <span className="font-mono tabular-nums" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
            · {row.topInstitution.sharePct.toFixed(0)}% {isEs ? 'del sector' : 'of sector'}
          </span>
        </div>
      )}

      {/* the old line-2 atoms, separated */}
      <div className="mt-2 font-mono tabular-nums flex items-center gap-x-2.5 gap-y-1 flex-wrap" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 1, background: RISK_COLORS.critical, flexShrink: 0 }} />
          {isEs ? 'crít' : 'crit'} {critPct.toFixed(1)}%
        </span>
        <span className="whitespace-nowrap">DA {row.daPct.toFixed(0)}%</span>
        <span className="whitespace-nowrap" style={{ color: sbHot ? RISK_COLORS.critical : undefined }}>
          1P {row.sbPct.toFixed(1)}%
        </span>
        <span className="whitespace-nowrap">
          {compactCount(row.contracts)} {isEs ? 'cont.' : 'contracts'} · {compactCount(row.vendors)} {isEs ? 'prov.' : 'vendors'}
        </span>
      </div>

      {/* lazy footer: largest contract + GT seal */}
      <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--color-border)' }}>
        {!active || lazyPending ? (
          <div className="space-y-1.5" aria-hidden="true">
            <div className="h-2.5 w-3/4 rounded-sm" style={{ background: 'var(--color-background-elevated)' }} />
            <div className="h-2.5 w-1/2 rounded-sm" style={{ background: 'var(--color-background-elevated)' }} />
          </div>
        ) : (
          <>
            {top && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono whitespace-nowrap" style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {isEs ? 'Mayor contrato' : 'Largest contract'}
                </span>
                <span className="font-mono tabular-nums whitespace-nowrap" style={{ fontSize: 10.5, color: 'var(--color-text-primary)' }}>
                  {formatCompactMXN(top.amount_mxn)}
                </span>
                {top.vendor_id != null && top.vendor_name && (
                  <EntityIdentityChip type="vendor" id={top.vendor_id} name={top.vendor_name} size="xs" hideIcon />
                )}
              </div>
            )}
            <div className="mt-1.5">
              {gt && gt.cases > 0 ? (
                <span
                  className="inline-block font-mono px-1.5 py-0.5 rounded-[1px]"
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: RISK_COLORS.high,
                    border: `1px solid ${RISK_COLORS.high}`,
                  }}
                >
                  ▣ {gt.cases} {isEs ? 'casos documentados' : 'documented cases'} · {gt.vendors} {isEs ? 'proveedores GT' : 'GT vendors'}
                </span>
              ) : (
                <span
                  className="font-mono"
                  style={{ fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
                >
                  {isEs ? 'Sin casos documentados en este sector' : 'No documented cases in this sector'}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
