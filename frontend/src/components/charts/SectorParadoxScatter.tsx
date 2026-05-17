/**
 * SectorParadoxScatter — Scatter plot: Direct Award % vs High-Risk %
 *
 * X: Direct Award %, Y: High-Risk %, bubble size: total value (billions)
 * v0.8.5 live data (May 2026): Agricultura (93% DA) is now 29.73% high-risk
 * (Segalmex dominates GT training data). Salud (64% DA) = 12.01% but largest
 * absolute value at risk (MX$369B). DA rate alone does NOT predict risk level.
 *
 * Migrated to EditorialScatterChart (Apr 2026). Per-sector tinting via colorBy.
 * Note: in-chart "label under bubble" callouts are no longer rendered — sector
 * identity is conveyed via tooltip + token color. The editorial overlay
 * annotations below the chart preserve the narrative finding.
 */

import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { sectorApi } from '@/api/client'
import type { SectorStatistics } from '@/api/types'
import {
  EditorialScatterChart,
  type ColorToken,
} from '@/components/charts/editorial'

interface SectorPoint {
  sector: string
  directAwardPct: number
  highRiskPct: number
  avgRisk: number
  totalBillions: number
  contracts: number
}

const SECTOR_TOKEN_MAP: Record<string, ColorToken> = {
  salud: 'sector-salud',
  educacion: 'sector-educacion',
  infraestructura: 'sector-infraestructura',
  energia: 'sector-energia',
  defensa: 'sector-defensa',
  tecnologia: 'sector-tecnologia',
  hacienda: 'sector-hacienda',
  gobernacion: 'sector-gobernacion',
  agricultura: 'sector-agricultura',
  ambiente: 'sector-ambiente',
  trabajo: 'sector-trabajo',
  otros: 'sector-otros',
}

// Live data fallback — May 2026 (v0.8.5 risk model)
const SECTOR_SCATTER_DATA: SectorPoint[] = [
  { sector: 'trabajo',         directAwardPct: 75.8, highRiskPct: 15.54, avgRisk: 0.2536, totalBillions: 97.1,   contracts: 48155 },
  { sector: 'hacienda',        directAwardPct: 81.0, highRiskPct: 14.91, avgRisk: 0.2571, totalBillions: 618.9,  contracts: 134065 },
  { sector: 'educacion',       directAwardPct: 78.3, highRiskPct: 13.05, avgRisk: 0.2426, totalBillions: 371.0,  contracts: 333110 },
  { sector: 'tecnologia',      directAwardPct: 71.8, highRiskPct: 12.82, avgRisk: 0.2450, totalBillions: 81.7,   contracts: 51946 },
  { sector: 'salud',           directAwardPct: 63.8, highRiskPct: 11.69, avgRisk: 0.2398, totalBillions: 3070.3, contracts: 1084780 },
  { sector: 'gobernacion',     directAwardPct: 60.2, highRiskPct: 11.38, avgRisk: 0.2258, totalBillions: 316.6,  contracts: 118875 },
  { sector: 'defensa',         directAwardPct: 56.3, highRiskPct: 10.94, avgRisk: 0.2390, totalBillions: 280.5,  contracts: 78701 },
  { sector: 'energia',         directAwardPct: 55.6, highRiskPct: 10.08, avgRisk: 0.2387, totalBillions: 1957.9, contracts: 313005 },
  { sector: 'ambiente',        directAwardPct: 44.3, highRiskPct: 10.08, avgRisk: 0.2253, totalBillions: 290.6,  contracts: 91938 },
  { sector: 'otros',           directAwardPct: 52.1, highRiskPct: 9.75,  avgRisk: 0.2372, totalBillions: 41.0,   contracts: 28340 },
  { sector: 'agricultura',     directAwardPct: 93.6, highRiskPct: 8.67,  avgRisk: 0.2213, totalBillions: 317.6,  contracts: 446648 },
  { sector: 'infraestructura', directAwardPct: 31.3, highRiskPct: 7.84,  avgRisk: 0.2102, totalBillions: 2438.9, contracts: 321731 },
]

export function SectorParadoxScatter() {
  const { t } = useTranslation('procurement')

  const { data: sectorsData } = useQuery({
    queryKey: ['sectors-list'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 10 * 60 * 1000,
  })

  const scatterData: SectorPoint[] = sectorsData?.data?.map((s: SectorStatistics) => ({
    sector: s.sector_code,
    directAwardPct: Math.round(s.direct_award_pct * 10) / 10,
    highRiskPct: Math.round(s.high_risk_pct * 10) / 10,
    avgRisk: s.avg_risk_score,
    totalBillions: Math.round(s.total_value_mxn / 1e9 * 10) / 10,
    contracts: s.total_contracts,
  })) ?? SECTOR_SCATTER_DATA

  return (
    <div className="space-y-4" role="img" aria-label="Scatter chart: sector risk vs direct award rate, bubble size represents total contract value">
      {/* Size legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
        <span className="font-medium">Bubble size = total contract value</span>
        <div className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="14" height="14"><circle cx="7" cy="7" r="5" fill="currentColor" fillOpacity={0.4} /></svg>
          <span>~40B MXN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="24" height="24"><circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity={0.4} /></svg>
          <span>~3T MXN</span>
        </div>
      </div>

      <div className="relative h-80">
        <EditorialScatterChart<SectorPoint>
          data={scatterData}
          xKey="directAwardPct"
          yKey="highRiskPct"
          sizeKey="totalBillions"
          colorBy={(row) => SECTOR_TOKEN_MAP[row.sector] ?? 'neutral'}
          xFormat="pct"
          yFormat="pct"
          xLabel="Direct Award Rate (%)"
          yLabel="High-Risk Rate (%)"
          height={320}
        />

        {/* Manual annotation overlays — preserved from original editorial design */}
        <div
          className="absolute pointer-events-none text-[9px] leading-tight max-w-[110px]"
          style={{ right: 28, bottom: 60, color: 'var(--color-sector-agricultura)' }}
          aria-hidden
        >
          {t('sector_paradox.annotation_ag')}
        </div>

        <div
          className="absolute pointer-events-none text-[9px] leading-tight max-w-[110px]"
          style={{ left: 120, top: 55, color: 'var(--color-sector-salud)' }}
          aria-hidden
        >
          {t('sector_paradox.annotation_salud')}
        </div>
      </div>

      {/* Callout — editorial finding box */}
      <div className="rounded-sm border border-risk-high/20 bg-risk-high/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-text-primary leading-relaxed">
          {t('sector_paradox.callout')}
        </p>
      </div>
    </div>
  )
}
