/**
 * SectorAdminHeatmap — 12 sectors × 5 administrations heatmap of avg risk score.
 *
 * Data strategy (Option B): single call to `/analysis/sector-year-breakdown`
 * (`analysisApi.getSectorYearBreakdown`) which returns per-sector-per-year rows
 * with `avg_risk` and `contracts`. We aggregate client-side into admin periods
 * using a contract-weighted mean of `avg_risk`.
 *
 * Visualization: pure CSS/Tailwind grid. No chart library. Cell background is
 * bucketed by risk level (v0.6.5 thresholds). Hover reveals a tooltip with
 * sector, admin, score and risk level in Spanish.
 */
import { memo, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import type { SectorYearItem } from '@/api/types'

// ── Administrations ──────────────────────────────────────────────────────────
// Year ranges are inclusive of dataStart, exclusive of end (matches Administrations.tsx).

interface Administration {
  readonly name: string
  readonly shortYears: string
  readonly dataStart: number
  readonly end: number
}

const ADMINISTRATIONS: readonly Administration[] = [
  { name: 'Fox',        shortYears: '02–06', dataStart: 2002, end: 2006 },
  { name: 'Calderón',   shortYears: '06–12', dataStart: 2006, end: 2012 },
  { name: 'Peña Nieto', shortYears: '12–18', dataStart: 2012, end: 2018 },
  { name: 'AMLO',       shortYears: '18–24', dataStart: 2018, end: 2024 },
  { name: 'Sheinbaum',  shortYears: '24+',   dataStart: 2024, end: 2031 },
] as const

// ── Risk thresholds (v0.6.5) ─────────────────────────────────────────────────

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

function classifyRisk(score: number): RiskLevel {
  if (score >= 0.60) return 'critical'
  if (score >= 0.40) return 'high'
  if (score >= 0.25) return 'medium'
  return 'low'
}

const RISK_CELL_BG: Record<RiskLevel, string> = {
  critical: '#7f1d1d', // red-900
  high:     '#9a3412', // orange-900
  medium:   '#78350f', // amber-900
  low:      '#27272a', // zinc-800
}

const RISK_LABEL_ES: Record<RiskLevel, string> = {
  critical: 'Crítico',
  high:     'Alto',
  medium:   'Medio',
  low:      'Bajo',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Cell {
  sectorId: number
  adminName: string
  avgRisk: number | null // null if no data (no contracts in that bucket)
  contracts: number
}

interface TooltipState {
  x: number
  y: number
  sectorName: string
  adminName: string
  adminYears: string
  avgRisk: number
  riskLevel: RiskLevel
  contracts: number
}

export interface SectorAdminHeatmapProps {
  className?: string
}

// ── Aggregation ──────────────────────────────────────────────────────────────

function aggregate(rows: SectorYearItem[]): Cell[] {
  const cells: Cell[] = []
  for (const sector of SECTORS) {
    for (const admin of ADMINISTRATIONS) {
      const bucket = rows.filter(
        (r) =>
          r.sector_id === sector.id &&
          r.year >= admin.dataStart &&
          r.year < admin.end,
      )
      const totalContracts = bucket.reduce((s, r) => s + (r.contracts || 0), 0)
      const weighted =
        totalContracts > 0
          ? bucket.reduce((s, r) => s + (r.avg_risk || 0) * (r.contracts || 0), 0) /
            totalContracts
          : null
      cells.push({
        sectorId: sector.id,
        adminName: admin.name,
        avgRisk: weighted,
        contracts: totalContracts,
      })
    }
  }
  return cells
}

function getCell(cells: Cell[], sectorId: number, adminName: string): Cell | undefined {
  return cells.find((c) => c.sectorId === sectorId && c.adminName === adminName)
}

// ── Component ────────────────────────────────────────────────────────────────

export const SectorAdminHeatmap = memo(function SectorAdminHeatmap({
  className,
}: SectorAdminHeatmapProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  const cells = useMemo(() => (data ? aggregate(data.data) : []), [data])

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // ── Loading ──
  if (isLoading) {
    return (
      <div className={className}>
        <HeatmapHeader />
        <div className="mt-4">
          <div className="grid" style={gridTemplate()}>
            {/* top-left empty */}
            <div />
            {ADMINISTRATIONS.map((a) => (
              <div key={a.name} className="h-10" />
            ))}
            {SECTORS.map((s) => (
              <SkeletonRow key={s.id} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (isError || !data) {
    return (
      <div className={className}>
        <HeatmapHeader />
        <div className="mt-4 rounded border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-400">
          No se pudo cargar el desglose sector × administración.
        </div>
      </div>
    )
  }

  // ── Rendered heatmap ──
  return (
    <div className={className}>
      <HeatmapHeader />

      <div className="relative mt-4 overflow-x-auto">
        <div className="inline-grid min-w-full" style={gridTemplate()}>
          {/* Top-left spacer */}
          <div className="border-b border-zinc-800" />

          {/* Column headers: administrations */}
          {ADMINISTRATIONS.map((admin) => (
            <div
              key={admin.name}
              className="flex flex-col items-center justify-end border-b border-zinc-800 px-1 pb-2"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-300">
                {admin.name}
              </span>
              <span className="text-[10px] text-zinc-500">{admin.shortYears}</span>
            </div>
          ))}

          {/* Body rows */}
          {SECTORS.map((sector) => (
            <RowGroup
              key={sector.id}
              sectorId={sector.id}
              sectorName={sector.name}
              cells={cells}
              onHover={(info) => setTooltip(info)}
              onLeave={() => setTooltip(null)}
            />
          ))}
        </div>

        {tooltip && <HeatmapTooltip {...tooltip} />}
      </div>

      <Legend />
    </div>
  )
})

export default SectorAdminHeatmap

// ── Sub-components ───────────────────────────────────────────────────────────

function HeatmapHeader() {
  return (
    <div className="border-l-2 border-zinc-600 pl-3">
      <h3 className="font-serif text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-300">
        Riesgo Promedio — Sector × Administración
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Puntuación promedio del modelo v0.6.5 por sector y período presidencial
      </p>
    </div>
  )
}

interface RowGroupProps {
  sectorId: number
  sectorName: string
  cells: Cell[]
  onHover: (info: TooltipState) => void
  onLeave: () => void
}

function RowGroup({ sectorId, sectorName, cells, onHover, onLeave }: RowGroupProps) {
  return (
    <>
      <div className="flex items-center justify-end border-b border-zinc-900 pr-3 text-[12px] text-zinc-300">
        {sectorName}
      </div>
      {ADMINISTRATIONS.map((admin) => {
        const cell = getCell(cells, sectorId, admin.name)
        const score = cell?.avgRisk ?? null
        const level = score !== null ? classifyRisk(score) : null
        const bg = level ? RISK_CELL_BG[level] : '#18181b' // zinc-900 for no data

        return (
          <div
            key={admin.name}
            className="flex h-11 items-center justify-center border-b border-zinc-900 border-l border-l-zinc-900/60 text-[11px] font-bold text-white transition-colors hover:ring-1 hover:ring-zinc-500"
            style={{ backgroundColor: bg }}
            onMouseEnter={(e) => {
              if (score === null || !level) return
              const rect = e.currentTarget.getBoundingClientRect()
              const parent = e.currentTarget.offsetParent as HTMLElement | null
              const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0 }
              onHover({
                x: rect.left - parentRect.left + rect.width / 2,
                y: rect.top - parentRect.top,
                sectorName,
                adminName: admin.name,
                adminYears: admin.shortYears,
                avgRisk: score,
                riskLevel: level,
                contracts: cell?.contracts ?? 0,
              })
            }}
            onMouseLeave={onLeave}
            role="gridcell"
            aria-label={
              score !== null && level
                ? `${sectorName}, ${admin.name}: ${score.toFixed(2)} (${RISK_LABEL_ES[level]})`
                : `${sectorName}, ${admin.name}: sin datos`
            }
          >
            {score !== null ? score.toFixed(2) : <span className="text-zinc-600">—</span>}
          </div>
        )
      })}
    </>
  )
}

function SkeletonRow() {
  return (
    <>
      <div className="flex items-center justify-end border-b border-zinc-900 pr-3">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
      </div>
      {ADMINISTRATIONS.map((a) => (
        <div
          key={a.name}
          className="h-11 animate-pulse border-b border-zinc-900 bg-zinc-800/60"
        />
      ))}
    </>
  )
}

function HeatmapTooltip(props: TooltipState) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
      style={{ left: props.x, top: props.y - 4 }}
      role="tooltip"
    >
      <div className="font-semibold text-zinc-100">{props.sectorName}</div>
      <div className="text-zinc-400">
        {props.adminName} · {props.adminYears}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-base font-bold text-white">
          {props.avgRisk.toFixed(3)}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            backgroundColor: RISK_CELL_BG[props.riskLevel],
            color: '#fff',
          }}
        >
          {RISK_LABEL_ES[props.riskLevel]}
        </span>
      </div>
      {props.contracts > 0 && (
        <div className="mt-0.5 text-[10px] text-zinc-500">
          {props.contracts.toLocaleString('es-MX')} contratos
        </div>
      )}
    </div>
  )
}

function Legend() {
  const items: { level: RiskLevel; label: string; range: string }[] = [
    { level: 'low',      label: 'Bajo',     range: '< 0.25' },
    { level: 'medium',   label: 'Medio',    range: '0.25–0.40' },
    { level: 'high',     label: 'Alto',     range: '0.40–0.60' },
    { level: 'critical', label: 'Crítico',  range: '≥ 0.60' },
  ]
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
      <span className="uppercase tracking-wide">Nivel de riesgo:</span>
      {items.map((it) => (
        <span key={it.level} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: RISK_CELL_BG[it.level] }}
          />
          <span className="text-zinc-400">{it.label}</span>
          <span className="font-mono text-zinc-600">{it.range}</span>
        </span>
      ))}
    </div>
  )
}

// ── Layout helper ────────────────────────────────────────────────────────────

function gridTemplate(): React.CSSProperties {
  // 1 narrow column for sector names, then 5 admin columns of equal width.
  return {
    gridTemplateColumns: `minmax(120px, 0.8fr) repeat(${ADMINISTRATIONS.length}, minmax(90px, 1fr))`,
  }
}
