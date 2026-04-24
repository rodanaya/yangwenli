/**
 * Editorial chart primitives — bible-locked, token-enforced.
 * Every page should import from here. No inline Recharts in pages.
 */

export { CHART_TOKENS, tokenColor, formatValue, annotationStroke } from './tokens'
export type { ColorToken, ChartAnnotation } from './tokens'

export { ChartFrame } from './ChartFrame'
export type { ChartFrameProps } from './ChartFrame'

export { DotStrip } from './DotStrip'
export type { DotStripProps, DotStripRow } from './DotStrip'

export { EditorialLineChart } from './EditorialLineChart'
export type { EditorialLineChartProps, LineSeries } from './EditorialLineChart'

export { EditorialAreaChart } from './EditorialAreaChart'
export type { EditorialAreaChartProps } from './EditorialAreaChart'

export { EditorialScatterChart } from './EditorialScatterChart'
export type { EditorialScatterChartProps } from './EditorialScatterChart'

export { EditorialComposedChart } from './EditorialComposedChart'
export type {
  EditorialComposedChartProps,
  ComposedLayer,
} from './EditorialComposedChart'

export { EditorialSparkline } from './EditorialSparkline'
export type { EditorialSparklineProps } from './EditorialSparkline'

export { EditorialRadarChart } from './EditorialRadarChart'
export type { EditorialRadarChartProps, RadarSeries } from './EditorialRadarChart'

export { EditorialHeatmap } from './EditorialHeatmap'
export type { EditorialHeatmapProps } from './EditorialHeatmap'

export { scaleToColor } from './colorScales'
export type { HeatmapScale } from './colorScales'
