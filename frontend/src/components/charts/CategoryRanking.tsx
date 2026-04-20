/**
 * CategoryRanking — editorial replacement for the 72-cell treemap.
 *
 * Design philosophy (NYT/FT investigative):
 * - Editorial hierarchy: top 5 categories rendered larger, 6-20 compact
 * - One clear story: where the money goes, ranked
 * - Warm-stone background with crimson risk emphasis only where it matters
 * - Sector color is a thin left accent bar, not a fill (removes noise)
 * - Risk badge appears only for medium+ risk — low risk stays quiet
 *
 * Replaces: CategoryTreemap (72 garish cells)
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'

interface RankingCategory {
  category_id: number
  name_es: string
  name_en: string
  sector_code: string | null
  total_value: number
  total_contracts: number
  avg_risk: number
  direct_award_pct: number
}

interface Props {
  categories: RankingCategory[]
  lang?: string
  limit?: number
  onSelect?: (id: number) => void
}

function pickName(c: RankingCategory, lang: string | undefined): string {
  return lang === 'en' ? (c.name_en || c.name_es) : (c.name_es || c.name_en)
}

export function CategoryRanking({ categories, lang, limit = 20, onSelect }: Props) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<number | null>(null)

  const ranked = useMemo(() => {
    return [...(categories ?? [])]
      .filter((c) => c.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, limit)
  }, [categories, limit])

  const maxValue = ranked[0]?.total_value ?? 1
  const totalOfRanked = useMemo(
    () => ranked.reduce((s, c) => s + c.total_value, 0),
    [ranked],
  )
  const totalAll = useMemo(
    () => (categories ?? []).reduce((s, c) => s + c.total_value, 0),
    [categories],
  )
  const sharePct = totalAll > 0 ? (totalOfRanked / totalAll) * 100 : 0

  if (!ranked.length) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-border/30 bg-background-card">
        <p className="text-xs text-text-muted font-mono">
          {lang === 'en' ? 'No category data' : 'Sin datos de categorías'}
        </p>
      </div>
    )
  }

  const handleClick = (id: number) => {
    if (onSelect) onSelect(id)
    else navigate(`/categories/${id}`)
  }

  const top5 = ranked.slice(0, 5)
  const rest = ranked.slice(5)

  return (
    <div className="space-y-6">
      {/* Share context band */}
      <div className="flex items-center justify-between gap-4 text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted/70 border-b border-border/30 pb-2">
        <span>
          {lang === 'en' ? 'Top' : 'Top'} {ranked.length} {lang === 'en' ? 'of' : 'de'} {categories.length}
        </span>
        <span className="text-text-muted/90">
          {formatCompactMXN(totalOfRanked)}
          <span className="text-text-muted/40 mx-1.5">·</span>
          <span className="text-amber-400/80 font-bold">{sharePct.toFixed(0)}%</span>
          <span className="text-text-muted/40 ml-1.5">
            {lang === 'en' ? 'of total spend' : 'del gasto total'}
          </span>
        </span>
      </div>

      {/* TIER 1 — Top 5 prominent rows */}
      <div className="space-y-2.5">
        {top5.map((cat, idx) => (
          <RankingRow
            key={cat.category_id}
            cat={cat}
            rank={idx + 1}
            maxValue={maxValue}
            lang={lang}
            prominent
            hovered={hovered === cat.category_id}
            onHover={() => setHovered(cat.category_id)}
            onLeave={() => setHovered(null)}
            onClick={() => handleClick(cat.category_id)}
          />
        ))}
      </div>

      {/* Divider */}
      {rest.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/50">
            {lang === 'en' ? 'Additional categories' : 'Categorías adicionales'}
          </span>
          <div className="flex-1 h-px bg-border/30" />
        </div>
      )}

      {/* TIER 2 — compact ranks 6-20 */}
      {rest.length > 0 && (
        <div className="space-y-1">
          {rest.map((cat, idx) => (
            <RankingRow
              key={cat.category_id}
              cat={cat}
              rank={idx + 6}
              maxValue={maxValue}
              lang={lang}
              hovered={hovered === cat.category_id}
              onHover={() => setHovered(cat.category_id)}
              onLeave={() => setHovered(null)}
              onClick={() => handleClick(cat.category_id)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 pt-3 border-t border-border/20 text-[10px] font-mono text-text-muted/50 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
          <span>{lang === 'en' ? 'Critical risk' : 'Riesgo crítico'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          <span>{lang === 'en' ? 'High risk' : 'Riesgo alto'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: '#a16207' }} />
          <span>{lang === 'en' ? 'Medium' : 'Medio'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-zinc-600/50" />
          <span>{lang === 'en' ? 'Baseline' : 'Base'}</span>
        </div>
        <span className="ml-auto opacity-60">
          {lang === 'en'
            ? 'Thin vertical bar = sector · click row for profile'
            : 'Barra vertical = sector · clic para perfil'}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// Single row — prominent or compact
// =============================================================================

function RankingRow({
  cat, rank, maxValue, lang, prominent = false, hovered, onHover, onLeave, onClick,
}: {
  cat: RankingCategory
  rank: number
  maxValue: number
  lang?: string
  prominent?: boolean
  hovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const sectorColor = cat.sector_code ? (SECTOR_COLORS[cat.sector_code] ?? '#64748b') : '#64748b'
  const riskLevel = getRiskLevelFromScore(cat.avg_risk)
  const riskColor = RISK_COLORS[riskLevel]
  const name = pickName(cat, lang)
  const barWidth = (cat.total_value / maxValue) * 100
  const isHighDA = cat.direct_award_pct > 70
  const isCritical = riskLevel === 'critical'
  const isHigh = riskLevel === 'high'
  const showRiskBadge = isCritical || isHigh || riskLevel === 'medium'

  if (prominent) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className="w-full text-left group relative rounded-lg border border-border/20 bg-background-card hover:border-border/50 transition-colors overflow-hidden"
        style={{
          borderLeft: `3px solid ${sectorColor}`,
          ...(hovered && { borderColor: 'rgba(239, 68, 68, 0.3)' }),
        }}
      >
        {/* Background value bar — subtle */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              backgroundColor: isCritical
                ? 'rgba(239, 68, 68, 0.08)'
                : isHigh
                  ? 'rgba(245, 158, 11, 0.06)'
                  : 'rgba(63, 63, 70, 0.18)',
            }}
          />
        </div>

        <div className="relative px-4 py-3 flex items-center gap-4">
          {/* Rank */}
          <div className="flex-shrink-0 w-8">
            <span
              className="font-mono font-bold text-2xl tabular-nums leading-none"
              style={{
                color: isCritical ? '#ef4444' : isHigh ? '#f59e0b' : 'rgba(228, 228, 231, 0.3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(rank).padStart(2, '0')}
            </span>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold text-text-primary leading-tight truncate"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {name}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-text-muted/70">
              <span className="uppercase tracking-wider capitalize">
                {cat.sector_code ?? 'otros'}
              </span>
              <span className="text-text-muted/30">·</span>
              <span>{formatNumber(cat.total_contracts)} {lang === 'en' ? 'contracts' : 'contratos'}</span>
              {isHighDA && (
                <>
                  <span className="text-text-muted/30">·</span>
                  <span className="text-amber-400/80">
                    {cat.direct_award_pct.toFixed(0)}% {lang === 'en' ? 'direct award' : 'adj. directa'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Value */}
          <div className="flex-shrink-0 text-right">
            <p className="font-mono font-bold text-lg text-text-primary tabular-nums leading-tight">
              {formatCompactMXN(cat.total_value)}
            </p>
            {showRiskBadge && (
              <p
                className="text-[10px] font-mono font-bold uppercase tracking-wider mt-0.5 tabular-nums"
                style={{ color: riskColor }}
              >
                {(cat.avg_risk * 100).toFixed(0)}% {lang === 'en' ? 'risk' : 'riesgo'}
              </p>
            )}
          </div>
        </div>
      </button>
    )
  }

  // Compact row for ranks 6-20
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="w-full text-left group relative py-1.5 px-2 rounded transition-colors hover:bg-background-elevated/30"
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        <span className="flex-shrink-0 w-6 text-right font-mono text-[11px] text-text-muted/40 tabular-nums">
          {rank}
        </span>

        {/* Sector tab */}
        <span
          className="flex-shrink-0 w-[3px] h-6 rounded-sm"
          style={{ backgroundColor: sectorColor, opacity: 0.75 }}
        />

        {/* Name */}
        <span className="flex-1 min-w-0 text-xs text-text-primary/90 group-hover:text-text-primary truncate transition-colors">
          {name}
        </span>

        {/* Dot-matrix bar */}
        {(() => {
          const N = 18, DR = 2.5, DG = 7.5
          const filled = Math.round((barWidth / 100) * N)
          const dotColor = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : riskLevel === 'medium' ? '#a16207' : 'rgba(113,113,122,0.6)'
          return (
            <svg viewBox={`0 0 ${N * DG} 8`} className="hidden md:block w-36 flex-shrink-0" style={{ height: 8 }} aria-hidden="true">
              {Array.from({ length: N }).map((_, i) => (
                <circle key={i} cx={i * DG + DR} cy={4} r={DR}
                  fill={i < filled ? dotColor : '#27272a'}
                  fillOpacity={i < filled ? (isCritical || isHigh ? 0.85 : 0.55) : 1}
                />
              ))}
            </svg>
          )
        })()}

        {/* Value */}
        <span className="flex-shrink-0 w-20 text-right font-mono font-bold text-xs text-text-primary tabular-nums">
          {formatCompactMXN(cat.total_value)}
        </span>

        {/* Risk */}
        <span
          className="flex-shrink-0 w-10 text-right font-mono text-[10px] tabular-nums"
          style={{ color: showRiskBadge ? riskColor : 'rgba(113, 113, 122, 0.5)' }}
        >
          {(cat.avg_risk * 100).toFixed(0)}%
        </span>
      </div>
    </button>
  )
}

export default CategoryRanking
