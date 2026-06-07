import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { scaleToColor } from '@/components/charts/editorial'
import { ADMINISTRATIONS, ADMIN_DISPLAY_NAMES, PARTY_COLORS } from './data'
import type { AdminName } from './types'

export type MatrixMetric = 'risk' | 'da' | 'hr' | 'sb'

export const MATRIX_SECTORS = [
  { key: 'salud',          code: 'SALUD',  name: 'Health' },
  { key: 'educacion',      code: 'EDUC',   name: 'Education' },
  { key: 'infraestructura',code: 'INFRA',  name: 'Infrastructure' },
  { key: 'energia',        code: 'ENERG',  name: 'Energy' },
  { key: 'defensa',        code: 'DEF',    name: 'Defense' },
  { key: 'tecnologia',     code: 'TEC',    name: 'Technology' },
  { key: 'hacienda',       code: 'HAC',    name: 'Finance' },
  { key: 'gobernacion',    code: 'GOB',    name: 'Interior' },
  { key: 'agricultura',    code: 'AGR',    name: 'Agriculture' },
  { key: 'ambiente',       code: 'AMB',    name: 'Environment' },
  { key: 'trabajo',        code: 'TRAB',   name: 'Labor' },
  { key: 'otros',          code: 'OTRO',   name: 'Other' },
]

type LiveCell = { risk: number; da: number; hr: number; sb: number }

function getCellValue(metric: MatrixMetric, v: LiveCell): number {
  switch (metric) {
    case 'risk': return v.risk * 100
    case 'da':   return v.da
    case 'hr':   return v.hr
    case 'sb':   return v.sb
  }
}

function getCellDisplay(metric: MatrixMetric, v: LiveCell): string {
  const val = getCellValue(metric, v)
  return val.toFixed(0) + '%'
}

// Relative-intensity heatmap (replaces the old absolute 20/12/6 tier ladder).
// Cells are colored by their position within the grid's OWN min–max for the
// active metric (cream → amber → red via scaleToColor 'risk'), NOT by per-contract
// risk tiers. Rationale: avg-risk aggregates cluster at 0.19–0.32 and never reach
// RISK_THRESHOLDS (high 0.40 / critical 0.60), so absolute-tier coloring would
// either overclaim (paint 0.25 "critical" red) or read flat (all muted grey).
// Relative intensity shows where risk concentrates, honestly. Low end is cream —
// never green (Bible §3.10).
function cellInk(t: number): string {
  // Dark ink over the light cream→amber range; switch to white once the fill reddens.
  return t > 0.62 ? '#ffffff' : 'var(--color-text-primary)'
}
function intensityOf(value: number, min: number, max: number): number {
  return max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)))
}

interface MatrixCellProps {
  adminName: string
  sector: { key: string; code: string; name: string }
  value: number
  displayText: string
  min: number
  max: number
  /** Whether this cell is the worst (max-value) sector in its administration row. */
  isRowMax?: boolean
}

function MatrixCell({ adminName, sector, value, displayText, min, max, isRowMax }: MatrixCellProps) {
  const t = intensityOf(value, min, max)
  const bgColor = scaleToColor(value, min, max, 'risk')
  return (
    <td className="p-0">
      <div
        className="flex items-center justify-center cursor-default select-none overflow-hidden"
        style={{
          minWidth: 72,
          minHeight: 48,
          backgroundColor: bgColor,
          border: '1px solid var(--color-border)',
          borderRadius: 3,
          boxShadow: isRowMax ? 'inset 0 0 0 1.5px var(--color-accent)' : undefined,
        }}
        title={`${sector.name} · ${adminName}: ${displayText}`}
        aria-label={`${sector.name} under ${adminName}: ${displayText}`}
      >
        <span
          className="font-bold tabular-nums leading-none"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 18,
            color: cellInk(t),
          }}
        >
          {displayText}
        </span>
      </div>
    </td>
  )
}

const METRIC_LABELS: Record<MatrixMetric, string> = {
  risk: 'Avg Risk',
  da:   'Direct Award %',
  hr:   'High Risk %',
  sb:   'Single Bid %',
}

