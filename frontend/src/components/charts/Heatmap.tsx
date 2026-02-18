/**
 * Heatmap Chart Component
 * Uses ECharts for sector risk matrix visualization
 */

import { memo, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
// Theme handled by CSS variables

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
  colorRange = ['#4ade80', '#fbbf24', '#f87171'], // green -> amber -> rose
  height = 300,
  onCellClick,
}: HeatmapProps) {
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
              color: 'var(--color-text-primary)',
              fontSize: 12,
              fontWeight: 500,
            },
          }
        : undefined,
      tooltip: {
        position: 'top',
        backgroundColor: 'var(--color-background)',
        borderColor: 'var(--color-border)',
        textStyle: {
          color: 'var(--color-text-primary)',
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
          color: 'var(--color-text-muted)',
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
          color: 'var(--color-text-muted)',
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
          color: 'var(--color-text-muted)',
        },
      },
      series: [
        {
          type: 'heatmap',
          data: chartData,
          label: {
            show: true,
            // Dark text for contrast on colored cells (green/yellow/red backgrounds)
            color: '#18181b',
            fontSize: 10,
            fontWeight: 500,
            formatter: (params: { data: [number, number, number] }) => {
              const [colIdx, rowIdx, value] = params.data
              return valueFormatter(value, rows[rowIdx], columns[colIdx])
            },
          },
          itemStyle: {
            borderColor: 'var(--color-background)',
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
  }, [data, rows, columns, title, valueFormatter, colorRange])

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
