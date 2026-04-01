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
  LabelList,
} from 'recharts'

const OECD_COLOR = '#22d3ee'

// Sorted ASCENDING by competitive rate (least competitive at top in horizontal chart)
const data = [
  { sector: 'Agricultura',    competitive: 6.5,  color: '#dc2626' },
  { sector: 'Educación',      competitive: 7.7,  color: '#dc2626' },
  { sector: 'Trabajo',        competitive: 11.7, color: '#dc2626' },
  { sector: 'Hacienda',       competitive: 11.7, color: '#dc2626' },
  { sector: 'Otros',          competitive: 16.1, color: '#ea580c' },
  { sector: 'Salud',          competitive: 20.1, color: '#ea580c' },
  { sector: 'Tecnología',     competitive: 21.7, color: '#ea580c' },
  { sector: 'Energía',        competitive: 31.4, color: '#ea580c' },
  { sector: 'Gobernación',    competitive: 35.1, color: '#eab308' },
  { sector: 'Ambiente',       competitive: 36.3, color: '#eab308' },
  { sector: 'Defensa',        competitive: 48.1, color: '#eab308' },
  { sector: 'Infraestructura', competitive: 54.2, color: '#16a34a' },
]

function getBarColor(pct: number): string {
  if (pct < 15) return '#dc2626'
  if (pct < 30) return '#ea580c'
  if (pct <= 50) return '#eab308'
  return '#16a34a'
}

interface PayloadEntry {
  payload: { sector: string; competitive: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.sector}</p>
      <p className="text-text-secondary">Competitivo: {d.competitive}%</p>
      <p className="text-text-muted">Adj. Directa: {(100 - d.competitive).toFixed(1)}%</p>
    </div>
  )
}

export function StoryCeroCompetenciaChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-background-card border border-border p-4"
    >
      <p className="text-sm font-semibold text-text-primary mb-0.5">
        Menos de 1 de cada 10 contratos en Agricultura y Educación tuvo competencia real
      </p>
      <p className="text-xs text-text-muted mb-4">
        % de contratos con procedimiento competitivo por sector · AMLO 2019-2024
      </p>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 80]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="sector"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={95}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'var(--color-border)', opacity: 0.25 }}
          />
          <ReferenceLine
            x={75}
            stroke={OECD_COLOR}
            strokeDasharray="4 2"
            label={{
              value: 'OCDE 75%',
              fill: OECD_COLOR,
              fontSize: 9,
              position: 'top',
            }}
          />
          <Bar
            dataKey="competitive"
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.competitive)} />
            ))}
            <LabelList
              dataKey="competitive"
              position="right"
              formatter={(v: unknown) => `${v}%`}
              style={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block bg-red-600" />
          {'< 15% competitivo'}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#ea580c' }} />
          15–30%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#eab308' }} />
          30–50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block bg-green-600" />
          {' > 50%'}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 inline-block" style={{ borderColor: OECD_COLOR, borderStyle: 'dashed' }} />
          Meta OCDE 75%
        </span>
      </div>
    </motion.div>
  )
}
