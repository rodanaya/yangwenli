/**
 * Chart Components
 * Centralized exports for all visualization components and Recharts re-exports
 *
 * NOTE: ECharts consumers (VendorConcentrationTreemap, NetworkGraphModal,
 * NetworkMiniGraph) are NOT exported here — they're imported via dynamic
 * `import()` at their call sites so the echarts vendor chunk only loads
 * when the user actually opens the network/treemap views.
 */

// Custom chart components (Recharts-based only)
export { StackedAreaChart } from './StackedArea'
export { ProcedureBreakdown } from './ProcedureBreakdown'

// Editorial particle-grammar primitives (pure SVG, deterministic)
export { MiniRiskField } from './MiniRiskField'
export { RiskRingField } from './RiskRingField'
export { ConcentrationConstellation } from './ConcentrationConstellation'
export { FlowParticle } from './FlowParticle'

// Re-export all Recharts components used across the project
export {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  BarChart,
  Area,
  AreaChart,
  Line,
  LineChart,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
  Treemap,
  LabelList,
  ReferenceLine,
  ReferenceArea,
  ErrorBar,
} from 'recharts'
