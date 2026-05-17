import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'
import {
  EditorialComposedChart,
  type ComposedLayer,
  type ChartAnnotation,
} from '@/components/charts/editorial'

const data = [
  { year: '2017', da: 74.3, single_bid: 16.8 },
  { year: '2018', da: 76.2, single_bid: 17.2 },
  { year: '2019', da: 77.8, single_bid: 16.5 },
  { year: '2020', da: 78.1, single_bid: 18.3, covid: true },
  { year: '2021', da: 80.0, single_bid: 19.1, covid: true },
  { year: '2022', da: 79.1, single_bid: 17.9 },
  { year: '2023', da: 81.9, single_bid: 18.7 },
]

type CovidRow = (typeof data)[number]

export function CovidEmergencyChart() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('covidEmergency.kicker')}
      headline={t('covidEmergency.headline')}
      subline={t('covidEmergency.subline')}
      stats={[
        { value: t('covidEmergency.stat1Value'), label: t('covidEmergency.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('covidEmergency.stat2Value'), label: t('covidEmergency.stat2Label'), accent: 'var(--color-sector-trabajo)' },
      ]}
      footer={t('covidEmergency.footer')}
    >
      <EditorialComposedChart<CovidRow>
        data={data}
        xKey="year"
        layers={
          [
            { kind: 'area', key: 'da', label: t('covidEmergency.daSeries'), colorToken: 'risk-critical', axis: 'left' },
            { kind: 'line', key: 'single_bid', label: t('covidEmergency.singleBidSeries'), colorToken: 'sector-trabajo', axis: 'right' },
          ] as ComposedLayer<CovidRow>[]
        }
        yFormat="pct"
        rightYFormat="pct"
        yDomain={[70, 85]}
        rightYDomain={[14, 22]}
        annotations={
          [
            { kind: 'band', x1: '2020', x2: '2021', label: t('covidEmergency.covidBand'), tone: 'crisis' },
          ] as ChartAnnotation[]
        }
        height={260}
      />

      {/* Legend — manual, cleaner than Recharts Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: 'var(--color-risk-critical)' }} aria-hidden="true" />
          <span className="text-[10px] font-mono text-text-muted">{t('covidEmergency.daSeries')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-sector-trabajo)' }} aria-hidden="true" />
          <span className="text-[10px] font-mono text-text-muted">{t('covidEmergency.singleBidSeries')}</span>
        </div>
      </div>
    </EditorialChartFrame>
  )
}
