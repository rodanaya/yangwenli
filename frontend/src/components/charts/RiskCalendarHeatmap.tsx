/**
 * RiskCalendarHeatmap — GitHub-style grid of procurement risk by month
 *
 * Each row = 1 year, each cell = 1 month.
 * Color intensity = average risk score.
 * Shows December budget-dump spikes and suspicious periods.
 *
 * Design: dark editorial (zinc-900 bg), risk-colored cells, monospace labels.
 */

import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { analysisApi } from '@/api/client'
import { RISK_COLORS } from '@/lib/constants'
import { getLocale } from '@/lib/utils'

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_ABBR_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DISPLAY_YEARS = Array.from({ length: 10 }, (_, i) => 2025 - i).reverse() // 2016-2025

// Tooltip chrome + no-data tones — centralized so future themes can swap
// in dark/cream-light variants without editing every cell + tooltip.
const CHART_TOKENS = {
  // No-data / empty cell tones (two explicit shades — kept here, not inlined)
  noDataFill: '#f3f1ec',       // elevated cream — month has 0 contracts
  veryLowFill: '#e2ddd6',      // warm border gray — risk < 0.15
  lowFill: '#d4cfc7',          // light zinc — risk < 0.25
  // Tooltip chrome
  tooltipBg: '#1a1714',
  tooltipBorder: '#3f3f46',
  // December outline
  decemberOutline: RISK_COLORS.low,
  // December annotation
  decemberAccent: '#ea580c',
  // Peak December dot inside the cell
  peakDecemberDot: '#1a1714',
} as const

// Risk color ramp — cream-mode, bible §2 (NO green for low; zinc for low).
// Breakpoints aligned to v0.8.5: low<0.25, medium<0.40, high<0.60, critical>=0.60
function riskToColor(risk: number): string {
  if (risk === 0) return CHART_TOKENS.noDataFill         // elevated cream — no data
  if (risk < 0.15) return CHART_TOKENS.veryLowFill        // warm border gray — very low
  if (risk < 0.25) return CHART_TOKENS.lowFill            // light zinc — low
  if (risk < 0.40) return RISK_COLORS.medium              // medium (bible)
  if (risk < 0.60) return RISK_COLORS.high                // high (bible)
  return RISK_COLORS.critical                             // critical (bible)
}

function riskLabel(risk: number, isEs: boolean): string {
  if (risk < 0.25) return isEs ? 'Bajo' : 'Low'
  if (risk < 0.40) return isEs ? 'Medio' : 'Medium'
  if (risk < 0.60) return isEs ? 'Alto' : 'High'
  return isEs ? 'Crítico' : 'Critical'
}

interface TooltipData {
  year: number
  month: number
  risk: number
  contracts: number
  value: number
}

