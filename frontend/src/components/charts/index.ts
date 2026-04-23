/**
 * Chart Components
 * Centralized exports for all visualization components and Recharts re-exports
 *
 * NOTE: Heatmap is NOT exported here to avoid bundling echarts (~900KB) into every page.
 * Import Heatmap directly: import { Heatmap } from '@/components/charts/Heatmap'
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
