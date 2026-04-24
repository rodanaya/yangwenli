/**
 * AdminConcentrationTimeline
 *
 * Vendor market concentration (top vendor's share of sector spend) over time,
 * with administration-era background shading.
 *
 * Migrated to EditorialLineChart primitive (Apr 2026). Admin bands rendered as
 * token-locked annotations (admin tone). Sector lines use sector-* tokens.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import {
  EditorialLineChart,
  type LineSeries,
  type ChartAnnotation,
  type ColorToken,
} from '@/components/charts/editorial'

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

// ── Administrations ──────────────────────────────────────────────────────────

const ADMIN_BANDS: ReadonlyArray<{
  key: string
  label: string
  start: number
  end: number
}> = [
  { key: 'fox',       label: 'Fox',        start: 2002, end: 2006 },
  { key: 'calderon',  label: 'Calderón',   start: 2006, end: 2012 },
  { key: 'pena',      label: 'Peña Nieto', start: 2012, end: 2018 },
  { key: 'amlo',      label: 'AMLO',       start: 2018, end: 2024 },
  { key: 'sheinbaum', label: 'Sheinbaum',  start: 2024, end: 2030 },
]

// Sectors to fetch — 4 largest by spend.
const TRACKED_SECTORS: ReadonlyArray<{
  id: number
  key: string
  label: string
  colorToken: ColorToken
}> = [
  { id: 1, key: 'salud',           label: 'Salud',           colorToken: 'sector-salud' },
  { id: 3, key: 'infraestructura', label: 'Infraestructura', colorToken: 'sector-infraestructura' },
  { id: 4, key: 'energia',         label: 'Energía',         colorToken: 'sector-energia' },
  { id: 2, key: 'educacion',       label: 'Educación',       colorToken: 'sector-educacion' },
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
    staleTime: 60 * 60 * 1000,
  })
}

// ── Main component ───────────────────────────────────────────────────────────

function AdminConcentrationTimeline({
  height = 280,
  className,
  title,
}: AdminConcentrationTimelineProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const { data, isLoading, isError } = useConcentrationTimeline()

  const chartData = useMemo<ChartRow[]>(() => {
    if (!data) return []
    const byYear = new Map<number, ChartRow>()
    data.forEach((resp, idx) => {
      const sector = TRACKED_SECTORS[idx]
      if (!sector || !resp?.history) return
      for (const pt of resp.history) {
        if (pt.year < YEAR_MIN || pt.year > YEAR_MAX) continue
        const row = byYear.get(pt.year) ?? { year: pt.year }
        const pct = Number((pt.top_vendor_share * 100).toFixed(2))
        row[sector.key] = pct
        byYear.set(pt.year, row)
      }
    })
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year)
  }, [data])

  const series: LineSeries<ChartRow>[] = useMemo(
    () =>
      TRACKED_SECTORS.map((s) => ({
        key: s.key,
        label: s.label,
        colorToken: s.colorToken,
        emphasis: 'secondary',
      })),
    [],
  )

  // Admin bands as annotations + vertical separators with labels.
  const annotations: ChartAnnotation[] = useMemo(() => {
    const out: ChartAnnotation[] = []
    ADMIN_BANDS.forEach((band) => {
      const x1 = Math.max(band.start, YEAR_MIN)
      const x2 = Math.min(band.end, YEAR_MAX)
      if (x2 <= x1) return
      out.push({ kind: 'band', x1, x2, label: band.label, tone: 'admin' })
      out.push({ kind: 'vrule', x: x1, label: band.label, tone: 'info' })
    })
    return out
  }, [])

  const heading = title ?? (lang === 'en' ? 'MARKET CONCENTRATION BY ADMINISTRATION' : 'CONCENTRACIÓN DE MERCADO POR ADMINISTRACIÓN')
  const subtitle = lang === 'en' ? 'Percentage of total awarded value captured by top vendor' : 'Porcentaje del valor total adjudicado al proveedor principal'

  return (
    <div className={className}>
      <div className="mb-3">
        <h3
          className="text-text-primary font-semibold tracking-wider uppercase"
          style={{ fontSize: 12, letterSpacing: '0.08em' }}
        >
          {heading}
        </h3>
        <p className="text-text-secondary mt-0.5" style={{ fontSize: 11 }}>
          {subtitle}
        </p>
      </div>

      {isLoading ? (
        <div
          className="bg-background-elevated rounded animate-pulse w-full"
          style={{ height }}
          aria-label={lang === 'en' ? 'Loading' : 'Cargando'}
        />
      ) : isError || !data || chartData.length === 0 ? (
        <div
          className="flex items-center justify-center text-text-secondary font-mono"
          style={{ height, fontSize: 11 }}
        >
          {lang === 'en' ? 'Could not load concentration data.' : 'No se pudieron cargar los datos de concentración.'}
        </div>
      ) : (
        <div role="img" aria-label={lang === 'en' ? 'Market concentration timeline by administration' : 'Línea de tiempo de concentración de mercado por administración'}>
          <EditorialLineChart<ChartRow>
            data={chartData}
            xKey="year"
            series={series}
            yFormat="pct"
            annotations={annotations}
            height={height}
          />
        </div>
      )}
    </div>
  )
}

export { AdminConcentrationTimeline }
export default AdminConcentrationTimeline
