/**
 * CategoryHoverDossier — §B4 register hover dossier for the /categories index.
 * Modeled on SectorHoverDossier's scaffold but with ZERO fetches: every value
 * comes from the summary row already in hand. Single floating instance per
 * register (the parent keys it by hovered category_id), pointer-events-none,
 * edge-flips above/below the register midline, focus-triggered too.
 *
 * Content: rank · EntityIdentityChip · spend sledge (Garamond italic 800) ·
 * share-of-total running bar · top_vendor chip · atom line (avg_risk via
 * intensityColor, DA% vs OCDE, single-bid %, contracts) · "Abrir dossier →".
 *
 * Hex colours ONLY via style={{}} (className hex is stripped). No green for low.
 */
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { SECTOR_COLORS, OECD_DIRECT_AWARD_LIMIT, getSectorName } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { CategorySummaryItem } from './types'
import { intensityColor } from './types'

const DA_LIMIT_PCT = OECD_DIRECT_AWARD_LIMIT * 100

export function CategoryHoverDossier({
  item,
  rank,
  totalValue,
  lang,
}: {
  item: CategorySummaryItem
  rank: number
  /** Sum of all categories' spend — for the share-of-total running bar. */
  totalValue: number
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const color = SECTOR_COLORS[item.sector_code] ?? SECTOR_COLORS.otros
  const riskCol = intensityColor(item.avg_risk)
  const sharePct = totalValue > 0 ? (item.total_value / totalValue) * 100 : 0
  const sbHot = item.single_bid_pct > 25
  const daOver = item.direct_award_pct > DA_LIMIT_PCT

  return (
    <div>
      {/* header: rank · sector */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color }}>
          #{String(rank).padStart(2, '0')}
        </span>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          {getSectorName(item.sector_code, lang)}
        </span>
        <span className="h-px flex-1" style={{ background: `${color}55` }} />
      </div>

      <div className="mb-2">
        <EntityIdentityChip
          type="category"
          id={item.category_id}
          name={isEs ? item.name_es : item.name_en}
          size="sm"
          sectorCode={item.sector_code}
        />
      </div>

      {/* spend sledge + share running bar */}
      <div className="flex items-baseline gap-2">
        <span
          className="tabular-nums"
          style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 1, color: 'var(--color-text-primary)' }}
        >
          {formatCompactMXN(item.total_value)}
        </span>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {isEs ? 'gasto' : 'spend'}
        </span>
      </div>
      <div className="mt-2">
        <div className="relative h-[10px] rounded-[1px] overflow-hidden" style={{ background: 'var(--color-background-elevated)' }}>
          <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, sharePct)}%`, background: color, opacity: 0.85 }} />
        </div>
        <div className="mt-1 font-mono tabular-nums flex items-center justify-between" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{sharePct.toFixed(1)}% {isEs ? 'del gasto total' : 'of total spend'}</span>
          <span>{formatNumber(item.total_contracts)} {isEs ? 'cont.' : 'contracts'}</span>
        </div>
      </div>

      {/* top vendor */}
      {item.top_vendor && (
        <div className="mt-2">
          <EntityIdentityChip type="vendor" id={item.top_vendor.id} name={item.top_vendor.name} size="xs" hideIcon sectorCode={item.sector_code} />
        </div>
      )}

      {/* atom line */}
      <div className="mt-2 font-mono tabular-nums flex items-center gap-x-2.5 gap-y-1 flex-wrap" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 9999, background: riskCol, flexShrink: 0 }} />
          <span style={{ color: riskCol, fontWeight: 700 }}>{item.avg_risk.toFixed(2)}</span>
          <span>{isEs ? 'riesgo' : 'risk'}</span>
        </span>
        <span className="whitespace-nowrap" style={{ color: daOver ? 'var(--color-text-secondary)' : undefined }}>
          {isEs ? 'AD' : 'DA'} {item.direct_award_pct.toFixed(0)}% · {isEs ? 'OCDE' : 'OECD'} {DA_LIMIT_PCT.toFixed(0)}%
        </span>
        <span className="whitespace-nowrap" style={{ color: sbHot ? 'var(--color-text-secondary)' : undefined }}>
          1P {item.single_bid_pct.toFixed(1)}%
        </span>
      </div>

      <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--color-border)' }}>
        <span className="font-mono" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>
          {isEs ? 'Abrir dossier →' : 'Open dossier →'}
        </span>
      </div>
    </div>
  )
}
