/**
 * RiskRankBand — §B3.5 "LO QUE EL GASTO ESCONDE / WHAT SPENDING HIDES" of the
 * /categories index. The category-native sibling of /sectors' SelfCaptureBand.
 *
 * Computes, per category gated by the contract floor: spendRank (by total_value
 * desc) and riskRank (by avg_risk desc); delta = spendRank − riskRank. Surfaces
 * the THREE largest positive deltas — categories that sit deep in the money book
 * but burn hot on the risk indicator. Selection is computed, never hardcoded: if
 * the data shifts, the honor roll shifts.
 *
 * Hex colours ONLY via style={{}} (className hex is stripped). No green for low
 * (Bible §3.10) — risk colour comes from intensityColor.
 */
import { useMemo } from 'react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { OECD_DIRECT_AWARD_LIMIT } from '@/lib/constants'
import type { CategorySummaryItem } from './types'
import { CONTRACT_FLOOR, intensityColor } from './types'

const DA_LIMIT_PCT = OECD_DIRECT_AWARD_LIMIT * 100

interface RankPick {
  item: CategorySummaryItem
  spendRank: number
  riskRank: number
  delta: number
}

export function RiskRankBand({ items, lang }: { items: CategorySummaryItem[]; lang: 'en' | 'es' }) {
  const isEs = lang === 'es'

  const picks = useMemo<RankPick[]>(() => {
    const qualified = items.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
    if (qualified.length === 0) return []
    const bySpend = [...qualified].sort((a, b) => b.total_value - a.total_value)
    const byRisk = [...qualified].sort((a, b) => b.avg_risk - a.avg_risk)
    const spendRankById = new Map(bySpend.map((c, i) => [c.category_id, i + 1]))
    const riskRankById = new Map(byRisk.map((c, i) => [c.category_id, i + 1]))
    return qualified
      .map((item) => {
        const spendRank = spendRankById.get(item.category_id)!
        const riskRank = riskRankById.get(item.category_id)!
        return { item, spendRank, riskRank, delta: spendRank - riskRank }
      })
      .filter((p) => p.delta > 0)
      .sort((a, b) => b.delta - a.delta || b.item.avg_risk - a.item.avg_risk)
      .slice(0, 3)
  }, [items])

  if (picks.length === 0) return null

  return (
    <section
      aria-label={isEs ? 'Lo que el gasto esconde' : 'What spending hides'}
      className="mb-6 pb-6 border-b border-border"
    >
      <p
        className="font-mono mb-3"
        style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
      >
        § {isEs ? 'Lo que el gasto esconde' : 'What spending hides'}
      </p>

      <div role="list">
        {picks.map(({ item, spendRank, riskRank, delta }) => {
          const riskCol = intensityColor(item.avg_risk)
          const hot = delta >= 10
          const vendorName = item.top_vendor?.name ?? null
          return (
            <div
              key={item.category_id}
              role="listitem"
              className="grid items-center gap-x-3 sm:gap-x-4 py-2.5 border-b border-border last:border-b-0"
              style={{ gridTemplateColumns: '76px minmax(0,1fr) auto' }}
            >
              {/* rank-delta chip */}
              <div className="flex flex-col items-start">
                <span
                  className="font-mono tabular-nums whitespace-nowrap"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: hot ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}
                >
                  {String(spendRank).padStart(2, '0')}→{String(riskRank).padStart(2, '0')}
                </span>
                <span
                  className="font-mono whitespace-nowrap"
                  style={{ fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
                >
                  {isEs ? `▲ ${delta} ${delta === 1 ? 'puesto' : 'puestos'}` : `▲ ${delta} ${delta === 1 ? 'rank' : 'ranks'}`}
                </span>
              </div>

              {/* name + atoms */}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <EntityIdentityChip
                    type="category"
                    id={item.category_id}
                    name={isEs ? item.name_es : item.name_en}
                    size="sm"
                    sectorCode={item.sector_code}
                    riskScore={item.avg_risk}
                  />
                  {item.top_vendor && vendorName && (
                    <EntityIdentityChip
                      type="vendor"
                      id={item.top_vendor.id}
                      name={vendorName}
                      size="xs"
                      hideIcon
                      sectorCode={item.sector_code}
                    />
                  )}
                  <span className="font-mono tabular-nums" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
                    {isEs ? 'AD' : 'DA'} {item.direct_award_pct.toFixed(0)}%
                    {item.direct_award_pct > DA_LIMIT_PCT && (
                      <span style={{ color: 'var(--color-text-secondary)' }}> · {isEs ? 'OCDE' : 'OECD'} {DA_LIMIT_PCT.toFixed(0)}%</span>
                    )}
                  </span>
                </div>
              </div>

              {/* risk sledge */}
              <div className="text-right">
                <div
                  className="tabular-nums"
                  style={{
                    fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 22,
                    lineHeight: 1,
                    color: riskCol,
                  }}
                >
                  {item.avg_risk.toFixed(2)}
                </div>
                <div
                  className="font-mono mt-0.5"
                  style={{ fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
                >
                  {isEs ? 'indicador de riesgo' : 'risk indicator'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* editorial callout */}
      <p
        className="mt-3"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--color-text-secondary)',
        }}
      >
        {isEs
          ? 'Estas categorías pesan poco en el libro del gasto pero queman caliente en el indicador. El orden por valor las entierra; el riesgo las expone.'
          : 'These categories weigh little in the spending book but burn hot on the indicator. The value ranking buries them; risk exposes them.'}
      </p>
    </section>
  )
}
