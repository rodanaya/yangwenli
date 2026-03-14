import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

interface HeatmapDay {
  date: string
  total_contracts: number
  high_risk_contracts: number
  risk_rate: number
}

interface Props {
  year?: number
  onDayClick?: (day: HeatmapDay) => void
}

export function RiskCalendarHeatmap({ year = new Date().getFullYear(), onDayClick }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['calendar-heatmap', year],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/v1/analysis/calendar-heatmap?year=${year}`)
        return res.data as HeatmapDay[]
      } catch {
        return [] as HeatmapDay[]
      }
    },
    staleTime: 1000 * 60 * 60,
  })

  const weeks = useMemo(() => {
    if (!data?.length) return []
    const dayMap = new Map(data.map(d => [d.date, d]))

    const startDate = new Date(`${year}-01-01`)
    const endDate = new Date(`${year}-12-31`)

    const result: (HeatmapDay | null)[][] = []
    let currentWeek: (HeatmapDay | null)[] = []

    const startDay = startDate.getDay()
    for (let i = 0; i < startDay; i++) currentWeek.push(null)

    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      currentWeek.push(dayMap.get(dateStr) || { date: dateStr, total_contracts: 0, high_risk_contracts: 0, risk_rate: 0 })
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
      current.setDate(current.getDate() + 1)
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null)
      result.push(currentWeek)
    }
    return result
  }, [data, year])

  const getColor = (day: HeatmapDay | null): string => {
    if (!day || day.total_contracts === 0) return 'var(--bg-elevated)'
    const rate = day.risk_rate
    if (rate >= 0.5) return '#dc2626'
    if (rate >= 0.3) return '#ea580c'
    if (rate >= 0.15) return '#f59e0b'
    if (rate >= 0.05) return '#fbbf24'
    return '#1e3a5f'
  }

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const legendColors = ['#1e3a5f', '#fbbf24', '#f59e0b', '#ea580c', '#dc2626']

  if (isLoading) {
    return (
      <div className="card-elevated" style={{ padding: '1rem' }}>
        <div style={{ height: 120, background: 'var(--bg-elevated)', borderRadius: 8, animation: 'pulse 2s infinite' }} />
      </div>
    )
  }

  return (
    <div className="card-elevated" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
          Risk Calendar {year}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>Low</span>
          {legendColors.map(c => (
            <div key={c} style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
          ))}
          <span>High</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 18 }}>
            {DAY_LABELS.map((d, i) => (
              <div key={i} style={{ width: 12, height: 12, fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day ? `${day.date}: ${day.total_contracts} contracts, ${Math.round(day.risk_rate * 100)}% high-risk` : ''}
                  onClick={() => day && onDayClick?.(day)}
                  role={day && day.total_contracts > 0 ? 'button' : undefined}
                  tabIndex={day && day.total_contracts > 0 ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && day) onDayClick?.(day)
                  }}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: getColor(day),
                    cursor: day && day.total_contracts > 0 ? 'pointer' : 'default',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'transform 0.1s',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {data?.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>
          No calendar data available
        </p>
      )}
    </div>
  )
}

export default RiskCalendarHeatmap
