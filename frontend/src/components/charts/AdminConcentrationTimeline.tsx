/**
 * AdminConcentrationTimeline
 *
 * Vendor market concentration (top vendor's share of sector spend) over time,
 * with administration-era background shading.
 *
 * Data source: /api/v1/sectors/{id}/concentration-history — returns
 * { history: [{ year, top_vendor_share (0..1), gini, total_value, vendor_count }] }
 * There is no single cross-sector year-level endpoint, so we fetch the four
 * largest sectors (salud, educacion, infraestructura, energia) in parallel and
 * plot one line per sector. This keeps the chart dense but readable and uses
 * data already precomputed server-side (factor_baselines + sector_year_breakdown).
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { SECTOR_COLORS } from '@/lib/constants'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from '@/components/charts'

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminConcentrationTimelineProps {
  height?: number
  className?: string
  title?: string
}

interface ConcentrationYear {
  year: number
  gini: number
  top_vendor_share: number // 0..1 from backend
  total_value: number
  vendor_count: number
}

interface ConcentrationHistoryResponse {
  sector_id: number
  sector_name: string
  history: ConcentrationYear[]
}

interface ChartRow {
  year: number
  [sectorKey: string]: number
}

// ── Administrations (matches Administrations.tsx palette) ────────────────────

const ADMIN_BANDS: ReadonlyArray<{
  key: string
  label: string
  start: number
  end: number
  color: string
}> = [
  { key: 'fox',       label: 'Fox',        start: 2002, end: 2006, color: '#3b82f6' },
  { key: 'calderon',  label: 'Calderón',   start: 2006, end: 2012, color: '#22c55e' },
  { key: 'pena',      label: 'Peña Nieto', start: 2012, end: 2018, color: '#ef4444' },
  { key: 'amlo',      label: 'AMLO',       start: 2018, end: 2024, color: '#a16207' },
  { key: 'sheinbaum', label: 'Sheinbaum',  start: 2024, end: 2030, color: '#14b8a6' },
]

// Sectors to fetch — 4 largest by spend. Keys must match SECTOR_COLORS.
const TRACKED_SECTORS: ReadonlyArray<{
  id: number
  key: keyof typeof SECTOR_COLORS
  label: string
}> = [
  { id: 1, key: 'salud',           label: 'Salud' },
  { id: 3, key: 'infraestructura', label: 'Infraestructura' },
  { id: 4, key: 'energia',         label: 'Energía' },
  { id: 2, key: 'educacion',       label: 'Educación' },
]

const YEAR_MIN = 2002
const YEAR_MAX = 2024

// ── Data fetching ────────────────────────────────────────────────────────────

async function fetchSectorConcentration(
  sectorId: number,
): Promise<ConcentrationHistoryResponse> {
  const { data } = await api.get<ConcentrationHistoryResponse>(
    `/sectors/${sectorId}/concentration-history`,
  )
  return data
}

function useConcentrationTimeline() {
  return useQuery({
    queryKey: ['admin-concentration-timeline', TRACKED_SECTORS.map((s) => s.id)],
    queryFn: async () => {
      const responses = await Promise.all(
        TRACKED_SECTORS.map((s) => fetchSectorConcentration(s.id)),
      )
      return responses
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey?: string | number
  value?: number | string
  color?: string
  name?: string | number
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string | number
}

function adminForYear(year: number): string {
  const band = ADMIN_BANDS.find((b) => year >= b.start && year < b.end)
  return band ? band.label : '—'
}

function ConcentrationTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const year = typeof label === 'number' ? label : Number(label)
  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 shadow-xl"
      style={{ fontSize: 11 }}
    >
      <div className="font-semibold text-zinc-100 mb-1" style={{ fontSize: 12 }}>
        {Number.isFinite(year) ? year : label}
        <span className="text-zinc-400 font-normal ml-2">
          {Number.isFinite(year) ? adminForYear(year) : ''}
        </span>
      </div>
      {payload.map((entry, idx) => {
        const val = typeof entry.value === 'number' ? entry.value : Number(entry.value)
        return (
          <div
            key={`${entry.dataKey ?? idx}`}
            className="font-mono text-zinc-300 flex items-center gap-2"
            style={{ fontSize: 11 }}
          >
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            <span className="flex-1">{String(entry.dataKey ?? entry.name ?? '')}</span>
            <span style={{ color: entry.color }}>
              {Number.isFinite(val) ? `${val.toFixed(1)}%` : '—'}
            </span>
          </div>
        )
      })}
      <div className="text-zinc-500 mt-1" style={{ fontSize: 10 }}>
        Participación del proveedor principal
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

function AdminConcentrationTimeline({
  height = 280,
  className,
  title,
}: AdminConcentrationTimelineProps) {
  const { data, isLoading, isError } = useConcentrationTimeline()

  const chartData = useMemo<ChartRow[]>(() => {
    if (!data) return []
    // Build lookup: sectorKey -> Map<year, top_vendor_share%>
    const byYear = new Map<number, ChartRow>()
    data.forEach((resp, idx) => {
      const sector = TRACKED_SECTORS[idx]
      if (!sector || !resp?.history) return
      for (const pt of resp.history) {
        if (pt.year < YEAR_MIN || pt.year > YEAR_MAX) continue
        const row = byYear.get(pt.year) ?? { year: pt.year }
        // top_vendor_share is 0..1 from backend — convert to percent
        const pct = Number((pt.top_vendor_share * 100).toFixed(2))
        row[sector.key] = pct
        byYear.set(pt.year, row)
      }
    })
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year)
  }, [data])

  const heading = title ?? 'CONCENTRACIÓN DE MERCADO POR ADMINISTRACIÓN'
  const subtitle = 'Porcentaje del valor total adjudicado al proveedor principal'

  return (
    <div className={className}>
      <div className="mb-3">
        <h3
          className="text-zinc-100 font-semibold tracking-wider uppercase"
          style={{ fontSize: 12, letterSpacing: '0.08em' }}
        >
          {heading}
        </h3>
        <p className="text-zinc-400 mt-0.5" style={{ fontSize: 11 }}>
          {subtitle}
        </p>
      </div>

      {isLoading ? (
        <div
          className="bg-zinc-800 rounded animate-pulse w-full"
          style={{ height }}
          aria-label="Cargando"
        />
      ) : isError || !data || chartData.length === 0 ? (
        <div
          className="flex items-center justify-center text-zinc-400 font-mono"
          style={{ height, fontSize: 11 }}
        >
          No se pudieron cargar los datos de concentración.
        </div>
      ) : (
        <div role="img" aria-label="Línea de tiempo de concentración de mercado por administración">
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={chartData}
              margin={{ top: 24, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="year"
                type="number"
                domain={[YEAR_MIN, YEAR_MAX]}
                ticks={[2002, 2006, 2012, 2018, 2024]}
                tick={{
                  fontSize: 11,
                  fill: 'rgba(255,255,255,0.55)',
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={false}
                allowDataOverflow
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{
                  fontSize: 11,
                  fill: 'rgba(255,255,255,0.55)',
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                }}
                axisLine={false}
                tickLine={false}
                width={44}
              />

              {/* Administration shading — rendered first so lines draw on top */}
              {ADMIN_BANDS.map((band) => {
                const x1 = Math.max(band.start, YEAR_MIN)
                const x2 = Math.min(band.end, YEAR_MAX)
                if (x2 <= x1) return null
                return (
                  <ReferenceArea
                    key={band.key}
                    x1={x1}
                    x2={x2}
                    fill={band.color}
                    fillOpacity={0.06}
                    stroke={band.color}
                    strokeOpacity={0.25}
                    strokeDasharray="2 4"
                    ifOverflow="extendDomain"
                    label={{
                      value: band.label,
                      position: 'insideTop',
                      fill: 'rgba(161,161,170,1)',
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    }}
                  />
                )
              })}

              <Tooltip content={<ConcentrationTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.65)',
                  paddingTop: 4,
                }}
                iconType="plainline"
              />

              {TRACKED_SECTORS.map((sector) => (
                <Line
                  key={sector.key}
                  type="monotone"
                  dataKey={sector.key}
                  name={sector.label}
                  stroke={SECTOR_COLORS[sector.key]}
                  strokeWidth={1.75}
                  dot={{ r: 2, fill: SECTOR_COLORS[sector.key], strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export { AdminConcentrationTimeline }
export default AdminConcentrationTimeline
