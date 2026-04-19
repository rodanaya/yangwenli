/**
 * AdminFingerprints — presidential risk fingerprints, 5 rows of pure SVG.
 *
 * One row per administration (Fox → Sheinbaum). Each row shows:
 *   [party tab] [Name + years] [high-risk bar + %] · [direct-award bar + %]
 *
 * The AMLO row is visually dominant by design — its high-risk rate (41.8%)
 * is the outlier that anchors the whole comparison. Fox-era direct-award %
 * is rendered as "N/D" because that flag wasn't captured pre-2007.
 *
 * Pure SVG. Static historical facts. No props needed.
 */

// ── Static data (precomputed_stats/administrations snapshot) ─────────────
// These are historical baselines for the 5 Mexican presidencies in scope
// of the RUBLI dataset (2002-2025). Kept inline: values are ground truth,
// do not depend on runtime data.
interface Admin {
  name: string
  fullName: string
  years: string
  party: string
  partyColor: string
  contracts: number
  value: number
  avgRisk: number
  highRiskPct: number
  directAwardPct: number
}

const ADMINS: Admin[] = [
  { name: 'Fox',         fullName: 'Vicente Fox',            years: '2001–2006',    party: 'PAN',    partyColor: '#1a5276', contracts: 206333,  value: 934149093703,  avgRisk: 0.2405, highRiskPct: 17.7, directAwardPct: 0    },
  { name: 'Calderón',    fullName: 'Felipe Calderón',        years: '2007–2012',    party: 'PAN',    partyColor: '#1a5276', contracts: 481450,  value: 2408464590942, avgRisk: 0.2435, highRiskPct: 18.5, directAwardPct: 42.3 },
  { name: 'Peña Nieto',  fullName: 'Enrique Peña Nieto',     years: '2013–2018',    party: 'PRI',    partyColor: '#c41e3a', contracts: 1228625, value: 3063252272272, avgRisk: 0.2566, highRiskPct: 23.0, directAwardPct: 73.1 },
  { name: 'AMLO',        fullName: 'A.M. López Obrador',     years: '2019–2024',    party: 'MORENA', partyColor: '#7b2d8b', contracts: 1050552, value: 2757688188124, avgRisk: 0.3109, highRiskPct: 41.8, directAwardPct: 79.4 },
  { name: 'Sheinbaum',   fullName: 'Claudia Sheinbaum',      years: '2025–pres.',   party: 'MORENA', partyColor: '#7b2d8b', contracts: 92631,   value: 718602180690,  avgRisk: 0.3016, highRiskPct: 39.5, directAwardPct: 68.3 },
]

// ── Layout constants ─────────────────────────────────────────────────────
const SVG_W        = 580
const ROW_H        = 34
const ROW_GAP      = 8
const PAD_T        = 22    // header row
const PAD_B        = 18    // footer caption
const SVG_H        = PAD_T + ADMINS.length * (ROW_H + ROW_GAP) + PAD_B
const PARTY_TAB_W  = 4
const PARTY_TAB_GAP = 8
const LABEL_X      = PARTY_TAB_W + PARTY_TAB_GAP
const LABEL_W      = 100
const BAR_RISK_X   = LABEL_X + LABEL_W + 8
const BAR_RISK_W   = 170
const PCT_W        = 38
const DIVIDER_X    = BAR_RISK_X + BAR_RISK_W + PCT_W + 6
const BAR_DA_X     = DIVIDER_X + 10
const BAR_DA_W     = 130

// Max values used to normalize bar lengths — chosen to let AMLO's risk
// and DA rates fill the bar track, making the outlier visually obvious.
const MAX_RISK_PCT = 45
const MAX_DA_PCT   = 85

// Colors
const RISK_COLOR   = '#dc2626'
const DA_COLOR     = '#78716c'
const GRID_COLOR   = 'rgba(255,255,255,0.06)'
const HEADER_COLOR = '#a1a1aa'
const MUTED_COLOR  = '#71717a'
const TEXT_COLOR   = '#e5e5e5'

