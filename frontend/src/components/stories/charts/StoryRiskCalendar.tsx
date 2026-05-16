/**
 * StoryRiskCalendar — Editorial: a decade of risk mapped month by month
 *
 * GitHub-style heatmap grid: rows = years (2016-2025), cells = months.
 * Color intensity = average risk score. December consistently glows red.
 * The 2020 COVID procurement spike is visible as a horizontal red streak.
 */

import { useTranslation } from 'react-i18next'
import { RiskCalendarHeatmap } from '@/components/charts/RiskCalendarHeatmap'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StoryRiskCalendar() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('riskCalendar.kicker')}
      headline={t('riskCalendar.headline')}
      lede={t('riskCalendar.lede')}
      footer={t('riskCalendar.footer')}
      tone="bare"
    >
      {/* Annotation strip */}
      <div className="flex items-center gap-4 py-2 border-y border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-[10px] text-text-secondary">{t('riskCalendar.legendHigh')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400" />
          <span className="text-[10px] text-text-secondary">{t('riskCalendar.legendMedium')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-text-muted" />
          <span className="text-[10px] text-text-secondary">{t('riskCalendar.legendLow')}</span>
        </div>
        <span className="text-[10px] text-text-muted ml-auto">{t('riskCalendar.hoverHint')}</span>
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <RiskCalendarHeatmap />
      </div>

      {/* Year annotations */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-risk-critical/20 bg-risk-critical/5 p-3">
          <div className="text-[10px] font-mono text-risk-critical uppercase tracking-wide">{t('riskCalendar.covidLabel')}</div>
          <p className="text-xs text-text-secondary mt-1">
            {t('riskCalendar.covidBody')}
          </p>
        </div>
        <div className="rounded-lg border border-risk-high/20 bg-risk-high/5 p-3">
          <div className="text-[10px] font-mono text-risk-high uppercase tracking-wide">{t('riskCalendar.decemberLabel')}</div>
          <p className="text-xs text-text-secondary mt-1">
            {t('riskCalendar.decemberBody')}
          </p>
        </div>
      </div>
    </EditorialChartFrame>
  )
}
