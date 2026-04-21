/**
 * PatternTypology — the 5 canonical procurement red flags as an editorial
 * stat grid. Each card is a "count + % + severity + narrative" unit.
 *
 * The co-bidding card (1.48M contracts, 48.6% of the dataset) is the
 * story: nearly half of all federal contracts in scope show a bidding
 * pattern consistent with possible bid rings. Visual emphasis on co-bid:
 * spans 2 columns on lg+ with a stronger border and glow.
 *
 * Pure JSX + Tailwind. No props, no state, no data fetching.
 */

type Severity = 'critical' | 'high' | 'medium'

interface Pattern {
  key: string
  label: string
  desc: string
  count: number
  pct: number
  color: string
  severity: Severity
}

const PATTERNS: Pattern[] = [
  {
    key: 'co_bidding',
    label: 'Co-licitación',
    desc: 'Vendors bidding together — possible bid ring',
    count: 1485424,
    pct: 48.6,
    color: '#dc2626',
    severity: 'critical',
  },
  {
    key: 'single_bid',
    label: 'Licitación única',
    desc: 'Competitive process with only 1 bidder',
    count: 505219,
    pct: 16.5,
    color: '#f59e0b',
    severity: 'high',
  },
  {
    key: 'split_contracts',
    label: 'Fraccionamiento',
    desc: 'Multiple same-day contracts to same vendor',
    count: 247946,
    pct: 8.1,
    color: '#f59e0b',
    severity: 'high',
  },
  {
    key: 'december_rush',
    label: 'Diciembre urgente',
    desc: 'Year-end spending rush in December',
    count: 52637,
    pct: 1.7,
    color: '#78716c',
    severity: 'medium',
  },
  {
    key: 'price_outliers',
    label: 'Precio anómalo',
    desc: 'Contract amounts 3× above sector median',
    count: 17373,
    pct: 0.6,
    color: '#78716c',
    severity: 'medium',
  },
]

export function PatternTypology() {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {PATTERNS.map((p) => {
        const isFlagship = p.key === 'co_bidding'
        const barPct = Math.min(100, p.pct * 2) // 50% → full bar
        return (
          <div
            key={p.key}
            className={[
              'rounded-lg border p-3.5',
              isFlagship
                ? 'lg:col-span-2 border-red-500/30 bg-red-500/[0.04] shadow-[0_0_24px_rgba(220,38,38,0.06)]'
                : 'border-stone-800/60 bg-stone-900/30',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                {p.label}
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                style={{ color: p.color, borderColor: `${p.color}40` }}
              >
                {p.severity}
              </span>
            </div>

            <div
              className={[
                'font-black tabular-nums mb-0.5 leading-none',
                isFlagship ? 'text-3xl' : 'text-2xl',
              ].join(' ')}
              style={{ color: p.color }}
            >
              {p.count.toLocaleString()}
            </div>

            <div className="text-[10px] font-mono text-stone-400 mb-2">
              {p.pct.toFixed(1)}% de contratos
            </div>

            {/* Dot-matrix bar */}
            {(() => {
              const N = 24, DR = 2.5, DG = 8
              const filled = Math.round((barPct / 100) * N)
              return (
                <svg viewBox={`0 0 ${N * DG} 8`} className="w-full" style={{ height: 8 }} aria-hidden="true">
                  {Array.from({ length: N }).map((_, i) => (
                    <circle key={i} cx={i * DG + DR} cy={4} r={DR}
                      fill={i < filled ? p.color : '#2d2926'}
                      stroke={i < filled ? undefined : '#3d3734'}
                      strokeWidth={i < filled ? 0 : 0.5}
                      fillOpacity={i < filled ? 0.85 : 1}
                    />
                  ))}
                </svg>
              )
            })()}

            <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed">
              {p.desc}
            </p>
          </div>
        )
      })}
      </div>
      <p className="text-[10px] font-mono text-text-muted mt-2">
        1 ● ≈ 2% de contratos clasificados · severity = nivel de riesgo estructural
      </p>
    </div>
  )
}

export default PatternTypology
