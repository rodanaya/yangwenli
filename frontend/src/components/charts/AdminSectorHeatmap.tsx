/**
 * AdminSectorHeatmap — NYT-style procurement intensity heatmap.
 *
 * Rows: 6 presidential administrations
 * Columns: 12 sectors
 * Cell value: % of administration's total spend allocated to each sector
 * Color scale: white -> light-amber -> orange -> deep red
 */

import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SECTORS, SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import type { SectorYearItem } from '@/api/types'
import EditorialChartFrame from '@/components/stories/EditorialChartFrame'

const DATA_SOURCE_EN = 'Source: RUBLI analysis · COMPRANET data 2002–2025 · Risk model v0.8.5'
const DATA_SOURCE_ES = 'Fuente: análisis RUBLI · datos COMPRANET 2002–2025 · Modelo de riesgo v0.8.5'

interface Administration {
  name: string
  fullName: string
  start: number
  end: number
  dataStart: number
  party: string
}

const ADMINS: Administration[] = [
  { name: 'Fox',         fullName: 'Vicente Fox Quesada',            start: 2000, end: 2006, dataStart: 2002, party: 'PAN' },
  { name: 'Calderon',    fullName: 'Felipe Calderón Hinojosa',       start: 2006, end: 2012, dataStart: 2006, party: 'PAN' },
  { name: 'Pena Nieto',  fullName: 'Enrique Peña Nieto',             start: 2012, end: 2018, dataStart: 2012, party: 'PRI' },
  { name: 'AMLO',        fullName: 'Andrés Manuel López Obrador',    start: 2018, end: 2024, dataStart: 2018, party: 'MORENA' },
  { name: 'Sheinbaum',   fullName: 'Claudia Sheinbaum Pardo',        start: 2024, end: 2030, dataStart: 2024, party: 'MORENA' },
]

interface HeatmapCell {
  adminName: string
  sectorCode: string
  sectorNameEN: string
  pct: number
  totalValue: number
}

interface AdminSectorHeatmapProps {
  /** Raw sector-year breakdown items from the API */
  sectorYearData: SectorYearItem[]
  /** Height per row in pixels (default 44) */
  rowHeight?: number
  /** Width per cell in pixels (default 64) */
  cellWidth?: number
}

/**
 * Interpolate between two hex colors.
 */
function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const ca = parse(a)
  const cb = parse(b)
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t)
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t)
  const bv = Math.round(ca[2] + (cb[2] - ca[2]) * t)
  return `rgb(${r},${g},${bv})`
}

// Risk-derived intensity ramp: low → medium → high → critical
// Anchors come from RISK_COLORS so the cell palette matches every other
// chart in the platform (no inline hex outside the constants module).
const RAMP_LOW = '#f3f1ec'              // cream baseline (token-equivalent)
const RAMP_MED = RISK_COLORS.medium     // #a16207
const RAMP_HIGH = RISK_COLORS.high      // #f59e0b
const RAMP_CRIT = RISK_COLORS.critical  // #ef4444

function heatColor(pct: number, maxPct: number): string {
  if (maxPct <= 0) return 'var(--color-background-elevated)'
  const t = Math.min(pct / maxPct, 1)
  // RISK_COLORS-derived ramp: cream → medium → high → critical.
  if (t < 0.33) return lerpColor(RAMP_LOW, RAMP_MED, t / 0.33)
  if (t < 0.66) return lerpColor(RAMP_MED, RAMP_HIGH, (t - 0.33) / 0.33)
  return lerpColor(RAMP_HIGH, RAMP_CRIT, (t - 0.66) / 0.34)
}

