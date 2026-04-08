/**
 * CategoryTreemap — ECharts treemap for 72 spending categories.
 *
 * Sized by total_value, colored by sector (SECTOR_COLORS).
 * Click a cell → navigate to /categories/:id (CategoryProfile).
 *
 * Design: dark editorial (zinc-900 bg), sector-colored cells, zinc-800 borders.
 */
import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'

interface TreemapCategory {
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
  categories: TreemapCategory[]
  height?: number
}

export function CategoryTreemap({ categories = [], height = 480 }: Props) {
  const navigate = useNavigate()

  const data = useMemo(() => {
    return (categories ?? [])
      .filter((c) => c.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .map((c) => {
        const color = c.sector_code ? SECTOR_COLORS[c.sector_code] ?? '#64748b' : '#64748b'
        return {
          name: c.name_es || c.name_en,
          value: c.total_value,
          categoryId: c.category_id,
          sectorCode: c.sector_code,
          contractCount: c.total_contracts,
          avgRisk: c.avg_risk,
          directAwardPct: c.direct_award_pct,
          itemStyle: {
            color,
            borderColor: '#18181b',
            borderWidth: 2,
            gapWidth: 2,
          },
        }
      })
  }, [categories])

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: '#09090b',
        borderColor: '#3f3f46',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
          color: '#f4f4f5',
          fontFamily: "ui-monospace, 'SF Mono', monospace",
          fontSize: 12,
        },
        formatter: (info: any) => {
          const d = info.data
          if (!d) return ''
          const risk = d.avgRisk ?? 0
          const riskPct = (risk * 100).toFixed(1)
          const riskLevel = getRiskLevelFromScore(risk)
          const riskColor = RISK_COLORS[riskLevel] ?? '#a1a1aa'
          const da = d.directAwardPct ?? 0
          const daOverLimit = da > 25
          const sector = d.sectorCode ?? '—'
          return `
            <div style="font-size:12px;line-height:1.65;color:#f4f4f5;max-width:260px">
              <div style="font-weight:700;font-size:13px;color:#fafafa;margin-bottom:4px;font-family:ui-serif,Georgia,serif">${info.name}</div>
              <div style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${sector}</div>
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#a1a1aa">Valor:</span><span style="color:#fafafa;font-weight:600">${formatCompactMXN(d.value)}</span></div>
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#a1a1aa">Contratos:</span><span style="color:#fafafa">${formatNumber(d.contractCount)}</span></div>
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#a1a1aa">Riesgo prom.:</span><span style="color:${riskColor};font-weight:600">${riskPct}%</span></div>
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#a1a1aa">Adj. directa:</span><span style="color:${daOverLimit ? '#fb923c' : '#fafafa'};font-weight:600">${da.toFixed(0)}%${daOverLimit ? ' ⚠' : ''}</span></div>
              <div style="color:#f59e0b;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-top:8px;border-top:1px solid #27272a;padding-top:6px">Clic para ver perfil →</div>
            </div>
          `
        },
      },
      series: [
        {
          type: 'treemap',
          data,
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: (params: any) => {
              const val = params.data?.value ?? 0
              return `{name|${params.name}}\n{value|${formatCompactMXN(val)}}`
            },
            rich: {
              name: {
                fontSize: 11,
                color: '#fafafa',
                fontWeight: 'bold',
                lineHeight: 15,
                fontFamily: 'ui-serif, Georgia, serif',
              },
              value: {
                fontSize: 10,
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 13,
                fontFamily: "ui-monospace, 'SF Mono', monospace",
              },
            },
            padding: [5, 7],
          },
          upperLabel: { show: false },
          itemStyle: {
            borderColor: '#18181b',
            borderWidth: 2,
            gapWidth: 2,
          },
          emphasis: {
            itemStyle: {
              borderColor: '#f59e0b',
              borderWidth: 3,
            },
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#27272a',
                borderWidth: 0,
                gapWidth: 2,
              },
            },
          ],
        },
      ],
    }),
    [data],
  )

  const onEvents = useMemo(
    () => ({
      click: (params: any) => {
        const id = params.data?.categoryId
        if (id) navigate(`/categories/${id}`)
      },
    }),
    [navigate],
  )

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center border border-border/30 rounded-lg bg-background-card"
        style={{ height: `${height}px` }}
      >
        <p className="text-xs text-text-muted font-mono">Sin datos de categorías</p>
      </div>
    )
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      onEvents={onEvents}
      opts={{ renderer: 'canvas' }}
    />
  )
}

export default CategoryTreemap
