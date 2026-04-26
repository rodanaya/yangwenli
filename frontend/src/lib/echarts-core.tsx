/**
 * echarts-core — slimmed ECharts instance with only the modules our 4
 * consumer components actually need.
 *
 * Replaces `import ReactECharts from 'echarts-for-react'` (which pulls
 * the entire ~1.1 MB echarts bundle) with a tree-shaken core + selective
 * module registration. Saves ~500-700 KB raw / ~150-200 KB gzipped.
 *
 * Modules registered (verified against component option configs):
 *   Charts: Heatmap, Treemap, Graph
 *   Components: Title, Tooltip, Grid, VisualMap
 *   Renderers: SVG (Heatmap, NetworkGraphModal, NetworkMiniGraph),
 *              Canvas (VendorConcentrationTreemap)
 *
 * Usage:
 *   import ReactECharts from '@/lib/echarts-core'
 *   <ReactECharts option={...} />
 */
import * as echarts from 'echarts/core'
import { HeatmapChart, TreemapChart, GraphChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
} from 'echarts/components'
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers'
import EChartsReactCore from 'echarts-for-react/lib/core'
import { forwardRef, type CSSProperties, type Ref } from 'react'

echarts.use([
  HeatmapChart,
  TreemapChart,
  GraphChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
  SVGRenderer,
  CanvasRenderer,
])

interface ReactEChartsProps {
  option: object
  style?: CSSProperties
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvents?: Record<string, (...args: any[]) => void>
  opts?: { renderer?: 'canvas' | 'svg'; useDirtyRect?: boolean; useCoarsePointer?: boolean }
  notMerge?: boolean
  lazyUpdate?: boolean
  showLoading?: boolean
}

const ReactECharts = forwardRef<unknown, ReactEChartsProps>(function ReactECharts(props, ref) {
  return (
    <EChartsReactCore
      ref={ref as Ref<EChartsReactCore>}
      echarts={echarts}
      {...props}
    />
  )
})

export default ReactECharts
