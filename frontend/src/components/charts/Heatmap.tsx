/**
 * Heatmap Chart Component
 * Uses ECharts for sector risk matrix visualization
 */

import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from '@/hooks/useTheme'

interface HeatmapData {
  row: string
  col: string
  value: number
}

interface HeatmapProps {
  data: HeatmapData[]
  rows: string[]
  columns: string[]
  title?: string
  valueFormatter?: (value: number, row?: string, col?: string) => string
  colorRange?: [string, string, string]
  height?: number
  onCellClick?: (row: string, col: string, value: number) => void
}

export const Heatmap = memo(function Heatmap({
  data,
  rows,
  columns,
  title,
  valueFormatter = (v) => v.toFixed(2),
  colorRange = ['#16a34a', '#eab308', '#dc2626'], // green -> yellow -> red
  height = 300,
  onCellClick,
}: HeatmapProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const option = useMemo(() => {
    // Convert data to ECharts format [colIndex, rowIndex, value]
    const chartData = data.map((d) => {
      const colIndex = columns.indexOf(d.col)
      const rowIndex = rows.indexOf(d.row)
      return [colIndex, rowIndex, d.value]
    })

    const values = data.map((d) => d.value)
    const minValue = Math.min(...values, 0)
    const maxValue = Math.max(...values, 1)

    return {
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            left: 'center',
            textStyle: {
              color: isDark ? '#f5f5f5' : '#0f172a',
              fontSize: 14,
              fontWeight: 500,
            },
          }
        : undefined,
      tooltip: {
        position: 'top',
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        borderColor: isDark ? '#2e2e2e' : '#e2e8f0',
        textStyle: {
          color: isDark ? '#f5f5f5' : '#0f172a',
        },
        formatter: (params: { data: [number, number, number] }) => {
          const [colIdx, rowIdx, value] = params.data
          const row = rows[rowIdx]
          const col = columns[colIdx]
          return `<strong>${row}</strong><br/>${col}: ${valueFormatter(value, row, col)}`
        },
      },
      grid: {
        top: title ? 50 : 10,
        left: 100,
        right: 10,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: columns,
        splitArea: { show: false },
        axisLabel: {
          color: isDark ? '#a3a3a3' : '#64748b',
          fontSize: 11,
          rotate: 45,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: rows,
        splitArea: { show: false },
        axisLabel: {
          color: isDark ? '#a3a3a3' : '#64748b',
          fontSize: 11,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      visualMap: {
        min: minValue,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: colorRange,
        },
        textStyle: {
          color: isDark ? '#a3a3a3' : '#64748b',
        },
      },
      series: [
        {
          type: 'heatmap',
          data: chartData,
          label: {
            show: true,
            // Use dark text on light cells, light text on dark cells
            // Since heatmap goes green (light) -> yellow -> red (medium), use dark text for contrast
            color: '#1a1a1a',
            fontSize: 10,
            fontWeight: 500,
            formatter: (params: { data: [number, number, number] }) => {
              const [colIdx, rowIdx, value] = params.data
              return valueFormatter(value, rows[rowIdx], columns[colIdx])
            },
          },
          itemStyle: {
            borderColor: isDark ? '#1a1a1a' : '#ffffff',
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    }
  }, [data, rows, columns, title, valueFormatter, colorRange, isDark])

  const handleClick = (params: { data: [number, number, number] }) => {
    if (onCellClick && params.data) {
      const [colIdx, rowIdx, value] = params.data
      onCellClick(rows[rowIdx], columns[colIdx], value)
    }
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      onEvents={{ click: handleClick }}
      opts={{ renderer: 'svg' }}
    />
  )
})

export default Heatmap
