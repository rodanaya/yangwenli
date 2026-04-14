import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { SECTOR_COLORS } from '@/lib/constants'

const OECD_COLOR = '#22d3ee'

// Map sector names to their canonical color keys
const SECTOR_KEY_MAP: Record<string, string> = {
  'Agricultura': 'agricultura',
  'Educacion': 'educacion',
  'Trabajo': 'trabajo',
  'Hacienda': 'hacienda',
  'Otros': 'otros',
  'Salud': 'salud',
  'Tecnologia': 'tecnologia',
  'Energia': 'energia',
  'Gobernacion': 'gobernacion',
  'Ambiente': 'ambiente',
  'Defensa': 'defensa',
  'Infraestructura': 'infraestructura',
}

// Sorted ASCENDING by competitive rate (least competitive at top)
const data = [
  { sector: 'Agricultura',     competitive: 6.5 },
  { sector: 'Educacion',       competitive: 7.7 },
  { sector: 'Trabajo',         competitive: 11.7 },
  { sector: 'Hacienda',        competitive: 11.7 },
  { sector: 'Otros',           competitive: 16.1 },
  { sector: 'Salud',           competitive: 20.1 },
  { sector: 'Tecnologia',      competitive: 21.7 },
  { sector: 'Energia',         competitive: 31.4 },
  { sector: 'Gobernacion',     competitive: 35.1 },
  { sector: 'Ambiente',        competitive: 36.3 },
  { sector: 'Defensa',         competitive: 48.1 },
  { sector: 'Infraestructura', competitive: 54.2 },
]

function getSectorColor(sectorName: string): string {
  const key = SECTOR_KEY_MAP[sectorName]
  return key ? (SECTOR_COLORS[key] || '#64748b') : '#64748b'
}

interface PayloadEntry {
  payload: { sector: string; competitive: number }
}

function DarkTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  const { t } = useTranslation('spending')
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const da = (100 - d.competitive).toFixed(1)
  const oecdGap = 75 - d.competitive
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="font-mono text-xs font-semibold text-zinc-100">{d.sector}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-zinc-400 text-xs">
          {t('ceroComp.competitive')}: <span className="text-zinc-100 font-bold">{d.competitive}%</span>
        </p>
        <p className="text-red-400 text-xs">
          {t('ceroComp.directAward')}: <span className="font-bold">{da}%</span>
        </p>
        <p className="text-cyan-400 text-[10px] font-mono">
          {oecdGap > 0 ? t('ceroComp.belowOecd', { n: oecdGap.toFixed(0) }) : t('ceroComp.meetsOecd')}
        </p>
      </div>
    </div>
  )
}

export function StoryCeroCompetenciaChart() {
  // Count sectors below 25% competitive
  const criticalSectors = data.filter(d => d.competitive < 25).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-5"
    >
      {/* Overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Competencia por Sector
      </p>

      {/* Editorial headline */}
      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Menos de 1 de cada 10 contratos en Agricultura y Educación tuvo competencia real
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        % de contratos con procedimiento competitivo por sector · AMLO 2019-2024
      </p>

      {/* Hero stats */}
      <div className="flex gap-6 mb-5">
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-red-500">{criticalSectors}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">sectores bajo 25%</div>
        </div>
        <div className="border-l-2 border-cyan-400 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-cyan-400">0</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">sectores cumplen OCDE 75%</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 80]}
            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="sector"
            tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ fill: '#27272a', opacity: 0.6 }}
          />
          <ReferenceLine
            x={75}
            stroke={OECD_COLOR}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: 'OCDE 75%',
              fill: OECD_COLOR,
              fontSize: 9,
              fontFamily: 'var(--font-family-mono)',
              position: 'top',
            }}
          />
          <Bar
            dataKey="competitive"
            radius={[0, 3, 3, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
            label={{
              position: 'right' as const,
              formatter: (v: unknown) => `${v}%`,
              fill: '#71717a',
              fontSize: 9,
              fontFamily: 'var(--font-family-mono)',
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={getSectorColor(entry.sector)}
                fillOpacity={entry.competitive < 15 ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Finding callout */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Ningún sector alcanza la meta OCDE de 75% competitivo. Los 4 peores sectores
          (Agricultura, Educación, Trabajo, Hacienda) están 60+ puntos debajo del estándar.
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-3">
        Fuente: COMPRANET · Meta OCDE: 75% competitivo · Análisis RUBLI v6.5
      </p>
    </motion.div>
  )
}
