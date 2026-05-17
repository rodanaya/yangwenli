import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ADMINISTRATIONS, PARTY_COLORS } from './data'
import type { AdminName } from './types'

export type MatrixMetric = 'risk' | 'da' | 'hr' | 'sb'

export const MATRIX_SECTORS = [
  { key: 'salud',          code: 'S',  name: 'Health' },
  { key: 'educacion',      code: 'Ed', name: 'Education' },
  { key: 'infraestructura',code: 'In', name: 'Infrastructure' },
  { key: 'energia',        code: 'En', name: 'Energy' },
  { key: 'defensa',        code: 'D',  name: 'Defense' },
  { key: 'tecnologia',     code: 'T',  name: 'Technology' },
  { key: 'hacienda',       code: 'H',  name: 'Finance' },
  { key: 'gobernacion',    code: 'G',  name: 'Interior' },
  { key: 'agricultura',    code: 'A',  name: 'Agriculture' },
  { key: 'ambiente',       code: 'Am', name: 'Environment' },
  { key: 'trabajo',        code: 'Tr', name: 'Labor' },
  { key: 'otros',          code: 'O',  name: 'Other' },
]

function intensityToColor(t: number): string {
  const c = Math.min(1, Math.max(0, t))
  const r = Math.round(191 + (55  - 191) * c)
  const g = Math.round(219 + (48  - 219) * c)
  const b = Math.round(254 + (163 - 254) * c)
  return `rgb(${r},${g},${b})`
}

type LiveCell = { risk: number; da: number; hr: number; sb: number }

function getCellIntensity(metric: MatrixMetric, v: LiveCell): number {
  switch (metric) {
    case 'risk': return Math.min(1, v.risk / 0.5)
    case 'da':   return Math.min(1, Math.max(0, (v.da - 20) / 80))
    case 'hr':   return Math.min(1, v.hr / 30)
    case 'sb':   return Math.min(1, v.sb / 40)
  }
}

function getCellDisplay(metric: MatrixMetric, v: LiveCell): string {
  switch (metric) {
    case 'risk': return (v.risk * 100).toFixed(0) + '%'
    case 'da':   return v.da.toFixed(0) + '%'
    case 'hr':   return v.hr.toFixed(0) + '%'
    case 'sb':   return v.sb.toFixed(0) + '%'
  }
}

interface MatrixCellProps {
  adminName: string
  sector: { key: string; code: string; name: string }
  intensity: number
  displayText: string
  isSelectedAdmin: boolean
}

function MatrixCell({ adminName, sector, intensity, displayText, isSelectedAdmin }: MatrixCellProps) {
  const bgColor = intensityToColor(intensity)
  return (
    <td className="p-0">
      <div
        className={cn(
          'relative flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-150 cursor-default select-none',
          isSelectedAdmin ? 'h-11 w-11' : 'h-10 w-10',
        )}
        style={{
          backgroundColor: `${bgColor}28`,
          border: isSelectedAdmin ? `1.5px solid ${bgColor}` : '1px solid transparent',
          borderRadius: 4,
        }}
        title={`${sector.name} · ${adminName}: ${displayText}`}
        aria-label={`${sector.name} under ${adminName}: ${displayText}`}
      >
        <span style={{ color: bgColor }}>{sector.code}</span>
        <svg className="absolute bottom-0.5 left-1 right-1" viewBox="0 0 20 3" width={20} height={3} aria-hidden="true">
          {(() => {
            const N = 5, DR = 1, DG = 4
            const filled = Math.max(1, Math.round(intensity * N))
            return Array.from({ length: N }).map((_, k) => (
              <circle key={k} cx={k * DG + DR} cy={1.5} r={DR}
                fill={k < filled ? bgColor : 'var(--color-background-elevated)'}
                stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                strokeWidth={k < filled ? 0 : 0.5}
                fillOpacity={k < filled ? 0.6 : 1}
              />
            ))
          })()}
        </svg>
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
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted font-mono">{t('matrixLegend.low')}</span>
              <div
                className="h-3 w-20 rounded"
                style={{ background: 'linear-gradient(to right, rgb(191,219,254), rgb(55,48,163))' }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-text-muted font-mono">{t('matrixLegend.high')}</span>
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
                  <div className="flex justify-center">
                    <span
                      className="text-[10px] text-text-muted font-medium block"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        height: 52,
                        lineHeight: 1,
                        paddingBottom: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sector.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMINISTRATIONS.map((admin) => {
              const liveRow = liveMatrix?.[admin.name]
              const isSelected = admin.name === selectedAdmin
              const partyColor = PARTY_COLORS[admin.party] || '#64748b'
              return (
                <tr key={admin.name}>
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
                    </div>
                  </td>
                  {MATRIX_SECTORS.map((sector) => {
                    const cellData = liveRow?.[sector.key] ?? { risk: 0, da: 0, hr: 0, sb: 0 }
                    const intensity = getCellIntensity(metric, cellData)
                    const displayText = getCellDisplay(metric, cellData)
                    return (
                      <MatrixCell
                        key={sector.key}
                        adminName={admin.name}
                        sector={sector}
                        intensity={intensity}
                        displayText={displayText}
                        isSelectedAdmin={isSelected}
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