export function RiskCalendarHeatmap() {
  const [tooltip, setTooltip] = useState<(TooltipData & { x: number; y: number }) | null>(null)
  const { i18n } = useTranslation()
  const isES = i18n.language?.startsWith('es') ?? true

  // Fetch all years in parallel
  const results = useQueries({
    queries: DISPLAY_YEARS.map(year => ({
      queryKey: ['monthly-breakdown', year],
      queryFn: () => analysisApi.getMonthlyBreakdown(year),
      staleTime: 30 * 60 * 1000,
    })),
  })

  const isLoading = results.some(r => r.isLoading)

  const yearData = useMemo(() => {
    return DISPLAY_YEARS.map((year, i) => ({
      year,
      months: results[i]?.data?.months ?? [],
    }))
  }, [results])

  // Find the year with the highest December risk — "budget avalanche" peak
  const peakDecemberYear = useMemo(() => {
    let bestYear: number | null = null
    let bestRisk = 0
    for (const { year, months } of yearData) {
      const dec = months[11]
      if (dec && dec.contracts > 0 && dec.avg_risk > bestRisk) {
        bestRisk = dec.avg_risk
        bestYear = year
      }
    }
    return bestYear
  }, [yearData])

  if (isLoading) return <Skeleton className="h-48 w-full bg-background-elevated" />

  const CELL_W = 28, CELL_H = 18, GAP = 3
  const LABEL_W = 36
  // December is month index 11. Each cell occupies CELL_W + GAP horizontally.
  // The grid row uses `ml-1` (4px) after the year label of width LABEL_W.
  const decemberLeft = LABEL_W + 4 + 11 * (CELL_W + GAP)
  const decemberCenter = decemberLeft + CELL_W / 2

  return (
    <div className="overflow-x-auto">
      <div className="relative pt-10">
        {/* December annotation callout — JBM-style: a labeled spike, not silent data */}
        <div
          className="pointer-events-none absolute top-0 flex flex-col items-center"
          style={{
            left: decemberCenter,
            transform: 'translateX(-50%)',
            width: 180,
          }}
        >
          <div
            className="font-mono leading-tight text-center whitespace-nowrap"
            style={{ fontSize: 13, color: CHART_TOKENS.decemberAccent }}
          >
            {isES ? '↑ 64% más riesgo en diciembre' : '↑ 64% higher risk in December'}
          </div>
          <div
            className="font-mono leading-tight text-center text-text-muted mt-0.5"
            style={{ fontSize: 7, maxWidth: 170 }}
          >
            {isES
              ? 'Cierre de presupuesto impulsa contratos de fin de año'
              : 'Presupuesto deadline drives year-end rush'}
          </div>
          {/* Tick connecting the label to the December column */}
          <div
            className="mt-0.5"
            style={{ width: 1, height: 6, backgroundColor: CHART_TOKENS.decemberAccent, opacity: 0.55 }}
          />
        </div>

        {/* Month headers */}
        <div className="flex ml-[36px] mb-1">
          {(isES ? MONTH_ABBR_ES : MONTH_ABBR).map(m => (
            <div
              key={m}
              className="text-[13px] font-mono text-text-muted text-center"
              style={{ width: CELL_W + GAP, flexShrink: 0 }}
            >
              {m}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-[3px]">
          {yearData.map(({ year, months }) => (
            <div key={year} className="flex items-center gap-0">
              <span
                className="text-[12px] font-mono text-text-muted text-right shrink-0 tabular-nums"
                style={{ width: LABEL_W }}
              >
                {year}
              </span>
              <div className="flex ml-1" style={{ gap: GAP }}>
                {Array.from({ length: 12 }, (_, mi) => {
                  const monthData = months[mi]
                  const risk = monthData?.avg_risk ?? 0
                  const contracts = monthData?.contracts ?? 0
                  const value = monthData?.value ?? 0
                  const isDecember = mi === 11
                  const isPeakDecember = isDecember && year === peakDecemberYear

                  return (
                    <div
                      key={mi}
                      className="rounded-[2px] cursor-default relative transition-all duration-150 hover:ring-1 hover:ring-zinc-400/30"
                      style={{
                        width: CELL_W,
                        height: CELL_H,
                        backgroundColor: contracts > 0 ? riskToColor(risk) : CHART_TOKENS.noDataFill,
                        outline: isDecember ? `1px solid ${CHART_TOKENS.decemberOutline}` : 'none',
                        outlineOffset: -1,
                      }}
                      onMouseEnter={(e) => {
                        if (contracts === 0) return
                        setTooltip({ year, month: mi + 1, risk, contracts, value, x: e.clientX, y: e.clientY })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {isPeakDecember && (
                        <span
                          aria-label={isES ? 'Pico de avalancha presupuestal' : 'Budget avalanche peak'}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono leading-none"
                          style={{ fontSize: 8, color: CHART_TOKENS.peakDecemberDot }}
                        >
                          ●
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Tooltip — dark editorial */}
        {tooltip && (
          <div
            className="fixed z-50 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-2xl"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              backgroundColor: CHART_TOKENS.tooltipBg,
              border: `1px solid ${CHART_TOKENS.tooltipBorder}`,
            }}
          >
            <p className="font-semibold text-text-primary font-mono">
              {(isES ? MONTH_ABBR_ES : MONTH_ABBR)[tooltip.month - 1]} {tooltip.year}
            </p>
            <p className="text-text-secondary mt-0.5">
              {isES ? 'Riesgo' : 'Risk'}:{' '}
              <span style={{ color: riskToColor(tooltip.risk) }} className="font-bold font-mono">
                {tooltip.risk.toFixed(3)}
              </span>{' '}
              <span className="text-text-muted">({riskLabel(tooltip.risk, isES)})</span>
            </p>
            <p className="text-text-secondary">
              {isES ? 'Contratos' : 'Contracts'}:{' '}
              <span className="text-text-primary font-mono">{tooltip.contracts.toLocaleString(getLocale())}</span>
            </p>
          </div>
        )}
      </div>

      {/* Legend — dark-mode risk palette */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] font-mono text-text-muted uppercase tracking-wide">
          {isES ? 'Riesgo' : 'Risk'}:
        </span>
        {[
          { labelEn: 'None', labelEs: 'Ninguno', color: CHART_TOKENS.noDataFill },
          { labelEn: 'Low', labelEs: 'Bajo', color: RISK_COLORS.low },
          { labelEn: 'Medium', labelEs: 'Medio', color: RISK_COLORS.medium },
          { labelEn: 'High', labelEs: 'Alto', color: RISK_COLORS.high },
          { labelEn: 'Critical', labelEs: 'Crítico', color: RISK_COLORS.critical },
        ].map(({ labelEn, labelEs, color }) => (
          <div key={labelEn} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: color, border: labelEn === 'None' ? `1px solid ${CHART_TOKENS.tooltipBorder}` : 'none' }}
            />
            <span className="text-[12px] font-mono text-text-muted">{isES ? labelEs : labelEn}</span>
          </div>
        ))}
        <span className="text-[12px] font-mono text-text-muted ml-2">
          {isES ? 'contorno = diciembre (cierre de año)' : 'outlined = December (budget year-end)'}
        </span>
      </div>
    </div>
  )
}
