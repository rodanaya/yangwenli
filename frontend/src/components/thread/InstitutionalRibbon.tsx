/**
 * InstitutionalRibbon — second graph in the Network chapter.
 * Extracted from RedThread.tsx.
 *
 * Each institution gets one horizontal lane spanning [first_year, last_year].
 * Ribbon thickness encodes log(value); ribbon color encodes avg_risk.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, formatCompactMXN, getRiskLevel } from '@/lib/utils'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

// ─── Local constants ─────────────────────────────────────────────────────────

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface InstitutionalRibbonProps {
  institutions: Array<{
    institution_id: number
    institution_name: string
    institution_type?: string
    contract_count: number
    total_value_mxn: number
    avg_risk_score?: number
    first_year?: number
    last_year?: number
  }>
  vendorFirstYear: number
  vendorLastYear: number
  /** Unused — component calls useTranslation internally. Accepted for call-site compatibility. */
  i18n?: unknown
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InstitutionalRibbon({
  institutions,
  vendorFirstYear,
  vendorLastYear,
}: InstitutionalRibbonProps) {
  const { t } = useTranslation('redThread')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const sorted = [...institutions]
    .filter((inst) => inst.total_value_mxn > 0)
    .sort((a, b) => b.total_value_mxn - a.total_value_mxn)
    .slice(0, 12)

  if (sorted.length === 0) return null

  const minYear = Math.min(...sorted.map((i) => i.first_year ?? vendorFirstYear), vendorFirstYear)
  const maxYear = Math.max(...sorted.map((i) => i.last_year ?? vendorLastYear), vendorLastYear)
  const yearSpan = Math.max(1, maxYear - minYear + 1)

  const maxValue = Math.max(...sorted.map((i) => i.total_value_mxn), 1)
  const logMaxValue = Math.log(maxValue + 1)

  const totalValue = sorted.reduce((s, i) => s + i.total_value_mxn, 0)
  const topShare = (sorted[0].total_value_mxn / totalValue) * 100

  const colorOf = (risk: number) => RISK_DOT_COLORS[getRiskLevel(risk)]
  const ribbonHeight = (value: number) => 6 + (Math.log(value + 1) / logMaxValue) * 18

  const axisYears: number[] = []
  const yearTickCount = 5
  for (let i = 0; i < yearTickCount; i++) {
    axisYears.push(Math.round(minYear + ((yearSpan - 1) * i) / (yearTickCount - 1)))
  }
  const uniqueAxisYears = Array.from(new Set(axisYears))

  return (
    <div>
      {/* Year axis at top */}
      <div className="relative pb-2 border-b border-border mb-2">
        <div className="grid items-end" style={{ gridTemplateColumns: 'minmax(180px, 280px) 1fr 110px', gap: '12px' }}>
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {t('institutional.label')}
          </span>
          <div className="relative h-3">
            {uniqueAxisYears.map((y) => {
              const xPct = ((y - minYear) / (yearSpan - 1)) * 100
              return (
                <span
                  key={y}
                  className="absolute -translate-x-1/2 text-[9px] font-mono tabular-nums text-text-muted"
                  style={{ left: `${xPct}%`, top: 0 }}
                >
                  {y}
                </span>
              )
            })}
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted text-right">
            {t('institutional.valueContracts')}
          </span>
        </div>
      </div>

      {/* Lanes */}
      <div className="space-y-1">
        {sorted.map((inst, idx) => {
          const start = inst.first_year ?? minYear
          const end = inst.last_year ?? maxYear
          const startPctRaw = ((start - minYear) / Math.max(yearSpan - 1, 1)) * 100
          const startPct = Math.max(0, Math.min(100, startPctRaw))
          const widthRaw = Math.max(2.5, ((end - start + 1) / yearSpan) * 100)
          const widthPct = Math.max(2.5, Math.min(widthRaw, 100 - startPct))
          const risk = inst.avg_risk_score ?? 0
          const color = colorOf(risk)
          const height = ribbonHeight(inst.total_value_mxn)
          const isHover = hoverIdx === idx

          return (
            <div
              key={inst.institution_id}
              className="block group"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <div
                className={cn(
                  'grid items-center py-1 px-1 rounded-sm transition-colors',
                  isHover ? 'bg-background-elevated' : ''
                )}
                style={{ gridTemplateColumns: 'minmax(180px, 280px) 1fr 110px', gap: '12px' }}
              >
                {/* Institution name */}
                <div className="min-w-0">
                  <EntityIdentityChip
                    type="institution"
                    id={inst.institution_id}
                    name={inst.institution_name}
                    size="sm"
                    hideIcon
                  />
                  {inst.institution_type && (
                    <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-text-muted truncate">
                      {inst.institution_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                  )}
                </div>

                {/* Lane — ribbon spans first→last year */}
                <div className="relative h-7 rounded-sm bg-background-elevated/40 border border-border/40">
                  <div className="absolute inset-y-0 left-0 right-0 my-auto h-px bg-border/30" />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-sm transition-all"
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      height: `${height}px`,
                      backgroundColor: color,
                      opacity: isHover ? 1 : 0.78,
                      boxShadow: isHover ? `0 0 6px 1px ${color}aa` : 'none',
                    }}
                  >
                    {widthPct > 12 && (
                      <span
                        className="absolute inset-y-0 left-1.5 flex items-center text-[9px] font-mono tabular-nums text-text-primary/90 whitespace-nowrap"
                        style={{ mixBlendMode: 'plus-lighter' }}
                      >
                        {start === end ? `${start}` : `${start}–${end}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Value + count badge */}
                <div className="text-right">
                  <div className="text-[11px] font-mono tabular-nums font-bold text-text-primary leading-tight">
                    {formatCompactMXN(inst.total_value_mxn)}
                  </div>
                  <div className="text-[9px] font-mono tabular-nums text-text-muted leading-tight">
                    {inst.contract_count}c · {Math.round(risk * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Concentration callout */}
      <p className="mt-3 text-xs text-text-secondary leading-relaxed">
        <span className="font-mono uppercase tracking-[0.12em] text-[10px] text-text-muted">
          {t('institutional.concentration')}
        </span>
        {' '}— {topShare.toFixed(0)}% →{' '}
        <EntityIdentityChip type="institution" id={sorted[0].institution_id} name={sorted[0].institution_name} size="xs" className="inline-flex align-middle" />
        {topShare > 50 && <span className="text-[var(--color-risk-critical)] font-medium"> {t('institutional.likelyCapture')}</span>}
      </p>
    </div>
  )
}
