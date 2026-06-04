import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ADMINISTRATIONS, PARTY_COLORS } from './data'
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

function getRiskLevel(pct: number): 'critical' | 'high' | 'medium' | 'low' {
  if (pct >= 20) return 'critical'
  if (pct >= 12) return 'high'
  if (pct >= 6)  return 'medium'
  return 'low'
}

function getCellBg(riskLevel: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (riskLevel) {
    case 'critical': return 'rgba(239,68,68,0.25)'
    case 'high':     return 'rgba(245,158,11,0.2)'
    case 'medium':   return 'rgba(161,98,7,0.15)'
    case 'low':      return 'var(--color-background-elevated)'
  }
}

function getCellColor(riskLevel: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (riskLevel) {
    case 'critical': return '#ef4444'
    case 'high':     return '#f59e0b'
    case 'medium':   return '#a16207'
    case 'low':      return 'var(--color-text-muted)'
  }
}

interface MatrixCellProps {
  adminName: string
  sector: { key: string; code: string; name: string }
  cellData: LiveCell
  metric: MatrixMetric
  adminColor: string
  maxValueAcrossAll: number
  totalMXNForCell: number
  maxMXNAcrossAll: number
}

function MatrixCell({ adminName, sector, cellData, metric, adminColor, maxValueAcrossAll, totalMXNForCell, maxMXNAcrossAll }: MatrixCellProps) {
  const displayVal = getCellValue(metric, cellData)
  const displayText = getCellDisplay(metric, cellData)
  // Use risk-based coloring for visual encoding regardless of selected metric
  const riskLevel = getRiskLevel(cellData.risk * 100)
  const bgColor = getCellBg(riskLevel)
  const textColor = getCellColor(riskLevel)
  const barWidth = maxMXNAcrossAll > 0 ? Math.max(4, (totalMXNForCell / maxMXNAcrossAll) * 100) : 0
  void maxValueAcrossAll // suppress unused warning — kept for future normalization
  return (
    <td className="p-0">
      <div
        className="relative flex flex-col items-center justify-center cursor-default select-none overflow-hidden"
        style={{
          minWidth: 72,
          minHeight: 48,
          backgroundColor: bgColor,
          border: '1px solid var(--color-border)',
          borderRadius: 3,
        }}
        title={`${sector.name} · ${adminName}: ${displayText}`}
        aria-label={`${sector.name} under ${adminName}: ${displayText}`}
      >
        <span
          className="font-bold tabular-nums leading-none"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 18,
            color: textColor,
          }}
        >
          {displayVal.toFixed(0)}%
        </span>
        {/* Mini MXN spend bar at bottom */}
        {barWidth > 0 && (
          <div
            className="absolute bottom-0 left-0 h-[3px]"
            style={{
              width: `${barWidth}%`,
              backgroundColor: adminColor,
              opacity: 0.6,
            }}
            aria-hidden="true"
          />
        )}
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
}: {
  selectedAdmin: AdminName
  liveMatrix: Record<string, Record<string, { risk: number; da: number; hr: number; sb: number }>> | null
  /** Per-admin overall values (the "standings" column). Same shape as a cell. */
  summary: Record<string, { risk: number; da: number; hr: number; sb: number }> | null
  metric: MatrixMetric
  onMetricChange: (m: MatrixMetric) => void
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
  const maxValueAcrossAll = allCellValues.length > 0 ? Math.max(...allCellValues) : 1

  return (
    <div className="card-elevated">
      <div className="px-4 py-3 border-b border-border/60 bg-background-card">
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
            {/* Risk-level legend */}
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span className="px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.25)', color: '#ef4444' }}>CRIT</span>
              <span className="px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>HIGH</span>
              <span className="px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(161,98,7,0.15)', color: '#a16207' }}>MED</span>
              <span className="px-1.5 py-0.5 rounded-sm text-text-muted" style={{ backgroundColor: 'var(--color-background-elevated)' }}>LOW</span>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto px-4 py-3 bg-background-card">
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
              const adminColor = admin.color || partyColor
              const overall = summary?.[admin.name] ?? null
              const overallLevel = getRiskLevel((overall?.risk ?? 0) * 100)
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
                        {admin.name}
                      </span>
                    </div>
                  </td>
                  {/* OVERALL standing — the anchor column */}
                  <td className="p-0">
                    <div
                      className="flex items-center justify-center select-none"
                      style={{
                        minWidth: 64,
                        minHeight: 48,
                        backgroundColor: getCellBg(overallLevel),
                        border: '1px solid var(--color-border-hover)',
                        borderRadius: 3,
                      }}
                      title={overall ? `${admin.name} · ${METRIC_LABELS[metric]}: ${getCellDisplay(metric, overall)}` : '--'}
                      aria-label={overall ? `${admin.name} overall ${METRIC_LABELS[metric]}: ${getCellDisplay(metric, overall)}` : undefined}
                    >
                      <span
                        className="font-bold tabular-nums leading-none"
                        style={{ fontFamily: 'var(--font-family-serif)', fontSize: 19, color: getCellColor(overallLevel) }}
                      >
                        {overall ? getCellDisplay(metric, overall) : '–'}
                      </span>
                    </div>
                  </td>
                  {MATRIX_SECTORS.map((sector) => {
                    const cellData = liveRow?.[sector.key] ?? { risk: 0, da: 0, hr: 0, sb: 0 }
                    const cellVal = getCellValue(metric, cellData)
                    return (
                      <MatrixCell
                        key={sector.key}
                        adminName={admin.name}
                        sector={sector}
                        cellData={cellData}
                        metric={metric}
                        adminColor={adminColor}
                        maxValueAcrossAll={maxValueAcrossAll}
                        totalMXNForCell={cellVal}
                        maxMXNAcrossAll={maxValueAcrossAll}
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
