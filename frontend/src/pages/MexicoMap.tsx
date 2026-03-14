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
import { Map as MapIcon, AlertTriangle, DollarSign, Shield, FileText, ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { subnationalApi } from '@/api/client'
import type { SubnationalStateSummary } from '@/api/types'
import { HexMap } from '@/components/charts/HexMap'

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
  amount:    { label: 'Total Spending',  colorRange: ['#0d1117', '#3b82f6'], format: formatCompactMXN },
  risk:      { label: 'Avg Risk Score',  colorRange: ['#0d1117', '#f87171'], format: (v) => v.toFixed(3) },
  contracts: { label: 'Contract Count',  colorRange: ['#0d1117', '#f59e0b'], format: (v) => v.toLocaleString() },
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
      className="pointer-events-none fixed z-50 rounded-lg border px-3 py-2 shadow-xl text-xs"
      style={{ left: x + 14, top: y - 10, background: 'var(--color-background-elevated)', borderColor: 'var(--color-border)' }}
    >
      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-mono)' }}>
        {state.state_name}
        <span className="ml-1.5 font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{state.state_code}</span>
      </p>
      <div className="space-y-0.5" style={{ color: 'var(--color-text-secondary)' }}>
        <p>Spending: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatCompactMXN(state.total_value_mxn ?? 0)}</span></p>
        <p>Contracts: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{(state.contract_count ?? 0).toLocaleString()}</span></p>
        <p>
          Risk:{' '}
          <span className="font-bold" style={{ color: riskColor }}>
            {(state.avg_risk_score ?? 0).toFixed(3)}
          </span>
        </p>
        <p className="text-[10px] pt-0.5" style={{ color: 'var(--color-text-muted)' }}>Click to drill down</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MexicoMap() {
  const navigate   = useNavigate()
  const [metric, setMetric]     = useState<Metric>('amount')
  const [viewMode, setViewMode] = useState<'choropleth' | 'hex'>('choropleth')
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
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg" style={{ background: 'var(--color-accent-glow)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
            <MapIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-gradient text-2xl font-bold font-mono tracking-tight">Mexico Procurement Map</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Federal spending by state -- click any state to drill down</p>
          </div>
        </div>
      </div>

      {/* Controls row: metric selector + view toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Show:</span>
          {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
            <button
              key={m}
              className="h-7 px-3 text-xs rounded-md border font-medium flex items-center gap-1.5 transition-all"
              style={
                metric === m
                  ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: '#0f172a' }
                  : { background: 'var(--color-background-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }
              }
              onClick={() => setMetric(m)}
            >
              {m === 'amount'    && <DollarSign className="h-3 w-3" />}
              {m === 'risk'      && <Shield     className="h-3 w-3" />}
              {m === 'contracts' && <FileText   className="h-3 w-3" />}
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-md p-0.5" style={{ border: '1px solid var(--color-border)', background: 'var(--color-background-card)' }}>
          <button
            className="h-6 text-xs gap-1.5 px-2 rounded flex items-center transition-all font-medium"
            style={
              viewMode === 'choropleth'
                ? { background: 'var(--color-accent)', color: '#0f172a' }
                : { color: 'var(--color-text-muted)' }
            }
            onClick={() => setViewMode('choropleth')}
            title="Geographic choropleth"
          >
            <MapIcon className="h-3 w-3" /> Choropleth
          </button>
          <button
            className="h-6 text-xs gap-1.5 px-2 rounded flex items-center transition-all font-medium"
            style={
              viewMode === 'hex'
                ? { background: 'var(--color-accent)', color: '#0f172a' }
                : { color: 'var(--color-text-muted)' }
            }
            onClick={() => setViewMode('hex')}
            title="Equal-area hex grid"
          >
            <Grid3X3 className="h-3 w-3" /> Hex Grid
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-semibold uppercase tracking-wide font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {cfg.label} by State
            </span>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button className="h-7 w-7 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--color-text-muted)' }} onClick={handleZoomIn}  title="Zoom in">
              <ZoomIn  className="h-3.5 w-3.5" />
            </button>
            <button className="h-7 w-7 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--color-text-muted)' }} onClick={handleZoomOut} title="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button className="h-7 w-7 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--color-text-muted)' }} onClick={handleReset}   title="Reset view">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Loading */}
          {isLoading && <Skeleton className="h-[460px] w-full" />}

          {/* API error */}
          {error && !isLoading && (
            <div className="flex items-center gap-2 py-8 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Failed to load state data</span>
            </div>
          )}

          {/* Hex Grid view */}
          {!isLoading && !error && viewMode === 'hex' && (
            <HexMap states={states} metric={metric} />
          )}

          {/* Choropleth map */}
          {!isLoading && !error && viewMode === 'choropleth' && (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div
              className="relative rounded-lg overflow-hidden"
              style={{ height: 460, background: '#080c14', border: '1px solid var(--color-border)' }}
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
                          : '#1e2d45'
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
                <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{cfg.label}</span>
                <div
                  className="w-24 h-2.5 rounded"
                  style={{
                    background: `linear-gradient(to right, ${cfg.colorRange[0]}, ${cfg.colorRange[1]})`,
                  }}
                />
                <div className="flex justify-between text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              {/* Hint */}
              <div className="absolute bottom-3 right-3 text-[10px] hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
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
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Risk:</span>
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <div key={level} className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: RISK_COLORS[level] }} />
                  <span className="text-[10px] capitalize" style={{ color: 'var(--color-text-secondary)' }}>{level}</span>
                </div>
              ))}
              <span className="text-[10px] ml-2" style={{ color: 'var(--color-text-muted)' }}>hover = tooltip</span>
            </div>
          )}
        </div>
      </div>

      {/* State summary table */}
      {!isLoading && !error && states.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm font-semibold uppercase tracking-wide font-mono" style={{ color: 'var(--color-text-muted)' }}>
              All States -- {cfg.label}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-background-elevated)' }}>
                  <th className="data-cell-header px-4 py-2.5 text-left text-xs">State</th>
                  <th className="data-cell-header px-4 py-2.5 text-right text-xs">Contracts</th>
                  <th className="data-cell-header px-4 py-2.5 text-right text-xs">Total Spending</th>
                  <th className="data-cell-header px-4 py-2.5 text-right text-xs">Avg Risk</th>
                  <th className="data-cell-header px-4 py-2.5 text-right text-xs hidden sm:table-cell">
                    Direct Award
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...states]
                  .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric))
                  .map((s) => {
                    const riskScore = s.avg_risk_score ?? 0
                    const riskColor = getRiskColor(riskScore)
                    return (
                      <tr
                        key={s.state_code}
                        className="cursor-pointer transition-colors border-b"
                        style={{ borderColor: 'var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-elevated)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => navigate(`/state-expenditure/${s.state_code}`)}
                      >
                        <td className="data-cell px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex h-6 w-9 items-center justify-center rounded text-[10px] font-mono font-semibold"
                              style={{ background: 'var(--color-background-elevated)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
                            >
                              {s.state_code}
                            </span>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.state_name}</span>
                          </div>
                        </td>
                        <td className="data-cell px-4 py-2.5 text-right tabular-nums text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          {(s.contract_count ?? 0).toLocaleString()}
                        </td>
                        <td className="data-cell px-4 py-2.5 text-right tabular-nums text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          {formatCompactMXN(s.total_value_mxn ?? 0)}
                        </td>
                        <td className="data-cell px-4 py-2.5 text-right text-xs">
                          <span
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono"
                            style={{ backgroundColor: riskColor + '22', color: riskColor }}
                          >
                            {riskScore.toFixed(3)}
                          </span>
                        </td>
                        <td className="data-cell px-4 py-2.5 text-right tabular-nums text-xs font-mono hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                          {((s.direct_award_rate ?? 0) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
