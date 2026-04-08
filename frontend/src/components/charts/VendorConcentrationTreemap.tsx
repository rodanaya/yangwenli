/**
 * VendorConcentrationTreemap — ECharts treemap showing vendor concentration at an institution.
 * Sized by total_value_mxn, colored by avg_risk_score.
 *
 * Design: dark editorial (zinc-900 bg), risk-colored cells, zinc-800 borders.
 */
import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'

interface TreemapVendor {
  vendor_id: number
  vendor_name: string
  total_value_mxn: number
  contract_count?: number
  avg_risk_score?: number | null
}

interface Props {
  vendors: TreemapVendor[]
  totalInstitutionValue?: number
  maxItems?: number
  height?: number
}

function riskToColor(score: number): string {
  if (score >= 0.60) return RISK_COLORS.critical
  if (score >= 0.40) return RISK_COLORS.high
  if (score >= 0.25) return RISK_COLORS.medium
  return RISK_COLORS.low
}

export function VendorConcentrationTreemap({ vendors = [], totalInstitutionValue: _totalInstitutionValue, maxItems = 15, height = 320 }: Props) {
  const navigate = useNavigate()

  const { treeData, otherNode } = useMemo(() => {
    const sorted = [...(vendors ?? [])].sort((a, b) => b.total_value_mxn - a.total_value_mxn)
    const topN = sorted.slice(0, maxItems)
    const rest = sorted.slice(maxItems)

    const topData = topN.map((v) => ({
      name: v.vendor_name.length > 30 ? v.vendor_name.slice(0, 28) + '...' : v.vendor_name,
      value: v.total_value_mxn,
      vendorId: v.vendor_id,
      contractCount: v.contract_count ?? 0,
      riskScore: v.avg_risk_score ?? 0,
      itemStyle: {
        color: riskToColor(v.avg_risk_score ?? 0),
        borderColor: '#27272a',
        borderWidth: 2,
      },
    }))

    let other = null
    if (rest.length > 0) {
      const otherVal = rest.reduce((s, v) => s + v.total_value_mxn, 0)
      other = {
        name: `Otros (${rest.length})`,
        value: otherVal,
        vendorId: 0,
        contractCount: rest.reduce((s, v) => s + (v.contract_count ?? 0), 0),
        riskScore: 0,
        itemStyle: {
          color: '#52525b',
          borderColor: '#27272a',
          borderWidth: 2,
        },
      }
    }

    return { treeData: topData, otherNode: other }
  }, [vendors, maxItems])

  const allData = otherNode ? [...treeData, otherNode] : treeData

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      textStyle: {
        color: '#f4f4f5',
        fontFamily: "ui-monospace, 'SF Mono', monospace",
        fontSize: 12,
      },
      formatter: (info: any) => {
        const d = info.data
        if (!d) return ''
        const risk = d.riskScore ?? 0
        const riskPct = (risk * 100).toFixed(1)
        return `
          <div style="font-size:12px;line-height:1.6;color:#f4f4f5">
            <strong style="color:#f4f4f5">${info.name}</strong><br/>
            <span style="color:#a1a1aa">Valor:</span> ${formatCompactMXN(d.value)}<br/>
            <span style="color:#a1a1aa">Contratos:</span> ${formatNumber(d.contractCount)}<br/>
            <span style="color:#a1a1aa">Riesgo:</span> <span style="color:${riskToColor(risk)}">${riskPct}%</span>
          </div>
        `
      },
    },
    series: [{
      type: 'treemap',
      data: allData,
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
            fontSize: 10,
            color: '#f4f4f5',
            fontWeight: 'bold',
            lineHeight: 14,
            fontFamily: "ui-monospace, 'SF Mono', monospace",
          },
          value: {
            fontSize: 9,
            color: '#a1a1aa',
            lineHeight: 12,
            fontFamily: "ui-monospace, 'SF Mono', monospace",
          },
        },
        padding: [4, 6],
      },
      itemStyle: {
        borderColor: '#27272a',
        borderWidth: 2,
        gapWidth: 2,
      },
      levels: [{
        itemStyle: {
          borderColor: '#3f3f46',
          borderWidth: 0,
          gapWidth: 2,
        },
      }],
    }],
  }), [allData])

  const onEvents = useMemo(() => ({
    click: (params: any) => {
      const vid = params.data?.vendorId
      if (vid && vid !== 0) {
        navigate(`/vendors/${vid}`)
      }
    },
  }), [navigate])

  if (!allData.length) {
    return (
      <div className="flex items-center justify-center text-xs text-zinc-500 py-8">
        No vendor concentration data available
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

export default VendorConcentrationTreemap
