/**
 * MexicoMap — Mexico States Choropleth
 *
 * Shows procurement spending, average risk, or contract count per state.
 * Uses react-simple-maps (GeoJSON + d3-geo projection — no ECharts map module needed).
 */

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { Map as MapIcon, AlertTriangle, DollarSign, Shield, FileText, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { subnationalApi } from '@/api/client'
import type { SubnationalStateSummary } from '@/api/types'
import { PageHeader } from '@/components/layout/PageHeader'

// GeoJSON served from public/ — same origin fetch, no CORS issues
const GEO_URL = '/mexico.geojson'

// Default map view centered on Mexico
const DEFAULT_CENTER: [number, number] = [-102, 24]
const DEFAULT_ZOOM = 1

// ── State code → GeoJSON feature name mapping ─────────────────────────────────
// Keys = INEGI codes stored in institutions.state_code in the backend DB.
// Values = 'name' property in /public/mexico.geojson features (must match exactly).
const STATE_NAME_MAP: Record<string, string> = {
  AGS:  'Aguascalientes',
  BC:   'Baja California',
  BCS:  'Baja California Sur',
  CAMP: 'Campeche',
  CHIS: 'Chiapas',
  CHIH: 'Chihuahua',
  CDMX: 'Ciudad de México',
  COAH: 'Coahuila',
  COL:  'Colima',
  DGO:  'Durango',
  GTO:  'Guanajuato',
  GRO:  'Guerrero',
  HGO:  'Hidalgo',
  JAL:  'Jalisco',
  MEX:  'México',
  MICH: 'Michoacán',
  MOR:  'Morelos',
  NAY:  'Nayarit',
  NL:   'Nuevo León',
  OAX:  'Oaxaca',
  PUE:  'Puebla',
  QRO:  'Querétaro',
  QROO: 'Quintana Roo',
  SLP:  'San Luis Potosí',
  SIN:  'Sinaloa',
  SON:  'Sonora',
  TAB:  'Tabasco',
  TAMPS:'Tamaulipas',
  TLAX: 'Tlaxcala',
  VER:  'Veracruz',
  YUC:  'Yucatán',
  ZAC:  'Zacatecas',
}

// name → code (for click handler)
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_MAP).map(([code, name]) => [name, code]),
)

type Metric = 'amount' | 'risk' | 'contracts'

const METRIC_CONFIG: Record<Metric, {
  label: string
  colorRange: [string, string]
  format: (v: number) => string
}> = {
  amount:    { label: 'Total Spending',  colorRange: ['#dbeafe', '#1d4ed8'], format: formatCompactMXN },
  risk:      { label: 'Avg Risk Score',  colorRange: ['#dcfce7', '#dc2626'], format: (v) => v.toFixed(3) },
  contracts: { label: 'Contract Count',  colorRange: ['#ede9fe', '#7c3aed'], format: (v) => v.toLocaleString() },
}

function getMetricValue(state: SubnationalStateSummary, metric: Metric): number {
  if (metric === 'amount')    return state.total_value_mxn ?? 0
  if (metric === 'risk')      return state.avg_risk_score ?? 0
  return state.contract_count ?? 0
}