export function AdminFingerprints() {
  // Identify the max high-risk admin so we can tint it more saturated.
  const maxRiskPct = Math.max(...ADMINS.map((a) => a.highRiskPct))

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Presidential risk fingerprints: high-risk rate and direct-award percentage by administration, 2001-2025."
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <text
        x={LABEL_X}
        y={12}
        fill={HEADER_COLOR}
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight="bold"
        letterSpacing="0.1em"
      >
        ADMINISTRATION
      </text>
      <text
        x={BAR_RISK_X}
        y={12}
        fill={HEADER_COLOR}
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight="bold"
        letterSpacing="0.1em"
      >
        % HIGH + CRITICAL RISK
      </text>
      <text
        x={BAR_DA_X}
        y={12}
        fill={HEADER_COLOR}
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight="bold"
        letterSpacing="0.1em"
      >
        % DIRECT AWARD
      </text>

      {/* ── Header underline ───────────────────────────────────────────── */}
      <line
        x1={0}
        y1={PAD_T - 6}
        x2={SVG_W}
        y2={PAD_T - 6}
        stroke={GRID_COLOR}
        strokeWidth={1}
      />

      {/* ── Divider between risk and DA sections (faint vertical rule) ─── */}
      <line
        x1={DIVIDER_X}
        y1={PAD_T - 2}
        x2={DIVIDER_X}
        y2={PAD_T + ADMINS.length * (ROW_H + ROW_GAP) - 4}
        stroke={GRID_COLOR}
        strokeWidth={1}
      />

      {/* ── Rows ───────────────────────────────────────────────────────── */}
      {ADMINS.map((a, idx) => {
        const rowY = PAD_T + idx * (ROW_H + ROW_GAP)
        const isMaxRisk = a.highRiskPct === maxRiskPct
        const riskBarW = (Math.min(a.highRiskPct, MAX_RISK_PCT) / MAX_RISK_PCT) * BAR_RISK_W
        const daBarW = a.directAwardPct > 0
          ? (Math.min(a.directAwardPct, MAX_DA_PCT) / MAX_DA_PCT) * BAR_DA_W
          : 0
        const riskAlpha = isMaxRisk ? 1.0 : 0.72
        const isLast = idx === ADMINS.length - 1

        return (
          <g key={a.name}>
            {/* Party color tab (left border) */}
            <rect
              x={0}
              y={rowY}
              width={PARTY_TAB_W}
              height={ROW_H}
              fill={a.partyColor}
              fillOpacity={0.9}
            />

            {/* Name */}
            <text
              x={LABEL_X}
              y={rowY + 13}
              fill={TEXT_COLOR}
              fontSize={12}
              fontFamily="var(--font-family-serif, Georgia, serif)"
              fontWeight="600"
            >
              {a.name}
            </text>
            {/* Years + party */}
            <text
              x={LABEL_X}
              y={rowY + 26}
              fill={MUTED_COLOR}
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              letterSpacing="0.04em"
            >
              {a.years} · {a.party}
            </text>

            {/* Risk bar track */}
            <rect
              x={BAR_RISK_X}
              y={rowY + 10}
              width={BAR_RISK_W}
              height={14}
              fill="rgba(255,255,255,0.04)"
              rx={1}
            />
            {/* Risk bar fill */}
            <rect
              x={BAR_RISK_X}
              y={rowY + 10}
              width={riskBarW}
              height={14}
              fill={RISK_COLOR}
              fillOpacity={riskAlpha}
              rx={1}
            />
            {/* Risk % */}
            <text
              x={BAR_RISK_X + BAR_RISK_W + 6}
              y={rowY + 20}
              fill={isMaxRisk ? RISK_COLOR : TEXT_COLOR}
              fontSize={11}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight={isMaxRisk ? 'bold' : 'normal'}
              dominantBaseline="middle"
            >
              {a.highRiskPct.toFixed(1)}%
            </text>

            {/* DA bar track */}
            <rect
              x={BAR_DA_X}
              y={rowY + 10}
              width={BAR_DA_W}
              height={14}
              fill="rgba(255,255,255,0.04)"
              rx={1}
            />
            {/* DA bar fill (or N/D for Fox era) */}
            {a.directAwardPct > 0 ? (
              <>
                <rect
                  x={BAR_DA_X}
                  y={rowY + 10}
                  width={daBarW}
                  height={14}
                  fill={DA_COLOR}
                  fillOpacity={0.8}
                  rx={1}
                />
                <text
                  x={BAR_DA_X + BAR_DA_W + 6}
                  y={rowY + 20}
                  fill={TEXT_COLOR}
                  fontSize={11}
                  fontFamily="var(--font-family-mono, monospace)"
                  dominantBaseline="middle"
                >
                  {a.directAwardPct.toFixed(1)}%
                </text>
              </>
            ) : (
              <text
                x={BAR_DA_X + 6}
                y={rowY + 20}
                fill={MUTED_COLOR}
                fontSize={10}
                fontFamily="var(--font-family-mono, monospace)"
                fontStyle="italic"
                dominantBaseline="middle"
              >
                N/D (flag no capturado)
              </text>
            )}

            {/* Hairline separator below row (except last) */}
            {!isLast && (
              <line
                x1={0}
                y1={rowY + ROW_H + ROW_GAP / 2}
                x2={SVG_W}
                y2={rowY + ROW_H + ROW_GAP / 2}
                stroke={GRID_COLOR}
                strokeWidth={0.5}
              />
            )}
          </g>
        )
      })}

      {/* ── Footer caption ─────────────────────────────────────────────── */}
      <text
        x={LABEL_X}
        y={SVG_H - 4}
        fill="#52525b"
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
      >
        AMLO era: 41.8% high-risk · 2.4× Fox era · direct-award flag absent pre-2007
      </text>
    </svg>
  )
}

export default AdminFingerprints
