/**
 * SectorParadoxScatter — Scatter plot: Direct Award % vs High-Risk %
 *
 * X: Direct Award %, Y: High-Risk %, bubble size: total value (billions)
 * v6.5 live data (Apr 2026): Agricultura (93% DA) is now 29.73% high-risk
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

// Live data fallback — Apr 2026 (v6.5 risk model)
const SECTOR_SCATTER_DATA: SectorPoint[] = [
  { sector: 'agricultura',     directAwardPct: 93.4, highRiskPct: 29.73, avgRisk: 0.3693, totalBillions: 317.6,  contracts: 447708 },
  { sector: 'trabajo',         directAwardPct: 75.8, highRiskPct: 24.74, avgRisk: 0.3122, totalBillions: 97.1,   contracts: 48134 },
  { sector: 'defensa',         directAwardPct: 56.1, highRiskPct: 14.46, avgRisk: 0.2336, totalBillions: 280.5,  contracts: 78974 },
  { sector: 'energia',         directAwardPct: 55.6, highRiskPct: 13.49, avgRisk: 0.2598, totalBillions: 1957.9, contracts: 312931 },
  { sector: 'otros',           directAwardPct: 51.8, highRiskPct: 16.50, avgRisk: 0.2839, totalBillions: 41.0,   contracts: 28502 },
  { sector: 'salud',           directAwardPct: 63.7, highRiskPct: 12.01, avgRisk: 0.2794, totalBillions: 3070.3, contracts: 1085497 },
  { sector: 'tecnologia',      directAwardPct: 71.7, highRiskPct: 11.41, avgRisk: 0.2765, totalBillions: 81.7,   contracts: 51977 },
  { sector: 'hacienda',        directAwardPct: 78.5, highRiskPct: 8.98,  avgRisk: 0.2195, totalBillions: 618.9,  contracts: 138156 },
  { sector: 'infraestructura', directAwardPct: 31.3, highRiskPct: 8.72,  avgRisk: 0.2459, totalBillions: 2438.9, contracts: 321626 },
  { sector: 'ambiente',        directAwardPct: 44.3, highRiskPct: 8.29,  avgRisk: 0.2513, totalBillions: 290.6,  contracts: 91954 },
  { sector: 'gobernacion',     directAwardPct: 60.1, highRiskPct: 7.98,  avgRisk: 0.2431, totalBillions: 316.6,  contracts: 118907 },
  { sector: 'educacion',       directAwardPct: 78.0, highRiskPct: 4.64,  avgRisk: 0.2052, totalBillions: 371.0,  contracts: 333920 },
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
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="currentColor" fillOpacity={0.4} /></svg>
          <span>~40B MXN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity={0.4} /></svg>
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
      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
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