// Simple linear color interpolation between two hex colors
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from)
  const [r2, g2, b2] = hexToRgb(to)
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`
}

function getStateColor(value: number, max: number, colorRange: [string, string]): string {
  if (max === 0 || value === 0) return colorRange[0]
  // Power-0.4 scale: compresses high values so smaller states are visible
  const t = Math.min(Math.pow(value / max, 0.4), 1)
  return lerpColor(colorRange[0], colorRange[1], t)
}

function getRiskColor(riskScore: number): string {
  if (riskScore >= 0.5) return RISK_COLORS.critical
  if (riskScore >= 0.3) return RISK_COLORS.high
  if (riskScore >= 0.1) return RISK_COLORS.medium
  return RISK_COLORS.low
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function MapTooltip({
  state,
  x,
  y,
}: {
  state: SubnationalStateSummary
  x: number
  y: number
}) {
  const riskColor = getRiskColor(state.avg_risk_score ?? 0)
  return (
    <div
      className="pointer-events-none fixed z-50 rounded border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-xl text-xs"
      style={{ left: x + 14, top: y - 10 }}
    >
      <p className="font-semibold text-slate-100 text-sm mb-1">
        {state.state_name}
        <span className="ml-1.5 text-slate-400 font-mono text-[10px]">{state.state_code}</span>
      </p>
      <div className="space-y-0.5 text-slate-300">
        <p>Spending: <span className="text-white font-medium">{formatCompactMXN(state.total_value_mxn ?? 0)}</span></p>
        <p>Contracts: <span className="text-white font-medium">{(state.contract_count ?? 0).toLocaleString()}</span></p>
        <p>
          Risk:{' '}
          <span className="font-bold" style={{ color: riskColor }}>
            {(state.avg_risk_score ?? 0).toFixed(3)}
          </span>
        </p>
        <p className="text-slate-500 text-[10px] pt-0.5">Click to drill down</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MexicoMap() {
  const navigate   = useNavigate()
  const [metric, setMetric]     = useState<Metric>('amount')
  const [zoom, setZoom]         = useState(DEFAULT_ZOOM)
  const [center, setCenter]     = useState<[number, number]>(DEFAULT_CENTER)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Fetch state data from backend
  const { data, isLoading, error } = useQuery({
    queryKey: ['subnational', 'states'],
    queryFn: () => subnationalApi.getStates(),
    staleTime: 15 * 60 * 1000,
  })

  const states = data?.data ?? []

  const stateByCode = useMemo(() => {
    const m = new Map<string, SubnationalStateSummary>()
    states.forEach((s) => m.set(s.state_code, s))
    return m
  }, [states])

  const stateByName = useMemo(() => {
    const m = new Map<string, SubnationalStateSummary>()
    states.forEach((s) => {
      const displayName = STATE_NAME_MAP[s.state_code]
      if (displayName) m.set(displayName, s)
    })
    return m
  }, [states])

  const maxValue = useMemo(() => {
    if (states.length === 0) return 1
    return Math.max(...states.map((s) => getMetricValue(s, metric)), 1)
  }, [states, metric])

  const cfg = METRIC_CONFIG[metric]
  const hoveredState = hoveredCode ? stateByCode.get(hoveredCode) : null

  const handleStateClick = useCallback(
    (code: string) => navigate(`/state-expenditure/${code}`),
    [navigate],
  )

  const handleZoomIn  = () => setZoom((z) => Math.min(z * 1.5, 8))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, 1))
  const handleReset   = () => { setZoom(DEFAULT_ZOOM); setCenter(DEFAULT_CENTER) }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Mexico Procurement Map"
        subtitle="Federal spending by state — click any state to drill down"
        icon={MapIcon}
      />

      {/* Metric selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Show:</span>
        {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
          <Button
            key={m}
            variant={metric === m ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setMetric(m)}
          >
            {m === 'amount'    && <DollarSign className="h-3 w-3" />}
            {m === 'risk'      && <Shield     className="h-3 w-3" />}
            {m === 'contracts' && <FileText   className="h-3 w-3" />}
            {cfg.label === METRIC_CONFIG[m].label ? METRIC_CONFIG[m].label : METRIC_CONFIG[m].label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {cfg.label} by State
              </CardTitle>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}  title="Zoom in">
                <ZoomIn  className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom out">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}   title="Reset view">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading */}
          {isLoading && <Skeleton className="h-[460px] w-full" />}

          {/* API error */}
          {error && !isLoading && (
            <div className="flex items-center gap-2 py-8 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Failed to load state data</span>
            </div>
          )}

          {/* Map */}
          {!isLoading && !error && (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div
              className="relative rounded overflow-hidden bg-slate-50 dark:bg-slate-900/30 border border-border"
              style={{ height: 460 }}
              onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredCode(null)}
            >
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ center: DEFAULT_CENTER, scale: 900 }}
                width={800}
                height={460}
                style={{ width: '100%', height: '100%' }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  center={center}
                  onMoveEnd={({ coordinates, zoom: z }) => {
                    setCenter(coordinates as [number, number])
                    setZoom(z)
                  }}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const name      = geo.properties?.name as string | undefined
                        const code      = name ? NAME_TO_CODE[name] : undefined
                        const stateData = code ? stateByCode.get(code) : (name ? stateByName.get(name) : undefined)
                        const value     = stateData ? getMetricValue(stateData, metric) : 0
                        const fill      = stateData
                          ? getStateColor(value, maxValue, cfg.colorRange)
                          : '#e2e8f0'
                        const isHovered = code === hoveredCode

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={isHovered ? '#f59e0b' : fill}
                            stroke="#1e293b"
                            strokeWidth={0.5}
                            style={{
                              default:  { outline: 'none', cursor: stateData ? 'pointer' : 'default', transition: 'fill 0.15s' },
                              hover:    { outline: 'none' },
                              pressed:  { outline: 'none', fill: '#d97706' },
                            }}
                            onMouseEnter={() => { if (code) setHoveredCode(code) }}
                            onMouseLeave={() => setHoveredCode(null)}
                            onClick={() => { if (code) handleStateClick(code) }}
                            aria-label={stateData ? `${stateData.state_name}: ${cfg.format(value)}` : name}
                            tabIndex={-1}
                          />
                        )
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>

              {/* Color scale legend */}
              <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wide">{cfg.label}</span>
                <div
                  className="w-24 h-2.5 rounded"
                  style={{
                    background: `linear-gradient(to right, ${cfg.colorRange[0]}, ${cfg.colorRange[1]})`,
                  }}
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              {/* Hint */}
              <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 hidden sm:block">
                Drag to pan · scroll to zoom
              </div>
            </div>
          )}

          {/* Tooltip */}
          {hoveredState && (
            <MapTooltip state={hoveredState} x={mousePos.x} y={mousePos.y} />
          )}

          {/* Risk legend */}
          {!isLoading && !error && (
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Risk:</span>
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <div key={level} className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: RISK_COLORS[level] }} />
                  <span className="text-[10px] capitalize">{level}</span>
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground ml-2">hover = tooltip</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* State summary table */}
      {!isLoading && !error && states.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              All States — {cfg.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">State</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Contracts</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Total Spending</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Avg Risk</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs hidden sm:table-cell">
                      Direct Award
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...states]
                    .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric))
                    .map((s) => {
                      const riskScore = s.avg_risk_score ?? 0
                      const riskColor = getRiskColor(riskScore)
                      return (
                        <tr
                          key={s.state_code}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => navigate(`/state-expenditure/${s.state_code}`)}
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-9 items-center justify-center rounded bg-muted text-[10px] font-mono font-semibold">
                                {s.state_code}
                              </span>
                              <span className="text-xs font-medium">{s.state_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">
                            {(s.contract_count ?? 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">
                            {formatCompactMXN(s.total_value_mxn ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs">
                            <span
                              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                              style={{ backgroundColor: riskColor }}
                            >
                              {riskScore.toFixed(3)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs hidden sm:table-cell">
                            {((s.direct_award_rate ?? 0) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
