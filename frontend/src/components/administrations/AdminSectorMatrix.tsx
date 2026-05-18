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
  metric,
  onMetricChange,
}: {
  selectedAdmin: AdminName
  liveMatrix: Record<string, Record<string, { risk: number; da: number; hr: number; sb: number }>> | null
  metric: MatrixMetric
  onMetricChange: (m: MatrixMetric) => void
}) {
  const { t } = useTranslation('administrations')
  const isLive = liveMatrix !== null

  // Compute max MXN for mini bar normalization — use total_value if available, else use risk * da as proxy
  // For now use spend proxy: risk * da * 1e9 is not available; use count (contracts) is also not in matrix.
  // Mini bar width: we can only compute relative intensity per admin×sector from the risk value.
  // We normalize across all cells in the matrix.
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
              <th scope="col" className="text-left pr-3 pb-1 text-[10px] text-text-muted font-normal w-24 whitespace-nowrap">
                {t('matrixLegend.administration')}
              </th>
              {MATRIX_SECTORS.map((sector) => (
                <th scope="col" key={sector.key} className="text-center pb-1 align-bottom" title={sector.name}>
                  <span
                    className="text-[9px] text-text-muted font-mono font-semibold tracking-wider block"
                    style={{ minWidth: 72 }}
                  >
                    {sector.code}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMINISTRATIONS.map((admin) => {
              const liveRow = liveMatrix?.[admin.name]
              const isSelected = admin.name === selectedAdmin
              const isAMLO = admin.name === 'AMLO'
              const partyColor = PARTY_COLORS[admin.party] || '#64748b'
              const adminColor = admin.color || partyColor
              return (
                <tr
                  key={admin.name}
                  style={isAMLO ? { borderLeft: '2px solid #ef4444' } : undefined}
                >
                  <td className="pr-3 py-0.5">
                    <div className="flex items-center gap-1.5">
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
                      {isAMLO && (
                        <span className="text-[8px] font-mono text-risk-critical ml-0.5">12.9%</span>
                      )}
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