export const AdminSectorHeatmap = memo(function AdminSectorHeatmap({
  sectorYearData,
  rowHeight = 44,
  cellWidth = 64,
}: AdminSectorHeatmapProps) {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  const { cells, maxPct } = useMemo(() => {
    const result: HeatmapCell[] = []
    let maxP = 0

    for (const admin of ADMINS) {
      // Filter data to this admin's years
      const adminRows = sectorYearData.filter(
        (d) => d.year >= admin.dataStart && d.year < admin.end,
      )
      const adminTotal = adminRows.reduce((s, r) => s + r.total_value, 0)

      for (const sector of SECTORS) {
        const sectorRows = adminRows.filter((r) => r.sector_id === sector.id)
        const sectorValue = sectorRows.reduce((s, r) => s + r.total_value, 0)
        const pct = adminTotal > 0 ? (sectorValue / adminTotal) * 100 : 0
        if (pct > maxP) maxP = pct
        result.push({
          adminName: admin.name,
          sectorCode: sector.code,
          sectorNameEN: sector.nameEN,
          pct,
          totalValue: sectorValue,
        })
      }
    }

    return { cells: result, maxPct: maxP }
  }, [sectorYearData])

  if (!cells.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-muted text-sm font-mono">
        {t('charts.adminSectorHeatmap.noData')}
      </div>
    )
  }

  const rowLabelWidth = 100
  const totalWidth = rowLabelWidth + SECTORS.length * cellWidth

  const kicker = lang === 'en' ? 'RUBLI · PROCUREMENT INTENSITY' : 'RUBLI · INTENSIDAD DE COMPRA'
  const headline = lang === 'en'
    ? 'Sector share of administration spend'
    : 'Participación sectorial del gasto por administración'
  const subline = lang === 'en'
    ? 'Each cell is the percentage of the administration\'s total awarded value going to that sector.'
    : 'Cada celda es el porcentaje del valor adjudicado total de la administración asignado a ese sector.'
  const source = lang === 'en' ? DATA_SOURCE_EN : DATA_SOURCE_ES

  return (
    <EditorialChartFrame
      kicker={kicker}
      headline={headline}
      subline={subline}
      footer={source}
      tone="bare"
      animate={false}
    >
      <div
        className="overflow-x-auto"
        role="table"
        aria-label="Procurement intensity heatmap: administrations vs sectors"
      >
        <div style={{ minWidth: totalWidth }}>
          {/* Sector column headers */}
          <div className="flex" style={{ paddingLeft: rowLabelWidth }}>
            {SECTORS.map((sector) => (
              <div
                key={sector.code}
                className="flex flex-col items-center justify-end pb-1"
                style={{ width: cellWidth }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mb-1"
                  style={{ backgroundColor: SECTOR_COLORS[sector.code] }}
                />
                <span
                  className="text-[9px] font-mono font-semibold text-text-muted uppercase leading-tight text-center break-words"
                  style={{ maxWidth: cellWidth - 4 }}
                >
                  {sector.nameEN}
                </span>
              </div>
            ))}
          </div>

          {/* Rows: one per administration */}
          {ADMINS.map((admin) => (
            <div key={admin.name} className="flex items-stretch" style={{ height: rowHeight }}>
              {/* Row label */}
              <div
                className="flex items-center pr-2 flex-shrink-0"
                style={{ width: rowLabelWidth }}
              >
                <span className="text-[10px] font-mono font-bold text-text-secondary truncate">
                  {admin.name}
                </span>
                <span className="ml-1 text-[8px] text-text-muted font-mono">
                  {admin.dataStart}-{Math.min(admin.end, 2025)}
                </span>
              </div>

              {/* Cells */}
              {SECTORS.map((sector) => {
                const cell = cells.find(
                  (c) => c.adminName === admin.name && c.sectorCode === sector.code,
                )
                const pct = cell?.pct ?? 0
                const cellKey = `${admin.name}-${sector.code}`
                const isHovered = hoveredCell === cellKey

                return (
                  <div
                    key={sector.code}
                    className="relative flex items-center justify-center border border-border/60 transition-all duration-150"
                    style={{
                      width: cellWidth,
                      backgroundColor: heatColor(pct, maxPct),
                      outline: isHovered ? '2px solid rgba(255,255,255,0.4)' : 'none',
                      outlineOffset: '-1px',
                      zIndex: isHovered ? 10 : 0,
                    }}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                    role="cell"
                    aria-label={`${admin.name}, ${sector.nameEN}: ${pct.toFixed(1)}%`}
                  >
                    <span
                      className="text-[10px] font-mono font-semibold tabular-nums"
                      style={{
                        color: pct > maxPct * 0.4 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {pct >= 1 ? pct.toFixed(0) : pct > 0 ? pct.toFixed(1) : '-'}
                    </span>

                    {/* Hover tooltip */}
                    {isHovered && cell && (
                      <div
                        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-background-card border border-border rounded-lg px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap"
                      >
                        <p className="text-[10px] font-medium text-text-primary mb-0.5">
                          {admin.fullName} &middot; {sector.nameEN}
                        </p>
                        <p className="text-[10px] font-mono text-text-muted">
                          {pct.toFixed(2)}% of total spend
                        </p>
                        <p className="text-[10px] font-mono text-text-muted">
                          {cell.totalValue >= 1e12
                            ? `${(cell.totalValue / 1e12).toFixed(2)}T MXN`
                            : cell.totalValue >= 1e9
                            ? `${(cell.totalValue / 1e9).toFixed(1)}B MXN`
                            : `${(cell.totalValue / 1e6).toFixed(0)}M MXN`}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Color scale legend */}
        <div className="flex items-center gap-2 mt-3 ml-[100px]">
          <span className="text-[9px] text-text-muted font-mono">0%</span>
          <div
            className="h-3 rounded-sm"
            style={{
              width: 120,
              background: `linear-gradient(to right, ${RAMP_LOW}, ${RAMP_MED}, ${RAMP_HIGH}, ${RAMP_CRIT})`,
            }}
          />
          <span className="text-[9px] text-text-muted font-mono">{maxPct.toFixed(0)}%</span>
          <span className="text-[9px] text-text-muted font-mono ml-2">
            {lang === 'en' ? '% of admin total spend' : '% del gasto total de la administración'}
          </span>
        </div>
      </div>
    </EditorialChartFrame>
  )
})

export default AdminSectorHeatmap
