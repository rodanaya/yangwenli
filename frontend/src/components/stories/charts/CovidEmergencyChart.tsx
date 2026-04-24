import { motion } from 'framer-motion'
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background-card p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Emergencia sanitaria
      </p>
      <h3 className="text-lg font-bold text-text-primary leading-tight mb-0.5">
        COVID-19 no creo la crisis — la acelero
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Adj. Directa subio durante la pandemia pero nunca bajo despues. Licitacion unica alcanzo 19.1% en 2021.
      </p>

      {/* Key stat callout */}
      <div className="flex gap-4 mb-4">
        <div className="border-l-2 pl-3 py-0.5" style={{ borderColor: 'var(--color-risk-critical)' }}>
          <p className="text-2xl font-mono font-bold" style={{ color: 'var(--color-risk-critical)' }}>+5.7 pts</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">DA 2017 a 2023</p>
        </div>
        <div className="border-l-2 pl-3 py-0.5" style={{ borderColor: 'var(--color-sector-trabajo)' }}>
          <p className="text-2xl font-mono font-bold" style={{ color: 'var(--color-sector-trabajo)' }}>19.1%</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">Licitacion unica pico 2021</p>
        </div>
      </div>

      <EditorialComposedChart<CovidRow>
        data={data}
        xKey="year"
        layers={
          [
            { kind: 'area', key: 'da', label: 'Adj. Directa %', colorToken: 'risk-critical', axis: 'left' },
            { kind: 'line', key: 'single_bid', label: 'Licitacion unica %', colorToken: 'sector-trabajo', axis: 'right' },
          ] as ComposedLayer<CovidRow>[]
        }
        yFormat="pct"
        rightYFormat="pct"
        yDomain={[70, 85]}
        rightYDomain={[14, 22]}
        annotations={
          [
            { kind: 'band', x1: '2020', x2: '2021', label: 'COVID-19', tone: 'crisis' },
          ] as ChartAnnotation[]
        }
        height={260}
      />

      {/* Legend — manual, cleaner than Recharts Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: 'var(--color-risk-critical)' }} />
          <span className="text-[10px] font-mono text-text-muted">Adj. Directa %</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-sector-trabajo)' }} />
          <span className="text-[10px] font-mono text-text-muted">Licitacion unica %</span>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-text-muted text-right font-mono">
        Fuente: COMPRANET 2017-2023 · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
