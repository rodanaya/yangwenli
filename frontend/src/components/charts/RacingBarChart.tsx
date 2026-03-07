/**
 * RacingBarChart — Animated sector spending race 2002→2025
 *
 * Shows top 8 sectors by spending for each year, with bars racing
 * up and down as budgets shift across administrations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'

// Administration periods for the timeline marker
const ADMINS = [
  { name: 'Fox',       start: 2002, end: 2006, color: '#2563eb' },
  { name: 'Calderón',  start: 2006, end: 2012, color: '#16a34a' },
  { name: 'Peña Nieto',start: 2012, end: 2018, color: '#ea580c' },
  { name: 'AMLO',      start: 2018, end: 2024, color: '#7c3aed' },
  { name: 'Sheinbaum', start: 2024, end: 2026, color: '#db2777' },
]

const TOP_N = 8
const YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2002 + i)

function getAdminColor(year: number) {
  return ADMINS.find(a => year >= a.start && year < a.end)?.color ?? '#64748b'
}
function getAdminName(year: number) {
  return ADMINS.find(a => year >= a.start && year < a.end)?.name ?? ''
}

interface RaceEntry {
  sectorId: number
  name: string
  value: number
  rank: number
  color: string
}

export function RacingBarChart() {
  const [yearIdx, setYearIdx] = useState(0)
  const [playing, setPlaying] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 30 * 60 * 1000,
  })

  // Build year → sorted sectors map
  const yearMap = useMemo(() => {
    if (!data?.data) return new Map<number, RaceEntry[]>()
    const m = new Map<number, Map<number, number>>()
    data.data.forEach(item => {
      if (!m.has(item.year)) m.set(item.year, new Map())
      m.get(item.year)!.set(item.sector_id, item.total_value)
    })
    const result = new Map<number, RaceEntry[]>()
    YEARS.forEach(year => {
      const sectorMap = m.get(year)
      if (!sectorMap) { result.set(year, []); return }
      const sorted = Array.from(sectorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_N)
        .map(([sid, value], i) => {
          const sector = SECTORS.find(s => s.id === sid)
          return {
            sectorId: sid,
            name: sector?.nameEN ?? `Sector ${sid}`,
            value,
            rank: i,
            color: sector ? SECTOR_COLORS[sector.code] : '#64748b',
          }
        })
      result.set(year, sorted)
    })
    return result
  }, [data])

  const currentYear = YEARS[yearIdx]
  const entries = yearMap.get(currentYear) ?? []
  const maxValue = entries[0]?.value ?? 1
  const adminColor = getAdminColor(currentYear)
  const adminName = getAdminName(currentYear)

  // Auto-play
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setYearIdx(i => {
        if (i >= YEARS.length - 1) { setPlaying(false); return i }
        return i + 1
      })
    }, 700)
    return () => clearInterval(id)
  }, [playing])

  const handlePlay = useCallback(() => {
    if (yearIdx >= YEARS.length - 1) setYearIdx(0)
    setPlaying(p => !p)
  }, [yearIdx])

  if (isLoading) return <Skeleton className="h-80 w-full" />

  return (
    <div className="space-y-3">
      {/* Header with year + admin badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-black tabular-nums text-foreground">{currentYear}</span>
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: adminColor }}
          >
            {adminName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYearIdx(i => Math.max(0, i-1))}>
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 px-3" onClick={handlePlay}>
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYearIdx(i => Math.min(YEARS.length-1, i+1))}>
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Bars */}
      <div className="relative h-64 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {entries.map((entry) => {
            const pct = (entry.value / maxValue) * 100
            return (
              <motion.div
                key={entry.sectorId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute left-0 right-0 flex items-center gap-2"
                style={{ top: entry.rank * 30, height: 26 }}
              >
                <span className="text-[10px] text-muted-foreground w-4 shrink-0 text-right">
                  {entry.rank + 1}
                </span>
                <div className="flex-1 relative h-full flex items-center">
                  <motion.div
                    className="h-5 rounded-r-sm flex items-center pl-2"
                    style={{ backgroundColor: entry.color, minWidth: 4 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  >
                    <span className="text-[10px] font-semibold text-white truncate">
                      {entry.name}
                    </span>
                  </motion.div>
                  <span className="absolute right-0 text-[10px] tabular-nums text-muted-foreground ml-1 whitespace-nowrap">
                    {formatCompactMXN(entry.value)}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Year scrubber */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={YEARS.length - 1}
          value={yearIdx}
          onChange={e => { setPlaying(false); setYearIdx(Number(e.target.value)) }}
          className="w-full h-1.5 accent-primary cursor-pointer"
        />
        {/* Admin bands below scrubber */}
        <div className="relative h-3">
          {ADMINS.map(a => {
            const startPct = ((a.start - 2002) / (YEARS.length - 1)) * 100
            const endPct = ((Math.min(a.end, 2025) - 2002) / (YEARS.length - 1)) * 100
            return (
              <div
                key={a.name}
                className="absolute h-full rounded-sm opacity-60"
                style={{
                  left: `${startPct}%`,
                  width: `${endPct - startPct}%`,
                  backgroundColor: a.color,
                }}
                title={a.name}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          {ADMINS.map(a => (
            <span key={a.name} style={{ color: a.color }}>{a.name}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