export function AdminSectorMatrix({
  selectedAdmin,
  liveMatrix,
  summary,
  metric,
  onMetricChange,
  bare,
}: {
  selectedAdmin: AdminName
  liveMatrix: Record<string, Record<string, { risk: number; da: number; hr: number; sb: number }>> | null
  /** Per-admin overall values (the "standings" column). Same shape as a cell. */
  summary: Record<string, { risk: number; da: number; hr: number; sb: number }> | null
  metric: MatrixMetric
  onMetricChange: (m: MatrixMetric) => void
  /** Drop the outer card chrome when embedded inside the PATRÓN folder (M7c). */
  bare?: boolean
}) {
  const { t } = useTranslation('administrations')
  const isLive = liveMatrix !== null

  // Standings sort. 'overall' = per-admin summary, 'chrono' = ADMINISTRATIONS
  // order, or a sector key. Default: overall descending → worst at the top.
  const OVERALL_KEY = 'overall'
  const [sortKey, setSortKey] = useState<string>(OVERALL_KEY)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const valueFor = (adminName: string, key: string): number => {
    if (key === OVERALL_KEY) {
      const s = summary?.[adminName]
      return s ? getCellValue(metric, s) : 0
    }
    const cell = liveMatrix?.[adminName]?.[key]
    return cell ? getCellValue(metric, cell) : 0
  }

  const sortedAdmins = useMemo(() => {
    if (sortKey === 'chrono') return ADMINISTRATIONS
    const arr = [...ADMINISTRATIONS]
    arr.sort((a, b) => {
      const d = valueFor(b.name, sortKey) - valueFor(a.name, sortKey)
      return sortDir === 'desc' ? d : -d
    })
    return arr
    // valueFor closes over metric/liveMatrix/summary — list them so re-sorts track data + metric changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortDir, metric, liveMatrix, summary])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }
  const ariaSort = (key: string): 'descending' | 'ascending' | 'none' =>
    sortKey === key ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'
  const sortCaret = (key: string) =>
    sortKey === key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''

  // Compute max value across all cells for the mini intensity bar normalization.
  const allCellValues: number[] = []
  if (liveMatrix) {
    for (const admin of ADMINISTRATIONS) {
      for (const sector of MATRIX_SECTORS) {
        const v = liveMatrix[admin.name]?.[sector.key]
        if (v) allCellValues.push(getCellValue(metric, v))
      }
    }
  }
  // F2 — normalize the intensity ramp to the P10–P90 of visible cell values
  // (per metric) instead of absolute min–max, so the 21–27% mid-band spreads
  // legibly instead of collapsing to one saturated orange.
  const percentile = (vals: number[], p: number): number => {
    if (vals.length === 0) return 0
    const sorted = [...vals].sort((a, b) => a - b)
    const idx = (sorted.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    if (lo === hi) return sorted[lo]
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
  }
  const p10 = allCellValues.length > 0 ? percentile(allCellValues, 0.10) : 0
  const p90Raw = allCellValues.length > 0 ? percentile(allCellValues, 0.90) : 1
  // Guard against a degenerate flat ramp (all cells equal).
  const p90 = p90Raw > p10 ? p90Raw : p10 + 1
  const minValueAcrossAll = p10
  const maxValueAcrossAll = p90

  // The OVERALL standings column gets its own intensity scale (5 admin values)
  // so the worst administration reads reddest regardless of the cell-grid range.
  const overallValues = ADMINISTRATIONS
    .map((a) => {
      const s = summary?.[a.name]
      return s ? getCellValue(metric, s) : null
    })
    .filter((v): v is number => v !== null)
  const overallMin = overallValues.length > 0 ? Math.min(...overallValues) : 0
  const overallMax = overallValues.length > 0 ? Math.max(...overallValues) : 1

  return (
    <div className={bare ? '' : 'card-elevated'}>
      <div className={cn('px-4 py-3', !bare && 'border-b border-border/60 bg-background-card')}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-mono text-text-primary">
              {t('matrixTitle')}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isLive ? t('matrixSubtitle') : t('matrixSubtitleLoading')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-0.5 rounded-sm border border-border/40 p-0.5 bg-background-elevated/30">
              {(Object.keys(METRIC_LABELS) as MatrixMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onMetricChange(m)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                    metric === m
                      ? 'bg-accent/20 text-accent'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {METRIC_LABELS[m].replace(' %', '')}
                </button>
              ))}
            </div>
            {/* Ranked ⇄ chronological toggle */}
            <button
              type="button"
              onClick={() => {
                if (sortKey === 'chrono') {
                  setSortKey(OVERALL_KEY)
                  setSortDir('desc')
                } else {
                  setSortKey('chrono')
                }
              }}
              aria-pressed={sortKey === 'chrono'}
              title={t('matrixChronoHint', 'Toggle chronological / ranked order')}
              className={cn(
                'px-2 py-0.5 rounded-sm text-[10px] font-mono border transition-colors',
                sortKey === 'chrono'
                  ? 'border-accent/40 bg-accent/20 text-accent'
                  : 'border-border/40 text-text-muted hover:text-text-primary',
              )}
            >
              {t('matrixChrono', 'Crono')}
            </button>
            {/* Relative-intensity legend — color is each cell's rank within the
                grid's own min–max for the active metric, not an absolute risk tier. */}
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-muted">
              <span>{t('matrixLess', 'menor')}</span>
              <span
                className="h-2.5 w-20 rounded-sm"
                style={{
                  background: 'linear-gradient(90deg, #f3f1ec, #f59e0b, #ef4444)',
                  border: '1px solid var(--color-border)',
                }}
                aria-hidden="true"
              />
              <span>{t('matrixMore', 'mayor')}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={cn('overflow-x-auto px-4 py-3', !bare && 'bg-background-card')}>
        <table className="border-separate" style={{ borderSpacing: 3 }} aria-label="Administration sector comparison matrix">
          <thead>
            <tr>
              <th scope="col" className="text-left pr-3 pb-1 text-[10px] text-text-muted font-normal w-28 whitespace-nowrap">
                {t('matrixLegend.administration')}
              </th>
              <th scope="col" aria-sort={ariaSort(OVERALL_KEY)} className="text-center pb-1 align-bottom px-1">
                <button
                  type="button"
                  onClick={() => handleSort(OVERALL_KEY)}
                  className={cn(
                    'text-[9px] font-mono font-bold tracking-wider block w-full transition-colors',
                    sortKey === OVERALL_KEY ? 'text-accent' : 'text-text-muted hover:text-text-primary',
                  )}
                  style={{ minWidth: 64 }}
                  title={t('matrixOverallHint', 'Sort by overall standing')}
                >
                  {t('matrixOverall', 'GENERAL')}{sortCaret(OVERALL_KEY)}
                </button>
              </th>
              {MATRIX_SECTORS.map((sector) => (
                <th scope="col" key={sector.key} aria-sort={ariaSort(sector.key)} className="text-center pb-1 align-bottom" title={sector.name}>
                  <button
                    type="button"
                    onClick={() => handleSort(sector.key)}
                    className={cn(
                      'text-[9px] font-mono font-semibold tracking-wider block w-full transition-colors',
                      sortKey === sector.key ? 'text-accent' : 'text-text-muted hover:text-text-primary',
                    )}
                    style={{ minWidth: 72 }}
                  >
                    {sector.code}{sortCaret(sector.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAdmins.map((admin, rankIdx) => {
              const liveRow = liveMatrix?.[admin.name]
              const isSelected = admin.name === selectedAdmin
              const isAMLO = admin.name === 'AMLO'
              const partyColor = PARTY_COLORS[admin.party] || '#64748b'
              const overall = summary?.[admin.name] ?? null
              const overallVal = overall ? getCellValue(metric, overall) : 0
              const overallT = intensityOf(overallVal, overallMin, overallMax)
              // Worst (max-value) sector cell in this row — gets the accent ring.
              let rowMaxKey: string | null = null
              let rowMaxVal = -Infinity
              for (const sector of MATRIX_SECTORS) {
                const cd = liveRow?.[sector.key]
                if (!cd) continue
                const v = getCellValue(metric, cd)
                if (v > rowMaxVal) { rowMaxVal = v; rowMaxKey = sector.key }
              }
              return (
                <tr
                  key={admin.name}
                  style={isAMLO ? { borderLeft: '2px solid #ef4444' } : undefined}
                >
                  <td className="pr-3 py-0.5">
                    <div className="flex items-center gap-1.5">
                      {sortKey !== 'chrono' && (
                        <span className="text-[9px] font-mono tabular-nums text-text-muted/70 w-3 text-right flex-shrink-0">
                          {rankIdx + 1}
                        </span>
                      )}
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: partyColor }}
                      />
                      <span
                        className={cn(
                          'text-[10px] font-mono whitespace-nowrap',
                          isSelected ? 'text-accent font-semibold' : 'text-text-muted'
                        )}
                      >
                        {ADMIN_DISPLAY_NAMES[admin.name] ?? admin.name}
                      </span>
                    </div>
                  </td>
                  {/* OVERALL standing — the anchor column (own intensity scale) */}
                  <td className="p-0">
                    <div
                      className="flex items-center justify-center select-none"
                      style={{
                        minWidth: 64,
                        minHeight: 48,
                        backgroundColor: overall ? scaleToColor(overallVal, overallMin, overallMax, 'risk') : 'var(--color-background-elevated)',
                        border: '1px solid var(--color-border-hover)',
                        borderRadius: 3,
                      }}
                      title={overall ? `${admin.name} · ${METRIC_LABELS[metric]}: ${getCellDisplay(metric, overall)}` : '--'}
                      aria-label={overall ? `${admin.name} overall ${METRIC_LABELS[metric]}: ${getCellDisplay(metric, overall)}` : undefined}
                    >
                      <span
                        className="font-bold tabular-nums leading-none"
                        style={{ fontFamily: 'var(--font-family-serif)', fontSize: 19, color: overall ? cellInk(overallT) : 'var(--color-text-muted)' }}
                      >
                        {overall ? getCellDisplay(metric, overall) : '–'}
                      </span>
                    </div>
                  </td>
                  {MATRIX_SECTORS.map((sector) => {
                    const cellData = liveRow?.[sector.key] ?? { risk: 0, da: 0, hr: 0, sb: 0 }
                    return (
                      <MatrixCell
                        key={sector.key}
                        adminName={admin.name}
                        sector={sector}
                        value={getCellValue(metric, cellData)}
                        displayText={getCellDisplay(metric, cellData)}
                        min={minValueAcrossAll}
                        max={maxValueAcrossAll}
                        isRowMax={rowMaxKey === sector.key && rowMaxVal > 0}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {!isLive && (
          <p className="text-[10px] text-text-muted mt-3 font-mono">
            {t('matrixLoadingNote')}
          </p>
        )}
      </div>
    </div>
  )
}
